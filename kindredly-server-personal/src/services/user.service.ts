import { config } from "@/config";
import { AccountRepo } from "@/db/account.repo";
import { ItemFeedbackRepo } from "@/db/item_feedback.repo";
import { ReviewRepo } from "@/db/review.repo";
import { UserRepo } from "@/db/user.repo";
import { UserActivityRepo } from "@/db/user_activity.repo";
import { UserPermRepo } from "@/db/user_perm.repo";
import { UserPrefRepo } from "@/db/user_pref.repo";
import { UserPublicRepo } from "@/db/user_public.repo";
import User from "@/schemas/public/User";
import { MAIN_EMAIL_TEMPLATE } from '@/templates/email.templates';
import {
  getUserProfileInfo,
  prepUserForTransport,
  removeSensitiveInfoFromUser,
} from "@/utils/auth_utils";
import { checkUserName } from '@/utils/user.utils';
import { UserType, VerificationType } from "tset-sharedlib/shared.types";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../utils/email_utils";
import FriendService from "./friend.service";
import { RequestContext } from "../base/request_context";
import UserFileService from "./user_file.service";
import VerificationService from "./verification.service";
import {container} from '@/inversify.config';

const publicAttributes = ["username", " fullName", "enabled", "about", "profileImage"];

class UserService {
  private userRepo = new UserRepo();
  private usersPublic = new UserPublicRepo();

  private itemFeedbackRepo = new ItemFeedbackRepo();
  private userActivityRepo = new UserActivityRepo();
  private permissionsRepo = new UserPermRepo();
  private reviewsRepo = new ReviewRepo();
  private userPref = new UserPrefRepo();
  private friendService = new FriendService();
  private fileService = container.resolve(UserFileService);

  private verficationService = new VerificationService();

  async getUserInfo(ctx: RequestContext, userId: string) {
    await ctx.verifyInAccount(userId);
    let user = await ctx.getUserById(userId);
    if (!user || user.deleted) return null;

    prepUserForTransport(user);

    return removeSensitiveInfoFromUser(user);
  }

  async getUserById(id: string, includedDeleted = false) {
    if (!id) return null;

    const user = await this.userRepo.findById(id);
    if (!user || (user.deleted && !includedDeleted)) return null;
    return user;
  }


  // ROUTE-METHOD
  async getUserProfileById(
    ctx: RequestContext,
    viewAsUserId: string | undefined,
    id: string
  ) {
    viewAsUserId = viewAsUserId || ctx.currentUserId;
    await ctx.verifySelfOrAdmin(viewAsUserId);

    const user = await this.getUserById(id);
    if (!user) throw new Error("User not found");
    // same account?
    const viewingUser = await ctx.getUserById(viewAsUserId);
    let relationship = null;
    if (viewingUser.accountId !== user.accountId) {
      //check if friend
      const areFriends = await this.friendService.checkFriendship(
        viewingUser._id,
        id
      );
      if (areFriends) {
        relationship = "friend";
      }
    } else {
      relationship = "account";
    }

    if (!relationship) {
      throw new Error("User not found");
    }
    const userProfile = getUserProfileInfo(user);
    return { ...userProfile, relationship };
  }

  async _checkUsernameExists(username) {
    if (!username) return true;
    let result = await this.getUserByUsername(username);
    if (!result) {
      result = await this.getUserByEmail(username);
      return !!result;
    } else {
      return true;
    }
  }

  async _checkEmailExists(email: string) {
    if (!email) return true;
    const result = await this.getUserByEmail(email);
    return !!result;
  }

  //  ROUTE-METHOD
  async getUserPublicProfileById(id: string) {
    return await this.usersPublic.findById(id);
  }

  // ROUTE-METHOD
  // DEV-ONLY
  async debugUser(ctx: RequestContext, data = null) {
    const user = await ctx.getCurrentUser();

    const emailUser = await this.userRepo.findMany({ email: user.email });

    return emailUser;
  }

