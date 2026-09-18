import {HttpException} from '@/exceptions/HttpException';
import {UserChangeLogRepo} from '@/db/user_changelog.repo';
import type {DeviceGrant} from 'tset-sharedlib/restrictions/deviceGrants';
import {buildDeviceGrants} from '@/services/deviceGrantBuilder';
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
import {isGuardianOnlyPrefKey} from 'tset-sharedlib/types/client.types';
import {UpdatePublicProfileRequest} from 'tset-sharedlib/api';
import type {CopyUserSettingsRequest, CopyUserSettingsResponse, UserSettingsCopyGroup} from 'tset-sharedlib/api';
import {isUnderAge} from 'tset-sharedlib/date.utils';
import {effectiveHistoryRetentionDays} from 'tset-sharedlib/plan-policy';
import {buildCheckpointRelease, resolveCheckpointMode} from 'tset-sharedlib/restrictions/checkpoint';
import type {AccessControlSettings, CheckpointRelease} from 'tset-sharedlib/types';
import {isAppCapabilityId} from 'tset-sharedlib/types/item.types';
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
import {deviceSettingsChanged, notifyDeviceSettingsChanged} from './device_settings.service';
import {nextDeviceSettingsVersionSql} from '@/db/device_settings_version.repo';

const publicAttributes = ['username', 'fullName', 'enabled', 'about', 'profileImage'];

const ALLOWED_USER_SETTINGS_COPY_GROUPS: UserSettingsCopyGroup[] = [
  'contentFiltering',
  'usageLimits',
  'websiteSettings',
];

const OFFICIAL_PUBLISHER_CREATED_AT = new Date('2023-01-01T00:00:00.000Z');

/** Bounds on the app device-capability grant map — see _sanitizeAppCapabilityGrants. */
const MAX_APP_CAPABILITY_GRANT_APPS = 200;
const MAX_APP_CAPABILITY_REF_ID_LENGTH = 200;
const MAX_EMAIL_ALLOWED_SENDERS = 500;
const MAX_EMAIL_ADDRESS_LENGTH = 254;
/** A Blocked message is a sentence or two on a block screen, not a letter. */
const BLOCKED_MESSAGE_MAX = 500;

class UserService {
  private userRepo = new UserRepo();
  private changeLogRepo = new UserChangeLogRepo();
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
    if (!user) throw new HttpException(404, 'User not found');
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
      // Deliberately the same 404 and message as a genuinely absent user: a stranger must not be
      // able to tell "no such user" from "exists, but you may not see them".
      throw new HttpException(404, 'User not found');
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
      // "Which members still have key material on our servers" (D5) needs these as a
      // batch. prepUserForTransport emits them for a single user; this path deliberately
      // does not call it, so set them here rather than doing N round-trips.
      user['hasPasswordCopy'] = !!user['passwordCopy'];
      user['hasRecoveryKeyStored'] = !!user['recoveryKey'];
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

    // SYNC-6. This replaces `UPDATE user SET updatedAt` on every change to anything
    // this user can see -- a single hot row per user, written once per change, purely
    // so the client could tell whether it was behind.
    //
    // Computed on read instead of written on change. Reads of the user record are far
    // rarer than changes to a family's library, and (userId, id) makes this an
    // index-only backward scan of one entry. The client compares it against the
    // revision it last synced to and skips the request when they match, exactly as it
    // used to compare dates -- but without a write on the hot path, and without
    // depending on an SSE connection being up.
    return {...user, syncRevision: await this.changeLogRepo.maxRevisionForUser(user._id)};
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
  /**
   * A parent's approvals for the calling device, in the grant vocabulary.
   *
   * Called from the Companion's heartbeat, so it must never throw: a check-in that fails takes the
   * tamper reporting and the liveness signal down with it, and a missing grant only means a block
   * lifts on the next check-in instead of this one.
   *
   * Day scoping travels with the grant rather than being resolved here — this process is on UTC
   * and only the device knows the family's timezone.
   */
  async getDeviceGrantsForCurrentUser(ctx: RequestContext): Promise<DeviceGrant[]> {
    try {
      const user = await ctx.getCurrentUser();
      const options = (user?.options || {}) as Record<string, any>;
      const overrides = options?.ruleOverrideSettings?.ruleOverrides;
      return buildDeviceGrants(overrides, Date.now());
    } catch (error) {
      console.error('[UserService] getDeviceGrantsForCurrentUser failed', error);
      return [];
    }
  }

