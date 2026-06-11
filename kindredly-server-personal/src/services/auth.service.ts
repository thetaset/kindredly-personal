import {config} from '@/config';
import {AccountRepo} from '@/db/account.repo';
import {UserRepo} from '@/db/user.repo';
import User from 'tset-sharedlib/schemas/public/User';
import {buildAccountPlanUpdate, getDetailsByAccountType} from '@/defaults/products_and_plans';
import {CreateUserDto} from '@dtos/users.dto';
import {HttpException} from '@exceptions/HttpException';
import {TokenData, type RemoveRecoveryKeyFromServerRequest} from 'tset-sharedlib/api/api-types';
import {secureCompareSecrets, hashStringWithSalt, isEmpty} from '@/utils/crypto_util';
import {Request} from 'express';
import {v4 as uuidv4} from 'uuid';
import {sendEmail} from '../utils/email_utils';
import FriendService from './friend.service';
import {SessionService} from './session.service';
import ItemService from './item.service';
import NotificationService from './notification.service';
import EventAuditService from './record_event.service';
import {RequestContext} from '../base/request_context';
import {checkDisplayedName, checkUserName, DEFAULT_OPTIONS} from '@/utils/user.utils';
import {MAIN_EMAIL_TEMPLATE} from '@/templates/email.templates';
import UserService from './user.service';
import VerificationService from './verification.service';
import {EventRecordName, EventRecordType, NotificationType} from '@/typing/enum_strings';
import {
  ERROR_MESSAGE,
  RECOVER_ACCOUNT_ACCESS_MSG,
  RESET_PASSWORD_MSG,
  THANK_YOU_FOR_JOINING_MSG,
  WELCOME_TITLE_MESSAGE,
} from '@/defaults/message_templates';
import {AccountType, ClientInfoView, LoginType, UserType, VerificationType} from 'tset-sharedlib/shared.types';
import ClientInfoService from './client_info.service';

import {generateUsernameAndDisplayedName} from '@/utils/user.utils';
import {UserAuthInfo} from '@/utils/auth_utils';

import {decryptPassword, encryptPassword} from '@/utils/crypto_util';
import {_createTempToken, _createToken} from '@/utils/auth_utils';
import {UserOptions} from '@/typing/usertypes';
import {logger} from '@/utils/logger';
import AuthValidatorService from './_interfaces/auth_validator.service';
import {inject, injectable} from 'inversify';
import {TYPES} from '@/types';
import {container} from '@/inversify.config';
import PasskeyService from './passkey.service';

export interface ApplePostData {
  id_token: string;
  state: string;
  code: string;
  error: string;
}

const passwordSalt = String(config.passwordSalt);

function hashString(st: string) {
  return hashStringWithSalt(st, passwordSalt);
}

@injectable()
class AuthService {
  constructor(@inject(TYPES.AuthValidatorService) private authValidatorService: AuthValidatorService) {}

  private users = new UserRepo();
  private accounts = new AccountRepo();
  private auditService = new EventAuditService();
  private notificationsService = container.resolve(NotificationService);
  private verificationService = new VerificationService();
  private userService = new UserService();
  private friendService = new FriendService();
  private itemService = new ItemService();
  private clientInfoService = new ClientInfoService();
  private passkeyService = new PasskeyService();

  private logRecoveryEmailForDev(params: {
    flow: 'account-recovery' | 'password-reset';
    email: string;
    verificationCode: string;
    subject: string;
    body: string;
  }) {
    if (config.nodeEnv !== 'development') {
      return;
    }

    logger.info(
      [
        '[AUTH RECOVERY EMAIL][DEV ONLY]',
        `flow=${params.flow}`,
        `email=${params.email}`,
        `verificationCode=${params.verificationCode}`,
        `subject=${params.subject}`,
        `body=${params.body}`,
      ].join('\n'),
    );
  }

