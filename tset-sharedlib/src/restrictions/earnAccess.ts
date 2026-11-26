/**
 * Earn access (HAT-836): which rules are holding, and what each one holds.
 *
 * A rule holds when it is on, applies today, and has not been opened since its current period began.
 * Nothing about holding is stored: an opening records only when it happened, and the period it falls in
 * is worked out here in the family timezone (DCP-16). So a new day or week re-holds a rule without any
 * write, and every reader (the browser, the server, Guard, the desktop Companion) gives the same answer.
 *
 * Matching a page or an app is not done here. Each hold maps to the `LimitMatchCondition` the limits
 * already use, so the browser's `checkConditionList` and both device compilers reuse their own matchers
 * rather than growing a second one that drifts.
 */

import { familyClock, familyWeekStartMs, type FamilyClock } from '../deviceguard/familyClock';
import type { EduValue } from '../content.types';
import type { LimitMatchCondition, LimitRule } from '../types/usage-limits.types';
import type { CheckpointMode } from '../types/usage-limits.types';
import type {
  EarnAccessCheckin,
  EarnAccessHold,
  EarnAccessOpening,
  EarnAccessOpenings,
  EarnAccessReset,
  EarnAccessRule,
  EarnAccessSettings,
  EarnAccessStep,
} from '../types/earn-access.types';


export const EARN_ACCESS_HOLDS: readonly EarnAccessHold[] = ['entertainment', 'junk', 'games', 'social'];
export const EARN_ACCESS_RESETS: readonly EarnAccessReset[] = ['day', 'week', 'never'];

/** Usage types a minutes step may count. Never `eduval_unknown`: time nobody could classify earns nothing. */
export const EARN_ACCESS_COUNTABLE_EDU_VALUES: readonly EduValue[] = [
  'eduval_educational',
  'eduval_task',
  'eduval_edutainment',
];

export const EARN_ACCESS_MAX_RULES = 20;
export const EARN_ACCESS_MAX_STEPS = 12;
export const EARN_ACCESS_MAX_MINUTES = 600;
export const EARN_ACCESS_MAX_NAME_LENGTH = 80;
/** The longest instructions a rule keeps (HAT-912). */
export const EARN_ACCESS_MAX_INSTRUCTIONS_LENGTH = 4000;

/** Prefix of the limit-rule ids `earnAccessHoldsAsLimitRules` makes, so a device can tell them apart. */
export const EARN_ACCESS_LIMIT_RULE_PREFIX = 'earn-access:';

/** The condition each hold means, in the words the limits already match. */
export function earnAccessHoldCondition(hold: EarnAccessHold): LimitMatchCondition {
  switch (hold) {
    case 'entertainment':
      return { type: 'eduValue', values: ['eduval_fun'] };
    case 'junk':
      return { type: 'eduValue', values: ['eduval_junk'] };
    case 'games':
      return { type: 'attribute', values: ['game'] };
    case 'social':
      return { type: 'socialDesignation', values: ['social'] };
  }
}

/**
 * One closed limit rule per hold, for code that already knows how to apply a limit rule to a page or an
 * app (the device compilers expand these to app ids the way they expand a 0-minute limit).
 */
