/**
 * Social interaction types: posts, comments, reactions
 */

import type { PermissionType } from './item.types';

export interface ReactionInfo {
  _id: string;
  userId: string;
  refId: string;
  refType: string;
  reactionType: string;
  createdAt?: string;
}

export interface PermissionWithUser {
  userId: string;
  permission: PermissionType;
  /**
   * When true, user has permission but the item should not appear in their library.
   */
  notInLibrary?: boolean;
  user?: {
    _id: string;
    username: string;
    displayedName?: string;
    profileImage?: Record<string, any>;
  };
  permissionDetails?: {
    direct: boolean;
    notInLibrary?: boolean;
    sharedByUserId?: string;
  };
}

export interface ItemReaction {
  userId: string;
  reactionType: string;
  createdAt?: string;
  user?: {
    _id: string;
    username: string;
    displayedName?: string;
    profileImage?: Record<string, any>;
  };
}

export interface SharedItemReactionView {
  userId: string;
  username: string;
  displayedName?: string;
  profileImage?: Record<string, any>;
  reaction: string;
  reactionDate?: string;
}

export interface CommentInfo {
  _id: string;
  itemId: string;
  userId: string;
  comment: string;
  createdAt: string;
  user?: {
    _id: string;
    username: string;
    displayedName?: string;
    profileImage?: Record<string, any>;
  };
}

export interface PostWithDetails {
  _id: string;
  userId: string;
  postType: string;
  data: Record<string, any>;
  attachedItems?: any[];
  sharedWith?: string[];
  sharedWithUsers?: Array<{
    _id: string;
    username: string;
    displayedName?: string;
    profileImage?: Record<string, any>;
  }>;
  createdAt: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
  encrypted?: boolean;
  encInfo?: Record<string, any>;
  username?: string;
  displayedName?: string;
  profileImage?: Record<string, any>;
  comments: CommentInfo[];
  reactions: ReactionInfo[];
}

export interface FeedEntryInfo {
  _id: string;
  isRead: boolean;
  createdAt: string | Date;
  feedInfo?: Record<string, any>;
}

export interface FeedItemView {
  _id: string;
  refType: string;
  feedEntry: FeedEntryInfo;
  data: any;
}

export interface FeedListResponse {
  records: FeedItemView[];
  count?: number | null;
}