  // ROUTE-METHOD
  public async registerAndSignin(userData: CreateUserDto, req: Request): Promise<UserAuthInfo> {
    userData.loginType = userData.loginType || LoginType.internal;
    userData.type = userData.type || UserType.admin;

    const verificationCode = userData?.inviteVerification?.code;
    let accountId = null;

    //verify invite if exists
    if (verificationCode) {
      const inviteInfo = await this.verificationService.getFamilyInviteInfo(verificationCode);
      accountId = inviteInfo?.accountId;
      if (!accountId) {
        throw new Error('Invalid Invite');
      }
    }

    await this.authValidatorService.validateUserCredentialsForRegistration(userData);

    await this._checkEmailExists(userData.email);

    let user: User = null;

    if (!!accountId) {
      logger.info('Creating User for existing account', userData.email);
      user = await this._createUser(new RequestContext({accountId}), userData);
    } else {
      user = await this._createAccount(userData);
    }

    if (!user) {
      throw new HttpException(400, 'Failed to create account');
    }

    try {
      if (verificationCode) {
        await this.verificationService._invalidateVerification(verificationCode);
      }
    } catch (e) {}

    return this._getSuccessfulUserAuthInfo(user, userData.clientInfoData, req);
  }

  private async _checkEmailExists(email: string) {
    if (!email) {
      return;
    }
    const user = await this.users.findByEmail(email);

    if (!!user) {
      console.log('User exists with email!', email);
      throw new HttpException(
        400,
        `A user already exists with this email but with a login provider such as Google or Apple.`,
      );
    }
  }

  public async _createAccount(userData: CreateUserDto): Promise<User> {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    if (
      (userData.loginType == LoginType.internal || !!userData.username) &&
      (await this.userService._checkUsernameExists(userData.username))
    ) {
      throw new Error(ERROR_MESSAGE.USERNAME_TAKEN);
    }
    if (
      (userData.loginType == LoginType.internal || !!userData.email) &&
      (await this.userService._checkEmailExists(userData.email))
    ) {
      throw new Error(ERROR_MESSAGE.EMAIL_TAKEN);
    }

    const nowSt = new Date();
    const standardPlanUpdate = buildAccountPlanUpdate(AccountType.standard);

    const accountId = 'ac_' + uuidv4();
    await this.accounts.create({
      _id: accountId,
      options: {},
      createdAt: nowSt,
      updatedAt: nowSt,
      collectionCount: 0,
      userCount: 0,
      ...standardPlanUpdate,
    });

    const createdUser = await this._createUser(new RequestContext({accountId}), userData);

    const userId = createdUser._id;
    this.notificationsService.addUserNotification(
      RequestContext.instanceForSystem(),
      NotificationType.WELCOME_USER,
      userId,
      accountId,
      userId,
      {
        title: WELCOME_TITLE_MESSAGE,
        message: THANK_YOU_FOR_JOINING_MSG(config),
      },
    );

    this.auditService.recordEvent({
      eventName: EventRecordName.CREATE_ACCOUNT,
      eventType: EventRecordType.EXPLICIT,
      eventInfo: {},
      accountId,
      userId,
    });

    return createdUser;
  }

  // ROUTE-METHOD
  public async signin(userData: CreateUserDto, req: Request): Promise<UserAuthInfo> {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    userData.loginType = userData.loginType || LoginType.internal;

    // Verify and find user for each login type
    const {user, verified} = await this.authValidatorService.validateUserCredentials(userData);

    if (!user || user.deleted) throw new HttpException(409, `User not found `);
    else if (user.disabled) {
      throw new HttpException(409, 'User account is locked');
    } else if (!verified) {
      throw new HttpException(409, `Login failed`);
    }

    return this._getSuccessfulUserAuthInfo(user, userData.clientInfoData, req);
  }

