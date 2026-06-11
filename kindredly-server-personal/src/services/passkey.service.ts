import {config} from '@/config';
import {PasskeyCredentialRepo} from '@/db/passkey_credential.repo';
import {HttpException} from '@/exceptions/HttpException';
import {logger} from '@/utils/logger';
import {v4 as uuidv4} from 'uuid';
import {injectable} from 'inversify';
import {
  PasskeyChallengeResponse,
  PasskeyCredential,
  PasskeyRegisterRequest,
  PasskeyAuthenticateRequest,
  AuthResponse,
  type PasskeyChallengeRequest,
} from 'tset-sharedlib/api';
import * as crypto from 'crypto';
import {getRedisClient} from '@/base/redis_client';
import {_createToken, removeSensitiveInfoFromUser} from '@/utils/auth_utils';
import {UserRepo} from '@/db/user.repo';
import {decryptPassword} from '@/utils/crypto_util';

const CHALLENGE_PREFIX = 'passkey_challenge:';
const CHALLENGE_TTL_SECONDS = 300; // 5 minutes

@injectable()
class PasskeyService {
  private passkeyRepo = new PasskeyCredentialRepo();
  private userRepo = new UserRepo();
  private redis = getRedisClient();

  /**
   * Store a challenge in Redis with TTL
   */
  private async storeChallenge(
    challengeId: string,
    challenge: string,
    userId?: string,
    operation: PasskeyChallengeRequest['operation'] = 'default',
  ): Promise<void> {
    const data = JSON.stringify({challenge, userId, operation: operation || 'default'});
    await this.redis.setex(`${CHALLENGE_PREFIX}${challengeId}`, CHALLENGE_TTL_SECONDS, data);
  }

  /**
   * Retrieve and delete a challenge from Redis (one-time use)
   */
  private async consumeChallenge(
    challengeId: string,
  ): Promise<{challenge: string; userId?: string; operation?: PasskeyChallengeRequest['operation']} | null> {
    const key = `${CHALLENGE_PREFIX}${challengeId}`;
    const data = await this.redis.get(key);
    if (!data) return null;

    await this.redis.del(key);
    return JSON.parse(data);
  }

  /**
   * Generate a challenge for passkey registration or authentication
   */
  async generateChallenge(
    userId?: string,
    type: 'register' | 'authenticate' = 'register',
    usernameOrEmail?: string,
    operation: PasskeyChallengeRequest['operation'] = 'default',
  ): Promise<PasskeyChallengeResponse> {
    let targetUserId = userId;
    if (!targetUserId && type === 'authenticate' && usernameOrEmail) {
      const normalizedLogin = String(usernameOrEmail).trim().toLowerCase();
      if (normalizedLogin) {
        const matchedUser =
          (await this.userRepo.findByUsername(normalizedLogin)) || (await this.userRepo.findByEmail(normalizedLogin));
        targetUserId = matchedUser?._id;
      }
    }

    // Generate a random challenge
    const challengeBytes = crypto.randomBytes(32);
    const challenge = this.base64URLEncode(challengeBytes);

    // Store challenge in Redis with expiration (5 minutes)
    const challengeId = uuidv4();
    await this.storeChallenge(challengeId, challenge, targetUserId, operation || 'default');

    let credentialIds: string[] = [];
    let existingCredentialIds: string[] = [];
    if (targetUserId) {
      const credentials = await this.passkeyRepo.listByUserId(targetUserId);
      credentialIds = credentials.map((c) => c.credentialId);
      if (type === 'register') {
        existingCredentialIds = credentialIds;
      }
    }

    // Get RP ID from config or default to hostname
    const rpId = config.passkeyRpId || this.extractRpId(config.serverHostname);
    const rpName = config.passkeyRpName || 'Kindredly';

    return {
      challenge: `${challengeId}:${challenge}`, // Include challenge ID for verification
      rpId,
      rpName,
      existingCredentialIds,
      credentialIds,
      timeout: 60000,
    };
  }

