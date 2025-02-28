import { config } from '@/config';

import { sendEmail } from '../utils/email_utils';
import EventAuditService from './record_event.service';

import { MAIN_EMAIL_TEMPLATE, KEY_DIL, friendRequestTemplate } from '@/templates/email.templates';

import NotificationService from './notification.service';
import { FriendRepo } from '@/db/friend.repo';
import { UserRepo } from '@/db/user.repo';
import { RequestContext } from '../base/request_context';
import { EventRecordName, EventRecordType, NotificationType } from '@/typing/enum_strings';
import { BasicFriendInfo, filterBasicFriendInfo } from "@/utils/user.utils";
import { container } from '@/inversify.config';

class FriendService {
  private users = new UserRepo();
  private evenLogService = new EventAuditService();
  private notificationsService = container.resolve(NotificationService);
  private friends = new FriendRepo();

  async checkFriendRequestsForNewAccount(ctx: RequestContext, userId, accountId, email) {
    if (!email) return;
    const friendsIn = await this.friends.findMany({ friendUserId: email });

    if (friendsIn && friendsIn.length > 0) {
      await this.notificationsService.sendFriendRequestNotification(ctx, userId, accountId);
    }
  }



  private async _getBasicUserInfoLookupByIds(ids: string[]): Promise<Record<string, BasicFriendInfo>> {
    const users = await this.users.findWhereIdIn(ids);
    let friends = filterBasicFriendInfo(users);
    return Object.fromEntries(friends.map((v) => [v.userId, v]));

  }

  async getFriends(ctx: RequestContext, targetUserId: string) {
    const targetUser = await ctx.getUserById(targetUserId);
    await ctx.verifySelfOrAdmin(targetUserId);
    ///TODO: Join with users to get user info

    const friendsOut = await this.friends.findMany({ userId: targetUserId });

    const friendsIn = await this.friends.findMany({ friendUserId: targetUserId });

    if (targetUser.email) {
      const friendInByEmail = await this.friends.findMany({ friendUserId: targetUser.email });
      friendsIn.push(...friendInByEmail);
    }

    const requestedOutBound = friendsOut
      .filter((v) => !v.confirmed && v.requester && !v.denied)
      .map((v) => {
        return { userId: v.friendUserId, createdAt: v.createdAt };
      });

    const requestedInBound = friendsIn
      .filter((v) => !v.confirmed && v.requester && !v.denied)
      .map((v) => {
        return { userId: v.userId, createdAt: v.createdAt };
      });

    //TODO: check if in both out and in bound, if so. confirm as friend
    const friends = friendsOut
      .filter((v) => v.confirmed)
      .map((v) => {
        return {
          _id: v.friendUserId,
          userId: v.friendUserId,
          friendshipCreatedAt: v.createdAt
        };
      });

    function combineDicts(d1, d2) {
      return { ...d1, ...d2 };
    }

    const lookup = await this._getBasicUserInfoLookupByIds([
      ...requestedOutBound.map((v) => v.userId),
      ...requestedInBound.map((v) => v.userId),
      ...friends.map((v) => v.userId),
    ]);

    return {
      friends: friends.map((v) => combineDicts(v, lookup[v.userId])),
      requestedOutBound: requestedOutBound.map((v) => combineDicts(v, lookup[v.userId])).map(v => {
        v.profileImage = null
        return v;
      }),
      requestedInBound: requestedInBound.map((v) => combineDicts(v, lookup[v.userId])),
    };
  }

  createFriendId(userId, friendUserId) {
    return `${userId}${KEY_DIL}${friendUserId}`;
  }

  async getFriendProfile(ctx: RequestContext, targetUserId:string, friendUserId:string) {
    const user = await this.users.findById(targetUserId);
    await ctx.verifySelfOrAdmin(targetUserId);

    const friendEntry = await this.friends.findById(this.createFriendId(targetUserId, friendUserId));
    if (!friendEntry.confirmed) throw new Error('Access denied');

    const friend = await this.users.findById(friendUserId);
    if (!friend) throw new Error('User not found');

    const displayedName = friendEntry.nickname || friend.username;

    const collections = [];
    const publicId = friend.publicId;
    const publicUser = {};

    return {
      username: friend.username,
      publicId: publicId,
      publicUser: publicUser,
      displayedName: displayedName,
      collections,
    };
  }

  async checkFriendship(userId:string, friendUserId:string) {
    const id1 = this.createFriendId(userId, friendUserId);
    const id2 = this.createFriendId(friendUserId, userId);
    const friendRels = await this.friends.findWhereIdIn([id1,id2]);
    if (friendRels.length == 2){
      return friendRels[0].confirmed && friendRels[1].confirmed;
    }
    else
      return false
  }

