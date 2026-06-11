import {config} from '@/config';
import {AccountRepo} from '@/db/account.repo';
import {ItemFeedbackRepo} from '@/db/item_feedback.repo';
import {ReviewRepo} from '@/db/review.repo';
import {UserRepo} from '@/db/user.repo';
import {UserActivityRepo} from '@/db/user_activity.repo';
import {UserPermRepo} from '@/db/user_perm.repo';
import {UserPrefRepo} from '@/db/user_pref.repo';
import {UserPublicRepo} from '@/db/user_public.repo';
import {UserShowcaseRepo} from '@/db/user_showcase.repo';
import {PublishedRepo} from '@/db/published.repo';
import User from 'tset-sharedlib/schemas/public/User';
import {MAIN_EMAIL_TEMPLATE} from '@/templates/email.templates';
import {getUserProfileInfo, prepUserForTransport, removeSensitiveInfoFromUser} from '@/utils/auth_utils';
import {checkUserName} from '@/utils/user.utils';
import {
  isOfficialPublisherId,
  OFFICIAL_PUBLISHER_ABOUT,
  OFFICIAL_PUBLISHER_FULL_NAME,
  OFFICIAL_PUBLISHER_PUBLIC_ID,
  OFFICIAL_PUBLISHER_USERNAME,
} from 'tset-sharedlib/constants';
import {UserType, VerificationType} from 'tset-sharedlib/shared.types';
import {UpdatePublicProfileRequest} from 'tset-sharedlib/api';
import type {CopyUserSettingsRequest, CopyUserSettingsResponse, UserSettingsCopyGroup} from 'tset-sharedlib/api';
import {isUnderAge} from 'tset-sharedlib/date.utils';
import type UserPublic from 'tset-sharedlib/schemas/public/UserPublic';
import {
  buildContentFilteringCopySnapshot,
  buildUsageLimitsCopySnapshot,
  buildWebsiteSettingsCopySnapshot,
  USER_SETTINGS_COPY_FILTERING_PREF_KEYS,
  USER_SETTINGS_COPY_WEBSITE_PREF_KEYS,
} from 'tset-sharedlib/restrictions/userSettingsCopy';
import {v4 as uuidv4} from 'uuid';
import {sendEmail} from '../utils/email_utils';
import FriendService from './friend.service';
import {RequestContext} from '../base/request_context';
import UserFileService from './user_file.service';
import VerificationService from './verification.service';
import {container} from '@/inversify.config';
import SSEManager from './sse.manager';

const publicAttributes = ['username', 'fullName', 'enabled', 'about', 'profileImage'];

const ALLOWED_USER_SETTINGS_COPY_GROUPS: UserSettingsCopyGroup[] = [
  'contentFiltering',
  'usageLimits',
  'websiteSettings',
];

const OFFICIAL_PUBLISHER_CREATED_AT = new Date('2023-01-01T00:00:00.000Z');

class UserService {
  private userRepo = new UserRepo();
  private usersPublic = new UserPublicRepo();
  private userShowcaseRepo = new UserShowcaseRepo();
  private publishedRepo = new PublishedRepo();

  private itemFeedbackRepo = new ItemFeedbackRepo();
  private userActivityRepo = new UserActivityRepo();
  private permissionsRepo = new UserPermRepo();
  private reviewsRepo = new ReviewRepo();
  private userPref = new UserPrefRepo();
  private friendService = new FriendService();
  private sseManager = SSEManager.getInstance();
  private fileService = container.resolve(UserFileService);

  private verficationService = new VerificationService();

