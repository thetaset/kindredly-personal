import { ItemFeedbackRepo } from "@/db/item_feedback.repo";
import { PostRepo } from "@/db/post.repo";
import { ReactionRepo } from "@/db/reaction.repo";
import { KEY_DIL } from '@/templates/email.templates';
import NotificationService from "./notification.service";
import { RequestContext } from "../base/request_context";
import { container } from "@/inversify.config";

enum FeedbackRefType {
  POST = "post",
}

interface Reaction {
  _id: string;
  refId: string;
  refType: string;
  userId: string;
  reaction: string;
  createdAt: Date;
}

class FeedbackService {
  public itemFeedbackRepo = new ItemFeedbackRepo();
  public reactionRepo = new ReactionRepo();
  private posts = new PostRepo();
  private notificationsService = container.resolve(NotificationService);


  // Feedback id
  feedbackId(userId: string, itemId: string): string {
    return `${userId}${KEY_DIL}${itemId}`;
  }

  
  // ROUTE-METHOD
  async listReactionsForRef(ctx: RequestContext, refId: string, refType: FeedbackRefType): Promise<any[]> {

    if (refType == FeedbackRefType.POST) {
      if (!this._hasPostAccess(ctx, refId)) {
        throw new Error("You do not have access to react to this post");
      }

    } else {
      throw new Error("Invalid refType");
    }

    const reactions = await this.reactionRepo
      .query()
      .from("reaction")
      .where("reaction.refType", refType)
      .where("reaction.refId", "=", refId)
      .join("user", "user._id", "reaction.userId")
      .select(
        "reaction.*",
        "user.username",
        "user.profileImage",
        "user.displayedName"
      )
      .orderBy("createdAt", "asc");
    return reactions;
  }

  async _hasPostAccess(ctx: RequestContext, postId: string): Promise<boolean> {
    let post = await this.posts.findById(postId);

    if (post.userId != ctx.currentUserId && !post.sharedWith.includes(ctx.currentUserId)) {
      return false;
    }
    return true;
  }


  // ROUTE-METHOD
  async saveReaction(
    ctx: RequestContext,
    refId: string,
    refType: FeedbackRefType,
    reaction: string
  ): Promise<string> {
    let userId = ctx.currentUserId;
    const id = `${refId}${KEY_DIL}${userId}`;

    if (refType == FeedbackRefType.POST) {
      if (!this._hasPostAccess(ctx, refId)) {
        throw new Error("You do not have access to react to this post");
      }

    } else {
      throw new Error("Invalid refType");
    }

    if (!reaction) {
      await this.reactionRepo.deleteWithId(id);
      return id;
    }

    // get current reaction
    const lastReaction = await this.reactionRepo.findById(id);

    const reactionData: Reaction = {
      _id: id,
      refId,
      refType,
      userId,
      reaction,
      createdAt: new Date(),
    };
    await this.reactionRepo.create(reactionData);

    let dontNotify = false;
    if (!!lastReaction) {
      // if last reaction was in last few minutes
      // dont notify

      try {
        let timeDiff = new Date().getTime() - lastReaction.createdAt.getTime();

        if (lastReaction.reaction == reaction || timeDiff < 1000 * 60 * 5) {
          // same reaction, no need to notify
          dontNotify = true;
        }
      } catch (err) {
        console.log(err);
      }
    }

    // TODO: reactions for other stuff later
    if (refType == FeedbackRefType.POST && !dontNotify) {
      let currentUser = await ctx.getCurrentUser();

      // NOTIFY POSTER
      // if poster is not self, send notifications
      const userIdUpdateList = [];
      let post = await this.posts.findById(refId);
      if (post.userId !== ctx.currentUserId) userIdUpdateList.push(post.userId);
      else {
        // no notifications for self
        return id;
      }

      await this.notificationsService.sendReactionNotifications(currentUser, post, userIdUpdateList, ctx);
    }
    return id;
  }



  async _getItemFeedback(userId: string, itemId: string): Promise<any> {
    return await this.itemFeedbackRepo.findById(this.feedbackId(userId, itemId));
  }

  async _getItemFeedbackForUser(ctx: RequestContext, itemId: string): Promise<any> {
    return await this.itemFeedbackRepo.findById(
      this.feedbackId(ctx.currentUserId, itemId)
    );
  }

  async _getItemFeedbackById(id: string): Promise<any> {
    return await this.itemFeedbackRepo.findById(id);
  }

  async _getItemFeedbackByIds(userId: string, itemIds: string[]): Promise<any[]> {
    const ids = itemIds.map((itemId) => this.feedbackId(userId, itemId));
    return await this.itemFeedbackRepo.findIdWhereIn(ids);
  }

  async _updateItemFeedback(userId: string, itemId: string, feedback: any): Promise<string> {
    const id = this.feedbackId(userId, itemId);
    const origfeedback = await this._getItemFeedback(userId, itemId);
    const updatedFeedback = {
      ...origfeedback,
      ...feedback,
      itemId,
      _id: id,
      userId: userId,
      updatedAt: new Date(),
      createdAt: origfeedback?.createdAt || new Date(),
    };

    await this.itemFeedbackRepo.create(updatedFeedback);

    return id;
  }
}

export default FeedbackService;