  async confirmFriend(ctx: RequestContext, targetUserId: string, friendUserId: string) {
    const user = await this.users.findById(targetUserId);
    await ctx.verifySelfOrAdmin(targetUserId);

    const id1 = this.createFriendId(targetUserId, friendUserId);
    const friendEntry1 = await this.friends.findById(id1);
    if (friendEntry1 && friendEntry1.requester) {
      throw new Error('Cannot confirm friend you requested');
    }
    const id2 = this.createFriendId(friendUserId, targetUserId);
    let friendEntry2 = await this.friends.findById(id2);
    const nowSt = new Date();

    //incase you didn't have an account (or this email) when friend request occurred
    if (!friendEntry2 && user.email) {
      const emailBasedId = this.createFriendId(friendUserId, user.email);
      friendEntry2 = await this.friends.findById(emailBasedId);

      //if exist, then replace with id based
      if (friendEntry2) {
        const info2 = {
          _id: id2,
          userId: friendUserId,
          friendUserId: targetUserId,
          requester: true,
          confirmed: false,
          denied: false,
          createdAt: friendEntry2.createdAt,
        };
        //save new
        await this.friends.create(info2);
        //remove old
        await this.friends.deleteWithId(emailBasedId);
      }
    }

    if (!friendEntry2) {
      throw new Error('No such friend request exists');
    }

    // confirm request
    const info1 = {
      _id: id1,
      userId: targetUserId,
      friendUserId: friendUserId,
      requester: false,
      confirmed: true,
      denied: false,
      createdAt: nowSt,
    };
    await this.friends.create(info1);
    await this.friends.updateWithId(id2, { confirmed: true, denied: false });
  }

  async cancelRemoveFriend(ctx: RequestContext, targetUserId, friendUserId) {
    await ctx.verifySelfOrAdmin(targetUserId);

    await this.friends.deleteWithId(this.createFriendId(friendUserId, targetUserId));
    await this.friends.deleteWithId(this.createFriendId(targetUserId, friendUserId));
  }

  async denyFriend(ctx: RequestContext, targetUserId, friendUserId) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const id1 = this.createFriendId(friendUserId, targetUserId);

    await this.friends.updateWithId(id1, { denied: true });
  }

  async sendFriendRequest(ctx: RequestContext, targetUserId, requestData) {
    const targetUser = await ctx.getUserById(targetUserId);
    await ctx.verifySelfOrAdmin(targetUserId);

    if (!requestData || !requestData.email) {
      throw new Error('invalid friend request');
    }
    const now = new Date();

    let friendUser = await this.users.findByEmail(requestData.email);

    if (!friendUser) {
      friendUser = await this.users.findByUsername(requestData.email);
    }

    if (!friendUser) {
      console.log('No user with that email exists.');
      this._createFriendInvite(ctx.currentUserId, ctx.accountId, targetUserId, requestData).catch((e) => {
        console.log('Error sending friend invite', e)
      });
      const friendId = requestData.email;
      const id1 = this.createFriendId(targetUserId, friendId);
      const info1 = {
        _id: id1,
        userId: targetUserId,
        friendUserId: friendId,
        requester: true,
        confirmed: false,
        denied: false,
        createdAt: now,
      };

      await this.friends.create(info1);
      return true;
    } else if (friendUser.accountId == ctx.accountId) {
      throw new Error("You can't send friend requests to family members");
    } else {
      const id1 = this.createFriendId(targetUserId, friendUser._id);
      const friendEntry = await this.friends.findById(id1);
      if (friendEntry && friendEntry.confirmed) {
        return;
      }
      const info1 = {
        _id: id1,
        userId: targetUserId,
        friendUserId: friendUser._id,
        requester: true,
        confirmed: false,
        denied: false,
        createdAt: now,
      };

      //TODO, create friend request notification
      const { email, inviterName, message } = requestData;
      const displayedInviterName = inviterName || targetUser.email;

      this.notificationsService.createFriendRequestNotification(displayedInviterName, targetUser, message, id1, targetUserId, ctx, friendUser);

      await this.friends.create(info1);
    }
  }



  async _createFriendInvite(currentUserId, accountId, userId, inviteData) {
    const { email, inviterName, message } = inviteData;

    const accountUser = await this.users.findById(userId);
    this.notificationsService.sendFriendRequestEmail(inviterName, accountUser, email, message);

    this.evenLogService.recordEvent({
      eventName: EventRecordName.FRIEND_INVITE,
      eventType: EventRecordType.EXPLICIT,
      accountId,
      userId,
    });
    return true;
  }



}

export default FriendService;