  private buildOfficialPublisherProfile(): UserPublic {
    return {
      _id: OFFICIAL_PUBLISHER_PUBLIC_ID,
      username: OFFICIAL_PUBLISHER_USERNAME,
      fullName: OFFICIAL_PUBLISHER_FULL_NAME,
      about: OFFICIAL_PUBLISHER_ABOUT,
      enabled: true,
      profileImage: null,
      curator: false,
      verifiedType: 'official',
      verifiedContext: {source: 'published_official_profile'},
      createdAt: OFFICIAL_PUBLISHER_CREATED_AT,
      updatedAt: OFFICIAL_PUBLISHER_CREATED_AT,
    };
  }

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
    viewAsUserId: string | undefined, // so parent can see childs friends
    userId: string,
  ) {
    viewAsUserId = viewAsUserId || ctx.currentUserId;
    await ctx.verifySelfOrAdmin(viewAsUserId);

    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    // same account?
    const viewingUser = await ctx.getUserById(viewAsUserId);
    let relationship = null;
    if (viewingUser.accountId !== user.accountId) {
      //check if friend
      const areFriends = await this.friendService.checkFriendship(viewingUser._id, userId);
      if (areFriends) {
        relationship = 'friend';
      }
    } else {
      relationship = 'account';
    }

    if (!relationship) {
      throw new Error('User not found');
    }
    const userProfile = getUserProfileInfo(user);
    return {...userProfile, relationship};
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
    if (isOfficialPublisherId(id)) {
      return this.buildOfficialPublisherProfile();
    }

    return await this.usersPublic.findById(id);
  }

  // ROUTE-METHOD
  async getMyShowcase(ctx: RequestContext) {
    const user = await ctx.getCurrentUser();
    const row = await this.userShowcaseRepo.findById(user._id);
    const entries = (Array.isArray((row as any)?.entries) ? (row as any).entries : null) as Array<any> | null;
    const publishIds = (Array.isArray((row as any)?.publishIds) ? (row as any).publishIds : []) as string[];
    return {
      entries:
        entries ||
        publishIds.map((id) => ({
          publishId: id,
        })),
      config: ((row as any)?.config || null) as any,
      publicEnabled: !!row?.publicEnabled,
    };
  }

  // ROUTE-METHOD
  async updateMyShowcase(
    ctx: RequestContext,
    data: {
      entries?: Array<{publishId: string; addedAtMs?: number; label?: string | null; groupId?: string | null}>;
      publishIds?: string[];
      config?: Record<string, any> | null;
      publicEnabled?: boolean;
    },
  ) {
    const user = await ctx.getCurrentUser();

    const inputEntries: Array<{publishId: string; addedAtMs?: number; label?: string | null; groupId?: string | null}> =
      Array.isArray(data.entries)
        ? data.entries
        : Array.isArray(data.publishIds)
          ? data.publishIds.map((id) => ({publishId: id, addedAtMs: undefined, label: null, groupId: null}))
          : [];

    const normalizedEntries = inputEntries
      .filter((e) => e && typeof e.publishId === 'string' && e.publishId.length > 0)
      .map((e) => ({
        publishId: e.publishId,
        addedAtMs: typeof e.addedAtMs === 'number' ? e.addedAtMs : undefined,
        label: e.label ?? null,
        groupId: e.groupId ?? null,
      }));

    // Preserve order but enforce uniqueness by publishId.
    const seen = new Set<string>();
    const uniqueEntries: typeof normalizedEntries = [];
    for (const e of normalizedEntries) {
      if (seen.has(e.publishId)) continue;
      seen.add(e.publishId);
      uniqueEntries.push(e);
      if (uniqueEntries.length >= 200) break;
    }

    const candidateIds = uniqueEntries.map((e) => e.publishId);

    // Only allow showcasing the current user's own published collections.
    const rows = candidateIds.length > 0 ? await this.publishedRepo.findWhereIdsIn(candidateIds) : [];
    const ownedIds = new Set(
      (rows || [])
        .filter((r: any) => {
          if (!r || !r.published) return false;
          if (r.type !== 'col') return false;
          if (r.ownerUserId && r.ownerUserId === user._id) return true;
          if (user.publicId && r.publicUserId && r.publicUserId === user.publicId) return true;
          return false;
        })
        .map((r: any) => r._id),
    );

    const finalEntries = uniqueEntries.filter((e) => ownedIds.has(e.publishId));
    const now = new Date();
    await this.userShowcaseRepo.save({
      _id: user._id,
      userId: user._id,
      entries: finalEntries as any,
      config: (data.config || null) as any,
      publicEnabled: data.publicEnabled == null ? false : !!data.publicEnabled,
      updatedAt: now,
    });
  }

  // ROUTE-METHOD
  async getShowcaseByPublicId(ctx: RequestContext, publicId: string) {
    if (!publicId) return {entries: [] as any[], config: null as any};

    const user = await this.getUserByPublicId(publicId);
    if (!user || user.deleted) return {entries: [] as any[], config: null as any};

    // If the viewer is authenticated and in the user's network (friend/family), allow viewing
    // even if the public profile is disabled or the showcase isn't enabled publicly.
    let viewerCanSeePrivate = false;
    if (ctx.currentUserId) {
      try {
        viewerCanSeePrivate = await ctx.isInNetwork(user._id);
      } catch (_e) {
        viewerCanSeePrivate = false;
      }
    }

    if (!viewerCanSeePrivate) {
      const publicProfile = await this.usersPublic.findById(publicId);
      if (!publicProfile?.enabled) return {entries: [] as any[], config: null as any};
    }

    const row = await this.userShowcaseRepo.findById(user._id);
    if (!row) return {entries: [] as any[], config: null as any};
    if (!viewerCanSeePrivate && !row.publicEnabled) return {entries: [] as any[], config: null as any};

    const entries = (Array.isArray((row as any)?.entries) ? (row as any).entries : null) as Array<any> | null;
    const publishIds = (Array.isArray((row as any)?.publishIds) ? (row as any).publishIds : []) as string[];

    return {
      entries:
        entries ||
        publishIds.map((id) => ({
          publishId: id,
        })),
      config: ((row as any)?.config || null) as any,
    };
  }

  // ROUTE-METHOD
  // Used for in-app profile views where the viewer is authenticated (friends/family/self).
  async getShowcaseByUserId(ctx: RequestContext, userId: string) {
    if (!userId) return {entries: [] as any[], config: null as any};

    const viewerId = ctx.currentUserId;
    if (!viewerId) return {entries: [] as any[], config: null as any};

    const targetUser = await this.getUserById(userId);
    if (!targetUser || targetUser.deleted) return {entries: [] as any[], config: null as any};

    // Same account OR confirmed friends OR self.
    let allowed = viewerId === userId;
    if (!allowed) {
      try {
        const viewer = await ctx.getCurrentUser();
        allowed = viewer?.accountId === targetUser.accountId;
      } catch (_e) {
        allowed = false;
      }
    }

    if (!allowed) {
      allowed = await this.friendService.checkFriendship(viewerId, userId);
    }

    if (!allowed) {
      // Do not leak whether a showcase exists.
      return {entries: [] as any[], config: null as any};
    }

    const row = await this.userShowcaseRepo.findById(userId);
    if (!row) return {entries: [] as any[], config: null as any};

    const entries = (Array.isArray((row as any)?.entries) ? (row as any).entries : null) as Array<any> | null;
    const publishIds = (Array.isArray((row as any)?.publishIds) ? (row as any).publishIds : []) as string[];

    return {
      entries:
        entries ||
        publishIds.map((id) => ({
          publishId: id,
        })),
      config: ((row as any)?.config || null) as any,
    };
  }

  // ROUTE-METHOD
  // DEV-ONLY
  async debugUser(ctx: RequestContext, data = null) {
    const user = await ctx.getCurrentUser();

    const emailUser = await this.userRepo.findMany({email: user.email});

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
  async updateUserPublicProfile(ctx: RequestContext, data: UpdatePublicProfileRequest) {
    const user = await ctx.getCurrentUser();
    let publicId = user.publicId;
    if (!publicId) {
      publicId = uuidv4();
    }

    if (isOfficialPublisherId(publicId)) {
      throw new Error('Reserved public profile id');
    }

    let record = {};
    for (let attr of publicAttributes) {
      if (data[attr] != null) {
        record[attr] = data[attr];
      }
    }
    record['updatedAt'] = new Date();

    // check if username is valid
    if (data.username) {
      if (data.username.length < 6) {
        throw new Error('Username must be at least 6 characters');
      }
    }

    const publicUser = await this.usersPublic.findById(publicId);

    if (data.username) {
      const existingWithUserName = await this.usersPublic.findMany({
        username: data.username,
      });
      if (existingWithUserName.length > 0 && existingWithUserName[0]._id != publicId) {
        throw new Error('Username already taken');
      } /* The above code is a TypeScript function that updates a user's public profile. */
    }

    if (publicUser) {
      if (publicUser.blockedAt != null) {
        throw new Error('Public Profile is blocked by an admin, cannot update');
      }

      await this.usersPublic.updateWithId(publicId, {
        ...publicUser,
        ...record,
      });
    } else {
      await this.usersPublic.create({...record, _id: publicId});
      await this.userRepo.updateWithId(user._id, {publicId});
    }

    return publicId;
  }

  // Route Method
  async getUsersForAccount(ctx: RequestContext) {
    const users = await this._getUsers(ctx.accountId);
    for (const user of users) {
      user['hasPassword'] = !!user['password'];
      user['hasPin'] = !!user['pin'];
      removeSensitiveInfoFromUser(user);
    }
    return users;
  }

  async _getUsers(accountId) {
    const users = await this.userRepo.where({accountId});

    return users.filter((v: User) => !v.deleted);
  }

  async getCurrentUserInfo(ctx: RequestContext) {
    const user = await ctx.getCurrentUser();

    if (!user || user.accountId != ctx.accountId) {
      throw new Error('No such user');
    }

    this.updateLastActiveAt(ctx);
    return user;
  }

  updateLastActiveAt(ctx: RequestContext) {
    const currentUserId = ctx.currentUserId;
    this.userRepo.updateWithId(currentUserId, {lastActiveAt: new Date()}).catch((error) => {
      // Handle error
    });
  }

  async getUserByUsername(username, includedDeleted = false) {
    const result = await this.userRepo.where({username}).first();
    if (!includedDeleted && result?.deleted) return null;
    return result;
  }

  async getUserByEmail(email: string) {
    return await this.userRepo.where({email}).first();
  }

  async getUserByPublicId(publicId: string) {
    if (isOfficialPublisherId(publicId)) {
      return null;
    }

    return this.userRepo.where({publicId}).first();
  }

  private broadcastUserSettingsRefresh(
    targetUserId: string,
    refreshHints: {
      refreshCurrentUser?: boolean;
      refreshUserPrefs?: boolean;
      source: 'options-update' | 'prefs-update' | 'settings-copy';
    },
  ) {
    if (!refreshHints.refreshCurrentUser && !refreshHints.refreshUserPrefs) {
      return;
    }

    this.sseManager.broadcastToUser(targetUserId, 'userOptionsUpdate', refreshHints).catch((e) => {
      console.error('Error broadcasting user settings refresh via SSE', e, {
        targetUserId,
        source: refreshHints.source,
      });
    });
  }

  // ROUTE-METHOD
  async setUserOptions(ctx: RequestContext, targetUserId: string, options: any) {
    await ctx.verifyAdminPermissions(targetUserId);
    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.deleted) {
      throw new Error('User not found');
    }

    const updatedOptions = this._mergeUserOptions(targetUser, options);

    await this._updateUserWithId(targetUserId, {options: updatedOptions});
    this.broadcastUserSettingsRefresh(targetUserId, {
      refreshCurrentUser: true,
      refreshUserPrefs: false,
      source: 'options-update',
    });

    return null;
  }

  async copyUserSettings(ctx: RequestContext, input: CopyUserSettingsRequest): Promise<CopyUserSettingsResponse> {
    const sourceUserId = String(input?.sourceUserId || '').trim();
    const targetUserId = String(input?.targetUserId || '').trim();

    if (!sourceUserId || !targetUserId) {
      throw new Error('Source and target users are required');
    }
    if (sourceUserId === targetUserId) {
      throw new Error('Source and target users must be different');
    }

    const groups = Array.from(
      new Set(
        (Array.isArray(input?.groups) ? input.groups : []).filter((group): group is UserSettingsCopyGroup =>
          ALLOWED_USER_SETTINGS_COPY_GROUPS.includes(group as UserSettingsCopyGroup),
        ),
      ),
    );

    if (groups.length === 0) {
      throw new Error('At least one settings group is required');
    }

    await ctx.verifyAdminPermissions(targetUserId);
    await ctx.verifyInAccount(sourceUserId);

    const sourceUser = await ctx.getUserById(sourceUserId);
    const targetUser = await ctx.getUserById(targetUserId);

    if (!sourceUser || sourceUser.deleted) {
      throw new Error('Source user not found');
    }
    if (!targetUser || targetUser.deleted) {
      throw new Error('Target user not found');
    }
    if (sourceUser.accountId !== ctx.accountId || targetUser.accountId !== ctx.accountId) {
      throw new Error('User auth error');
    }
    if (sourceUser.type === UserType.admin) {
      throw new Error('Admin users cannot be used as the source');
    }
    if (targetUser.type === UserType.admin) {
      throw new Error('Admin users cannot be used as the target');
    }
    if (targetUser.type !== UserType.restricted) {
      throw new Error('Only restricted users can receive copied settings');
    }

    const sourceOptions =
      sourceUser.options && typeof sourceUser.options === 'object'
        ? (sourceUser.options as unknown as Record<string, unknown>)
        : {};
    const sourcePrefs = (await this.getUserPrefs(ctx, sourceUserId, [
      ...USER_SETTINGS_COPY_FILTERING_PREF_KEYS,
      ...USER_SETTINGS_COPY_WEBSITE_PREF_KEYS,
    ] as string[])) as Record<string, unknown>;

    const snapshot: Partial<CopyUserSettingsResponse['appliedSnapshot']> = {};
    const optionPatches: Record<string, unknown> = {};
    const preferenceUpdates: Record<string, unknown> = {};

    for (const group of groups) {
      const groupSnapshot = this._buildUserSettingsCopyGroupSnapshot(
        group,
        sourceOptions,
        sourcePrefs,
        sourceUser.type || null,
        targetUser.type || null,
      );

      snapshot[group] = groupSnapshot;

      const optionsPatch = groupSnapshot.optionsPatch;
      const prefsPatch = groupSnapshot.preferenceUpdates;

      if (optionsPatch && typeof optionsPatch === 'object') {
        Object.assign(optionPatches, optionsPatch);
      }
      if (prefsPatch && typeof prefsPatch === 'object') {
        Object.assign(preferenceUpdates, prefsPatch);
      }
    }

    const tx = await this.userRepo.createTransaction();
    try {
      const txUserRepo = this.userRepo.withTransaction(tx) as UserRepo;
      const txUserPref = this.userPref.withTransaction(tx) as UserPrefRepo;

      if (Object.keys(optionPatches).length > 0) {
        const updatedOptions = this._mergeUserOptions(targetUser, optionPatches);
        await txUserRepo.where({_id: targetUserId}).update({options: updatedOptions});
      }

      if (Object.keys(preferenceUpdates).length > 0) {
        for (const key of Object.keys(preferenceUpdates)) {
          await txUserPref.save({
            _id: this.userPref.prefId(targetUserId, key),
            userId: targetUserId,
            key,
            value: preferenceUpdates[key],
            updatedAt: new Date(),
          });
        }
      }

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    this.broadcastUserSettingsRefresh(targetUserId, {
      refreshCurrentUser: Object.keys(optionPatches).length > 0,
      refreshUserPrefs: Object.keys(preferenceUpdates).length > 0,
      source: 'settings-copy',
    });

    return {
      targetUserId,
      sourceUserId,
      appliedGroups: groups,
      appliedSnapshot: snapshot,
    };
  }

  async setCanPublishPublicly(ctx: RequestContext, targetUserId: string, canPublishPublicly: boolean) {
    await ctx.verifyAdminPermissions(targetUserId);
    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.deleted) {
      throw new Error('User not found');
    }

    await this.userRepo.updateWithId(targetUserId, {canPublishPublicly});
    return true;
  }

  // ROUTE-METHOD
  async updateProfileImage(ctx: RequestContext, targetUserId: string, imageData: any) {
    await ctx.verifySelfOrAdmin(targetUserId);
    if (imageData.type == 'path') {
      if (!imageData.data.startsWith('/') || imageData.data.length > 60) {
        throw new Error('Invalid path');
      }
    } else if (imageData.type == 'data') {
      if (imageData.data.fileData.length > 1000000 || imageData.data.imagePreview.length > 1000000) {
        throw new Error('Image too large');
      }

      let {fileData, imagePreview, imageType} = imageData.data;
      imageType = imageType.split('/')[1];
      const fileName = `${targetUserId}.${imageType}`;
      const fileNamePre = `${targetUserId}_pre.${imageType}`;

      if (fileData.startsWith('data:image')) fileData = fileData.split(',')[1];

      if (imagePreview.startsWith('data:image')) imagePreview = imagePreview.split(',')[1];

      await this.fileService.fileAccessProvider.uploadUserFileData(fileData, 'userprofile', 'default', fileName);
      await this.fileService.fileAccessProvider.uploadUserFileData(imagePreview, 'userprofile', 'default', fileNamePre);

      imageData.data = null;
      imageData.type = 'imageFile';
      imageData.data = {imageId: targetUserId, imageType};
    } else {
      throw new Error('Invalid image type');
    }
    await this._updateUserWithId(targetUserId, {profileImage: imageData});
    return null;
  }

  private async _updateUserWithId(userId: string, data: Record<string, unknown>) {
    await this.userRepo.where({_id: userId}).update(data);
    return null;
  }

  private _mergeUserOptions(targetUser: Pick<User, 'options' | 'type' | 'dob'>, options: any) {
    const prevOptions = (targetUser.options as unknown as Record<string, unknown> | null) ?? {
      whitelistingEnabled: false,
      codeInjectionEnabled: false,
      contentFilteringEnabled: false,
      logActivity: false,
      aiChatEnabled: false,
      accessControlSettings: null,
      usageLimitsData: null,
      ruleOverrideSettings: null,
    };

    const updatedOptions = {...prevOptions} as Record<string, unknown>;

    if (options && typeof options === 'object') {
      if ('whitelistingEnabled' in options) {
        updatedOptions.whitelistingEnabled = !!options.whitelistingEnabled;
      }
      if ('codeInjectionEnabled' in options) {
        updatedOptions.codeInjectionEnabled = !!options.codeInjectionEnabled;
      }
      if ('contentFilteringEnabled' in options) {
        updatedOptions.contentFilteringEnabled = !!options.contentFilteringEnabled;
      }
      if ('logActivity' in options) {
        updatedOptions.logActivity = !!options.logActivity;
      }
      if ('aiChatEnabled' in options) {
        updatedOptions.aiChatEnabled = !!options.aiChatEnabled;
      }
      if ('accessControlSettings' in options) {
        updatedOptions.accessControlSettings = options.accessControlSettings;
      }
      if ('usageLimitsData' in options) {
        updatedOptions.usageLimitsData = options.usageLimitsData;
      }
      if ('ruleOverrideSettings' in options) {
        updatedOptions.ruleOverrideSettings = options.ruleOverrideSettings;
      }
    }

    if (updatedOptions.whitelistingEnabled) {
      updatedOptions.contentFilteringEnabled = true;
    }

    if (targetUser.type === 'restricted' || isUnderAge(targetUser.dob as any, 18) === true) {
      updatedOptions.contentFilteringEnabled = true;
    }

    return updatedOptions;
  }

  private _buildUserSettingsCopyGroupSnapshot(
    group: UserSettingsCopyGroup,
    sourceOptions: Record<string, unknown>,
    sourcePrefs: Record<string, unknown>,
    sourceUserType: string | null,
    targetUserType: string | null,
  ) {
    switch (group) {
      case 'contentFiltering':
        return buildContentFilteringCopySnapshot(sourceOptions, sourcePrefs, targetUserType);
      case 'usageLimits':
        return buildUsageLimitsCopySnapshot(sourceOptions);
      case 'websiteSettings':
        return buildWebsiteSettingsCopySnapshot(sourcePrefs, sourceUserType);
      default:
        throw new Error(`Unsupported settings group: ${group}`);
    }
  }

  async purgeUser(user) {
    if (!user) return 'user not found';
    console.log('Purging user ', user._id);

    await this.itemFeedbackRepo.deleteWhere({userId: user._id});
    await this.userActivityRepo.deleteWhere({userId: user._id});
    await this.permissionsRepo.deleteWhere({userId: user._id});
    await this.reviewsRepo.deleteWhere({userId: user._id});
    await this.usersPublic.deleteWhere({_id: user.publicId});
    await this.userRepo.deleteWhere({_id: user._id});

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

    if (ctx.currentUserId == userId) throw new Error('Cannot change your own user type');
    const user = await this.getUserById(userId);
    const currentUser = await ctx.getCurrentUser();
    if (user.accountId != ctx.accountId || currentUser.type != 'admin') throw new Error('Something went wrong');
    await this._updateUserWithId(userId, {type: type});
  }

  // ROUTE-METHOD
  async setEmail(ctx: RequestContext, targetUserId: string, email: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const targetUser = await this.getUserById(targetUserId);

    if (!email && targetUser.type != UserType.restricted) {
      throw new Error('Email cannot be empty');
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
    if (!user) throw new Error('User not found');
    if (!user.email) throw new Error('User has no email address');
    if (user.verified) throw new Error('Email already verified');

    const verification = await this.verficationService._addVerification(
      10,
      VerificationType.confirmEmail,
      targetUserId,
      {
        userId: targetUserId,
        type: 'verifyemail',
        email: user.email,
      },
    );
    const verificationLink = `${config.serverHostname}/verifyemail/${verification._id}`;
    sendEmail(
      [user.email],
      'Verify your email',
      `Click here to verify your email: <a href="${verificationLink}">${verificationLink}</a><br/><br/> This link will expire in 10 minutes.`,
      MAIN_EMAIL_TEMPLATE,
    );
  }

  async setDisplayedName(ctx: RequestContext, targetUserId: string, displayedName: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    displayedName = displayedName.trim();
    if (displayedName.length < 3 && displayedName.length > 8) {
      throw new Error('Displayed name must be between 3 and 12 characters');
    }

    await this._updateUserWithId(targetUserId, {displayedName});
  }

  // ROUTE-METHOD
  async updateUsername(ctx: RequestContext, targetUserId: string, username: string) {
    await ctx.verifyAdminPermissions(targetUserId);

    if (!username || username.length < 6) {
      throw new Error('Username must be at least 6 characters');
    }
    username = username.trim().toLowerCase();

    checkUserName(username);
    if (await this._checkUsernameExists(username)) {
      throw new Error('Username is already taken');
    }

    await this._updateUserWithId(targetUserId, {username});
  }

  // ROUTE-METHOD
  async getUserPrefsDefaults(ctx: RequestContext, targetUserId: string, key: string) {
    return this.userPref.defaults[key];
  }

  // ROUTE-METHOD
  async getUserPrefs(ctx: RequestContext, targetUserId: string, keys: string[] = null) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const records = !keys
      ? await this.userPref.where({userId: targetUserId})
      : await this.userPref.where({userId: targetUserId}).whereIn('key', keys);

    const normalizePrefValue = (value: unknown): unknown => {
      if (typeof value !== 'string') return value;

      const trimmed = value.trim();
      if (!trimmed) return value;

      const startsLikeJson =
        trimmed.startsWith('{') ||
        trimmed.startsWith('[') ||
        trimmed.startsWith('"') ||
        trimmed === 'true' ||
        trimmed === 'false' ||
        trimmed === 'null' ||
        /^-?\d+(\.\d+)?$/.test(trimmed);

      if (!startsLikeJson) return value;

      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    };

    const prefs: Record<string, unknown> = {};
    for (const rec of records || []) {
      const key = String((rec as any)?.key || '').trim();
      if (!key) continue;
      prefs[key] = normalizePrefValue((rec as any)?.value);
    }

    if (Array.isArray(keys)) {
      for (const key of keys) {
        if (prefs[key] !== undefined) continue;
        if (Object.prototype.hasOwnProperty.call(this.userPref.defaults || {}, key)) {
          prefs[key] = this.userPref.defaults[key];
        }
      }
    }

    return prefs;
  }

  // ROUTE-METHOD
  async getUserPrefsValue(ctx: RequestContext, targetUserId: string, key: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    if (!key) {
      throw new Error('Key is required');
    } else {
      let results = await this.userPref.where({userId: targetUserId, key});
      if (results.length > 0) {
        const raw = results[0].value;
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          if (trimmed) {
            try {
              return {value: JSON.parse(trimmed)};
            } catch {
              return {value: raw};
            }
          }
        }
        return {value: raw};
      } else {
        return null;
      }
    }
  }

  // ROUTE-METHOD
  async updateUserPrefs(ctx: RequestContext, targetUserId: string, updates: Record<string, unknown>) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const updateKeys = Object.keys(updates || {});

    for (const key of updateKeys) {
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

    this.broadcastUserSettingsRefresh(targetUserId, {
      refreshCurrentUser: false,
      refreshUserPrefs: updateKeys.length > 0,
      source: 'prefs-update',
    });

    return true;
  }

  // ROUTE-METHOD
  // TODO: Account owner?
  async softDeleteUser(ctx: RequestContext, userIdToDelete) {
    if (!(await ctx.isAdmin())) {
      throw new Error('You must be an admin to delete a user');
    }
    await ctx.verifyAdminPermissions(userIdToDelete);

    const user = await this.getUserById(userIdToDelete);
    const users = await this._getUsers(user.accountId);
    if (users.length > 1) {
      let hasAdmin = false;
      for (const u of users) {
        if (user._id != u._id && u.type == 'admin' && !u.deleted) hasAdmin = true;
      }
      if (!hasAdmin)
        throw Error(
          "Your current account has other users.  At least one user in your account must be an Admin before you can continue.  You must do one of the following before continuing, make an existing 'restricted user' an 'admin user'.  Migrate or delete all other users in this account.",
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
    if (user.accountId != ctx.accountId && currentUser.type == 'admin') {
      throw new Error('Something went wrong');
    }

    const users = await this._getUsers(user.accountId);
    if (users.length > 1) {
      let hasAdmin = false;
      for (const u of users) {
        if (user._id != u._id && u.type == 'admin' && !u.deleted) hasAdmin = true;
      }
      if (!hasAdmin)
        throw Error(
          "Your current account has other users.  At least one user in your account must be an Admin before you can continue.  You must do one of the following before continuing, make an existing 'restricted user' an 'admin user'.  Migrate or delete all other users in this account.",
        );
    }

    await this._updateUserWithId(user._id, {disabled: true});
  }
}

export default UserService;