  async setUserOptions(ctx: RequestContext, targetUserId: string, options: any) {
    await ctx.verifyAdminPermissions(targetUserId);
    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.deleted) {
      throw new HttpException(404, 'User not found');
    }

    // The plan caps "Keep history for", so the merge needs to know it. The target is in the caller's
    // account: verifyAdminPermissions refuses anyone else.
    const account =
      options && typeof options === 'object' && 'historyRetentionDays' in options ? await ctx.getAccount() : null;
    const updatedOptions = this._mergeUserOptions(targetUser, options, {accountType: (account as any)?.accountType});

    // A device-relevant change raises the device settings version in the SAME statement as the
    // options, so no device can read the new version with the old settings (DCP-5). A display
    // preference changes nothing a device reads and wakes no device. Neither does re-saving
    // identical limits: the version tells a device nothing changed.
    const deviceChanged = deviceSettingsChanged(targetUser.options, updatedOptions);
    await this._updateUserWithId(targetUserId, {
      options: updatedOptions,
      ...(deviceChanged ? {deviceSettingsVersion: nextDeviceSettingsVersionSql(this.userRepo.knex)} : {}),
    });
    this.broadcastUserSettingsRefresh(targetUserId, {
      refreshCurrentUser: true,
      refreshUserPrefs: false,
      source: 'options-update',
    });

    // The one device nudge (SSE + silent push). Fire-and-forget: the parent's save must not fail,
    // or appear to fail, because a push provider was slow.
    if (deviceChanged) notifyDeviceSettingsChanged([targetUserId]);

