/**
 * Central export point for all domain types
 * 
 * Import from here for new code:
 * import { ItemInfoView, UserType, EncInfo } from 'tset-sharedlib/types';
 */

// Common utilities
export * from './common.types';

// User & Auth
export * from './user.types';

// Items & Collections
export * from './item.types';

// Content Classification
export type { EduValue, MinAgeGroup, TargetAudience, Cost, Ads, CostDetails, ContentType, UseCriterias, UseCriteriaData, UseCriteriaDataWithDetails } from '../content.types';

// Activity & Monitoring
export * from './activity.types';
export * from './activity-flags.types';

// Reason codes (precedence helpers)
export * from './reason-code.utils';
export * from './reason-metadata';

// Social
export * from './social.types';

// Publishing
export * from './published.types';

// Encryption
export * from './encryption.types';

// Files
export * from './file.types';

// External Metadata Cache
export * from './cache.types';

// Usage Limits & Parental Controls
export * from './usage-limits.types';
export * from './family-policy.types';

// Tasks
export * from './task.types';

// Rewards
export * from './reward.types';

// AI Agent System
export * from './ai-agent.types';

// Client UI Types
export * from './client.types';

// Standalone website apps
export * from './standalone-app.types';

// Category Explorer
export * from './categoryExplorer.types';

// Re-export schemas for convenience
export type { default as User } from '../schemas/public/User';
export type { default as UserPublic } from '../schemas/public/UserPublic';
export type { default as UserFeed } from '../schemas/public/UserFeed';
export type { default as Post } from '../schemas/public/Post';
export type { default as Notification } from '../schemas/public/Notification';
export type { default as KeyEntry } from '../schemas/public/KeyEntry';
export type { default as Item } from '../schemas/public/Item';
export type { default as Published } from '../schemas/public/Published';