  // ROUTE-METHOD
  async getMyPublicProfile(ctx: RequestContext) {
    const user = await ctx.getCurrentUser();
    let publicId = user.publicId;
    if (!publicId) {
      return null;
    }

    return await this.usersPublic.findById(publicId);
  }
  async updateUserPublicProfile(ctx: RequestContext, data) {
    const user = await ctx.getCurrentUser();
    let publicId = user.publicId;
    if (!publicId) {
      publicId = uuidv4();
    }

    let record = {};
    for (let attr of publicAttributes) {
      if (data[attr] != null) {
        record[attr] = data[attr];
      }
    }
    record["updatedAt"] = new Date();

    // check if username is valid
    if (data.username) {
      if (data.username.length < 6) {
        throw new Error("Username must be at least 6 characters");
      }
    }

    const publicUser = await this.usersPublic.findById(publicId);

    if (data.username) {
      const existingWithUserName = await this.usersPublic.findMany({
        username: data.username,
      });
      if (
        existingWithUserName.length > 0 &&
        existingWithUserName[0]._id != publicId
      ) {
        throw new Error("Username already taken");
      }
    }

    if (publicUser) {
      if (publicUser.blockedAt != null) {
        throw new Error("Public Profile is blocked by an admin, cannot update");
      }

      await this.usersPublic.updateWithId(publicId, {
        ...publicUser,
        ...record,
      });
    } else {
      await this.usersPublic.create({ ...record, _id: publicId });
      await this.userRepo.updateWithId(user._id, { publicId });
    }

    return record;
  }


  // Route Method
  async getUsersForAccount(ctx:RequestContext){
    const users = await this._getUsers(ctx.accountId);
    for (const user of users) {
      user['hasPassword'] = !!user['password'];
      user['hasPin'] = !!user['pin'];
      removeSensitiveInfoFromUser(user);
    }
    return users;
  }
  

  async _getUsers(accountId) {
    const users = await this.userRepo.where({ accountId });

    return users.filter((v: User) => !v.deleted);
  }

  async getCurrentUserInfo(ctx: RequestContext) {
    const user = await ctx.getCurrentUser();

    if (!user || user.accountId != ctx.accountId) {
      throw new Error("No such user");
    }

    this.updateLastActiveAt(ctx);
    return user;
  }

  updateLastActiveAt(ctx: RequestContext) {
    const currentUserId = ctx.currentUserId;
    this.userRepo
      .updateWithId(currentUserId, { lastActiveAt: new Date() })
      .catch((error) => {
        // Handle error
      });
  }

  async getUserByUsername(username, includedDeleted = false) {
    const result = await this.userRepo.where({ username }).first();
    if (!includedDeleted && result?.deleted) return null;
    return result;
  }

  async getUserByEmail(email: string) {
    return await this.userRepo.where({ email }).first();
  }

  async getUserByPublicId(publicId: string) {
    return this.userRepo.where({ publicId }).first();
  }

  // ROUTE-METHOD
  async setUserOptions(
    ctx: RequestContext,
    targetUserId: string,
    options: any
  ) {
    await ctx.verifyAdminPermissions(targetUserId);
    const targetUser = await ctx.getUserById(targetUserId);
    const updatedOptions = {
      ...(targetUser.options as Record<string, unknown>),
      ...options,
    };
    await this._updateUserWithId(targetUserId, { options: updatedOptions });
    return null;
  }


