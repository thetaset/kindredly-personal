import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper, getTargetUserId} from '@/utils/auth_utils';
import {encryptPassword, decryptPassword} from '@/utils/crypto_util';
import {UserOauthSecretRepo} from '@/db/user_oauth_secret.repo';
import {GmailOauthService} from '@/services/integrations/gmail_oauth.service';

const PROVIDER = 'gmail';

type GmailSecret = {
  refreshToken: string;
  scope?: string;
};

class UserIntegrationsGmailRoute implements Routes {
  public router = Router();

  private oauthRepo = new UserOauthSecretRepo();
  private gmailOauth = new GmailOauthService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/user/integrations/gmail/oauth/status',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/integrations/gmail/oauth/status'>, res) => {
        const userId = getTargetUserId(req);
        const row = await this.oauthRepo.getByUserAndProvider(userId, PROVIDER);
        res.json({success: true, results: {connected: !!row}});
      }),
    );

    this.router.post(
      '/user/integrations/gmail/oauth/disconnect',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/integrations/gmail/oauth/disconnect'>, res) => {
        const userId = getTargetUserId(req);
        await this.oauthRepo.deleteByUserAndProvider(userId, PROVIDER);
        res.json({success: true, results: {}});
      }),
    );

    this.router.post(
      '/user/integrations/gmail/oauth/exchangeCode',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/integrations/gmail/oauth/exchangeCode'>, res) => {
        const userId = getTargetUserId(req);

        const code = String(req?.body?.code || '').trim();
        const redirectUri = String(req?.body?.redirectUri || '').trim();
        if (!code) throw new Error('Missing code');
        if (!redirectUri) throw new Error('Missing redirectUri');

        const exchanged = await this.gmailOauth.exchangeCode({code, redirectUri});

        // If Google doesn't return refresh_token (common on reconnect), keep existing.
        const existing = await this.oauthRepo.getByUserAndProvider(userId, PROVIDER);
        let refreshToken = exchanged.refreshToken;
        let scope = exchanged.scope;

        if (!refreshToken && existing?.secretEnc) {
          try {
            const raw = decryptPassword(existing.secretEnc as any);
            const parsed = raw ? (JSON.parse(raw) as GmailSecret) : null;
            if (parsed?.refreshToken) refreshToken = parsed.refreshToken;
            if (!scope && parsed?.scope) scope = parsed.scope;
          } catch {
            // ignore
          }
        }

        if (!refreshToken) {
          throw new Error('Google did not provide a refresh token. Try Disconnect + Connect again.');
        }

        const secret: GmailSecret = {refreshToken, scope};
        const enc = encryptPassword(JSON.stringify(secret));
        if (!enc) throw new Error('Failed to encrypt refresh token');

        await this.oauthRepo.upsert({
          _id: this.oauthRepo.makeId(userId, PROVIDER),
          userId,
          provider: PROVIDER,
          secretEnc: enc,
        });

        // Return access token for immediate use (still short-lived).
        res.json({
          success: true,
          results: {
            accessToken: exchanged.accessToken,
            expiresInSec: exchanged.expiresInSec,
            scope: exchanged.scope || scope,
            obtainedAtMs: Date.now(),
          },
        });
      }),
    );

    this.router.post(
      '/user/integrations/gmail/oauth/accessToken',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/integrations/gmail/oauth/accessToken'>, res) => {
        const userId = getTargetUserId(req);
        const row = await this.oauthRepo.getByUserAndProvider(userId, PROVIDER);
        if (!row?.secretEnc) {
          res.json({success: false, message: 'Gmail is not connected', status: 400});
          return;
        }

        const raw = decryptPassword(row.secretEnc as any);
        if (!raw) {
          res.json({
            success: false,
            message: 'Gmail connection is corrupted. Disconnect + Connect again.',
            status: 400,
          });
          return;
        }

        const parsed = JSON.parse(raw) as GmailSecret;
        if (!parsed?.refreshToken) {
          res.json({success: false, message: 'Gmail refresh token missing. Disconnect + Connect again.', status: 400});
          return;
        }

        const refreshed = await this.gmailOauth.refreshAccessToken({refreshToken: parsed.refreshToken});

        res.json({
          success: true,
          results: {
            accessToken: refreshed.accessToken,
            expiresInSec: refreshed.expiresInSec,
            scope: refreshed.scope || parsed.scope,
            obtainedAtMs: Date.now(),
          },
        });
      }),
    );
  }
}

export default UserIntegrationsGmailRoute;
