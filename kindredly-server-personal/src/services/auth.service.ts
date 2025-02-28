import { config } from "@/config";
import { AccountRepo } from "@/db/account.repo";
import { UserRepo } from "@/db/user.repo";
import User from "@/schemas/public/User";
import { getDetailsByAccountType } from "@/defaults/products_and_plans";
import { CreateUserDto } from "@dtos/users.dto";
import { HttpException } from "@exceptions/HttpException";
import { TokenData } from "@interfaces/auth.interface";
import { secureCompareSecrets, hashStringWithSalt, isEmpty } from "@/utils/crypto_util";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../utils/email_utils";
import FriendService from "./friend.service";
import ItemService from "./item.service";
import NotificationService from "./notification.service";
import EventAuditService from "./record_event.service";
import { RequestContext } from "../base/request_context";
import { checkDisplayedName, checkUserName, DEFAULT_OPTIONS } from "@/utils/user.utils";
import { MAIN_EMAIL_TEMPLATE } from '@/templates/email.templates';
import UserService from "./user.service";
import VerificationService from "./verification.service";
import {
  EventRecordName,
  EventRecordType,
  NotificationType,
} from "@/typing/enum_strings";
import {
  ERROR_MESSAGE,
  RESET_PASSWORD_MSG,
  THANK_YOU_FOR_JOINING_MSG,
  WELCOME_TITLE_MESSAGE,
} from "@/defaults/message_templates";
import {
  AccountType,
  ClientInfoView,
  LoginType,
  UserType,
  VerificationType,
} from "tset-sharedlib/shared.types";
import ClientInfoService from "./client_info.service";

import { generateUsernameAndDisplayedName } from '@/utils/user.utils';
import { UserAuthInfo } from "@/utils/auth_utils";