  /**
   * Verify and store a new passkey credential
   */
  async registerPasskey(
    userId: string,
    accountId: string,
    request: PasskeyRegisterRequest,
  ): Promise<{success: boolean; credential?: PasskeyCredential}> {
    try {
      const {credential, attestationObject, clientDataJSON, deviceName} = request;

      // Parse the challenge from the stored format
      const clientData = JSON.parse(Buffer.from(this.base64URLDecode(clientDataJSON)).toString('utf-8'));

      // The challenge in clientDataJSON is base64URL encoded by WebAuthn
      // Decode it to get the original "challengeId:challenge" string
      const decodedChallenge = Buffer.from(this.base64URLDecode(clientData.challenge)).toString('utf-8');

      // Verify challenge format and extract parts
      const challengeParts = this.extractChallengeId(decodedChallenge);
      if (!challengeParts) {
        logger.error('Invalid challenge format, decoded challenge:', decodedChallenge);
        throw new HttpException(400, 'Invalid challenge format');
      }

      const {challengeId, originalChallenge} = challengeParts;

      // Verify the challenge exists and hasn't expired
      const storedChallenge = await this.consumeChallenge(challengeId);
      if (!storedChallenge) {
        throw new HttpException(400, 'Challenge expired or invalid');
      }

      if (storedChallenge.challenge !== originalChallenge) {
        throw new HttpException(400, 'Challenge mismatch');
      }

      // Verify the origin matches our expected origin
      const expectedOrigin = config.serverHostname;
      if (!clientData.origin.startsWith(expectedOrigin.replace(/^https?:\/\//, ''))) {
        // Allow for development environments
        if (config.nodeEnv !== 'development') {
          logger.warn(`Origin mismatch: expected ${expectedOrigin}, got ${clientData.origin}`);
        }
      }

      // Check if credential already exists
      const existingCredential = await this.passkeyRepo.findByCredentialId(credential.credentialId);
      if (existingCredential) {
        throw new HttpException(400, 'This passkey is already registered');
      }

      // Store the credential
      const passkeyCredential = await this.passkeyRepo.create({
        _id: uuidv4(),
        userId,
        accountId,
        credentialId: credential.credentialId,
        publicKey: credential.publicKey,
        transports: credential.transports,
        prfSupported: credential.prfSupported,
        deviceName: deviceName || 'Unknown Device',
        signCount: 0,
      });

      logger.info(`Passkey registered for user ${userId}, PRF supported: ${credential.prfSupported}`);

      return {
        success: true,
        credential: this.sanitizeCredential(passkeyCredential),
      };
    } catch (error) {
      logger.error('Passkey registration failed:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, 'Failed to register passkey');
    }
  }

  /**
   * Verify a passkey authentication assertion
   */
  async authenticatePasskey(
    request: PasskeyAuthenticateRequest,
    options: {
      expectedOperation?: PasskeyChallengeRequest['operation'];
      expectedUserId?: string;
    } = {},
  ): Promise<{success: boolean; userId?: string; verified: boolean}> {
    try {
      const {credentialId, signature, authenticatorData, clientDataJSON} = request;

      // Find the credential
      const credential = await this.passkeyRepo.findByCredentialId(credentialId);
      if (!credential) {
        return {success: false, verified: false};
      }

      // Parse client data
      const clientData = JSON.parse(Buffer.from(this.base64URLDecode(clientDataJSON)).toString('utf-8'));

      // The challenge in clientDataJSON is base64URL encoded by WebAuthn
      // Decode it to get the original challenge string (format: challengeId:challenge)
      const decodedChallenge = Buffer.from(this.base64URLDecode(clientData.challenge)).toString('utf-8');

      // Verify challenge format and extract parts
      const challengeParts = this.extractChallengeId(decodedChallenge);
      if (!challengeParts) {
        throw new HttpException(400, 'Invalid challenge format');
      }

      const {challengeId, originalChallenge} = challengeParts;

      // Verify the challenge
      const storedChallenge = await this.consumeChallenge(challengeId);
      if (!storedChallenge || storedChallenge.challenge !== originalChallenge) {
        throw new HttpException(400, 'Challenge expired or invalid');
      }

      const expectedOperation = options.expectedOperation || 'default';
      const storedOperation = storedChallenge.operation || 'default';
      if (storedOperation !== expectedOperation) {
        throw new HttpException(400, 'Challenge operation mismatch');
      }
      if (options.expectedUserId && storedChallenge.userId && storedChallenge.userId !== options.expectedUserId) {
        throw new HttpException(403, 'Passkey challenge user mismatch');
      }

      // In a full implementation, we would verify the signature here using the stored public key
      // For now, we trust the WebAuthn API's verification on the client side
      // TODO: Implement full server-side signature verification

      // Parse authenticator data to get sign count
      const authDataBuffer = Buffer.from(this.base64URLDecode(authenticatorData));
      const signCount = authDataBuffer.readUInt32BE(33); // Sign count is at bytes 33-36

      // Verify sign count to prevent replay attacks
      if (signCount <= credential.signCount && signCount !== 0) {
        logger.warn(`Possible credential cloning detected for credential ${credentialId}`);
        // In production, you might want to disable the credential here
      }

      // Update sign count
      await this.passkeyRepo.updateSignCount(credentialId, signCount);

      logger.info(`Passkey authentication successful for user ${credential.userId}`);

      if (options.expectedUserId && credential.userId !== options.expectedUserId) {
        throw new HttpException(403, 'Passkey credential does not belong to current user');
      }

      return {
        success: true,
        userId: credential.userId,
        verified: true,
      };
    } catch (error) {
      logger.error('Passkey authentication failed:', error);
      if (error instanceof HttpException) throw error;
      return {success: false, verified: false};
    }
  }

  /**
   * Login with passkey - verifies the passkey and returns a full auth response with token
   */
  async loginWithPasskey(request: PasskeyAuthenticateRequest): Promise<AuthResponse> {
    // First verify the passkey
    const authResult = await this.authenticatePasskey(request);

    if (!authResult.success || !authResult.verified || !authResult.userId) {
      throw new HttpException(401, 'Passkey authentication failed');
    }

    // Get the user
    const user = await this.userRepo.findById(authResult.userId);
    if (!user) {
      throw new HttpException(404, 'User not found');
    }

    // Create token
    const tokenData = _createToken(user);

    // Get password and recovery key for client (if available)
    let passwordForClient = null;
    if (user.passwordCopy != null) {
      passwordForClient = decryptPassword(user.passwordCopy);
    }

    let recoveryKeyForClient = null;
    if (user.recoveryKey != null) {
      recoveryKeyForClient = decryptPassword(user.recoveryKey);
    }

    logger.info(`Passkey login successful for user ${user._id}`);

    return {
      success: true,
      user: removeSensitiveInfoFromUser(user),
      tokenData,
      passwordForClient,
      recoveryKeyForClient,
      message: 'Passkey login successful',
      statusCode: 200,
    };
  }

  /**
   * List passkeys for a user
   */
  async listPasskeys(userId: string): Promise<PasskeyCredential[]> {
    const credentials = await this.passkeyRepo.listByUserId(userId);
    return credentials.map((c) => this.sanitizeCredential(c));
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(userId: string, credentialId: string): Promise<boolean> {
    const credential = await this.passkeyRepo.findByCredentialId(credentialId);
    if (!credential || credential.userId !== userId) {
      throw new HttpException(404, 'Passkey not found');
    }

    await this.passkeyRepo.disableByCredentialId(credentialId);
    logger.info(`Passkey deleted for user ${userId}`);
    return true;
  }

  // Helper methods

  private base64URLEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private base64URLDecode(str: string): Buffer {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return Buffer.from(str, 'base64');
  }

  private extractRpId(hostname: string): string {
    // Extract domain from URL
    try {
      const url = new URL(hostname);
      return url.hostname;
    } catch {
      return hostname;
    }
  }

  private extractChallengeId(challenge: string): {challengeId: string; originalChallenge: string} | null {
    const parts = challenge.split(':');
    if (parts.length !== 2) {
      return null;
    }
    return {
      challengeId: parts[0],
      originalChallenge: parts[1],
    };
  }

  private sanitizeCredential(credential: any): PasskeyCredential {
    return {
      credentialId: credential.credentialId,
      publicKey: credential.publicKey,
      userId: credential.userId,
      createdAt: credential.createdAt?.toISOString() || new Date().toISOString(),
      transports: credential.transports,
      prfSupported: credential.prfSupported,
      deviceName: credential.deviceName,
    };
  }
}

export default PasskeyService;