  public async verifyDesktopCompanionAdmin(usernameOrEmail: string, pinpass: string): Promise<User> {
    const normalizedUsername = String(usernameOrEmail || '')
      .trim()
      .toLowerCase();
    if (!normalizedUsername) {
      throw new HttpException(400, 'Username is required');
    }
    if (!pinpass) {
      throw new HttpException(400, 'PIN or password is required');
    }

    let user = await this.users.findByUsername(normalizedUsername);
    if (!user) {
      user = await this.users.findByEmail(normalizedUsername);
    }
    if (!user || user.deleted) {
      throw new HttpException(409, 'Login failed');
    }
    if (user.type !== UserType.admin) {
      throw new HttpException(403, 'Only admin users can modify browser protection');
    }

    const hashedPinpass = hashString(pinpass);
    if (user.pin !== hashedPinpass && user.password !== hashedPinpass) {
      throw new HttpException(409, 'Incorrect PIN or password');
    }

    return user;
  }
  // ROUTE-METHOD
  async createAccountUser(ctx: RequestContext, userData: CreateUserDto) {
    userData.username = userData.username.toLowerCase();
    checkUserName(userData.username);

    if (userData.displayedName) {
      userData.displayedName = userData.displayedName.trim();

      if (userData.displayedName.length > 1) checkDisplayedName(userData.displayedName);
    }

    return this._createUser(ctx, userData);
  }

  async _createUser(ctx: RequestContext, userData: CreateUserDto): Promise<User> {
    if (ctx.currentUserId && !(await ctx.isAdmin())) {
      throw new Error('Only admin can create users');
    }

    let {username, email, password, loginType, loginId, otherSettings, displayedName} = userData;
    const account = await ctx.getAccount();
    let userType = userData.type || UserType.admin;

    // Check if we have reached the max number of users for this account
    const accountLimits = await getDetailsByAccountType(account.accountType);
    const users = await this.users.listByAccountId(ctx.accountId);
    const userCount = users.length;

    const maxUsers = accountLimits?.maxUsers;
    if (userCount >= maxUsers) {
      throw Error(
        `The maximum number (${maxUsers}) of users has joined this account. Please upgrade your account to add more users.`,
      );
    }

    if (userData.username && (await this.userService._checkUsernameExists(userData.username))) {
      throw new Error(ERROR_MESSAGE.USERNAME_TAKEN);
    } else if (!userData.username) {
      ({username, displayedName} = await this._generateUniqueUsername());
    }

    if (!!userData.email && (await this.userService._checkEmailExists(userData.email))) {
      throw new Error(ERROR_MESSAGE.EMAIL_TAKEN);
    }

    // setup default options
    const options: UserOptions = {...DEFAULT_OPTIONS};
    let plugins = [];
    let dob = null;

    if (!!otherSettings?.['birthYear']) {
      dob = {
        y: otherSettings['birthYear'],
        m: otherSettings['birthMonth'] || 12,
      };
    }

    // Set some defaults for restricted users
    if (userData.type == UserType.restricted) {
      options.whitelistingEnabled = true;
      options.contentFilteringEnabled = true;
      plugins = ['default-youtube-no-distractions'];
    }

    options.logActivity = true;

    //encrypt password copy if requested to be stored
    let passwordCopy = undefined;
    if (userData.serverCopyOfPassword) {
      passwordCopy = encryptPassword(userData.serverCopyOfPassword);
    }

    const nowSt = new Date();
    const userId = 'u_' + uuidv4();

    let assignedLoginType = loginType || LoginType.internal;

    const newUser = await this.users.create({
      _id: userId,
      accountId: ctx.accountId,
      username: username,
      displayedName,
      email: email,
      password: password ? hashString(password) : null,
      passwordCopy: passwordCopy,
      type: userType,
      loginType: assignedLoginType,
      loginId: loginId,
      userData: userData ? userData.additionalInfo : null,
      dob: dob == null ? undefined : dob,
      options: options,
      updatedAt: nowSt,
      createdAt: nowSt,
      canPublishPublicly: false,
      verified: assignedLoginType != LoginType.internal ? true : false,
      plugins: plugins,
      deleted: false,
      disabled: false,
    });

    this.auditService.recordEvent({
      eventName: EventRecordName.CREATE_USER,
      eventType: EventRecordType.EXPLICIT,
      accountId: ctx.accountId,
      userId,
    });

    if (ctx.currentUserId == null) {
      ctx.currentUserId = userId;
    }
    ctx.cacheUser(newUser);

    try {
      await this.itemService._createDefaultQuickBarCollection(ctx, userId);
      await this.itemService._createDefaultSharedCollection(ctx, userId);
    } catch (e) {
      console.error('Error creating default collections', e);
    }

    if (newUser.loginType == LoginType.internal && !!newUser.email) {
      await this.userService.sendEmailVerification(ctx, newUser._id);
    }

    await this.notificationsService.sendUserJoinNotification(ctx, newUser, users);

    await this.friendService.checkFriendRequestsForNewAccount(ctx, userId, ctx.accountId, email);

    return newUser;
  }

