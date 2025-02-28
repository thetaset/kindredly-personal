import { RequestContext } from "@/base/request_context";
import { v4 as uuidv4 } from "uuid";

import { CommentRepo } from "@/db/comment.repo";
import { UserRepo } from "@/db/user.repo";
import { UserFeedRepo } from "@/db/user_feed.repo";
import { DynObj } from "@/types";
import { filterToFields } from "@/utils/parse_utils";
import { ReactionRepo } from "@/db/reaction.repo";

class UserFeedService {
  private userFeed = new UserFeedRepo();
  private usersRepo = new UserRepo();
  private commentsRepo = new CommentRepo();
  private reactionsRepo = new ReactionRepo();

  _feedQuery(userId) {
    return this.userFeed
      .query()
      .from("user_feed")
      .where("user_feed.userId", userId)
      .whereNot("user_feed.isDeleted", true)
      .leftJoin("post", "post._id", "user_feed.refId")
      .leftJoin("user", "user._id", "post.userId")
      .where("post.deletedAt", null);
  }

  async listByUserId(
    ctx: RequestContext,
    targetUserId: string,
    pageInfo: DynObj,
    includeComments = false,
    includeReactions = true,
    newOnly = false
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const { currentPage, perPage, includeTotalRows } = pageInfo;
    const feedEntries = await this._feedQuery(targetUserId)
      .limit(perPage)
      .offset(currentPage * perPage)
      .orderBy("user_feed.createdAt", "desc")
      .select(
        "post.*",
        "user.username",
        "user.displayedName",
        "user.profileImage",
        "user_feed.createdAt as feedCreatedAt",
        "user_feed._id as feedId",
        "user_feed.isRead as feedIsRead",
        "user_feed.info as feedInfo",
        "user_feed.refType as refType"
      );
    const commentsLookup: Record<string, any[]> = {};
    const postIds = feedEntries
      .filter((v) => v.refType == "post")
      .map((v) => v._id);

    if (includeComments) {
      const comments = await this.commentsRepo
        .query()
        .from("comment")
        .where("comment.refType", "post")
        .whereIn("comment.refId", postIds)
        .where("deletedAt", null)

        .join("user", "user._id", "comment.userId")
        .select(
          "comment.*",
          "user.username",
          "user.profileImage",
          "user.displayedName"
        )
        .orderBy("createdAt", "asc");

      // console.log('LOading comments', comments, postIds);
      comments.forEach((v) => {
        if (!commentsLookup[v.refId]) commentsLookup[v.refId] = [];
        commentsLookup[v.refId].push(v);
      });
    }
    const reactionLookup: Record<string, any[]> = {};

    if (includeReactions) {
      const reactions = await this.reactionsRepo
        .query()
        .from("reaction")
        .where("reaction.refType", "post")
        .whereIn("reaction.refId", postIds)
        .join("user", "user._id", "reaction.userId")
        .select(
          "reaction.*",
          "user.username",
          "user.profileImage",
          "user.displayedName"
        )
        .orderBy("createdAt", "asc");

      reactions.forEach((v) => {
        if (!reactionLookup[v.refId]) reactionLookup[v.refId] = [];
        reactionLookup[v.refId].push(v);
      });
    }

    const usersIds = [];
    feedEntries.forEach((v) => {
      if (v.sharedWith) usersIds.push(...v.sharedWith);
    });

    const userList = (await this.usersRepo.findWhereIdIn(usersIds)).map((v) =>
      filterToFields(["_id", "profileImage", "username", "displayedName"], v)
    );
    const userLookup = Object.fromEntries(userList.map((v: any) => [v._id, v]));

    const results = feedEntries.map((v) => {
      if (v.refType == "post" && v.sharedWith) {
        v.sharedWithUsers = v.sharedWith.map((v) => userLookup[v]);
      }

      let data = null;
      if (v.refType == "post") {
        data = {
          ...v,
          comments: commentsLookup[v._id] || [],
          reactions: reactionLookup[v._id] || [],
        };
      }
      return {
        _id: v.feedId,
        refType: v.refType,
        feedEntry: {
          _id: v.feedId,
          isRead: v.feedIsRead,
          feedInfo: v.feedInfo,
          createdAt: v.feedCreatedAt,
        },
        data,
      };
    });
    if (!includeTotalRows) return { records: results, count: null };
    return { records: results, count: 1000 };
  }

  _feedQuery2(userId, refId) {
    return this.userFeed
      .query()
      .from("user_feed")
      .where("user_feed.refId", refId)
      .where("user_feed.refType", "post")
      .where("user_feed.userId", userId)
      .whereNot("user_feed.isDeleted", true)
      .join("post", "post._id", "user_feed.refId")
      .join("user", "user._id", "post.userId");
    // .where('post.deletedAt', null);
  }

