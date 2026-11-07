import {RequestContext} from '@/base/request_context';
import {v4 as uuidv4} from 'uuid';
import {sendEmail} from '../utils/email_utils';

import {friendRequestTemplate, MAIN_EMAIL_TEMPLATE} from '@/templates/email.templates';

import {config} from '@/config';
import {NotificationRepo} from '@/db/notification.repo';
import {UserRepo} from '@/db/user.repo';
import {UserPrefKeys, UserPrefRepo} from '@/db/user_pref.repo';
import Notification from 'tset-sharedlib/schemas/public/Notification';
import User from 'tset-sharedlib/schemas/public/User';
import {userPrefDefaults} from 'tset-sharedlib/schemas/public/UserPref';
import {NotificationGroupType, NotificationMethod, NotificationType} from '@/typing/enum_strings';
import {UserType} from 'tset-sharedlib/shared.types';
import ClientInfoService from './client_info.service';
import SSEManager from './sse.manager';
import VerificationService from './verification.service';
import {ACCOUNT_INVITE_MSG, INVITATION_TO_ACCOUNT} from '@/defaults/message_templates';
import {clampOffset, clampPerPage} from '@/utils/pagination_utils';
import {escapeHtml} from '@/utils/text_utils';

// Whitelist: `sort` is a client-supplied column name going straight into
// .orderBy(), so anything outside this set falls back to createdAt.
const NOTIFICATION_SORT_FIELDS = ['createdAt', 'updatedAt', 'readAt', 'type'];

const typeToTitle = {
  WELCOME_USER: 'Welcome to Kindredly!',
  FRIEND_REQUEST: 'New Friend Request',
  ACCESS_REQUEST: 'New Request',
  ACCESS_REQUEST_UPDATE: 'Request Update',
  // The push title comes from here, not from the caller's `data.title`, and this
  // one type now covers two things: approving a site and recategorizing a page.
  // Naming either one in the title would make the other push say something untrue.
  // Which of the two it was is in the body, from `shortMessage`.
  LIBRARY_AUTO_APPROVAL_APPROVED: 'AI answered a request',
  NEW_POST: 'New Post',
  NEW_COMMENT: 'New Comment',
  NEW_ITEM: 'New Item Added to Your Library',
  SHARED_ITEM: 'Shared with you',
  RESTRICTED_USER_PUBLISHED: 'Restricted User Published',
  DEVICE_PROTECTION_ALERT: 'Device Protection Alert',
  CHILD_SAFETY_ALERT: 'A child may need you',
  PLATFORM_ALERT: 'Platform Alert',
  LESSON_PART_DONE: 'Digital citizenship',
  ACTIVITY_REPORT: 'Activity report',
};

/** At most this many lesson notices per child a day: a pack has five parts, and the child's device reports them. */
const LESSON_PART_DONE_PER_DAY = 5;

/**
 * Types whose push is titled by the notice itself. Every other type has one fixed push title, so
 * a "New app" push read "New Notification" over "1 new app on Emma's computer." (HAT-1016).
 */
const PUSH_TITLE_FROM_NOTICE = new Set(['DEVICE_APP_REVIEW']);

function notiticationTypeToTitle(type: string) {
  if (typeToTitle[type]) {
    return typeToTitle[type];
  } else {
    return 'New Notification';
  }
}

const maxAgeOfDevicesInDays = 10;

/** The Family Downtime notice's tag on Android and identifier on iOS. The phones' code uses the same strings. */
export const FAMILY_DOWNTIME_NOTICE_ID = 'family-downtime';
export const CLEAR_FAMILY_DOWNTIME_NOTICE = 'clearFamilyDowntimeNotice';
import {TYPES} from '@/types';
import type SetupService from './_interfaces/syssetup.service';
import {inject} from 'inversify';
import {parseAppSiteGrantKey} from 'tset-sharedlib/app-outside-services';
class NotificationService {
  constructor(@inject(TYPES.SetupService) private setupService: SetupService) {}

  private userRepo = new UserRepo();
  private notificationsRepo = new NotificationRepo();
  private verificationService = new VerificationService();
  private clientInfoService = new ClientInfoService();
  private userPrefRepo = new UserPrefRepo();

  async sendPushNotificationToAllUserDevices(userId: string, notification: {title: string; body: string}, data: any) {
    const tokens = await this.clientInfoService.listDeviceTokensUsedSinceXDaysAgo(userId, maxAgeOfDevicesInDays);

    if (tokens.length > 0) {
      const message = {
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
            },
          },
        },