  public async generateUniqueUsername(ctx: RequestContext) {
    return this._generateUniqueUsername();
  }

  private async _generateUniqueUsername() {
    let newNameInfo = generateUsernameAndDisplayedName();
    let usernameFound = false;
    for (let i = 0; i < 20; i++) {
      if (await this.userService._checkUsernameExists(newNameInfo.username)) {
        newNameInfo = generateUsernameAndDisplayedName();
      } else {
        usernameFound = true;
        break;
      }
    }

    // gen uuid if we can't find a unique username
    if (!usernameFound) {
      newNameInfo.username = 'u_' + uuidv4().replace(/-/g, '');
      newNameInfo.displayedName = 'User ' + newNameInfo.username.slice(2, 4);
    }

    return newNameInfo;
  }

  // ROUTE-METHOD
  async updatePassword(ctx: RequestContext, userId: string, rawPassword: string, passwordCopy: string | null) {
    await ctx.verifySelfOrAdminOverUser(userId);
    await this.users.updateWithId(userId, {
      password: hashString(rawPassword),
      passwordCopy: encryptPassword(passwordCopy),
    });

    // Kill outstanding tokens for this user. When changing your own password,
    // the session making the change stays signed in.
    const currentSessionId = ctx.request?.authInfo?.sessionId;
    const exceptSessionId = ctx.authUserId === userId ? currentSessionId : undefined;
    await SessionService.instance.revokeAllForUser(userId, 'password_changed', exceptSessionId);
  }

