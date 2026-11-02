/**
 * Earn access (HAT-836): rules that keep chosen kinds of content closed until something is done first.
 *
 * Stored on `accessControlSettings`: the rules in `earnAccessSettings`, and in `earnAccessOpenings` the
 * last time each rule was opened. Whether a rule is holding is never stored; every reader works it out
 * with `restrictions/earnAccess.ts`, so the browser, the server and the Companions give one answer.
 */

import type { EduValue } from '../content.types';
import type { CheckpointException, CheckpointMode, CheckpointTaskGate } from './usage-limits.types';

/**
 * What a rule can keep closed. Each is a condition the limits already match (`earnAccessHoldConditions`).
 * Video is not here: the Video limit matches only while a video plays, so it cannot hold a page.
 */
export type EarnAccessHold = 'entertainment' | 'junk' | 'games' | 'social';

/** When an opening stops counting: at the next family day, the next family week (Monday), or never. */
export type EarnAccessReset = 'day' | 'week' | 'never';

/** A task to finish. A repeating task counts when its occurrence in the period is done; a one-off once ever. */
export interface EarnAccessTaskStep {
  id: string;
  type: 'task';
  taskId: string;
}

/** Minutes spent on any of `eduValues` during the period. */
export interface EarnAccessMinutesStep {
  id: string;
  type: 'minutes';
  eduValues: EduValue[];
  minutes: number;
}

/** Lesson parts finished during the period (Digital citizenship). */
export interface EarnAccessLessonStep {
  id: string;
  type: 'lesson';
  count: number;
}

/**
 * The person says they did what the rule's instructions ask (HAT-912): for a family without Tasks, or
 * anything a task does not fit. Never done on its own: it is done when they tap I've done it on the block
 * page, which opens the rule once the other steps are done (or asks a guardian, on a rule that waits for
 * one). At most one per rule.
 */
export interface EarnAccessConfirmStep {
  id: string;
  type: 'confirm';
}

export type EarnAccessStep = EarnAccessTaskStep | EarnAccessMinutesStep | EarnAccessLessonStep | EarnAccessConfirmStep;

/**
 * The Daily Check-in, stored as a rule (HAT-913): what only it has. It locks everything, so its `holds`
 * stay empty and no rule reader holds anything for it; the check-in's own gate enforces it, reading it
 * through `checkpointSettingsOf` (restrictions/checkinRule.ts) exactly as it read `checkpointSettings`.
 */
export interface EarnAccessCheckin {
  /** Who clears it: the person (`self`), a guardian (`guardian`), or nothing is locked (`reminder`). */
  mode: CheckpointMode;
  /** What is open during it. */
  exceptions?: CheckpointException[];
  resetHourLocal?: number;
  /** Tasks to finish before checking in (`self` only). */
  taskGate?: CheckpointTaskGate;
}

export interface EarnAccessRule {
  id: string;
  /** `checkin` for the Daily Check-in (HAT-913), with `checkin` set. Absent for every other rule. */
  kind?: 'checkin';
  checkin?: EarnAccessCheckin;
  name: string;
  enabled: boolean;
  holds: EarnAccessHold[];
  /** All must be done. */
  steps: EarnAccessStep[];
  /** A guardian opens it once the steps are done. Never true on an adult's own rule: nobody could approve it. */
  approval: boolean;
  reset: EarnAccessReset;
  /** 0 = Sunday … 6 = Saturday, family time. Absent or empty: every day. */
  daysOfWeek?: number[];
  /**
   * What the guardian tells the person, in plain text or Markdown, shown on the block page above the
   * steps (HAT-912). A message on its own; with a `confirm` step, the instructions to follow. Absent or
   * empty: none.
   */
  instructions?: string;
}

export interface EarnAccessSettings {
  /**
   * 2 from HAT-912, written by every writer that knows rule instructions and the confirm step. A save
   * marked 1 comes from an older app, which drops both; the server keeps them from the stored copy
   * (`keepEarnAccessPartsOldWritersDrop`).
   */
  version: 1 | 2;
  rules: EarnAccessRule[];
}

/** The last time a rule was opened. It counts until the rule's period rolls over. */
export interface EarnAccessOpening {
  openedAtMs: number;
  byUserId?: string;
  /** Opened by the person the rule is for, not a guardian. */
  bySelf?: boolean;
}

export type EarnAccessOpenings = Record<string, EarnAccessOpening>;

/** How far one step is, as the child's device sees it. */
export interface EarnAccessStepStatus {
  id: string;
  type: EarnAccessStep['type'];
  done: boolean;
  /** The task's title, for a task step. */
  title?: string;
  /** The task's own how-to (its details), for a task step, when it has one. */
  details?: string;
  /** For a minutes step: minutes counted so far this period, and how many it needs. */
  minutesDone?: number;
  minutesRequired?: number;
  /** For a minutes step: the Usage types it counts. */
  eduValues?: EduValue[];
  /** A task step whose task this device cannot find (deleted, or not synced yet). Not done: a guardian can open the rule. */
  missing?: boolean;
  /** A step this device cannot check (a lesson step where lessons are off). It holds until a guardian opens the rule. */
  unavailable?: boolean;
}

export interface EarnAccessRuleStatus {
  ruleId: string;
  name: string;
  holds: EarnAccessHold[];
  reset: EarnAccessReset;
  approval: boolean;
  /** Keeping its holds closed right now. */
  holding: boolean;
  steps: EarnAccessStepStatus[];
  /**
   * Every step is done (approval aside). Never true while the rule has a `confirm` step: that step is
   * done only by the I've done it tap, which opens the rule itself (see `confirmReady`).
   */
  stepsDone: boolean;
  /**
   * The rule has a `confirm` step and every other step is done, so I've done it can be tapped now
   * (HAT-912). The tap sends `/user/earnAccess/open` with `confirmed: true`, or a request on a rule that
   * waits for a guardian.
   */
  confirmReady: boolean;
  /** The rule's instructions (plain text or Markdown), for the block page to show. */
  instructions?: string;
  /** When the current period began. */
  periodStartMs: number;
  /** The opening that counts this period, if any. */
  opening?: EarnAccessOpening;
}

export interface EarnAccessStatus {
  rules: EarnAccessRuleStatus[];
  evaluatedAtMs: number;
}
