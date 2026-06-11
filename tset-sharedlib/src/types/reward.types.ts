/**
 * Reward system types.
 *
 * Rewards let parents (or users themselves) define rules where completing a
 * trigger earns bonus content access for the day.  Rewards are generic: a
 * trigger can be manual (parent grants explicitly), task-based, or based on
 * accumulated time spent on educational content.  A grant can add bonus
 * minutes to an existing rule, fully unlock a rule for the day, or inject a
 * brand-new temporary rule.
 */

import type { EduValue } from '../content.types';
import type { LimitRule } from './usage-limits.types';

// ─── Triggers ────────────────────────────────────────────────────────────────

/** Parent explicitly grants the reward with no automated condition. */
export interface RewardTriggerManual {
  type: 'manual';
}

/** All listed tasks must be completed (for the current occurrence window). */
export interface RewardTriggerTaskCompletion {
  type: 'task_completion';
  taskIds: string[];
}

/** At least `requiredMinutes` of active browsing time on the listed edu values. */
export interface RewardTriggerTimeOnEdu {
  type: 'time_on_edu';
  eduValues: EduValue[];
  requiredMinutes: number;
}

export type RewardTrigger =
  | RewardTriggerManual
  | RewardTriggerTaskCompletion
  | RewardTriggerTimeOnEdu;

// ─── Grants ──────────────────────────────────────────────────────────────────

/**
 * Adds `bonusMinutes` on top of the rule's existing daily limit via a
 * RuleOverride that expires at midnight tonight.
 */
export interface RewardGrantBonusMinutes {
  type: 'bonus_minutes';
  targetRuleIds: string[];
  bonusMinutes: number;
}

/**
 * Replaces the rule's time limit with an effectively unlimited amount (99h)
 * via a RuleOverride that expires at midnight tonight.
 */
export interface RewardGrantUnlockRule {
  type: 'unlock_rule';
  targetRuleIds: string[];
}

/**
 * Injects a brand-new temporary LimitRule active until midnight tonight.
 * Useful for granting access to a specific site or content type that normally
 * has no rule at all.
 */
export interface RewardGrantNewRule {
  type: 'new_rule';
  /** Full rule definition.  `id` is optional — a stable ID is generated at claim time. */
  rule: Omit<LimitRule, 'id'> & { id?: string };
}

export type RewardGrant =
  | RewardGrantBonusMinutes
  | RewardGrantUnlockRule
  | RewardGrantNewRule;

// ─── Category ────────────────────────────────────────────────────────────────

/** Organisational grouping for reward rules (e.g. "Chores", "Learning Goals"). */
export interface RewardCategory {
  id: string;
  name: string;
  description?: string;
  /** Optional hex/CSS colour for UI badges. */
  color?: string;
  sortOrder?: number;
}

// ─── Rule ────────────────────────────────────────────────────────────────────

export interface RewardRule {
  id: string;
  name: string;
  categoryId?: string;
  trigger: RewardTrigger;
  grant: RewardGrant;
  enabled: boolean;
  /**
   * When `true` (default) the child must tap "Claim" to activate the grant.
   * When `false` the grant is applied automatically as soon as the trigger fires.
   */
  requireClaim?: boolean;
}

// ─── Settings ────────────────────────────────────────────────────────────────

/** Stored in UserOptions.rewardSettings */
export interface RewardSettings {
  categories: RewardCategory[];
  rewardRules: RewardRule[];
}

// ─── Daily state ─────────────────────────────────────────────────────────────

export type RewardStateStatus = 'pending' | 'earned' | 'claimed' | 'expired';

export interface RewardState {
  rewardRuleId: string;
  /** Local date string YYYY-MM-DD */
  date: string;
  status: RewardStateStatus;
  earnedAtMs?: number;
  claimedAtMs?: number;
  /** When the activated grant expires (midnight tonight). */
  grantExpiresAtMs?: number;
  /** Current progress for time_on_edu triggers, in whole minutes. */
  triggerProgressMinutes?: number;
}

/** Stored in UserOptions.dailyRewardStates.  One entry per configured reward per day. */
export interface DailyRewardStates {
  /** Local date string YYYY-MM-DD for the states below. */
  date: string;
  states: RewardState[];
}

// ─── Temporary rule ──────────────────────────────────────────────────────────

/**
 * A LimitRule that is active only until `expiresAtMs`.
 * Stored in UsageLimitData.temporaryRules and merged into contentUsageLimits
 * by ActivityLogDataService before enforcement.
 */
export type TemporaryLimitRule = LimitRule & { expiresAtMs: number };