  // ROUTE-METHOD
  async updateProfileImage(
    ctx: RequestContext,
    targetUserId: string,
    imageData: any
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);
    if (imageData.type == "path") {
      if (!imageData.data.startsWith("/") || imageData.data.length > 60) {
        throw new Error("Invalid path");
      }
    } else if (imageData.type == "data") {
      if (
        imageData.data.fileData.length > 1000000 ||
        imageData.data.imagePreview.length > 1000000
      ) {
        throw new Error("Image too large");
      }

      let { fileData, imagePreview, imageType } = imageData.data;
      const fileName = `${targetUserId}.${imageType}`;
      const fileNamePre = `${targetUserId}_pre.${imageType}`;

      if (fileData.startsWith("data:image")) fileData = fileData.split(",")[1];

      if (imagePreview.startsWith("data:image"))
        imagePreview = imagePreview.split(",")[1];
      await this.fileService.fileAccessProvider.uploadUserFileData(
        fileData,
        "userprofile",
        "default",
        fileName
      );
      await this.fileService.fileAccessProvider.uploadUserFileData(
        imagePreview,
        "userprofile",
        "default",
        fileNamePre
      );

      imageData.data = null;
      imageData.type = "imageFile";
      imageData.data = { imageId: targetUserId, imageType };
    } else {
      throw new Error("Invalid image type");
    }
    await this._updateUserWithId(targetUserId, { profileImage: imageData });
    return null;
  }


  private async _updateUserWithId(
    userId: string,
    data: Record<string, unknown>
  ) {
    await this.userRepo.where({ _id: userId }).update(data);
    return null;
  }

  async purgeUser(user) {
    if (!user) return "user not found";
    console.log("Purging user ", user._id);

    await this.itemFeedbackRepo.deleteWhere({ userId: user._id });
    await this.userActivityRepo.deleteWhere({ userId: user._id });
    await this.permissionsRepo.deleteWhere({ userId: user._id });
    await this.reviewsRepo.deleteWhere({ userId: user._id });
    await this.usersPublic.deleteWhere({ _id: user.publicId });
    await this.userRepo.deleteWhere({ _id: user._id });

    // await this.db.getItemFeedbackTable().deleteWhere({ userId: user._id });
    // await this.db.getUserActivityTable().deleteWhere({ userId: user._id });
    // await this.db.getPermissionsTable().deleteWhere({ userId: user._id });
    // await this.db.getReviewTable().deleteWhere({ userId: user._id });
    // if (user.publicId)
    //     await this.db.getUserPublicTable().removeById(user.publicId);
    // await this.db.getUserTable().removeById(user._id);
  }

  // ROUTE-METHOD
  async setUserType(ctx: RequestContext, userId, type) {
    await ctx.verifySelfOrAdmin(userId);

    if (ctx.currentUserId == userId)
      throw new Error("Cannot change your own user type");
    const user = await this.getUserById(userId);
    const currentUser = await ctx.getCurrentUser();
    if (user.accountId != ctx.accountId || currentUser.type != "admin")
      throw new Error("Something went wrong");
    await this._updateUserWithId(userId, { type: type });
  }

  // ROUTE-METHOD
  async setEmail(ctx: RequestContext, targetUserId: string, email: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const targetUser = await this.getUserById(targetUserId);

    if (!email && targetUser.type != UserType.restricted) {
      throw new Error("Email cannot be empty");
    }

    await this._updateUserWithId(targetUserId, {
      email,
      verified: false,
      emailChangedAt: new Date(),
    });
    if (!!email) await this.sendEmailVerification(ctx, targetUserId);
  }

  // ROUTE-METHOD
  async sendEmailVerification(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    const user = await this.getUserById(targetUserId);
    if (!user) throw new Error("User not found");
    if (!user.email) throw new Error("User has no email address");
    if (user.verified) throw new Error("Email already verified");

    const verification = await this.verficationService._addVerification(
      10,
      VerificationType.confirmEmail,
      targetUserId,
      {
        userId: targetUserId,
        type: "verifyemail",
        email: user.email,
      }
    );
    const verificationLink = `${config.serverHostname}/verifyemail/${verification._id}`;
    sendEmail(
      [user.email],
      "Verify your email",
      `Click here to verify your email: <a href="${verificationLink}">${verificationLink}</a><br/><br/> This link will expire in 10 minutes.`,
      MAIN_EMAIL_TEMPLATE
    );
  }

  async setDisplayedName(
    ctx: RequestContext,
    targetUserId: string,
    displayedName: string
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);
    displayedName = displayedName.trim();
    if (displayedName.length < 3 && displayedName.length > 8) {
      throw new Error("Displayed name must be between 3 and 12 characters");
    }

    await this._updateUserWithId(targetUserId, { displayedName });
  }

  // ROUTE-METHOD
  async updateUsername(
    ctx: RequestContext,
    targetUserId: string,
    username: string
  ) {
    await ctx.verifyAdminPermissions(targetUserId);

    if (!username || username.length < 6) {
      throw new Error("Username must be at least 6 characters");
    }
    username = username.trim().toLowerCase();

    checkUserName(username);
    if (await this._checkUsernameExists(username)) {
      throw new Error("Username is already taken");
    }

    await this._updateUserWithId(targetUserId, { username });
  }

  // ROUTE-METHOD
  async getUserPrefsDefaults(
    ctx: RequestContext,
    targetUserId: string,
    key: string
  ) {
    return this.userPref.defaults[key];
  }

  // ROUTE-METHOD
  async getUserPrefs(
    ctx: RequestContext,
    targetUserId: string,
    keys: string[] = null
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);

    if (!keys) {
      return await this.userPref._addPrefDefaults(
        await this.userPref.where({ userId: targetUserId }),
        keys
      );
    } else {
      return this.userPref._addPrefDefaults(
        await this.userPref
          .where({ userId: targetUserId })
          .whereIn("key", keys),
        keys
      );
    }
  }

  // ROUTE-METHOD
  async getUserPrefsValue(
    ctx: RequestContext,
    targetUserId: string,
    key: string
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);

    if (!key) {
      throw new Error("Key is required");
    } else {
      return await this.userPref.where({ userId: targetUserId, key });
    }
  }

  // ROUTE-METHOD
  async updateUserPrefs(
    ctx: RequestContext,
    targetUserId: string,
    updates: Record<string, unknown>
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);

    for (const key in updates) {
      const value = updates[key];
      const id = this.userPref.prefId(targetUserId, key);

      await this.userPref.save({
        _id: id,
        userId: targetUserId,
        key: key,
        value: value,
        updatedAt: new Date(),
      });
    }

    return null;
  }


  // ROUTE-METHOD
  // TODO: Account owner?
  async softDeleteUser(ctx: RequestContext, userIdToDelete) {
    if (!(await ctx.isAdmin())) {
      throw new Error("You must be an admin to delete a user");
    }
    await ctx.verifyAdminPermissions(userIdToDelete);

    const user = await this.getUserById(userIdToDelete);
    const users = await this._getUsers(user.accountId);
    if (users.length > 1) {
      let hasAdmin = false;
      for (const u of users) {
        if (user._id != u._id && u.type == "admin" && !u.deleted)
          hasAdmin = true;
      }
      if (!hasAdmin)
        throw Error(
          "Your current account has other users.  At least one user in your account must be an Admin before you can continue.  You must do one of the following before continuing, make an existing 'restricted user' an 'admin user'.  Migrate or delete all other users in this account."
        );
    }

    await this._updateUserWithId(userIdToDelete, {
      accountId: `deleted_` + user.accountId,
      email: `deleted_${userIdToDelete}_` + user.email,
      username: `deleted_${userIdToDelete}_` + user.username,
      loginId: `deleted_${userIdToDelete}_` + user.loginId,

      deleted: true,
    });

    return true;
  }



  async disableUser(ctx: RequestContext, userIdToDisable) {
    const user = await this.getUserById(userIdToDisable);
    const currentUser = await ctx.getCurrentUser();
    if (user.accountId != ctx.accountId && currentUser.type == "admin") {
      throw new Error("Something went wrong");
    }

    const users = await this._getUsers(user.accountId);
    if (users.length > 1) {
      let hasAdmin = false;
      for (const u of users) {
        if (user._id != u._id && u.type == "admin" && !u.deleted)
          hasAdmin = true;
      }
      if (!hasAdmin)
        throw Error(
          "Your current account has other users.  At least one user in your account must be an Admin before you can continue.  You must do one of the following before continuing, make an existing 'restricted user' an 'admin user'.  Migrate or delete all other users in this account."
        );
    }

    await this._updateUserWithId(user._id, { disabled: true });
  }

}

export default UserService;
