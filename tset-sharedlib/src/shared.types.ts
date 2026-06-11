/**
 * BACKWARD COMPATIBILITY FILE
 * 
 * This file re-exports all types from their new organized locations.
 * For new code, prefer importing from specific type modules:
 * 
 * import { ItemInfoView, ItemType } from 'tset-sharedlib/types/item.types';
 * import { UserType, UserView } from 'tset-sharedlib/types/user.types';
 * 
 * Or from the central types index:
 * import { ItemInfoView, UserType } from 'tset-sharedlib/types';
 */

// Re-export all domain types from new modules
export * from './types/common.types';
export * from './types/user.types';
export * from './types/item.types';
export * from './types/activity.types';
export * from './types/activity-flags.types';
export * from './types/task.types';
export * from './types/social.types';
export * from './types/published.types';
export * from './types/encryption.types';
export * from './types/file.types';
export * from './types/family-policy.types';
export * from './types/standalone-app.types';

// Re-export content classification types
export type { 
  EduValue, 
  MinAgeGroup, 
  TargetAudience, 
  Cost, 
  Ads, 
  CostDetails, 
  ContentType, 
  TopicTag,
  IntentTag,
  UseCriterias, 
  UseCriteriaData, 
  UseCriteriaDataWithDetails 
} from './content.types';

// Re-export schemas
export type { default as Item } from './schemas/public/Item';
export type { default as User } from './schemas/public/User';
export type { default as UserPublic } from './schemas/public/UserPublic';
export type { default as UserFeed } from './schemas/public/UserFeed';
export type { default as Post } from './schemas/public/Post';
export type { default as Notification } from './schemas/public/Notification';
export type { default as KeyEntry } from './schemas/public/KeyEntry';
export type { default as FamilyPolicyRuleRecord } from './schemas/public/FamilyPolicyRule';
export type { default as ClassificationFeedbackReport } from './schemas/public/ClassificationFeedbackReport';
export type { default as ClassificationDatasetSample } from './schemas/public/ClassificationDatasetSample';

export type SubscriptionRefType = 'col' | 'shared_col' | 'pub_col' | 'item_feed' | 'pub_item_feed' | 'custom';
export const SUBSCRIPTION_REF_TYPES: SubscriptionRefType[] = ['col', 'shared_col', 'pub_col', 'item_feed', 'pub_item_feed', 'custom'];

export type { default as Published } from './schemas/public/Published';

// Deprecated re-exports from this file (should use api-types.ts or specific modules)
export interface ResetPasswordRequestResponse {
  success: boolean;
}

export interface RecoverPasswordResponse {
  password: string | null;
}

export type GetUserPrefValueResponse = any;

export interface UserPermissionRecord {
  userId: string;
  username: string;
  permission: PermissionType;
  permissionDetails: ItemPermissionDetails;
  user: User;
}



// Import the types we reference
import type { PermissionType, ItemPermissionDetails } from './types/item.types';
import type User from './schemas/public/User';
