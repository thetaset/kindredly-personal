/**
 * Usage limits, parental controls, and access control types
 */

import type { ReasonCode, ActivityResultType, ActivityEventContext, InterventionMode } from './activity.types';
import type { EduValue } from '../content.types';

export interface TimeRange {
  start: string;
  end: string;
}

export interface LimitMatchCondition {
  // 'appId': device-app packages (android:<pkg>, ios:selection:<uuid>, or the
  // all-device-apps sentinel) enforced by the Companion satellite app.
  type: 'eduValue' | 'intent' | 'sessionIntent' | 'urlPatterns' | 'itemIds' | 'attribute' | 'usageRequirement' | 'socialDesignation' | 'appId';
  values: string[];
  timeAmount?: number;
}

export interface TimeLimit {
  hours: number;
  daysOfWeek: number[];
  timeRanges?: TimeRange[];
}

export interface LimitReqs {
  conditions: LimitMatchCondition[];
  timeAmount?: number;
}

export interface LimitRule {
  id: string;
  name: string;
  type: 'all' | 'advanced' | 'usage_only';
  conditions?: LimitMatchCondition[];
  reqs?: LimitReqs;
  timeLimits: TimeLimit[];
}

export interface LimitRuleInfo {
  isOverride: boolean;
  timeLimit: TimeLimit;
  limitRule: LimitRule;
  origTimeLimit: TimeLimit | null;
}

export interface UsageStatus {
  limit?: LimitRule;
  timeLimit?: TimeLimit;
  isOverride?: boolean;
  origTimeLimit?: TimeLimit;
  reqStatus?: {
    timeLeft?: number;
  };
  reqsMet?: boolean;
  usage?: number;
  timeLeft?: number;
  /**
   * This rule blocks right now. NOT "the time is used up": it is also true outside the allowed
   * hours with the whole budget left (`reasonCode: 'out-of-time-range'`). Words about running out
   * of time read `reasonCode === 'time-exceeded'` or `timeLeft <= 0`, never this.
   */
  limitExceeded: boolean;
  reasonCode?: ReasonCode;
  selectedByFilter?: boolean;
  logTimes?: { start: number; end: number }[];
}

export interface UsageSummaryData {
  overallUsage: UsageStatus;
  contentUsage: UsageStatus[];
  /**
   * Total ms today per content-value bucket, interval-merged exactly like
   * `overallUsage` (so overlapping logs count once). Logs with no eduValue land
   * in 'eduval_unknown'. Only buckets with time are present.
   *
   * This is the content-value axis, independent of `contentUsage` (which is one
   * entry per configured rule): it reports time for buckets that have no limit
   * rule at all — task-related, educational, still-unclassified — which still
   * count toward `overallUsage`.
   */
  eduValueUsage?: Partial<Record<EduValue, number>>;
  filterContext?: ActivityEventContext;
  noUsageLimits?: boolean;
  /** No limit applies right now: usage limits are paused, or all restrictions are (`restrictionsPaused`). */
  usageLimitsDisabled?: boolean;
  /** Set with `usageLimitsDisabled` when the reason is a restrictions pause, so a place can name it. */
  restrictionsPaused?: boolean;
  /**
   * The limits only remind (`usageLimitsRemindOnly`): the time states still hold, but nothing is
   * blocked, so no place may say "blocked", "blocking" or "unavailable until".
   */
  usageLimitsRemindOnly?: boolean;
}

/**
 * One exception to a checkpoint. Conditions are AND-ed within an entry (the
 * same semantics as LimitRule.conditions); entries are OR-ed against each
 * other, so any matching entry lets the request through.
 *
 * Two condition families are supported, and they cost different things:
 *
 *  - `urlPatterns` — decided from the address alone, before anything loads.
 *    Free, airtight, and the default.
 *  - `eduValue` — the page's Usage Type. Resolvable up front only for library
 *    items and the deterministic site table; otherwise it takes a page load to
 *    know. Configuring one opts this checkpoint into a slower gate where an
 *    undecidable page loads first and is pulled once classified. See
 *    `checkpointHasEduValueExceptions`.
 *
 * `intent`, `sessionIntent`, `socialDesignation` and `attribute` remain
 * unexposed — see CHECKPOINT_CONTENT_SHAPED_CONDITION_TYPES.
 */
export interface CheckpointException {
  id: string;
  label?: string;
  conditions: LimitMatchCondition[];
}

/**
 * Tasks that must be done before a `self` check-in can be cleared.
 *
 * This is a precondition on the CLEAR action, NOT a term in `checkpointBlocks`.
 * A release, once written, runs to its boundary no matter what happens to the
 * tasks afterwards — so nobody is ever dropped offline mid-session. Do not
 * "improve" this by feeding tasks into the enforcement path.
 *
 * Only meaningful in `self` mode: `guardian` already has a person holding the
 * key, and `reminder` never blocks. See `checkpointTaskGateIsActive`.
 */
export interface CheckpointTaskGate {
  version?: 1;
  enabled?: boolean;
  /**
   * Explicit task ids, deliberately not "everything assigned today" — a task
   * should be able to exist without locking the internet. Enabled with an empty
   * list reads as off.
   */
  requiredTaskIds?: string[];
}

