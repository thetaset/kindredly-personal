import { RequestContext } from "@/base/request_context";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../utils/email_utils";

import { friendRequestTemplate, MAIN_EMAIL_TEMPLATE } from '@/templates/email.templates';

import { config } from "@/config";
import { NotificationRepo } from "@/db/notification.repo";
import { UserRepo } from "@/db/user.repo";
import { UserPrefKeys, UserPrefRepo } from "@/db/user_pref.repo";
import  Notification from "@/schemas/public/Notification";
import User from "@/schemas/public/User";
import {
  NotificationGroupType,
  NotificationMethod,
  NotificationType,
} from "@/typing/enum_strings";
import { UserType } from "tset-sharedlib/shared.types";
import ClientInfoService from "./client_info.service";
import VerificationService from "./verification.service";
import { ACCOUNT_INVITE_MSG, INVITATION_TO_ACCOUNT } from "@/defaults/message_templates";

const typeToTitle = {
  WELCOME_USER: "Welcome to Kindredly!",
  FRIEND_REQUEST: "New Friend Request",
  ACCESS_REQUEST: "New Access Request",
  ACCESS_REQUEST_UPDATE: "Access Request Update",
  NEW_POST: "New Post",
  NEW_COMMENT: "New Comment",
  NEW_ITEM: "New Item Added to Your Library",
  SHARED_ITEM: "New Shared Item",
};

function notiticationTypeToTitle(type: string) {
  if (typeToTitle[type]) {
    return typeToTitle[type];
  } else {
    return "New Notification";
  }
}

const maxAgeOfDevicesInDays = 10;
import { TYPES } from "@/types";
import type SetupService from "./_interfaces/syssetup.service";
import { inject } from "inversify";
class NotificationService {

  constructor(@inject(TYPES.SetupService) private setupService: SetupService) {}

  private userRepo = new UserRepo();
  private notificationsRepo = new NotificationRepo();
  private verificationService = new VerificationService();
  private clientInfoService = new ClientInfoService();
  private userPrefRepo = new UserPrefRepo();

  async sendPushNotificationToAllUserDevices(
    userId: string,
    notification: { title: string; body: string },
    data: any
  ) {
    const tokens = await this.clientInfoService.listDeviceTokensUsedSinceXDaysAgo(
      userId,
      maxAgeOfDevicesInDays
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
          targetUserId: userId,
        },
        tokens: tokens,
      };

      console.log("Sending push notification", message);