    return null;
  }

  /**
   * Mark the CURRENT user's own daily check-in done for today.
   *
   * This is the only write into `accessControlSettings` a restricted user may
   * make, so it is deliberately narrow rather than a relaxation of
   * `setUserOptions`:
   *  - no target user — it always acts on ctx.currentUserId
   *  - it writes `checkpointRelease` and nothing else, onto a freshly read
   *    record, so it can never drop a sibling setting or flip a restriction
   *  - it refuses in guardian mode, which is the mode that means "only an
   *    admin may clear this"
   *
   * Admins clearing a child's guardian gate still go through setUserOptions.
   */
  // ROUTE-METHOD
  async clearOwnCheckpoint(ctx: RequestContext): Promise<{release: CheckpointRelease}> {
    const userId = ctx.getCurrentUserId();
    if (!userId) {
      throw new Error('You must be signed in');
    }

    const user = await this.userRepo.findById(userId);
    if (!user || user.deleted) {
      throw new HttpException(404, 'User not found');
    }

    const options = (user.options || {}) as any;
    const accessControlSettings = (options.accessControlSettings || {}) as AccessControlSettings;
    const checkpointSettings = accessControlSettings.checkpointSettings;

    if (checkpointSettings?.enabled !== true) {
      throw new Error('No daily check-in is set up');
    }
    if (resolveCheckpointMode(checkpointSettings) === 'guardian') {
      throw new Error('Only an adult can clear this check-in');
    }

    const release = buildCheckpointRelease(Date.now(), checkpointSettings, userId, true);

    await this._updateUserWithId(userId, {
      options: {
        ...options,
        accessControlSettings: {...accessControlSettings, checkpointRelease: release},
      },
    });
    this.broadcastUserSettingsRefresh(userId, {
      refreshCurrentUser: true,
      refreshUserPrefs: false,
      source: 'options-update',
    });

    return {release};
  }

  /**
   * Give every family member with no Blocked message this one. Anyone who has their own keeps it.
   *
   * Server-side and field-level on purpose. `setUserOptions` replaces `accessControlSettings`
   * wholesale, so the obvious client version (read each member, set the message, send it back)
   * would, for every member at once, carry the same risk that once wiped a child's check-in
   * (UX-023). Here the family's rows are read under a lock and only `usageGuidanceMessage` is set.
   *
   * The message is also the note on a device's downtime shield, so a changed member's device
   * settings version moves with it.
   */
  // ROUTE-METHOD
  async fillBlankBlockedMessages(ctx: RequestContext, message: unknown): Promise<{updatedUserIds: string[]}> {
    if (!(await ctx.isAdmin())) {
      throw new Error('Not authorized');
    }
    const text = typeof message === 'string' ? message.trim().slice(0, BLOCKED_MESSAGE_MAX) : '';
    if (!text) {
      throw new Error('Write a message first.');
    }

    const updatedUserIds: string[] = [];
    const trx = await this.userRepo.createTransaction();
    try {
      const members = (await trx('user')
        .where({accountId: ctx.accountId})
        .forUpdate()
        .select('_id', 'options', 'deleted')) as Array<{_id: string; options: any; deleted?: boolean}>;

      for (const member of members) {
        if (member.deleted) continue;
        const options = (member.options || {}) as Record<string, any>;
        const access = (options.accessControlSettings || {}) as AccessControlSettings;
        const existing = typeof access.usageGuidanceMessage === 'string' ? access.usageGuidanceMessage.trim() : '';
        if (existing) continue;

        await trx('user')
          .where({_id: member._id})
          .update({
            options: {...options, accessControlSettings: {...access, usageGuidanceMessage: text}},
            deviceSettingsVersion: nextDeviceSettingsVersionSql(trx),
          });
        updatedUserIds.push(member._id);
      }
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    for (const userId of updatedUserIds) {
      this.broadcastUserSettingsRefresh(userId, {
        refreshCurrentUser: true,
        refreshUserPrefs: false,
        source: 'options-update',
      });
    }
    notifyDeviceSettingsChanged(updatedUserIds);
    return {updatedUserIds};
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

    let deviceChanged = false;
    const tx = await this.userRepo.createTransaction();
    try {
      const txUserRepo = this.userRepo.withTransaction(tx) as UserRepo;
      const txUserPref = this.userPref.withTransaction(tx) as UserPrefRepo;

      if (Object.keys(optionPatches).length > 0) {
        const updatedOptions = this._mergeUserOptions(targetUser, optionPatches);
        // Copying usage limits is a device settings change for the target (DCP-5).
        deviceChanged = deviceSettingsChanged(targetUser.options, updatedOptions);
        await txUserRepo.where({_id: targetUserId}).update({
          options: updatedOptions,
          ...(deviceChanged ? {deviceSettingsVersion: nextDeviceSettingsVersionSql(tx)} : {}),
        } as any);
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
    if (deviceChanged) notifyDeviceSettingsChanged([targetUserId]);

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
      throw new HttpException(404, 'User not found');
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

  private _mergeUserOptions(
    targetUser: Pick<User, 'options' | 'type' | 'dob'>,
    options: any,
    plan: {accountType?: string | null} = {},
  ) {
    const prevOptions = (targetUser.options as unknown as Record<string, unknown> | null) ?? {
      whitelistingEnabled: false,
      codeInjectionEnabled: false,
      contentFilteringEnabled: false,
      logActivity: false,
      aiChatEnabled: false,
      assistantReviewEnabled: false,
      appEditorEnabled: false,
      explorePublishedEnabled: false,
      emailEnabled: false,
      speechModeEnabled: false,
      wakeWordEnabled: false,
      communityContentEnabled: false,
      companionDevicesEnabled: false,
      remoteChildActionsEnabled: false,
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
      if ('containLinksInternally' in options) {
        updatedOptions.containLinksInternally = !!options.containLinksInternally;
      }
      if ('aiChatEnabled' in options) {
        updatedOptions.aiChatEnabled = !!options.aiChatEnabled;
      }
      if ('assistantReviewEnabled' in options) {
        updatedOptions.assistantReviewEnabled = !!options.assistantReviewEnabled;
      }
      if ('appEditorEnabled' in options) {
        updatedOptions.appEditorEnabled = !!options.appEditorEnabled;
      }
      if ('explorePublishedEnabled' in options) {
        updatedOptions.explorePublishedEnabled = !!options.explorePublishedEnabled;
      }
      // The optional features that used to be one family-wide switch on the account. They are
      // per person now, and they are options rather than userPrefs for the reason every
      // permission here is: a restricted user can write their own prefs, so a child could
      // otherwise grant themselves an inbox, a microphone, or the community catalog.
      if ('emailEnabled' in options) {
        updatedOptions.emailEnabled = !!options.emailEnabled;
      }
      if ('speechModeEnabled' in options) {
        updatedOptions.speechModeEnabled = !!options.speechModeEnabled;
      }
      if ('wakeWordEnabled' in options) {
        updatedOptions.wakeWordEnabled = !!options.wakeWordEnabled;
      }
      if ('communityContentEnabled' in options) {
        updatedOptions.communityContentEnabled = !!options.communityContentEnabled;
      }
      if ('companionDevicesEnabled' in options) {
        updatedOptions.companionDevicesEnabled = !!options.companionDevicesEnabled;
      }
      if ('remoteChildActionsEnabled' in options) {
        updatedOptions.remoteChildActionsEnabled = !!options.remoteChildActionsEnabled;
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
      if ('appCapabilityGrants' in options) {
        updatedOptions.appCapabilityGrants = this._sanitizeAppCapabilityGrants(options.appCapabilityGrants);
      }
      if ('emailAllowedSenders' in options) {
        updatedOptions.emailAllowedSenders = this._sanitizeEmailAllowedSenders(options.emailAllowedSenders);
      }
      // "Keep history for" (PLN-9). An option, not a pref, for the same reason as the permissions
      // above: a child must never be able to shorten their own history and erase what their
      // guardians see. Stored already capped at the plan's maximum; null goes back to the default.
      // The purge caps it again at run time, so a family that later moves to Standard keeps 14 days.
      if ('historyRetentionDays' in options) {
        if (options.historyRetentionDays === null) {
          delete updatedOptions.historyRetentionDays;
        } else {
          updatedOptions.historyRetentionDays = effectiveHistoryRetentionDays(
            plan.accountType,
            options.historyRetentionDays,
          );
        }
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

  /**
   * App device-capability grants, written whole by a guardian approving an 'appCapability'
   * access request. The client read-merge-writes the entire map, so this is a full replace —
   * which is exactly why it is shape-checked here: a malformed or unbounded map would
   * otherwise be persisted verbatim and read back by every client on every refresh.
   */
  private _sanitizeAppCapabilityGrants(raw: unknown): Record<string, Record<string, unknown>> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const out: Record<string, Record<string, unknown>> = {};
    let appCount = 0;

    for (const [refId, capMap] of Object.entries(raw as Record<string, unknown>)) {
      if (appCount >= MAX_APP_CAPABILITY_GRANT_APPS) break;
      if (!refId || refId.length > MAX_APP_CAPABILITY_REF_ID_LENGTH) continue;
      if (!capMap || typeof capMap !== 'object' || Array.isArray(capMap)) continue;

      const caps: Record<string, unknown> = {};
      for (const [capability, grant] of Object.entries(capMap as Record<string, unknown>)) {
        if (!isAppCapabilityId(capability)) continue;
        if (!grant || typeof grant !== 'object' || Array.isArray(grant)) continue;

        const {grantedBy, grantedAt, expiresAtMs} = grant as Record<string, unknown>;
        if (typeof grantedBy !== 'string' || !grantedBy) continue;
        if (typeof grantedAt !== 'number' || !Number.isFinite(grantedAt)) continue;

        caps[capability] = {
          grantedBy: grantedBy.slice(0, MAX_APP_CAPABILITY_REF_ID_LENGTH),
          grantedAt,
          ...(typeof expiresAtMs === 'number' && Number.isFinite(expiresAtMs) ? {expiresAtMs} : {}),
        };
      }

      if (Object.keys(caps).length) {
        out[refId] = caps;
        appCount++;
      }
    }

    return out;
  }

  /**
   * The addresses a restricted user may correspond with. Written whole by a guardian, so
   * this is a full replace and has to be shape-checked here — the client read-merge-writes
   * the array, and an unbounded or malformed one would be persisted verbatim and read back
   * by every client on every refresh. Normalized to lowercase so the client's own
   * comparisons (which lowercase everything) cannot miss a match on casing alone.
   */
  private _sanitizeEmailAllowedSenders(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];

    const out: string[] = [];
    const seen = new Set<string>();

    for (const entry of raw) {
      if (out.length >= MAX_EMAIL_ALLOWED_SENDERS) break;
      if (typeof entry !== 'string') continue;

      const email = entry.trim().toLowerCase();
      if (!email || email.length > MAX_EMAIL_ADDRESS_LENGTH) continue;
      // Deliberately permissive but structural: one @, no spaces, a dot in the domain.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      if (seen.has(email)) continue;

      seen.add(email);
      out.push(email);
    }

    return out;
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
    if (!user) throw new HttpException(404, 'User not found');
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

  /**
   * Give a user a date of birth after their account already exists.
   *
   * Admin only, unlike `setDisplayedName` beside it: `dob` decides age-based restrictions
   * (`isUnderAge` below, and the recommended screen-time tier), so a restricted user allowed
   * to write their own would be choosing their own limits. Nothing else on this route has
   * that property, which is why it does not share the route's `verifySelfOrAdmin`.
   *
   * Only reachable because children created before SL-169 have `dob = NULL` and there was no
   * way to give them one (UX-028); on create the same value is built from `otherSettings`
   * in `auth.service.ts`.
   */
  // ROUTE-METHOD
  async setDateOfBirth(ctx: RequestContext, targetUserId: string, dob: {y?: number; m?: number; d?: number}) {
    await ctx.verifyAdminPermissions(targetUserId);

    const year = Number(dob?.y);
    // `dob?.m || 1` would turn an explicit month 0 into January — a 0-indexed month sent by
    // mistake would be silently accepted as a real one. Default only when it is genuinely
    // absent; an out-of-range month is a typo and gets refused below.
    const month = dob?.m === undefined || dob?.m === null ? 1 : Number(dob.m);
    const currentYear = new Date().getFullYear();

    // A year outside this range is a typo, not a person. Rejecting it matters more than it
    // looks: a year in the future reads as a negative age, and `calculateAge` returning a
    // nonsense number silently re-tiers every limit this child has.
    if (!Number.isInteger(year) || year < currentYear - 120 || year > currentYear) {
      throw new Error('Enter a valid birth year');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Enter a valid birth month');
    }

    await this._updateUserWithId(targetUserId, {dob: {y: year, m: month}} as any);
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

    // `verifySelfOrAdmin` counts a restricted user editing their own prefs as "self",
    // so without this a child could lift any restriction stored as one of their prefs
    // by calling this route directly. Disabling the control in the UI is not a check.
    if (updateKeys.some(isGuardianOnlyPrefKey)) {
      await ctx.verifyAdminPermissions(targetUserId);
    }

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
  // There is no account owner. "Who may remove whom" is settled by the two guards below and
  // documented in docs/architecture/31-MEMBER-LIFECYCLE.md (S1, S2, S3).
  async softDeleteUser(ctx: RequestContext, userIdToDelete) {
    if (!(await ctx.isAdmin())) {
      throw new Error('You must be an admin to delete a user');
    }
    await ctx.verifyAdminPermissions(userIdToDelete);

    const user = await this.getUserById(userIdToDelete);
    const isSelf = userIdToDelete == ctx.currentUserId;

    // An adult leaves under their own name; one guardian never evicts another. Losing a
    // co-guardian is a transfer of what they hold, not a delete — see doc 31 (S3, S5).
    if (user.type != UserType.restricted && !isSelf) {
      throw new Error('Only a child can be removed from the family. An adult has to leave the family themselves.');
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
    } else if (isSelf) {
      // The last user standing cannot leave an account behind with nobody in it — that is a
      // Delete Account, and it lives on its own page with its own confirmation.
      throw new Error('You are the only user in this account. Delete the account instead of leaving the family.');
    }

    return await this.markUserDeleted(userIdToDelete);
  }

  /**
   * The tombstone itself: move the identity columns out of the way so the address can be
   * reused, and set `deleted`.
   *
   * Separate from softDeleteUser because the two callers mean different things. Removing one
   * member from a family answers "who may remove whom" — the guards above. Deleting the whole
   * account answers nothing: every user goes, including the admin doing it, so those guards
   * would only ever refuse. AccountService.deleteAccountForPersonalServer used to call
   * softDeleteUser and hit exactly that — the last admin is always `isSelf` with nobody left,
   * so account deletion failed with "You are the only user in this account".
   */
  async markUserDeleted(userIdToDelete) {
    const user = await this.getUserById(userIdToDelete);

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
    // Was `!= accountId && type == admin`, which let a non-admin through and blocked the admin
    // it meant to allow. No route reaches this yet; fixed so wiring one is not a hole.
    if (user.accountId != ctx.accountId || currentUser.type != UserType.admin) {
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
