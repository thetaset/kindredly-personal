/**
 * A time limit's weekly total (HAT-1086): "Science Max, 20 minutes a week", "Games, 5 hours a week".
 *
 * `LimitRule.weeklyHours` sits beside the rule's daily amounts (`timeLimits`), never in place of
 * them: whichever runs out first stops it. The week starts Monday on the family clock
 * (`familyWeekStartMs`), the week Earn Access uses. Every place that enforces a limit reads the
 * weekly total through these, so a missing, negative or non-number value means "no weekly total"
 * everywhere alike.
 */

import type { LimitRule } from '../types/usage-limits.types';
import { withCapsInsideEntertainment } from './entertainmentCaps';

const HR_OF_MS = 60 * 60 * 1000;

/** True when the rule has a weekly total. 0 is one: nothing is allowed this week. */
export function hasWeeklyTotal(rule: Pick<LimitRule, 'weeklyHours'> | null | undefined): boolean {
  const hours = rule?.weeklyHours;
  return typeof hours === 'number' && Number.isFinite(hours) && hours >= 0;
}

/** The weekly total in ms, or null when the rule has none. */
export function weeklyBudgetMs(rule: Pick<LimitRule, 'weeklyHours'> | null | undefined): number | null {
  if (!hasWeeklyTotal(rule)) return null;
  return Math.max(0, Math.round((rule!.weeklyHours as number) * HR_OF_MS));
}

/** The weekly total in whole minutes, or null when the rule has none. */
export function weeklyTotalMinutes(rule: Pick<LimitRule, 'weeklyHours'> | null | undefined): number | null {
  if (!hasWeeklyTotal(rule)) return null;
  return Math.round((rule!.weeklyHours as number) * 60);
}

/** A copy of the rule with this weekly total in minutes; null or a negative number removes it. */
export function withWeeklyTotalMinutes<T extends LimitRule>(rule: T, minutes: number | null | undefined): T {
  const next = { ...rule };
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
    delete next.weeklyHours;
    return next;
  }
  next.weeklyHours = Math.round(minutes) / 60;
  return next;
}

/**
 * A day's amount never goes past the week's (HAT-1088): with 1 hour a week, no day has 2. A copy of
 * the rule with every daily amount above its weekly total lowered to it, and whether any was. A
 * whole day (24 hours, a limit on allowed hours alone) is no amount, so it is left as it is.
 */
export function withDailyAmountsInsideWeeklyTotal<T extends LimitRule>(rule: T): { rule: T; lowered: boolean } {
  if (!hasWeeklyTotal(rule) || !Array.isArray(rule.timeLimits)) return { rule, lowered: false };
  const weekly = rule.weeklyHours as number;
  let lowered = false;
  const timeLimits = rule.timeLimits.map((limit) => {
    const hours = limit?.hours;
    if (typeof hours !== 'number' || hours >= 24 || hours <= weekly) return limit;
    lowered = true;
    return { ...limit, hours: weekly };
  });
  return lowered ? { rule: { ...rule, timeLimits }, lowered } : { rule, lowered };
}

/** A number of hours from whatever was sent: a number, or a string that is one. Otherwise null. */
function hoursFrom(value: unknown): number | null {
  const hours = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof hours === 'number' && Number.isFinite(hours) ? hours : null;
}

/**
 * The limits as the server stores them (RVW-9, S5), whichever app or assistant sent them: a day's
 * amount is a number from 0 to 24 hours and never past its weekly total, and a weekly total is a
 * number from 0 to 168. An amount sent as text ("2") is stored as the number: text never blocked
 * in the browser and blocked all day on Guard. An amount that is no number at all is left as sent,
 * because nothing here can say what was meant. Returns the same array when nothing changed.
 */
export function heldUsageLimitRules<T extends LimitRule>(rules: T[] | null | undefined): T[] {
  if (!Array.isArray(rules)) return [];
  let changed = false;
  const held = rules.map((sent) => {
    if (!sent || typeof sent !== 'object') return sent;
    let rule = sent;
    if ((rule as LimitRule).weeklyHours != null) {
      const weekly = hoursFrom((rule as LimitRule).weeklyHours);
      const weeklyHours = weekly === null ? weekly : Math.min(168, Math.max(0, weekly));
      if (weeklyHours !== null && weeklyHours !== (rule as LimitRule).weeklyHours) rule = { ...rule, weeklyHours };
    }
    if (Array.isArray(rule.timeLimits)) {
      let amountsChanged = false;
      const timeLimits = rule.timeLimits.map((limit) => {
        const hours = hoursFrom(limit?.hours);
        if (hours === null) return limit;
        const heldHours = Math.min(24, Math.max(0, hours));
        if (heldHours === limit.hours) return limit;
        amountsChanged = true;
        return { ...limit, hours: heldHours };
      });
      if (amountsChanged) rule = { ...rule, timeLimits };
    }
    rule = withDailyAmountsInsideWeeklyTotal(rule).rule;
    if (rule !== sent) changed = true;
    return rule;
  });
  // Games and Social media can't exceed Entertainment (HAT-1092).
  const capped = withCapsInsideEntertainment(held);
  if (capped.lowered.length) return capped.rules;
  return changed ? held : rules;
}