/** The task gate as the blocked screen, the editor, and the clear guard need it. */
export interface CheckpointTaskGateStatus {
  active: boolean;
  satisfied: boolean;
  outstanding: { taskId: string; title: string; occurrenceStartMs: number }[];
  /**
   * Required ids no longer present in the task list — archived or deleted.
   * These can never be completed, so they must not hold the gate shut.
   */
  missingTaskIds: string[];
  evaluatedAtMs: number;
}

/**
 * How much a checkpoint enforces, and whose button clears it.
 *
 *  - `reminder`  — never blocks. A note the user clears themselves.
 *  - `self`      — blocks web access until the user marks it done themselves.
 *  - `guardian`  — blocks web access until an admin releases it.
 *
 * A record written before modes existed has no `mode`; it always means
 * `guardian`, since that was the only behavior. See `resolveCheckpointMode`.
 */
export type CheckpointMode = 'reminder' | 'self' | 'guardian';

export interface CheckpointSettings {
  version?: 1;
  enabled?: boolean;
  /**
   * Absent means `guardian` — see CheckpointMode. Always written explicitly on
   * save so enforcement never has to guess from the user's type.
   */
  mode?: CheckpointMode;
  /**
   * Parent's message to the kid, shown on the Checkpoint screen.
   * e.g. "Before you get online, make sure your homework is done."
   *
   * On an adult's own checkpoint this is their own note to themselves.
   */
  note?: string;
  /** 0-23 local hour at which the checkpoint re-applies. Default 0 (midnight). */
  resetHourLocal?: number;
  exceptions?: CheckpointException[];
  /** Only honoured in `self` mode. See CheckpointTaskGate. */
  taskGate?: CheckpointTaskGate;
}

/**
 * Absent or expired means the checkpoint is holding.
 *
 * In `guardian` mode only an admin may write this. In `reminder` / `self` mode
 * the user clears their own, and `releasedBySelf` records which it was.
 */
export interface CheckpointRelease {
  releasedAtMs: number;
  releasedUntilMs: number;
  releasedByUserId?: string;
  releasedBySelf?: boolean;
}

export interface AccessControlSettings {
  disableRestrictions?: boolean;
  disableRestrictionsTimeStamp?: number;
  disableRestrictionsExpires?: number;
  disableUsageLimits?: boolean;
  disableUsageLimitsTimeStamp?: number;
  disableUsageLimitsExpires?: number;
  restrictAll?: boolean;
  restrictAllTimeStamp?: number;
  restrictAllExpires?: number;
  usageLimitInterventionMode?: InterventionMode;
  defaultInterventionMode?: InterventionMode;
  guidanceModeEnabled?: boolean;
  usageStatusIndicatorEnabled?: boolean;
  usageStatusIndicatorThresholdMin?: number;
  usageGuidanceMessage?: string;
  takeBreakSettings?: TakeBreakSettings;
  remoteActionSettings?: RemoteActionSettings;
  liveViewSettings?: LiveViewSettings;
  checkpointSettings?: CheckpointSettings;
  checkpointRelease?: CheckpointRelease;
}

export interface RemoteActionSettings {
  enabled?: boolean;
  allowOpenUrl?: boolean;
  allowResetToHome?: boolean;
  allowScreenshot?: boolean;
  requireVerifiedLive?: boolean;
}

/**
 * Live View is deliberately separate from `remoteActionSettings`. A one-shot
 * tab screenshot and a continuous view of the whole desktop are different
 * consent conversations, so `allowDesktopCapture` has to be refusable on its
 * own without turning off screen viewing inside Kindredly.
 */
export interface LiveViewSettings {
  enabled?: boolean;
  /** Electron Companion only: capture the whole desktop, not just Kindredly. */
  allowDesktopCapture?: boolean;
}

export interface TakeBreakSettings {
  enabled?: boolean;
  consecutiveUseMinutes?: number;
  breakMinutes?: number;
  includeAllTypes?: boolean;
  appliesToEduValues?: EduValue[];
}

export interface TakeBreakAdvisory {
  triggered: boolean;
  globalConsecutiveUseMs: number;
  thresholdMs: number;
  consecutiveUseMinutes: number;
  breakMinutes: number;
  includeAllTypes: boolean;
  appliesToEduValues: EduValue[];
  matchedEduValue?: EduValue | null;
}

/**
 * The daily check-in as the nudge surfaces need it: still owed today, in which
 * mode, and with what note. Rides on an access evaluation the same way
 * TakeBreakAdvisory does, so a banner never needs a second round trip.
 *
 * Present whenever a check-in is enabled — including in gate modes, where the
 * blocked screen is the surface instead of a banner.
 */
export interface CheckinAdvisory {
  pending: boolean;
  mode: CheckpointMode;
  selfClearable: boolean;
  note?: string;
  resetHourLocal?: number;
}

export interface PresetFeature {
  text: string;
  type?: 'allowed' | 'blocked';
}

export interface UsageLimitPreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: (string | PresetFeature)[];
  rules: LimitRule[];
  successMessage: string;
}

export interface RuleOverride {
  ruleId: string;
  timeLimit: TimeLimit;
  expiresAt: number;
}

export interface RuleOverrideSettings {
  ruleOverrides: RuleOverride[];
  lastUpdated?: number;
}