export function earnAccessHoldsAsLimitRules(rule: EarnAccessRule): LimitRule[] {
  return rule.holds.map((hold) => ({
    id: `${EARN_ACCESS_LIMIT_RULE_PREFIX}${rule.id}:${hold}`,
    name: rule.name,
    type: 'advanced' as const,
    conditions: [earnAccessHoldCondition(hold)],
    timeLimits: [{ hours: 0, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
  }));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function cleanId(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 64) : '';
}

function cleanStep(raw: any): EarnAccessStep | null {
  const id = cleanId(raw?.id);
  if (!id) return null;
  if (raw?.type === 'task') {
    const taskId = cleanId(raw.taskId);
    return taskId ? { id, type: 'task', taskId } : null;
  }
  if (raw?.type === 'minutes') {
    const eduValues = Array.isArray(raw.eduValues)
      ? Array.from(new Set(raw.eduValues.filter((v: unknown) => EARN_ACCESS_COUNTABLE_EDU_VALUES.includes(v as EduValue)))) as EduValue[]
      : [];
    const minutes = isFiniteNumber(raw.minutes) ? Math.round(raw.minutes) : 0;
    if (!eduValues.length || minutes < 1) return null;
    return { id, type: 'minutes', eduValues, minutes: Math.min(minutes, EARN_ACCESS_MAX_MINUTES) };
  }
  if (raw?.type === 'lesson') {
    const count = isFiniteNumber(raw.count) ? Math.round(raw.count) : 1;
    return { id, type: 'lesson', count: Math.min(Math.max(count, 1), 10) };
  }
  if (raw?.type === 'confirm') return { id, type: 'confirm' };
  return null;
}

/**
 * A rule as stored, with anything it cannot use dropped: unknown holds and steps, an unknown reset (read as
 * `day`), days outside 0–6. Returns null for a rule with no id. Used on every read and before every write.
 */
export function normalizeEarnAccessRule(raw: any): EarnAccessRule | null {
  const id = cleanId(raw?.id);
  if (!id) return null;
  const holds = Array.isArray(raw?.holds)
    ? EARN_ACCESS_HOLDS.filter((hold) => raw.holds.includes(hold))
    : [];
  const seenSteps = new Set<string>();
  let hasConfirm = false;
  const steps = (Array.isArray(raw?.steps) ? raw.steps : [])
    .map(cleanStep)
    .filter((step: EarnAccessStep | null): step is EarnAccessStep => {
      if (!step || seenSteps.has(step.id)) return false;
      // One I've done it is all a rule needs; a second would ask the same thing twice.
      if (step.type === 'confirm') {
        if (hasConfirm) return false;
        hasConfirm = true;
      }
      seenSteps.add(step.id);
      return true;
    })
    .slice(0, EARN_ACCESS_MAX_STEPS);
  const days = Array.isArray(raw?.daysOfWeek)
    ? Array.from(new Set(raw.daysOfWeek.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))) as number[]
    : [];
  const name = typeof raw?.name === 'string' ? raw.name.trim().slice(0, EARN_ACCESS_MAX_NAME_LENGTH) : '';
  const rule: EarnAccessRule = {
    id,
    name,
    enabled: raw?.enabled === true,
    holds,
    steps,
    approval: raw?.approval === true,
    reset: EARN_ACCESS_RESETS.includes(raw?.reset) ? raw.reset : 'day',
  };
  if (days.length && days.length < 7) rule.daysOfWeek = days.sort((a, b) => a - b);
  const instructions = typeof raw?.instructions === 'string' ? raw.instructions.trim().slice(0, EARN_ACCESS_MAX_INSTRUCTIONS_LENGTH) : '';
  if (instructions) rule.instructions = instructions;
  if (raw?.kind === 'checkin') {
    // The Daily Check-in (HAT-913) locks everything through its own gate, set by `checkin` alone: as a
    // rule it holds nothing and has no steps, so no rule reader, old or new, holds anything for it.
    rule.kind = 'checkin';
    rule.holds = [];
    rule.steps = [];
    rule.approval = false;
    rule.reset = 'day';
    delete rule.daysOfWeek;
    rule.checkin = cleanCheckin(raw.checkin);
  }
  return rule;
}

const CHECKIN_MODES: readonly CheckpointMode[] = ['reminder', 'self', 'guardian'];

/** What only the Daily Check-in has, as stored. An unknown mode reads as `guardian`, as a check-in always has. */
function cleanCheckin(raw: any): EarnAccessCheckin {
  const checkin: EarnAccessCheckin = { mode: CHECKIN_MODES.includes(raw?.mode) ? raw.mode : 'guardian' };
  if (Array.isArray(raw?.exceptions)) {
    const exceptions = raw.exceptions
      .filter((e: any) => e && typeof e === 'object' && typeof e.id === 'string' && Array.isArray(e.conditions))
      .slice(0, 50);
    if (exceptions.length) checkin.exceptions = exceptions;
  }
  if (Number.isInteger(raw?.resetHourLocal) && raw.resetHourLocal >= 0 && raw.resetHourLocal <= 23) {
    checkin.resetHourLocal = raw.resetHourLocal;
  }
  if (raw?.taskGate && typeof raw.taskGate === 'object') {
    const ids: string[] = Array.isArray(raw.taskGate.requiredTaskIds) ? raw.taskGate.requiredTaskIds.map(cleanId).filter(Boolean) : [];
    checkin.taskGate = { version: 1, enabled: raw.taskGate.enabled === true, requiredTaskIds: Array.from(new Set(ids)) };
  }
  return checkin;
}

/** Settings as stored, normalized. Absent or broken settings read as no rules. */
export function normalizeEarnAccessSettings(raw: any): EarnAccessSettings {
  const seen = new Set<string>();
  const rules = (Array.isArray(raw?.rules) ? raw.rules : [])
    .map(normalizeEarnAccessRule)
    .filter((rule: EarnAccessRule | null): rule is EarnAccessRule => {
      if (!rule || seen.has(rule.id)) return false;
      seen.add(rule.id);
      return true;
    });
  // The Daily Check-in is one, and never one of the rules counted against the most a person can have.
  const checkin = rules.filter((rule: EarnAccessRule) => rule.kind === 'checkin').slice(0, 1);
  const others = rules.filter((rule: EarnAccessRule) => rule.kind !== 'checkin').slice(0, EARN_ACCESS_MAX_RULES);
  return { version: 2, rules: [...checkin, ...others] };
}

/**
 * What a writer from before HAT-912 cannot see, and so drops from every rule it saves: the instructions
 * and the I've done it step. A save marked below version 2 keeps them from the stored copy, rule by rule,
 * so a guardian on an older app who changes one rule doesn't wipe the words written for all of them. A
 * save marked 2 comes from a writer that shows both, and is taken as written.
 */
export function keepEarnAccessPartsOldWritersDrop(stored: unknown, incoming: unknown): unknown {
  if (!incoming || typeof incoming !== 'object' || (incoming as { version?: unknown }).version === 2) return incoming;
  const kept = new Map(normalizeEarnAccessSettings(stored).rules.map((rule) => [rule.id, rule]));
  const rules: unknown[] = Array.isArray((incoming as { rules?: unknown }).rules) ? (incoming as { rules: unknown[] }).rules : [];
  let changed = false;
  const merged = rules.map((raw: any) => {
    const before = raw && typeof raw === 'object' ? kept.get(cleanId(raw.id)) : undefined;
    if (!before) return raw;
    const next = { ...raw };
    // The Daily Check-in, stored as a rule from HAT-913: an older app saves it as a plain rule.
    if (before.kind === 'checkin' && raw.kind !== 'checkin') {
      next.kind = 'checkin';
      next.checkin = before.checkin;
      changed = true;
    }
    if (before.instructions && typeof raw.instructions !== 'string') {
      next.instructions = before.instructions;
      changed = true;
    }
    const confirm = before.steps.find((step) => step.type === 'confirm');
    const steps: unknown[] = Array.isArray(raw.steps) ? raw.steps : [];
    if (confirm && !steps.some((step: any) => step?.type === 'confirm')) {
      next.steps = [...steps, confirm];
      changed = true;
    }
    return next;
  });
  return changed ? { ...(incoming as object), rules: merged } : incoming;
}

/**
 * True when a rule can hold anything at all: it holds something, and something opens it. A rule with no
 * steps and no approval would open the moment it was asked, so it holds nothing; the editor refuses to
 * turn one on rather than saving something inert.
 */
export function earnAccessRuleIsComplete(rule: EarnAccessRule): boolean {
  // The Daily Check-in is enforced by its own gate (HAT-913); as a rule it holds nothing.
  if (rule.kind === 'checkin') return false;
  return rule.holds.length > 0 && (rule.steps.length > 0 || rule.approval);
}

/** Whether the rule applies on the clock's day. */
export function earnAccessRuleAppliesOn(rule: EarnAccessRule, clock: FamilyClock): boolean {
  return !rule.daysOfWeek?.length || rule.daysOfWeek.includes(clock.dayOfWeek);
}

/**
 * When the period an opening must fall in began: the family day's start, this family week's Monday, or the
 * beginning of time for a rule that never starts over.
 */
export function earnAccessPeriodStartMs(reset: EarnAccessReset, clock: FamilyClock): number {
  if (reset === 'never') return 0;
  if (reset === 'week') return familyWeekStartMs(clock);
  return clock.dayStartMs;
}

/** True when the opening falls in the rule's current period. */
export function earnAccessOpeningCounts(
  rule: EarnAccessRule,
  opening: EarnAccessOpening | null | undefined,
  clock: FamilyClock,
): boolean {
  const openedAtMs = opening?.openedAtMs;
  if (!isFiniteNumber(openedAtMs)) return false;
  return openedAtMs >= earnAccessPeriodStartMs(rule.reset, clock);
}

/** True when the rule is keeping its holds closed right now. */
export function earnAccessRuleHolding(
  rule: EarnAccessRule,
  openings: EarnAccessOpenings | null | undefined,
  clock: FamilyClock,
): boolean {
  if (!rule.enabled || !earnAccessRuleIsComplete(rule)) return false;
  if (!earnAccessRuleAppliesOn(rule, clock)) return false;
  return !earnAccessOpeningCounts(rule, openings?.[rule.id], clock);
}

/** The rules holding right now, from settings as stored. */
export function holdingEarnAccessRules(
  settings: unknown,
  openings: EarnAccessOpenings | null | undefined,
  nowMs: number,
  timeZone: string | null | undefined,
): EarnAccessRule[] {
  const { rules } = normalizeEarnAccessSettings(settings);
  if (!rules.length) return [];
  const clock = familyClock(nowMs, timeZone);
  return rules.filter((rule) => earnAccessRuleHolding(rule, openings, clock));
}

/** Every hold some holding rule keeps closed. */
export function heldEarnAccessHolds(rules: EarnAccessRule[]): Set<EarnAccessHold> {
  const holds = new Set<EarnAccessHold>();
  for (const rule of rules) for (const hold of rule.holds) holds.add(hold);
  return holds;
}

/**
 * The next time any rule's state can change without anyone acting: the next family day start, when a
 * daily rule re-holds, a weekly one may, and a rule limited to some days starts or stops applying. Null
 * when no rule can change by itself (none on, or every one never starts over and runs every day).
 * Devices recompile at this time.
 */
export function earnAccessNextChangeMs(settings: unknown, nowMs: number, timeZone: string | null | undefined): number | null {
  const { rules } = normalizeEarnAccessSettings(settings);
  const changes = rules.some(
    (rule) => rule.enabled && earnAccessRuleIsComplete(rule) && (rule.reset !== 'never' || !!rule.daysOfWeek?.length),
  );
  if (!changes) return null;
  const clock = familyClock(nowMs, timeZone);
  return familyClock(clock.dayStartMs + 30 * 60 * 60 * 1000, timeZone).dayStartMs;
}

/** How many family days ahead a device is given each rule's open times, as Family Downtime's 28 days. */
export const EARN_ACCESS_DEVICE_HORIZON_DAYS = 28;

/** The start of each family day from today's through `days` days on, so `days + 1` times. */
export function earnAccessDayStarts(nowMs: number, timeZone: string | null | undefined, days: number): number[] {
  const starts = [familyClock(nowMs, timeZone).dayStartMs];
  // 30 hours on lands inside the next day whatever daylight saving does to this one.
  for (let i = 0; i < days; i++) starts.push(familyClock(starts[i] + 30 * 60 * 60 * 1000, timeZone).dayStartMs);
  return starts;
}

/**
 * When a rule that is on is open over the family days `dayStarts` spans: each day it does not hold
 * (opened for that day or week, or a day it does not apply), joined where they touch. Null for a rule
 * opened for good, which nothing but a change to the settings can make hold again.
 */
export function earnAccessOpenTimes(
  rule: EarnAccessRule,
  openings: EarnAccessOpenings | null | undefined,
  dayStarts: number[],
  timeZone: string | null | undefined,
): Array<{ startMs: number; endMs: number }> | null {
  if (rule.reset === 'never' && earnAccessOpeningCounts(rule, openings?.[rule.id], familyClock(dayStarts[0], timeZone))) return null;
  const open: Array<{ startMs: number; endMs: number }> = [];
  for (let day = 0; day + 1 < dayStarts.length; day++) {
    // Holding is the same all day: a period starts only at a family day's start.
    if (earnAccessRuleHolding(rule, openings, familyClock(dayStarts[day], timeZone))) continue;
    const last = open[open.length - 1];
    if (last && last.endMs === dayStarts[day]) last.endMs = dayStarts[day + 1];
    else open.push({ startMs: dayStarts[day], endMs: dayStarts[day + 1] });
  }
  return open;
}

/** True when the person the rule is for may open it themselves once the steps are done. */
export function earnAccessRuleSelfOpenable(rule: EarnAccessRule): boolean {
  return !rule.approval;
}

export function buildEarnAccessOpening(nowMs: number, byUserId?: string, bySelf?: boolean): EarnAccessOpening {
  return {
    openedAtMs: nowMs,
    ...(byUserId ? { byUserId } : {}),
    ...(bySelf === true ? { bySelf: true } : {}),
  };
}

/** Openings with any for a rule that no longer exists dropped, so the record does not grow forever. */
export function pruneEarnAccessOpenings(settings: unknown, openings: unknown): EarnAccessOpenings {
  const ids = new Set(normalizeEarnAccessSettings(settings).rules.map((rule) => rule.id));
  const out: EarnAccessOpenings = {};
  if (!openings || typeof openings !== 'object') return out;
  for (const [ruleId, opening] of Object.entries(openings as Record<string, any>)) {
    if (!ids.has(ruleId) || !isFiniteNumber(opening?.openedAtMs)) continue;
    out[ruleId] = buildEarnAccessOpening(opening.openedAtMs, cleanId(opening.byUserId) || undefined, opening.bySelf === true);
  }
  return out;
}