        data: {
          ...data,
          title: notification.title,
          body: notification.body,
          targetUserId: userId,
        },
        tokens: tokens,
      };

      // Never the message itself: it names the child and the site they asked for, and these logs
      // go to CloudWatch (EUP-3).
      console.log(`Sending push notification to ${tokens.length} device(s)`);

      this.setupService.sendPushNotification(message);
    }
  }

  /**
   * A data-only push that shows the child NOTHING.
   *
   * Guard pulls its rules on a 15-minute backstop; this is what makes a parent's block arrive
   * in seconds instead (UX-019). It carries no rules — only a marker telling the device to
   * fetch — so it needs no encryption and leaks nothing if it is ever seen.
   *
   * Deliberately NOT `sendPushNotificationToAllUserDevices`: that one always builds an APNs
   * `alert` and a title/body, which on the child's phone would read as "your parent just
   * blocked something". `content-available` wakes the app without a banner, and no `title`
   * or `body` key is sent, so the Android receiver has nothing to display even if it tried.
   */
  async sendSilentDeviceRuleSync(userId: string) {
    const tokens = await this.clientInfoService.listDeviceTokensUsedSinceXDaysAgo(userId, maxAgeOfDevicesInDays);
    if (tokens.length === 0) return {sent: 0};

    this.setupService.sendPushNotification({
      apns: {
        // Background delivery. `apns-priority: 5` is required for content-available pushes;
        // 10 with no alert is rejected by APNs outright.
        headers: {'apns-push-type': 'background', 'apns-priority': '5'},
        payload: {aps: {'content-available': 1}},
      },
      android: {priority: 'high'},
      data: {
        kndAction: 'syncDeviceRules',
        targetUserId: userId,
      },
      tokens,
    });

    return {sent: tokens.length};
  }

  /**
   * "Send what you have recorded, now." Shows the child nothing, exactly like the rule sync above.
   *
   * A separate action rather than a reuse of `syncDeviceRules`: that one means "fetch your
   * settings", and a device that answered it by also uploading would upload on every block a
   * parent sets, which is a different and much more frequent event. Older Guard builds ignore an
   * action they do not know, so this degrades to the fifteen-minute cycle rather than failing.
   */
  async sendSilentDeviceUploadRequest(userId: string) {
    const tokens = await this.clientInfoService.listDeviceTokensUsedSinceXDaysAgo(userId, maxAgeOfDevicesInDays);
    if (tokens.length === 0) return {sent: 0};

    this.setupService.sendPushNotification({
      apns: {
        headers: {'apns-push-type': 'background', 'apns-priority': '5'},
        payload: {aps: {'content-available': 1}},
      },
      android: {priority: 'high'},
      data: {
        kndAction: 'uploadActivityNow',
        targetUserId: userId,
      },
      tokens,
    });

    return {sent: tokens.length};
  }

  /**
   * "Family Downtime / On until 9:00 PM." on an admin's phone, gone when downtime ends (HAT-380).
   *
   * One notice per phone, replaced rather than stacked: Android posts it under a fixed tag and
   * removes it by itself at `endsAtMs`; iOS shows it under the `apns-collapse-id`. Neither is
   * delivered after downtime ends (`ttl`, `apns-expiration`), so a phone that was off never shows a
   * stale one. `sendFamilyDowntimeNoticeClear` removes it when downtime ends early.
   */
  async sendFamilyDowntimeNotice(
    userId: string,
    notice: {title: string; body: string; endsAtMs: number; nowMs: number},
  ) {
    const tokens = await this.clientInfoService.listDeviceTokensUsedSinceXDaysAgo(userId, maxAgeOfDevicesInDays);
    if (tokens.length === 0 || notice.endsAtMs <= notice.nowMs) return {sent: 0};

    this.setupService.sendPushNotification({
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-collapse-id': FAMILY_DOWNTIME_NOTICE_ID,
          'apns-expiration': String(Math.floor(notice.endsAtMs / 1000)),
        },
        payload: {aps: {alert: {title: notice.title, body: notice.body}}},
      },
      android: {priority: 'high', ttl: notice.endsAtMs - notice.nowMs},
      data: {
        kndKind: FAMILY_DOWNTIME_NOTICE_ID,
        notificationTag: FAMILY_DOWNTIME_NOTICE_ID,
        endsAtMs: String(notice.endsAtMs),
        // Tapping it opens the Family Downtime page.
        type: 'NAVIGATE_PATH',
        path: '/family/downtime',
        title: notice.title,
        body: notice.body,
        targetUserId: userId,
      },
      tokens,
    });
    return {sent: tokens.length};
  }

  /** Removes the Family Downtime notice. Silent, like the rule sync: it shows nothing of its own. */
  async sendFamilyDowntimeNoticeClear(userIds: string[]) {
    const tokens = await this.clientInfoService.listDeviceTokensForUsersUsedSinceXDaysAgo(
      userIds,
      maxAgeOfDevicesInDays,
    );
    if (tokens.length === 0) return {sent: 0};

    this.setupService.sendPushNotification({
      apns: {
        headers: {'apns-push-type': 'background', 'apns-priority': '5'},
        payload: {aps: {'content-available': 1}},
      },
      android: {priority: 'high'},
      data: {kndAction: CLEAR_FAMILY_DOWNTIME_NOTICE},
      tokens,
    });
    return {sent: tokens.length};
  }

  async sendPushNotificationToAllUserDevicesMultipleUsers(
    userIds: string[],
    notification: {title: string; body: string},
    data: any,
  ) {
    const tokens = await this.clientInfoService.listDeviceTokensForUsersUsedSinceXDaysAgo(
      userIds,
      maxAgeOfDevicesInDays,
    );
    if (tokens.length > 0) {
      const message = {
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
            },
          },
        },

        data: {
          ...data,
          title: notification.title,
          body: notification.body,
          targetUserType: 'ADMIN',
        },
        tokens,
      };

      this.setupService.sendPushNotification(message);
    }
  }

  async canSend(notificationSettings: Record<string, any>, method: string, type: string) {
    // PLATFORM_ALERT: staff-only ops alerts must not be mutable (see enum_strings.ts).
    if (type == NotificationType.USER_JOINED_ACCOUNT || type == NotificationType.PLATFORM_ALERT) {
      return true;
    }

    if (!notificationSettings || typeof notificationSettings !== 'object') {
      return true;
    }

    const categoryMap =
      notificationSettings?.categories && typeof notificationSettings.categories === 'object'
        ? notificationSettings.categories
        : notificationSettings;

    // A type the user has never seen falls back to its *packaged* default before the
    // catch-all DEFAULT. Without this, every newly-introduced category silently
    // inherits DEFAULT's `push: false` for every existing user — which would have
    // made DEVICE_PROTECTION_ALERT push-silent for exactly the families that
    // already have Guard set up. An explicit user setting still wins.
    const packagedDefault = userPrefDefaults.notificationSettings.categories[type];
    const selectedCategory = categoryMap?.[type] || packagedDefault || categoryMap?.DEFAULT;
    if (selectedCategory && typeof selectedCategory === 'object') {
      return selectedCategory?.[method] === true;
    }

    return true;
  }

  async addUserNotification(
    ctx: RequestContext,
    type: NotificationType,
    senderId: string,
    accountId: string,
    targetUserId: string,
    data: {
      title?: string;
      emailMessage?: string;
      message?: string | null;
      shortMessage?: string | null;
      highPriority?: boolean;
      refInfo?: any;
      actions?: Array<{name: string; label: string; data?: any}>;
    },
    sendPush = false,
  ) {
    const targetUser = await this.userRepo.findById(targetUserId);

    const notificationSettings = await this.userPrefRepo.getUserPref(targetUserId, UserPrefKeys.notificationSettings);

    const id = uuidv4();
    const now = new Date();

    const info: Notification = {
      _id: id,
      type: type,
      senderId: senderId,
      targetKey: targetUserId,
      accountId: accountId,
      createdAt: now,
      data: data,
    };

    if (type != NotificationType.NEW_POST) {
      await this.notificationsRepo.create(info);
    }

    //PUSH NOTIFICATIONS
    if (sendPush && (await this.canSend(notificationSettings, NotificationMethod.push, type))) {
      this.sendPushNotificationToAllUserDevices(
        targetUserId,
        {
          title: notiticationTypeToTitle(type),
          body: data.shortMessage || data.title,
        },
        {
          ...data.refInfo,
          // The notification's type wins over refInfo's, except a `NAVIGATE_PATH`: that is what makes
          // a tap on the push open `refInfo.path` (useNativeIntegration), as account notices do.
          type: data.refInfo?.type === 'NAVIGATE_PATH' ? 'NAVIGATE_PATH' : type,
        },
      ).catch((err) => {
        console.log(err);
      });
    }

    //EMAIL NOTIFICATIONS
    if (await this.canSend(notificationSettings, NotificationMethod.email, type))
      this.createAndSendEmail(type, targetUser, data).catch((err) => {
        console.log(err);
      });

    return id;
  }

  async createAndSendEmail(
    type: NotificationType,
    targetUser: User,
    data: {
      title?: string;
      emailMessage?: string;
      message?: string;
      refInfo?: any;
    },
  ) {
    const emailFooterLink = this.getEmailFooterLink(type);

    if (
      [
        NotificationType.WELCOME_USER,
        NotificationType.FRIEND_REQUEST,
        NotificationType.ACCESS_REQUEST,
        NotificationType.ACCESS_REQUEST_UPDATE,
        NotificationType.NEW_POST,
        NotificationType.SHARED_ITEM,
        NotificationType.FOLLOWING_UPDATE,
        NotificationType.NEW_COMMENT,
        NotificationType.RESTRICTED_USER_PUBLISHED,
        // Emailed as well as pushed: the whole point of a tamper alert is that it
        // reaches the parent, and a parent whose phone is off is exactly the
        // situation in which a child picks to try.
        NotificationType.DEVICE_PROTECTION_ALERT,
        NotificationType.CHILD_SAFETY_ALERT,
        // Staff ops alerts (bug reports): email is one of the three required channels.
        NotificationType.PLATFORM_ALERT,
        // Email starts off, so this only mails an admin who turned it on (HAT-655).
        NotificationType.ACTIVITY_REPORT,
      ].includes(type)
    ) {
      if (targetUser.email != null && targetUser.email.length > 0) {
        sendEmail(
          [targetUser.email],
          data.title || 'New Notification',
          `${data.emailMessage || data.message || 'New Notification'}
                <br/>
                <br/>
                <a href="${config.serverHostname}${emailFooterLink.href}">${emailFooterLink.label}</a>.
                <br/>
                <br/>
                <br/>
                <a href="${config.serverHostname}">kindredly.ai</a>.
                <br/>`,
          MAIN_EMAIL_TEMPLATE,
          [],
          'Kindredly <notify-noreply@thetaset.com>',
        );
      }
    }
  }

  private getEmailFooterLink(type: NotificationType) {
    if (type === NotificationType.NEW_POST) {
      return {
        href: '/kindredapp/#/feeds/sharing',
        label: 'View shared posts',
      };
    }

    return {
      href: '/kindredapp/#/notifications',
      label: 'View all my notifications',
    };
  }

  // ROUTE-METHOD
  async removeNotificationById(ctx: RequestContext, id: string) {
    const notification = await this.notificationsRepo.findById(id);
    if (notification && (notification.targetKey == ctx.accountId || notification.targetKey == ctx.currentUserId)) {
      await this.notificationsRepo.deleteWithId(id); //todo, pass check auth function
      if (notification.type == NotificationGroupType.USER) {
        await this.listUserNotifcations(ctx);
      }
    } else {
      console.error('Unable to remove notification', id);
    }
  }

  // ROUTE-METHOD
  async clearNotifications(ctx: RequestContext) {
    if (await ctx.isAdmin()) {
      await this.notificationsRepo.deleteWhere({targetKey: ctx.accountId});
    }
    await this.notificationsRepo.deleteWhere({targetKey: ctx.currentUserId});
  }

  /**
   * A child finished a part of a built-in lesson pack (Digital citizenship, HAT-577), so the family's
   * guardians can talk it over with them. The child's own device reports it: lesson progress is
   * end-to-end encrypted, so nothing else knows a part was finished.
   *
   * The notice names the child and the pack, never the part or its questions. Some parts are about
   * sextortion and image abuse, and this text is stored in the clear, pushed through FCM and shown on
   * lock screens. The Talk it over questions are on the child's Digital citizenship page, which the
   * notice opens. Self-reported, so capped per child per day.
   */
  async addLessonPartDoneNotification(ctx: RequestContext, nowMs = Date.now()): Promise<{notified: boolean}> {
    const childUserId = ctx.getSessionUserId();
    if (!childUserId || !ctx.accountId) return {notified: false};
    const child = await ctx.getUserById(childUserId);
    // A guardian doing the lessons themselves is not told about it.
    if (!child || child.type === UserType.admin) return {notified: false};

    const since = new Date(nowMs - 24 * 60 * 60 * 1000);
    const sentToday = await this.notificationsRepo.countFromSenderSince(
      childUserId,
      NotificationType.LESSON_PART_DONE,
      since,
    );
    if (sentToday >= LESSON_PART_DONE_PER_DAY) return {notified: false};

    const name = child.displayedName || child.username || 'Your child';
    const path = `/manage/user/${childUserId}/digitalcitizenship`;
    await this.addAccountNotification(
      ctx,
      NotificationType.LESSON_PART_DONE,
      childUserId,
      ctx.accountId,
      {
        title: `${name} finished a part of Digital citizenship`,
        message: escapeHtml(`Talk it over together. The questions are on ${name}'s Digital citizenship page.`),
        shortMessage: `${name} finished a part of Digital citizenship. Talk it over together.`,
        // A tap on the push opens the page too (`NAVIGATE_PATH` replaces the push's type).
        refInfo: {type: 'NAVIGATE_PATH', path, resourceType: 'lessonPack', resourceId: childUserId},
        actions: [{name: 'openPath', label: 'Talk it over', data: {path}}],
      },
      true,
    );
    return {notified: true};
  }

  async addAccountNotification(
    ctx: RequestContext,
    type: string,
    senderId: string,
    accountId: string,
    data: {
      title?: string;
      emailMessage?: string;
      message?: string | null;
      shortMessage?: string | null;
      refInfo?: any;
      actions?: Array<{name: string; label: string; data?: any}>;
    },
    sendPush = false,
  ) {
    const id = uuidv4();
    const now = new Date();

    const info = {
      _id: id,
      targetKey: accountId,
      senderId: senderId,
      type: type,
      accountId: accountId,
      createdAt: now,
      data: data,
    };

    await this.notificationsRepo.create(info);

    const users = await this.userRepo.listByAccountId(accountId);

    const adminUsers = users.filter((v) => v.type == UserType.admin);
    const adminSettings = await Promise.all(
      adminUsers.map(async (user) => ({
        user,
        notificationSettings: await this.userPrefRepo.getUserPref(user._id, UserPrefKeys.notificationSettings),
      })),
    );

    if (sendPush) {
      const pushEnabledAdminUserIds: string[] = [];
      for (const admin of adminSettings) {
        if (await this.canSend(admin.notificationSettings, NotificationMethod.push, type)) {
          pushEnabledAdminUserIds.push(admin.user._id);
        }
      }

      if (pushEnabledAdminUserIds.length > 0) {
        this.sendPushNotificationToAllUserDevicesMultipleUsers(
          pushEnabledAdminUserIds,
          {
            title: PUSH_TITLE_FROM_NOTICE.has(type) && data.title ? data.title : notiticationTypeToTitle(type),
            body: data.shortMessage || data.title,
          },
          {
            type: type,
            ...data.refInfo,
            sysId: id,
          },
        ).catch((err) => {
          console.log(err);
        });
      }
    }

    //Send email to all account admins
    if (['ACCESS_REQUEST'].includes(type)) {
      for (const admin of adminSettings) {
        const user = admin.user;
        const canSendEmail = await this.canSend(admin.notificationSettings, NotificationMethod.email, type);

        if (canSendEmail && user.type == 'admin' && user.email != null && user.email.length > 0) {
          sendEmail(
            [user.email],
            data.title || 'New Access Request',
            `${data.emailMessage || data.message || 'New Access Request'}

                    <br/>
                    <br/>
                    <br/>
                    
                    
                    <a href="${
                      config.serverHostname
                    }/kindredapp/#/settings/useraccessrequests"> - View Access Requests</a>
                       <br/>
                       <br/>
                <a href="${config.serverHostname}/kindredapp/#/notifications"> - View all my notifications</a>
                <br/>
                <br/>`,
            MAIN_EMAIL_TEMPLATE,
            [],
            'Kindredly <notify-noreply@thetaset.com>',
          );
        }
      }
    }

    // Device protection alerts (Guard tamper alerts, the extension being removed) are mailed as
    // well as pushed. `createAndSendEmail` has always listed this type, but account-wide
    // notifications never reached it, so every one of these alerts was push-only.
    if (type === NotificationType.DEVICE_PROTECTION_ALERT || type === NotificationType.CHILD_SAFETY_ALERT) {
      for (const admin of adminSettings) {
        if (await this.canSend(admin.notificationSettings, NotificationMethod.email, type)) {
          this.createAndSendEmail(type as NotificationType, admin.user, {
            ...data,
            message: data.message ?? undefined,
          }).catch((err) => {
            console.log(err);
          });
        }
      }
    }

    return id;
  }

  async _listAccountNotifcations(accountId) {
    const notifications = await this.notificationsRepo.findMany({
      targetKey: accountId,
    }); //TODO, sort by date
    return notifications;
  }

  // ROUTE-METHOD
  async listUserNotifcations(ctx: RequestContext, pageInfo: any = null) {
    let {page, pageSize, sort, order, unreadOnly} = pageInfo || {};

    // Defaults previously applied only when pageInfo was entirely absent, so
    // a partial object (or a hostile pageSize) reached .limit()/.orderBy()
    // unchecked: pageSize:1e9 returned the whole history, and a missing sort
    // produced `order by "undefined"` — a 500.
    const safePageSize = clampPerPage(pageSize, 30);
    const safePage = clampOffset(page);
    const safeSort = NOTIFICATION_SORT_FIELDS.includes(sort) ? sort : 'createdAt';
    const safeOrder = String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const notifications = await this.notificationsRepo
      .findMany({
        targetKey: ctx.currentUserId,
      })
      .where(function () {
        if (unreadOnly) {
          this.whereNull('readAt').orWhere('readAt', null);
        }
      })
      .orderBy(safeSort, safeOrder)
      .limit(safePageSize)
      .offset(clampOffset(safePage * safePageSize));

    const user = await ctx.getCurrentUser();

    if (!user) {
      throw new Error('User not found');
    }

    if (user.type == UserType.admin) {
      const accountNotifications = await this._listAccountNotifcations(ctx.accountId);
      notifications.push(...accountNotifications);
    }

    return notifications

      .sort(function (a, b) {
        if (!b.createdAt) {
          return -1;
        } else if (!a.createdAt) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map((v) => v);
  }

  // ROUTE-METHOD
  async countUserNotifcations(ctx: RequestContext) {
    let cnt = await this.notificationsRepo.countRows({
      targetKey: ctx.currentUserId,
    });

    if (await ctx.isAdmin()) {
      cnt += await this.notificationsRepo.countRows({
        targetKey: ctx.accountId,
      });
    }
    return cnt;
  }

  // ROUTE-METHOD
  async countUnreadUserNotifcations(ctx: RequestContext) {
    let query1 = this.notificationsRepo
      .query()
      .where({
        targetKey: ctx.currentUserId,
      })
      .where(function () {
        this.whereNull('readAt').orWhere('readAt', null);
      });
    let cnt = await this.notificationsRepo.countFromQuery(query1);

    if (await ctx.isAdmin()) {
      let query1 = this.notificationsRepo
        .query()
        .where({
          targetKey: ctx.accountId,
        })
        .where(function () {
          this.whereNull('readAt').orWhere('readAt', null);
        });
      cnt += await this.notificationsRepo.countFromQuery(query1);
    }
    return cnt;
  }

  // ROUTE-METHOD
  async markNotificationsAsRead(ctx: RequestContext, ids: string[]) {
    if (!ctx.isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    await this.notificationsRepo
      .query()
      .whereIn('_id', ids)
      .where(function () {
        this.where({targetKey: ctx.currentUserId}).orWhere({
          targetKey: ctx.accountId,
        });
      })
      .update({
        readAt: new Date(),
      });
  }

  // ROUTE-METHOD
  async markNotificationsAsUnread(ctx: RequestContext, ids: string[]) {
    if (!ctx.isAuthenticated) {
      throw new Error('User not authenticated');
    }
    await this.notificationsRepo
      .query()
      .whereIn('_id', ids)
      .where(function () {
        this.where({targetKey: ctx.currentUserId}).orWhere({
          targetKey: ctx.accountId,
        });
      })
      .update({
        readAt: null,
      });
  }

  async verifyEmail(verificationId: string) {
    const verification = await this.verificationService._getVerificationById(verificationId);
    if (!verification) return null;
  }

  async sendAccessRequestNotification(
    ctx: RequestContext,
    requester: User,
    accessRequestId: string,
    key: string,
    type: string = 'url',
    details?: any,
  ) {
    const requesterName = requester.displayedName || requester.username || 'A user';
    const requestPath = `/kindredapp/#/settings/useraccessrequests?requestId=${accessRequestId}`;

    let title: string;
    let summary: string;
    if (type === 'time') {
      title = 'More screen time';
      summary = `${requesterName} asked for more screen time.`;
    } else if (type === 'publishedItem') {
      const itemName = details?.srcTitle || 'a catalog item';
      title = 'Library add request';
      summary = `${requesterName} wants "${itemName}" added to their library.`;
    } else if (type === 'item') {
      const itemName = details?.srcTitle || details?.name || 'an item';
      title = 'Library add request';
      summary = `${requesterName} wants "${itemName}" added to their library.`;
    } else if (type === 'earnAccess') {
      // Earn access (HAT-836): the rule's own name is what the parent judges.
      const ruleName = typeof details?.earnAccessRuleName === 'string' ? details.earnAccessRuleName.trim() : '';
      title = 'Earn access';
      summary = ruleName
        ? `${requesterName} is asking you to open "${ruleName}".`
        : `${requesterName} is asking you to open an Earn access rule.`;
    } else if (type === 'checkpoint') {
      title = 'Daily Check-in';
      // Lead with the parent's own reminder when there is one — it is the thing
      // they need to judge, and it may have been written weeks ago.
      const note = typeof details?.checkpointNote === 'string' ? details.checkpointNote.trim() : '';
      summary = note
        ? `${requesterName} is asking to get online. You asked: "${note}"`
        : `${requesterName} is asking to get online.`;
    } else if (type === 'appCapability') {
      const appName = details?.itemName || 'an app';
      const site = parseAppSiteGrantKey(details?.capability);
      const ask = site
        ? `${site.kind === 'fetch' ? 'get data from' : 'send data to'} ${site.host}`
        : `use ${
            details?.capability === 'location'
              ? 'Location'
              : details?.capability === 'capture.photo'
                ? 'Camera'
                : 'a device feature'
          }`;
      title = 'App permission request';
      summary = `${requesterName}'s app "${appName}" wants to ${ask}.`;
    } else if (type === 'pause') {
      // "Ask to install something" (HAT-766), from the Companion or the app. The computer's name when
      // the Companion sent it, so a parent with two of them knows which one.
      const device = typeof details?.srcTitle === 'string' && details.srcTitle.trim() ? details.srcTitle.trim() : '';
      title = 'Pause request';
      summary = device
        ? `${requesterName} asks you to pause restrictions on ${device}, to install something.`
        : `${requesterName} asks you to pause restrictions, to install something.`;
    } else if (type === 'emailSender') {
      const address = (details?.emailAddress || String(key || '').replace(/^EMAIL:/, '') || 'someone new').trim();
      title = 'Email contact request';
      summary = `${requesterName} wants to email ${address}.`;
    } else if (type === 'url') {
      let site = key;
      try {
        site = new URL(key).hostname.replace(/^www\./, '');
      } catch {
        // key isn't a parseable URL — fall back to the raw value
      }
      title = 'Website access request';
      summary = `${requesterName} wants to open ${site}.`;
      // When the assistant looked and stepped aside, its reading is the most
      // useful thing in the notification — it is the difference between "someone
      // wants something" and "here is what it appears to be".
      const assistantReason =
        typeof details?.aiReview?.reasonForParent === 'string' ? details.aiReview.reasonForParent.trim() : '';
      if (assistantReason) {
        summary += ` Assistant: ${assistantReason}`;
      }
    } else {
      title = 'Access request';
      summary = `${requesterName} requested access.`;
    }

    const notificationData = {
      title,
      // The push body falls back to `title`, which is only the request category
      // ("Website access request"). `summary` names who asked and for what, which
      // is the whole value of the notification on a lock screen.
      shortMessage: summary,
      // Keep an inline review link in the message so older clients still have a
      // working way to act; newer clients render a dedicated "Review request" button.
      // The summary is text: the child's name, what they asked for and the assistant's reading.
      message: `${escapeHtml(summary)} <a href="${requestPath}">Review request</a>`,
      emailMessage: `${escapeHtml(summary)}
        <br/>
        <br/>
        <a class="button" href="${config.serverHostname}${requestPath}">Open Request</a>`,

      refInfo: {
        requestId: accessRequestId,
        requesterUsername: requester.username,
        requesterDisplayName: requesterName,
        requestType: type,
        resourceType: type,
        resourceId: key,
        resourceName:
          type === 'time'
            ? 'More screen time'
            : type === 'pause'
              ? 'Pause restrictions'
              : type === 'checkpoint'
                ? 'Daily Check-in'
                : type === 'earnAccess'
                  ? details?.earnAccessRuleName || 'Earn access'
                  : type === 'publishedItem'
                    ? details?.srcTitle || key
                    : key,
      },
    };

    await this.addAccountNotification(
      ctx,
      NotificationType.ACCESS_REQUEST,
      ctx.currentUserId,
      ctx.accountId,
      notificationData,
      true,
    );
    this.nudgeAdminsOfAccessRequest(ctx.accountId);
  }

  /**
   * Tell each admin's open Kindredly that a request came in, so it can show it at once (HAT-658).
   * Content-free: the app reads the request list itself. Never awaited, and never allowed to fail the
   * child's request.
   */
  private nudgeAdminsOfAccessRequest(accountId: string | null | undefined): void {
    if (!accountId) return;
    void (async () => {
      const users = await this.userRepo.listByAccountId(accountId);
      const sse = SSEManager.getInstance();
      for (const user of users.filter((u) => u.type == UserType.admin)) {
        sse.broadcastToUser(user._id, 'accessRequestAdded', {}).catch((e) => {
          console.warn('[access-request] SSE nudge failed', e?.message || e);
        });
      }
    })().catch((e) => console.warn('[access-request] could not list admins to nudge', e?.message || e));
  }

  async notifyOfInvitation(email: string, inviterName: string, accountUser: User, inviteCode: string, message: string) {
    const inviteLink = `${config.serverHostname}/kindredapp/#/joinAccount?accountInvitationCode=${inviteCode}`;
    console.log('Invite Link Created:', inviteLink);

    sendEmail(
      [email],
      `Invitation to join ${inviterName}'s family account`,
      ACCOUNT_INVITE_MSG(accountUser, config, inviteLink, inviteCode, inviterName, message),
      MAIN_EMAIL_TEMPLATE,
      [],
      'Kindredly  <noreply@kindredly.ai>',
    );

    sendEmail(
      [accountUser.email],
      `You sent an invitation to join your family account`,
      INVITATION_TO_ACCOUNT(config, inviteCode, email),
      MAIN_EMAIL_TEMPLATE,
      [],
      'Kindredly  <noreply@kindredly.ai>',
    );
  }

  async sendUserJoinNotification(ctx: RequestContext, newUser: User, users: User[]) {
    if (users.length > 0 && newUser.type == UserType.admin) {
      const adminUsers = users.filter((u) => u.type == UserType.admin && u._id != newUser._id);

      const message = `
            ${newUser.username} (${newUser.email}) accepted your invite and joined your account. 
            <br/>
            <br/> 
            Action Required: You must visit your <a href="TS_BASE_PATH#/settings/encryption">Encryption Settings</a> to give them access to the account encryption key.`;

      const notificationData = {
        title: `[Action Required] A new user has joined the account and need permission to your account encryption key.`,
        message: message.replace(/TS_BASE_PATH/g, '/kindredapp/'),
        emailMessage: message.replace(/TS_BASE_PATH/g, `${config.serverHostname}/kindredapp/`),
        refInfo: {
          action: 'path',
          path: '/settings/encryption?action=shareAccountKey&userId=' + newUser._id,
        },
        highPriority: true,
        actions: [{label: 'Grant Access', name: 'shareKey', data: {userId: newUser._id}}],
      };

      for (const adminUser of adminUsers) {
        this.addUserNotification(
          RequestContext.instanceForSystem(),
          NotificationType.USER_JOINED_ACCOUNT,
          ctx.currentUserId,
          ctx.accountId,
          adminUser._id,
          notificationData,
          true,
        ).catch((e) => {});
      }
    }
  }

  async sendReactionNotifications(currentUser: User, post: any, userIdUpdateList: any[], ctx: RequestContext) {
    const notificationForPosterData = {
      title: `${currentUser.username} reacted to your post`,
      shortMessage: `${currentUser.username} reacted to your post.`,
      message: `<a href="/kindredapp/#/p/${post._id}">View Post</a>`,
      emailMessage: `${currentUser.username} reacted to your post.... <a href="${config.serverHostname}/kindredapp/#/p/${post._id}">view</a>`,
      refInfo: {
        postId: post._id,
      },
    };

    for (const userId of userIdUpdateList) {
      const user = await this.userRepo.findById(userId);
      if (user) {
        ctx.cacheUser(user);
        //check if permissions allow posting to this user
        let postData = notificationForPosterData;
        this.addUserNotification(
          ctx,
          NotificationType.NEW_COMMENT,
          ctx.currentUserId,
          ctx.accountId,
          userId,
          postData,
          true,
        ).catch((err) => {
          console.log(err);
        });
      }
    }
  }

  async notifyCommentPosterAndWatchers(
    currentUser: User,
    post: any,
    commentId: string,
    userIdUpdateList: any[],
    ctx: RequestContext,
  ) {
    const notificationForPosterData = {
      title: `${currentUser.username} commented on your post`,
      shortMessage: `${currentUser.username} added a comment to your post.`,
      message: `<a href="/kindredapp/#/p/${post._id}?commentId=${commentId}">View Comment</a>`,
      emailMessage: `${currentUser.username} commented on your post.... <a href="${config.serverHostname}/kindredapp/#/p/${post._id}?commentId=${commentId}">view</a>`,
      refInfo: {
        commentId: commentId,
        postId: post._id,
        commenterUsername: currentUser.username,
      },
    };

    const notificationForWatcherData = {
      title: `${currentUser.username} added a comment on a post shared with you.`,
      shortMessage: `${currentUser.username} added a comment on a post shared with you.`,
      message: `<a href="/kindredapp/#/p/${post._id}?commentId=${commentId}">View Comment</a>`,
      emailMessage: `${currentUser.username} commented on a post shared with you... <a href="${config.serverHostname}/kindredapp/#/p/${post._id}?commentId=${commentId}">view</a>`,
      refInfo: {
        commentId: commentId,
        postId: post._id,
        commenterUsername: currentUser.username,
      },
    };

    for (const userId of userIdUpdateList) {
      const user = await this.userRepo.findById(userId);
      if (user) {
        ctx.cacheUser(user);
        //check if permissions allow posting to this user
        let postData = userId != post.userId ? notificationForWatcherData : notificationForPosterData;
        this.addUserNotification(
          ctx,
          NotificationType.NEW_COMMENT,
          ctx.currentUserId,
          ctx.accountId,
          userId,
          postData,
          true,
        ).catch((err) => {
          console.log(err);
        });
      }
    }
  }

  notifyItemUsersOfComment(
    currentUser: User,
    refId: string,
    commentId: string,
    userIds: string[],
    ctx: RequestContext,
  ) {
    const notificationData = {
      title: `New Item Comment`,
      shortMessage: `${currentUser.username} added a comment to an item in your library.`,
      message: `${currentUser.username} added a comment to an item in your library. <a href="/kindredapp/#/item/${refId}?commentId=${commentId}">View Comment</a>`,
      emailMessage: `${currentUser.username} added a commented to an item in your library. <a href="${config.serverHostname}/kindredapp/#/item/${refId}?commentId=${commentId}">view</a>`,
      refInfo: {
        commentId: commentId,
        refType: 'item',
        refId: refId,
        commenterUsername: currentUser.username,
      },
    };
    for (const userId of userIds) {
      if (userId == ctx.currentUserId) continue;

      this.addUserNotification(
        ctx,
        NotificationType.NEW_COMMENT,
        ctx.currentUserId,
        ctx.accountId,
        userId,
        notificationData,
        true,
      ).catch((err) => {
        console.log(err);
      });
    }
  }

  async sendFriendRequestNotification(ctx: RequestContext, userId: any, accountId: any) {
    const notificationData = {
      title: `You have one or more friend requests`,
      message: `<a href="/kindredapp/#/people?show=friends">View</a> your friend requests`,
      emailMessage: `<a href="${config.serverHostname}/kindredapp/#/people?show=friends">View</a> your friend requests`,
    };
    await this.addUserNotification(ctx, NotificationType.FRIEND_REQUEST, userId, accountId, userId, notificationData);
  }

  createFriendRequestNotification(
    displayedInviterName: any,
    targetUser: User,
    message: any,
    id1: string,
    targetUserId: any,
    ctx: RequestContext,
    friendUser: any,
  ) {
    // The sender writes their name and the message: escaped where they go into HTML.
    const fromHtml =
      escapeHtml(displayedInviterName) + (targetUser?.email ? ' (' + escapeHtml(targetUser.email) + ')' : '');
    const notificationData = {
      title: `Friend Request from ${displayedInviterName}`,
      shortMessage: `You have a new friend request from ${displayedInviterName}${targetUser?.email ? ' (' + targetUser.email + ')' : ''}!${message ? ' --' + message : ''}!`,
      message: `You have a new friend request from ${fromHtml}! <br/><br/>${message ? 'Invite Message:' + escapeHtml(message) : ''}<br/> <br/><a href="/kindredapp/#/people?show=friends">Click here to approve or deny friend requests</a>`,
      emailMessage: `You have a new friend request from ${fromHtml}!  <br/> <br/><a href="${config.serverHostname}/kindredapp/#/people?show=friends">Click here to approve or deny friend requests</a>`,
      refInfo: {
        friendRequestId: id1,
        requestingUserId: targetUserId,
        requestingUserEmail: targetUser.email,
        requestingUserUsername: targetUser.username,
      },
    };
    this.addUserNotification(
      ctx,
      NotificationType.FRIEND_REQUEST,
      ctx.currentUserId,
      friendUser.accountId,
      friendUser._id,
      notificationData,
      true,
    ).catch((e) => {
      console.log('Error sending friend request notification', e);
    });
  }

  sendFriendRequestEmail(inviterName: any, accountUser: any, email: any, message: any) {
    const displayedInviterName = inviterName || accountUser.email;
    sendEmail(
      [email],
      friendRequestTemplate.subject(displayedInviterName),
      friendRequestTemplate.content(displayedInviterName, message, accountUser),
      MAIN_EMAIL_TEMPLATE,
      [],
      config.notificationSourceEmailString,
    );
  }
}

export default NotificationService;