import {
  decryptPassword,
  encryptPassword
} from "@/utils/crypto_util";
import {
  _createTempToken,
  _createToken
} from "@/utils/auth_utils";
import { UserOptions } from "@/typing/usertypes";
import { logger } from "@/utils/logger";
import AuthValidatorService from "./_interfaces/auth_validator.service";
import { inject, injectable } from 'inversify';
import { TYPES } from "@/types";
import { container } from '@/inversify.config';

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
  constructor(@inject(TYPES.AuthValidatorService) private authValidatorService: AuthValidatorService) { }

  private users = new UserRepo();
  private accounts = new AccountRepo();
  private auditService = new EventAuditService();
  private notificationsService = container.resolve(NotificationService);
  private verificationService = new VerificationService();
  private userService = new UserService();
  private friendService = new FriendService();
  private itemService = new ItemService();
  private clientInfoService = new ClientInfoService();

  // ROUTE-METHOD
  public async registerAndSignin(
    userData: CreateUserDto,
    req: Request
  ): Promise<UserAuthInfo> {
    userData.loginType = userData.loginType || LoginType.internal;
    userData.type = userData.type || UserType.admin;

    const verificationCode = userData?.inviteVerification?.code;
    let accountId = null;

    //verify invite if exists
    if (verificationCode) {
      const inviteInfo = await this.verificationService.getFamilyInviteInfo(
        verificationCode
      );
      accountId = inviteInfo?.accountId
      if (!accountId) {
        throw new Error("Invalid Invite");
      }
    }

    await this.authValidatorService.validateUserCredentialsForRegistration(userData);

    await this._checkEmailExists(userData.email);

    let user: User = null;

    if (!!accountId) {
      logger.log("Creating User for existing account", userData.email);
      user = await this._createUser(new RequestContext({ accountId }), userData);
    } else {
      user = await this._createAccount(userData);
    }

    if (!user) {
      throw new HttpException(400, "Failed to create account");
    }

    try {
      if (verificationCode) {
        await this.verificationService._invalidateVerification(
          verificationCode
        );
      }
    } catch (e) { }

    return this._getSuccessfulUserAuthInfo(user, userData.clientInfoData, req);
  }



  private async _checkEmailExists(email: string) {
    if (!email) {
      return
    }
    const user = await this.users.findByEmail(email);

    if (!!user) {
      console.log("User exists with email!", email);
      throw new HttpException(
        400,
        `A user already exists with this email but with a login provider such as Google or Apple.`
      );
    }

  }

  public async _createAccount(userData: CreateUserDto): Promise<User> {
    if (isEmpty(userData)) throw new HttpException(400, "userData is empty");

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

    const accountId = "ac_" + uuidv4();
    await this.accounts.create({
      _id: accountId,
      options: {},
      createdAt: nowSt,
      updatedAt: nowSt,
      collectionCount: 0,
      userCount: 0,
      accountType: AccountType.standard,
      maxUsers: null,
      maxCollections: 500,
      maxItemsPerCollection: 100,
    });

    const createdUser = await this._createUser(
      new RequestContext({ accountId }),
      userData
    );

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
      }
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
  public async signin(
    userData: CreateUserDto,
    req: Request
  ): Promise<UserAuthInfo> {
    if (isEmpty(userData)) throw new HttpException(400, "userData is empty");

    userData.loginType = userData.loginType || LoginType.internal;

    // Verify and find user for each login type
    const { user, verified } = await this.authValidatorService.validateUserCredentials(userData);

    if (!user || user.deleted)
      throw new HttpException(409, `User not found `);
    else if (user.disabled) {
      throw new HttpException(409, "User account is locked");
    } else if (!verified) {
      throw new HttpException(409, `Login failed`);
    }

    return this._getSuccessfulUserAuthInfo(
      user,
      userData.clientInfoData,
      req
    );
  }

  // ROUTE-METHOD
  async createAccountUser(ctx: RequestContext,
    userData: CreateUserDto) {

    userData.username = userData.username.toLowerCase();
    checkUserName(userData.username);

    if (userData.displayedName) {
      userData.displayedName = userData.displayedName.trim();

      if (userData.displayedName.length > 1)
        checkDisplayedName(userData.displayedName);
    }

    return this._createUser(ctx, userData);

  }

  async _createUser(
    ctx: RequestContext,
    userData: CreateUserDto
  ): Promise<User> {
    if (ctx.currentUserId && !(await ctx.isAdmin())) {
      throw new Error("Only admin can create users");
    }

    let {
      username,
      email,
      password,
      loginType,
      loginId,
      otherSettings,
      displayedName,
    } = userData;
    const account = await ctx.getAccount();
    let userType = userData.type || UserType.admin;

    // Check if we have reached the max number of users for this account
    const accountLimits = await getDetailsByAccountType(
      account.accountType
    );
    const users = await this.users.listByAccountId(ctx.accountId);
    const userCount = users.length;

    const maxUsers = accountLimits?.maxUsers;
    if (userCount >= maxUsers) {
      throw Error(
        `The maximum number (${maxUsers}) of users has joined this account. Please upgrade your account to add more users.`
      );
    }

    if (
      userData.username &&
      (await this.userService._checkUsernameExists(userData.username))
    ) {
      throw new Error(ERROR_MESSAGE.USERNAME_TAKEN);
    }
    else if (!userData.username) {
      ({ username, displayedName } = await this._generateUniqueUsername(userData, username, displayedName));
    }

    if (!!userData.email &&
      (await this.userService._checkEmailExists(userData.email))) {
      throw new Error(ERROR_MESSAGE.EMAIL_TAKEN);
    }


    // setup default options
    const options: UserOptions = { ...DEFAULT_OPTIONS };
    let plugins = [];
    let dob = null;

    if (!!otherSettings?.["birthYear"]) {
      dob = {
        y: otherSettings["birthYear"],
        m: otherSettings["birthMonth"] || 12,
      };
    }

    // Set some defaults for restricted users
    if (userData.type == UserType.restricted) {
      options.whitelistingEnabled = true;
      plugins = ["default-youtube-no-distractions"];
    }

    options.logActivity = true;

    //encrypt password copy if requested to be stored
    let passwordCopy = undefined;
    if (userData.serverCopyOfPassword) {
      passwordCopy = encryptPassword(userData.serverCopyOfPassword);
    }

    const nowSt = new Date();
    const userId = "u_" + uuidv4();

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
      console.error("Error creating default collections", e);
    }

    if (newUser.loginType == LoginType.internal && !!newUser.email) {
      await this.userService.sendEmailVerification(ctx, newUser._id);
    }

    await this.notificationsService.sendUserJoinNotification(ctx, newUser, users);

    await this.friendService.checkFriendRequestsForNewAccount(
      ctx,
      userId,
      ctx.accountId,
      email
    );

    return newUser;
  }



  private async _generateUniqueUsername(userData: CreateUserDto, username: string, displayedName: string) {
    if (!userData.username) {
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
        newNameInfo.username = "u_" + uuidv4().replace(/-/g, "");
        newNameInfo.displayedName = "User " + newNameInfo.username.slice(2, 4);
      } else {
        username = newNameInfo.username;
        displayedName = newNameInfo.displayedName;
      }
    }
    return { username, displayedName };
  }

  // ROUTE-METHOD
  async updatePassword(
    ctx: RequestContext,
    userId: string,
    rawPassword: string,
    passwordCopy: string | null
  ) {
    await ctx.verifySelfOrAdminOverUser(userId);
    await this.users.updateWithId(userId, {
      password: hashString(rawPassword),
      passwordCopy: encryptPassword(passwordCopy),
    });
  }

  // ROUTE-METHOD
  async checkPassword(
    ctx: RequestContext,
    targetUserId: string,
    password: string
  ) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    const user = await ctx.getUserById(targetUserId);
    return user.password == hashString(password);
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
  async setStoredPassword(
    ctx: RequestContext,
    targetUserId: string,
    password: string,
    passwordCopy: string
  ) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    const user = await ctx.getUserById(targetUserId);

    if (user.password != hashString(password) || passwordCopy == null) {
      throw new Error("Invalid password or password copy.");
    }

    await this.users.updateWithId(targetUserId, {
      passwordCopy: encryptPassword(passwordCopy),
    });
  }

  // ROUTE-METHOD
  async clearStoredPassword(
    ctx: RequestContext,
    targetUserId: string,
    password: string
  ) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    const user = await ctx.getUserById(targetUserId);

    if (user.password != hashString(password)) {
      throw new Error("Invalid password");
    }

    await this.users.updateWithId(targetUserId, { passwordCopy: null });
  }

  // ROUTE-METHOD
  async saveRecoveryKeyOnServer(
    ctx: RequestContext,
    targetUserId: string,
    recoveryKey: string
  ) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    await this.users.updateWithId(targetUserId, {
      recoveryKey: encryptPassword(recoveryKey),
    });
  }

  // ROUTE-METHOD
  async removeRecoveryKeyFromServer(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    const user = await ctx.getUserById(targetUserId);

    await this.users.updateWithId(targetUserId, { recoveryKey: null });
  }

  // ROUTE-METHOD
  async forceResetPassword(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    await this.users.updateWithId(targetUserId, {
      password: null,
      passwordCopy: null,
    });
  }


  // ROUTE-METHOD
  async updatePIN(ctx: RequestContext, targetUserId: string, rawPin: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    await this.users.updateWithId(targetUserId, { pin: hashString(rawPin) });
  }


  // ROUTE-METHOD
  async resetPasswordRequest(uEmail: string) {
    let user = null;
    if (uEmail.includes("@")) {
      console.log("Getting user by email", uEmail);
      user = await this.userService.getUserByEmail(uEmail);
    } else {
      console.log("Getting user by username", uEmail);
      user = await this.userService.getUserByUsername(uEmail);
    }

    if (user) {
      if (!user.email || !user.email.includes("@")) {
        throw Error(
          "User does not have a valid email.  Please contact Kindredly support."
        );
      }

      if (user.loginType != LoginType.internal) {
        throw Error(
          "This user uses an external login and cannot have reset their password through Kindredly."
        );
      }

      const verification = await this.verificationService._addVerification(
        10,
        VerificationType.passwordReset,
        user._id,
        {
          userId: user._id,
          type: VerificationType.passwordReset,
        }
      );

      sendEmail(
        [user.email],
        "Password Reset (Kindredly.ai)",
        RESET_PASSWORD_MSG(user, verification, config),
        MAIN_EMAIL_TEMPLATE
      );

      return true;
    } else {
      throw Error("No such user found.");
    }
  }


  // ROUTE-METHOD
  async recoverPassword(verificationCode: string) {
    const verification = await this.verificationService._getVerificationById(
      verificationCode
    );

    if (verification) {
      const data = verification?.data as any;
      if (!data) {
        throw Error("Invalid verification code");
      }
      const user = await this.users.findById(data.userId);
      if (!user || user.deleted || user.loginType == LoginType.google) {
        throw Error("Unable to reset password for this user.");
      }

      if (user.passwordCopy != null) {
        await this.verificationService._invalidateVerification(
          verificationCode
        );
        return decryptPassword(user.passwordCopy);
      } else {
        return null;
      }
    } else {
      throw Error("Invalid verification code");
    }
  }


  // ROUTE-METHOD
  async resetPassword(verificationCode: string, newPassword: string) {
    const verification = await this.verificationService._getVerificationById(
      verificationCode
    );

    if (verification) {
      const data = verification?.data as any;
      if (!data) {
        throw Error("Invalid verification code");
      }
      const user = await this.users.findById(data.userId);
      if (!user || user.deleted || user.loginType == LoginType.google) {
        throw Error("Unable to reset password for this user.");
      }
      await this.users.updateWithId(data.userId, {
        password: hashString(newPassword),
        passwordCopy: null,
      });
      await this.verificationService._invalidateVerification(verificationCode);
    } else {
      throw Error("Invalid verification code");
    }
  }



  // ROUTE-METHOD
  public async switchUser(
    ctx: RequestContext,
    targetUserId: string,
    pinpass: string,
    clientInfoData: ClientInfoView
  ): Promise<{
    findUser: User;
    tokenData: TokenData;
    passwordForClient: string;
    recoveryKeyForClient: string;
  }> {
    await ctx.verifyInAccount(targetUserId);

    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.accountId != ctx.accountId)
      throw Error("Failed to switch user, user not found");


    if (!pinpass || pinpass == "") {
      await ctx.verifyAdminOverUser(targetUserId);
    }
    else {

      const hashedPINPASS = hashString(pinpass);
      if (
        targetUser.pin != hashedPINPASS &&
        targetUser.password != hashedPINPASS
      ) {
        throw Error("Failed to switch user, incorrect password or PIN");
      }
    }


    await this.clientInfoService._loginUpdate(
      targetUser,
      clientInfoData,
      ctx.request
    );

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
    request: Request
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
    targetUserId: string,
    pinpass: string
  ): Promise<{ targetUserId: string; tokenData: TokenData }> {
    await ctx.verifyInAccount(targetUserId);

    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.accountId != ctx.accountId)
      throw Error("user not found");

    const currentUser = await ctx.getCurrentUser();

    if (currentUser.type != UserType.admin || pinpass != null) {
      if (!pinpass || pinpass == "") {
        throw Error("pin or password required.");
      }
      const hashedPINPASS = hashString(pinpass);
      if (
        targetUser.pin != hashedPINPASS &&
        targetUser.password != hashedPINPASS
      ) {
        throw Error("incorrect password or PIN");
      }
    }
    const tokenData = _createTempToken(targetUser);
    return { targetUserId: targetUser._id, tokenData };
  }


  // ROUTE-METHOD
  public async invalidateSession(ctx: RequestContext) {
    //TODO
  }

  private async _getSuccessfulUserAuthInfo(
    user: User,
    clientInfoData: Record<string, any>,
    req: Request
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