  // ROUTE-METHOD
  async checkPassword(ctx: RequestContext, targetUserId: string, password: string) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    const user = await ctx.getUserById(targetUserId);
    return !!user.password && secureCompareSecrets(user.password, hashString(password));
  }

  // ROUTE-METHOD
  async showStoredPassword(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    const user = await ctx.getUserById(targetUserId);

    if (user.passwordCopy != null) {
      return decryptPassword(user.passwordCopy);
    } else {
      return null;
    }
  }

  // ROUTE-METHOD
  // async setStoredPassword(
  //   ctx: RequestContext,
  //   targetUserId: string,
  //   password: string,
  //   passwordCopy: string
  // ) {
  //   await ctx.verifySelfOrAdminOverUser(targetUserId);
  //   const user = await ctx.getUserById(targetUserId);

  //   if (user.password != hashString(password) || passwordCopy == null) {
  //     throw new Error("Invalid password or password copy.");
  //   }

  //   await this.users.updateWithId(targetUserId, {
  //     passwordCopy: encryptPassword(passwordCopy),
  //   });
  // }

  // ROUTE-METHOD
  async saveRecoveryKeyOnServer(ctx: RequestContext, targetUserId: string, recoveryKey: string) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    await this.users.updateWithId(targetUserId, {
      recoveryKey: encryptPassword(recoveryKey),
    });
  }

  // ROUTE-METHOD
  async removeRecoveryKeyFromServer(
    ctx: RequestContext,
    targetUserId: string,
    request: RemoveRecoveryKeyFromServerRequest,
  ) {
    if (!ctx.currentUserId || targetUserId !== ctx.currentUserId) {
      throw new HttpException(403, 'This action is only available for the current user.');
    }

    const user = await ctx.getUserById(targetUserId);
    const passkeys = await this.passkeyService.listPasskeys(targetUserId);
    const hasPassword = !!user.password;
    const hasPasskeys = passkeys.length > 0;

    if (!hasPassword && !hasPasskeys) {
      throw new HttpException(400, 'Add a password or passkey before disabling Kindredly recovery.');
    }

    if (request.method === 'password') {
      if (!hasPassword || !request.password || !secureCompareSecrets(user.password, hashString(request.password))) {
        throw new HttpException(401, 'Verification failed.');
      }
    } else if (request.method === 'passkey') {
      if (!hasPasskeys || !request.passkey) {
        throw new HttpException(401, 'Verification failed.');
      }

      const authResult = await this.passkeyService.authenticatePasskey(request.passkey, {
        expectedOperation: 'remove-recovery-key',
        expectedUserId: targetUserId,
      });

      if (!authResult.success || !authResult.verified || authResult.userId !== targetUserId) {
        throw new HttpException(401, 'Verification failed.');
      }
    } else {
      throw new HttpException(400, 'Verification method is required.');
    }

    await this.users.updateWithId(targetUserId, {recoveryKey: null});
  }

  // ROUTE-METHOD
  async forceResetPassword(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    await this.users.updateWithId(targetUserId, {
      password: null,
      passwordCopy: null,
    });

    await SessionService.instance.revokeAllForUser(targetUserId, 'password_reset');
  }

  // ROUTE-METHOD
  async updatePIN(ctx: RequestContext, targetUserId: string, rawPin: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    await this.users.updateWithId(targetUserId, {pin: hashString(rawPin)});
  }

  // ROUTE-METHOD
  async resetPasswordRequest(uEmail: string) {
    const login = String(uEmail || '').trim();
    if (!login) {
      throw Error('Username or email is required.');
    }

    let user = null;
    if (login.includes('@')) {
      console.log('Getting user by email', login);
      user = await this.userService.getUserByEmail(login);
    } else {
      console.log('Getting user by username', login);
      user = await this.userService.getUserByUsername(login);
    }

    if (user) {
      if (!user.email || !user.email.includes('@')) {
        throw Error('User does not have a valid email.  Please contact Kindredly support.');
      }

      if (user.loginType != LoginType.internal) {
        throw Error('This user uses an external login and cannot have reset their password through Kindredly.');
      }

      const hasServerRecoveryMaterial = !!user.recoveryKey || !!user.passwordCopy;
      if (!hasServerRecoveryMaterial) {
        const verification = await this.verificationService._addVerification(
          10,
          VerificationType.accountRecovery,
          user._id,
          {
            userId: user._id,
            type: VerificationType.accountRecovery,
          },
        );

        const subject = 'Account Recovery (Kindredly.ai)';
        const body = RECOVER_ACCOUNT_ACCESS_MSG(user, verification, config);

        sendEmail([user.email], subject, body, MAIN_EMAIL_TEMPLATE);

        this.logRecoveryEmailForDev({
          flow: 'account-recovery',
          email: user.email,
          verificationCode: verification._id,
          subject,
          body,
        });

        return {
          requestAccepted: true,
          recoverable: false,
          nextStep: 'account-recovery' as const,
          reason: 'no_server_recovery_material' as const,
          message:
            'Password reset is disabled for this account because no recovery material is stored on the server. We sent a verification code so you can sign in and finish recovery with your saved recovery key.',
        };
      }

      const verification = await this.verificationService._addVerification(
        10,
        VerificationType.passwordReset,
        user._id,
        {
          userId: user._id,
          type: VerificationType.passwordReset,
        },
      );

      const subject = 'Password Reset (Kindredly.ai)';
      const body = RESET_PASSWORD_MSG(user, verification, config);

      sendEmail([user.email], subject, body, MAIN_EMAIL_TEMPLATE);

      this.logRecoveryEmailForDev({
        flow: 'password-reset',
        email: user.email,
        verificationCode: verification._id,
        subject,
        body,
      });

      return {
        requestAccepted: true,
        recoverable: true,
        nextStep: 'reset-password' as const,
      };
    } else {
      throw Error('No such user found.');
    }
  }

  // ROUTE-METHOD
  async recoverPassword(verificationCode: string) {
    const verification = await this.verificationService._getVerificationById(verificationCode);

    if (verification) {
      const data = verification?.data as any;
      if (!data) {
        throw Error('Invalid verification code');
      }
      const user = await this.users.findById(data.userId);
      if (!user || user.deleted || user.loginType == LoginType.google) {
        throw Error('Unable to reset password for this user.');
      }

      if (user.passwordCopy != null) {
        await this.verificationService._invalidateVerification(verificationCode);
        return decryptPassword(user.passwordCopy);
      } else {
        return null;
      }
    } else {
      throw Error('Invalid verification code');
    }
  }

  // ROUTE-METHOD
  async resetPassword(verificationCode: string, newPassword: string) {
    const verification = await this.verificationService._getVerificationById(verificationCode);

    if (verification) {
      const data = verification?.data as any;
      if (!data) {
        throw Error('Invalid verification code');
      }
      const user = await this.users.findById(data.userId);
      if (!user || user.deleted || user.loginType == LoginType.google) {
        throw Error('Unable to reset password for this user.');
      }
      await this.users.updateWithId(data.userId, {
        password: hashString(newPassword),
        passwordCopy: null,
      });
      await this.verificationService._invalidateVerification(verificationCode);

      // Email-link resets are the canonical "my account was compromised"
      // flow — kill every outstanding session for the user.
      await SessionService.instance.revokeAllForUser(data.userId, 'password_reset');
    } else {
      throw Error('Invalid verification code');
    }
  }

  // ROUTE-METHOD
  async recoverAccountAccess(verificationCode: string, clientInfoData: ClientInfoView, req: Request) {
    const verification = await this.verificationService._getVerificationById(verificationCode);

    if (!verification) {
      throw Error('Invalid verification code');
    }

    const data = verification?.data as any;
    if (!data || data.type !== VerificationType.accountRecovery) {
      throw Error('Invalid verification code');
    }

    const user = await this.users.findById(data.userId);
    if (!user || user.deleted || user.loginType != LoginType.internal) {
      throw Error('Unable to recover access for this user.');
    }

    const authInfo = await this._getSuccessfulUserAuthInfo(user, clientInfoData, req);
    await this.verificationService._invalidateVerification(verificationCode);
    return authInfo;
  }

  // ROUTE-METHOD
  public async switchUser(
    ctx: RequestContext,
    targetUserId: string,
    pinpass: string,
    clientInfoData: ClientInfoView,
  ): Promise<{
    findUser: User;
    tokenData: TokenData;
    passwordForClient: string;
    recoveryKeyForClient: string;
  }> {
    await ctx.verifyInAccount(targetUserId);

    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.accountId != ctx.accountId) throw Error('Failed to switch user, user not found');

    if (!pinpass || pinpass == '') {
      await ctx.verifyAdminOverUser(targetUserId);
    } else {
      const hashedPINPASS = hashString(pinpass);
      if (targetUser.pin != hashedPINPASS && targetUser.password != hashedPINPASS) {
        throw Error('Failed to switch user, incorrect password or PIN');
      }
    }

    await this.clientInfoService._loginUpdate(targetUser, clientInfoData, ctx.request);

    const tokenData = _createToken(targetUser);

    let passwordForClient = null;
    if (targetUser.passwordCopy != null) {
      passwordForClient = decryptPassword(targetUser.passwordCopy);
    }

    let recoveryKeyForClient = null;
    if (targetUser.recoveryKey != null) {
      recoveryKeyForClient = decryptPassword(targetUser.recoveryKey);
    }

    return {
      findUser: targetUser,
      tokenData,
      passwordForClient,
      recoveryKeyForClient,
    };
  }

  // ROUTE-METHOD
  public async getTokenLoginUser(
    targetUserId: string,
    clientInfoData: ClientInfoView,
    request: Request,
  ): Promise<{
    findUser: User;
    tokenData: TokenData;
    passwordForClient: string;
    recoveryKeyForClient: string;
  }> {
    const user = await this.userService.getUserById(targetUserId);

    await this.clientInfoService._loginUpdate(user, clientInfoData, request);

    const tokenData = _createToken(user);

    let passwordForClient = null;
    if (user.passwordCopy != null) {
      passwordForClient = decryptPassword(user.passwordCopy);
    }

    let recoveryKeyForClient = null;
    if (user.recoveryKey != null) {
      recoveryKeyForClient = decryptPassword(user.recoveryKey);
    }

    return {
      findUser: user,
      tokenData,
      passwordForClient,
      recoveryKeyForClient,
    };
  }

  // ROUTE-METHOD
  public async verifyUserPinPass(
    ctx: RequestContext,
    overrideUserId: string,
    pinpass: string,
  ): Promise<{overrideUserId: string; tokenData: TokenData}> {
    if (overrideUserId === ctx.currentUserId) {
      throw Error('cannot override the currently signed-in user');
    }
    await ctx.verifyInAccount(overrideUserId);

    const targetUser = await ctx.getUserById(overrideUserId);
    if (!targetUser || targetUser.accountId != ctx.accountId) throw Error('user not found');

    if (targetUser.type != UserType.admin) {
      throw Error('permission override requires an admin user');
    }

    const currentUser = await ctx.getCurrentUser();

    if (currentUser.type != UserType.admin || pinpass != null) {
      if (!pinpass || pinpass == '') {
        throw Error('pin or password required.');
      }
      const hashedPINPASS = hashString(pinpass);
      if (targetUser.pin != hashedPINPASS && targetUser.password != hashedPINPASS) {
        throw Error('incorrect password or PIN');
      }
    }
    const tokenData = _createTempToken(targetUser);
    return {overrideUserId: targetUser._id, tokenData};
  }

  public async createDesktopHandoffToken(ctx: RequestContext): Promise<{tokenData: TokenData}> {
    const currentUser = await ctx.getCurrentUser();
    const tokenData = _createTempToken(currentUser);
    return {tokenData};
  }

  // ROUTE-METHOD
  public async invalidateSession(ctx: RequestContext) {
    const sessionId = ctx.request?.authInfo?.sessionId;
    if (sessionId) {
      await SessionService.instance.revokeSession(sessionId, 'signout');
    }
  }

  /**
   * Revokes every session for a user except the caller's own (when acting on
   * themselves). Parent/admin acting on another user revokes all of them.
   */
  public async signoutEverywhere(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    const currentSessionId = ctx.request?.authInfo?.sessionId;
    const exceptSessionId = ctx.authUserId === targetUserId ? currentSessionId : undefined;
    return await SessionService.instance.revokeAllForUser(targetUserId, 'signout_everywhere', exceptSessionId);
  }

  private async _getSuccessfulUserAuthInfo(
    user: User,
    clientInfoData: Record<string, any>,
    req: Request,
  ): Promise<UserAuthInfo> {
    await this.clientInfoService._loginUpdate(user, clientInfoData, req);

    const tokenData = _createToken(user);

    let passwordForClient = null;
    if (user.passwordCopy != null) {
      passwordForClient = decryptPassword(user.passwordCopy);
    }

    let recoveryKeyForClient = null;
    if (user.recoveryKey != null) {
      recoveryKeyForClient = decryptPassword(user.recoveryKey);
    }

    return {
      findUser: user,
      tokenData,
      passwordForClient,
      recoveryKeyForClient,
    };
  }
}

export default AuthService;