      this.setupService.sendPushNotification(message);
    }
  }


  async sendPushNotificationToAllUserDevicesMultipleUsers(
    userIds: string[],
    notification: { title: string; body: string },
    data: any
  ) {
    const tokens = await this.clientInfoService.listDeviceTokensForUsersUsedSinceXDaysAgo(
      userIds,
      maxAgeOfDevicesInDays
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
          targetUserType: "ADMIN",
        },
        tokens,
      };
    
    this.setupService.sendPushNotification(message);

    }
  }

  async canSend(
    notificationSettings: Record<string, any>,
    method: string,
    type: string
  ) {
    if (type == NotificationType.USER_JOINED_ACCOUNT) {
      return true;
    }

    if (!!notificationSettings && notificationSettings[type]) {
      return notificationSettings[type][method] == true;
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
    },
    sendPush = false
  ) {
    const targetUser = await this.userRepo.findById(targetUserId);

    const notificationSettings = await this.userPrefRepo.getUserPref(
      targetUserId,
      UserPrefKeys.notificationSettings
    );

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
    if (
      sendPush &&
      (await this.canSend(notificationSettings, NotificationMethod.push, type))
    ) {
      this.sendPushNotificationToAllUserDevices(
        targetUserId,
        {
          title: notiticationTypeToTitle(type),
          body: data.shortMessage || data.title,
        },
        {
          ...data.refInfo,
          type: type,
        }
      ).catch((err) => {
        console.log(err);
      });
    }

    //EMAIL NOTIFICATIONS
    if (
      await this.canSend(notificationSettings, NotificationMethod.email, type)
    )
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
    }
  ) {
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
      ].includes(type)
    ) {
      if (targetUser.email != null && targetUser.email.length > 0) {
        sendEmail(
          [targetUser.email],
          data.title || "New Notification",
          `${data.emailMessage || data.message || "New Notification"}
                <br/>
                <br/>
                <a href="${
                  config.serverHostname
                }/kindredapp/#/?show=notifications">View all my notifications</a>.
                <br/>
                <br/>
                <br/>
                <a href="${config.serverHostname}">kindredly.ai</a>.
                <br/>`,
          MAIN_EMAIL_TEMPLATE,
          [],
          "Kindredly <notify-noreply@thetaset.com>"
        );
      }
    }
  }


  // ROUTE-METHOD
  async removeNotificationById(ctx: RequestContext, id: string) {
    const notification = await this.notificationsRepo.findById(id);
    if (
      notification &&
      (notification.targetKey == ctx.accountId ||
        notification.targetKey == ctx.currentUserId)
    ) {
      await this.notificationsRepo.deleteWithId(id); //todo, pass check auth function
      if (notification.type == NotificationGroupType.USER) {
        await this.listUserNotifcations(ctx);
      }
    } else {
      console.error("Unable to remove notification", id);
    }
  }

  // ROUTE-METHOD
  async clearNotifications(ctx: RequestContext) {
    if (await ctx.isAdmin()) {
      await this.notificationsRepo.deleteWhere({ targetKey: ctx.accountId });
    }
    await this.notificationsRepo.deleteWhere({ targetKey: ctx.currentUserId });
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
    },
    sendPush = false
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

    const adminUserIds = users
      .filter((v) => v.type == UserType.admin)
      .map((v) => v._id);

    // TODO: Check notification settings

    this.sendPushNotificationToAllUserDevicesMultipleUsers(
      adminUserIds,
      {
        title: notiticationTypeToTitle(type),
        body: data.shortMessage || data.title,
      },
      {
        type: type,
        ...data.refInfo,
        sysId: id,
      }
    ).catch((err) => {
      console.log(err);
    });

    //Send email to all account admins
    if (["ACCESS_REQUEST"].includes(type)) {
      for (const user of users) {
        if (
          user.type == "admin" &&
          user.email != null &&
          user.email.length > 0
        ) {
          sendEmail(
            [user.email],
            data.title || "New Access Request",
            `${data.emailMessage || data.message || "New Access Request"}

                    <br/>
                    <br/>
                    <br/>
                    
                    
                    <a href="${
                      config.serverHostname
                    }/kindredapp/#/settings/useraccessrequests"> - View Access Requests</a>
                       <br/>
                       <br/>
                <a href="${
                  config.serverHostname
                }/kindredapp/#/notifications"> - View all my notifications</a>
                <br/>
                <br/>`,
            MAIN_EMAIL_TEMPLATE,
            [],
            "Kindredly <notify-noreply@thetaset.com>"
          );
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
    let { page, pageSize, sort, order, unreadOnly } = pageInfo || {
      page: 0,
      pageSize: 30,
      sort: "createdAt",
      order: "desc",
      unreadOnly: false,
    };

    const notifications = await this.notificationsRepo
      .findMany({
        targetKey: ctx.currentUserId,
      })
      .where(function () {
        if (unreadOnly) {
          this.whereNull("readAt").orWhere("readAt", null);
        }
      })
      .orderBy(sort, order)
      .limit(pageSize)
      .offset(page * pageSize);

    const user = await ctx.getCurrentUser();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.type == UserType.admin) {
      const accountNotifications = await this._listAccountNotifcations(
        ctx.accountId
      );
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
        this.whereNull("readAt").orWhere("readAt", null);
      });
    let cnt = await this.notificationsRepo.countFromQuery(query1);

    if (await ctx.isAdmin()) {
      let query1 = this.notificationsRepo
        .query()
        .where({
          targetKey: ctx.accountId,
        })
        .where(function () {
          this.whereNull("readAt").orWhere("readAt", null);
        });
      cnt += await this.notificationsRepo.countFromQuery(query1);
    }
    return cnt;
  }


  // ROUTE-METHOD
  async markNotificationsAsRead(ctx: RequestContext, ids: string[]) {
    if (!ctx.isAuthenticated()) {
      throw new Error("User not authenticated");
    }
    await this.notificationsRepo
      .query()
      .whereIn("_id", ids)
      .where(function () {
        this.where({ targetKey: ctx.currentUserId }).orWhere({
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
      throw new Error("User not authenticated");
    }
    await this.notificationsRepo
      .query()
      .whereIn("_id", ids)
      .where(function () {
        this.where({ targetKey: ctx.currentUserId }).orWhere({
          targetKey: ctx.accountId,
        });
      })
      .update({
        readAt: null,
      });
  }

  async verifyEmail(verificationId: string) {
    const verification = await this.verificationService._getVerificationById(
      verificationId
    );
    if (!verification) return null;
  }

  async sendAccessRequestNotification(ctx: RequestContext, requester: User, accessRequestId: string, key: string) {
    const notificationData = {
      title: `Access Request from ${requester.username} to ${key}`,
      message: `<a href="/kindredapp/#/settings/useraccessrequests?requestId=${accessRequestId}">Access request</a> from ${requester.username} to ${key}`,
      emailMessage: `Access Request from ${requester.username} to ${key}.
        <br/>
        <br/>
        <a class="button" href="${config.serverHostname}/kindredapp/#/settings/useraccessrequests?requestId=${accessRequestId}">Open Request</a>`,

      refInfo: {
        'requestId': accessRequestId,
        'requesterUsername': requester.username,
        'resourceType': 'url',
        'resourceId': key,
        'resourceName': key
      }
    };

    await this.addAccountNotification(
      ctx,
      NotificationType.ACCESS_REQUEST,
      ctx.currentUserId,
      ctx.accountId,
      notificationData
    );
  }


  async notifyOfInvitation(email: string, inviterName: string, accountUser: User, inviteCode: string, message: string) {

    const inviteLink = `${config.serverHostname}/kindredapp/#/joinAccount?accountInvitationCode=${inviteCode}`;
    console.log("Invite Link Created:", inviteLink);

    sendEmail(
      [email],
      `Invitation to join ${inviterName}'s family account`,
      ACCOUNT_INVITE_MSG(accountUser, config, inviteLink, inviteCode, inviterName, message),
      MAIN_EMAIL_TEMPLATE,
      [],
      "Kindredly  <noreply@kindredly.ai>"
    );

    sendEmail(
      [accountUser.email],
      `You sent an invitation to join your family account`,
      INVITATION_TO_ACCOUNT(config, inviteCode, email),
      MAIN_EMAIL_TEMPLATE,
      [],
      "Kindredly  <noreply@kindredly.ai>"
    );
  }


   async sendUserJoinNotification(ctx: RequestContext, newUser: User, users: User[]) {

      if (users.length > 0 && newUser.type == UserType.admin) {
        const adminUsers = users.filter(
          (u) => u.type == UserType.admin && u._id != newUser._id
        );
  
        const message = `
            ${newUser.username} (${newUser.email}) accepted your invite and joined your account. 
            <br/>
            <br/> 
            Action Required: You must visit your <a href="TS_BASE_PATH#/settings/encryption">Encryption Settings</a> to give them access to the account encryption key.`;
  
        const notificationData = {
          title: `[Action Required] A new user has joined the account and need permission to your account encryption key.`,
          message: message.replace(/TS_BASE_PATH/g, "/kindredapp/"),
          emailMessage: message.replace(
            /TS_BASE_PATH/g,
            `${config.serverHostname}/kindredapp/`
          ),
          refInfo: {
            action: "path",
            path: "/settings/encryption?action=shareAccountKey&userId=" + newUser._id,
          },
          highPriority: true,
          actions: [
            { label: "Grant Access", name: "shareKey", data: { userId: newUser._id } },
          ],
        };
  
        for (const adminUser of adminUsers) {
          this
            .addUserNotification(
              RequestContext.instanceForSystem(),
              NotificationType.USER_JOINED_ACCOUNT,
              ctx.currentUserId,
              ctx.accountId,
              adminUser._id,
              notificationData,
              true
            )
            .catch((e) => { });
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
            this
              .addUserNotification(
                ctx,
                NotificationType.NEW_COMMENT,
                ctx.currentUserId,
                ctx.accountId,
                userId,
                postData,
                true
              )
              .catch((err) => {
                console.log(err);
              });
          }
        }
      }


   async notifyCommentPosterAndWatchers(currentUser: User, post: any, commentId: string, userIdUpdateList: any[], ctx: RequestContext) {
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
        this
          .addUserNotification(ctx, NotificationType.NEW_COMMENT, ctx.currentUserId, ctx.accountId, userId, postData, true)
          .catch((err) => {
            console.log(err);
          });
      }
    }
  }

   notifyItemUsersOfComment(currentUser: User, refId: string, commentId: string, userIds: string[], ctx: RequestContext) {
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
  
        this
          .addUserNotification(
            ctx,
            NotificationType.NEW_COMMENT,
            ctx.currentUserId,
            ctx.accountId,
            userId,
            notificationData,
            true
          )
          .catch((err) => {
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
        await this.addUserNotification(
          ctx,
          NotificationType.FRIEND_REQUEST,
          userId,
          accountId,
          userId,
          notificationData
        );
      }

       createFriendRequestNotification(displayedInviterName: any, targetUser: User, message: any, id1: string, targetUserId: any, ctx: RequestContext, friendUser: any) {
        const notificationData = {
          title: `Friend Request from ${displayedInviterName}`,
          shortMessage: `You have a new friend request from ${displayedInviterName}${targetUser?.email ? " (" + targetUser.email + ")" : ""}!${message ? " --" + message : ""}!`,
          message: `You have a new friend request from ${displayedInviterName}${targetUser?.email ? " (" + targetUser.email + ")" : ""}! <br/><br/>${message ? 'Invite Message:' + message : ''}<br/> <br/><a href="/kindredapp/#/people?show=friends">Click here to approve or deny friend requests</a>`,
          emailMessage: `You have a new friend request from ${displayedInviterName}${targetUser?.email ? " (" + targetUser.email + ")" : ""}!  <br/> <br/><a href="${config.serverHostname}/kindredapp/#/people?show=friends">Click here to approve or deny friend requests</a>`,
          refInfo: {
            friendRequestId: id1,
            requestingUserId: targetUserId,
            requestingUserEmail: targetUser.email,
            requestingUserUsername: targetUser.username,
          }
        };
        this.addUserNotification(
          ctx,
          NotificationType.FRIEND_REQUEST,
          ctx.currentUserId,
          friendUser.accountId,
          friendUser._id,
          notificationData,
          true
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
          config.notificationSourceEmailString
        );
      }
    
}

export default NotificationService;