  async getByPostId(ctx: RequestContext, targetUserId: string, postId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const post = await this._feedQuery2(targetUserId, postId)
      .select(
        "post.*",
        "user.username",
        "user.profileImage",
        "user.displayedName",
        "user_feed.createdAt as feedCreatedAt",
        "user_feed._id as feedId",
        "user_feed.isRead as feedIsRead",
        "user_feed.info as feedInfo"
      )
      .first();

    if (!post) throw new Error("Post not found :" + postId);

    if (post?.deletedAt) return { _id: postId, deletedAt: post?.deletedAt };

    const comments = await this.commentsRepo
      .query()
      .from("comment")
      .where("comment.refType", "post")
      .where("comment.refId", "=", postId)
      .where("deletedAt", null)

      .join("user", "user._id", "comment.userId")
      .select(
        "comment.*",
        "user.username",
        "user.profileImage",
        "user.displayedName"
      )
      .orderBy("createdAt", "asc");


      const reactions = await this.reactionsRepo
      .query()
      .from("reaction")
      .where("reaction.refType", "post")
      .where("reaction.refId",'=', postId)
      .join("user", "user._id", "reaction.userId")
      .select(
        "reaction.*",
        "user.username",
        "user.profileImage",
        "user.displayedName"
      )
      .orderBy("createdAt", "asc");


    post.sharedWithUsers = (
      await this.usersRepo.findWhereIdIn(post.sharedWith)
    ).map((v) =>
      filterToFields(["_id", "profileImage", "username", "displayedName"], v)
    );

    return {
      _id: post.feedId,
      refType: post.refType,
      feedEntry: {
        _id: post.feedId,
        isRead: post.feedIsRead,
        feedInfo: post.feedInfo,
        createdAt: post.feedCreatedAt,
      },
      data: { ...post, comments: comments, reactions },
    };
  }

  // ROUTE-METHOD
  async countUnreadByUserId(ctx: RequestContext) {
    const count = Number(
      (
        await this._feedQuery(ctx.currentUserId)
          .whereNot("user_feed.isRead", true)
          .count()
          .first()
      ).count
    );

    return count;
  }

  async removeById(ctx: RequestContext, id: string) {
    const feed = await this.userFeed.findById(id);
    await ctx.verifySelfOrAdminOverUser(feed.userId);

    return await this.userFeed.updateWithId(id, { isDeleted: true });
  }

  async removeByPostId(ctx: RequestContext, targetUserId: string, id: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    const feed = await this.userFeed.findMany({
      userId: targetUserId,
      refType: "post",
      refId: id,
    });

    if (feed.length > 0) {
      await this.userFeed.updateWithId(feed[0]._id, { isDeleted: true });
    } else {
      throw new Error(
        `Post with id ${id} not found in user feed. Please check the id and try again.`
      );
    }
  }

  // ROUTE-METHOD
  // TODO: fix this at some point, currently marks all as read
  async updateReadStatusForMultipleEntries(
    ctx: RequestContext,
    ids: string[],
    isRead: boolean
  ) {
    await this.userFeed
      .query()
      .where("userId", ctx.currentUserId)
      .whereNot("isRead", true)
      // .whereIn("user_feed._id", ids)
      .update({ isRead: isRead });
  }


  // ROUTE-METHOD
  async updateReadStatus(
    ctx: RequestContext,
    id: string,
    isRead: boolean,
    commentIds: Array<string>
  ) {
    const feed = await this.userFeed.findMany({
      userId: ctx.currentUserId,
      refType: "post",
      refId: id,
    });

    if (feed.length > 0) {
      const feedItem = feed[0];
      const origUnReadCommentIds = feedItem.info?.unReadCommentIds || [];
      const unReadCommentIds: Array<string> = [];

      if (!isRead) {
        unReadCommentIds.push(...origUnReadCommentIds);
        unReadCommentIds.push(...commentIds);
      } else {
        for (const commentId of origUnReadCommentIds) {
          if (!commentIds.includes(commentId)) {
            unReadCommentIds.push(commentId);
          }
        }
      }

      await this.userFeed.updateWithId(feedItem._id, {
        isRead,
        info: { ...feedItem.info, unReadCommentIds: unReadCommentIds },
      });
    } else {
      throw new Error(
        `Post with id ${id} not found in user feed. Please check the id and try again.`
      );
    }
  }

  async add(
    ctx: RequestContext,
    targetUserId: string,
    refType: string,
    refId: string,
    info: any = null
  ) {
    const feedId = "feed_" + uuidv4();

    const currentTimeSt = new Date();

    const feedEntry = {
      _id: feedId,
      userId: targetUserId,
      refType: refType,
      refId: refId,
      createdAt: currentTimeSt,
      updatedAt: currentTimeSt,
      info: info,
    };

    return await this.userFeed.create(feedEntry);
  }
}

export default UserFeedService;
