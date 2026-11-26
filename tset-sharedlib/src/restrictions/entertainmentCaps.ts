/**
 * Games and Social media can't exceed Entertainment (HAT-1092). A game or a social site counts toward
 * its page's category and toward Games or Social media, and whichever runs out first stops it; most
 * of them are Entertainment, so a Games amount above Entertainment's is never reached and a child
 * sees Games time he can't use. The cap makes that a rule of the limits themselves: Games and
 * Social media are never saved above Entertainment, daily against daily, weekly against weekly, a
 * daily amount against Entertainment's weekly total, and a weekly total against Entertainment's days
 * added up. Every writer (Time limits, the setup wizard, Kinbot, the server) passes its limits
 * through this.
 */

import type { LimitRule } from '../types/usage-limits.types';
import { hasLimitException, ownTimeExceptionOf } from './limitExceptions';

// weeklyLimit.ts imports this file, so its hasWeeklyTotal is restated here rather than imported.
function hasWeeklyTotal(rule: Pick<LimitRule, 'weeklyHours'>): boolean {
  const hours = rule.weeklyHours;
  return typeof hours === 'number' && Number.isFinite(hours) && hours >= 0;
}

export const ENTERTAINMENT_RULE_ID = 'simple-entertainment';
/** The limits that sit inside Entertainment: Games (HAT-634) and Social media. */
export const CAPPED_BY_ENTERTAINMENT_RULE_IDS = ['simple-custom-games', 'simple-social'] as const;
/** True while this limit is held inside Entertainment: it is Games or Social media, with no exception. */
export function isHeldInsideEntertainment(rules: LimitRule[] | null | undefined, ruleId: string): boolean {
  if (!(CAPPED_BY_ENTERTAINMENT_RULE_IDS as readonly string[]).includes(ruleId)) return false;
  const exception = ownTimeExceptionOf(ruleId);
  return !exception || !hasLimitException(rules, exception);
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** An amount of hours, or null for a whole day (24 hours: a limit on allowed hours alone) or none. */
function amountHours(hours: unknown): number | null {
  return typeof hours === 'number' && Number.isFinite(hours) && hours >= 0 && hours < 24 ? hours : null;
}

/** Entertainment's daily amount on this day, or null when it gives that day no amount. */
function dailyOn(rule: LimitRule, day: number): number | null {
  for (const limit of rule.timeLimits ?? []) {
    if (Array.isArray(limit?.daysOfWeek) && limit.daysOfWeek.includes(day)) return amountHours(limit.hours);
  }
  return null;
}

/**
 * The most Entertainment can have in a week: its weekly total, or its seven days added up when every
 * day has an amount, whichever is less. Null when neither bounds the week.
 */
export function entertainmentWeekCapHours(rule: LimitRule | null | undefined): number | null {
  if (!rule) return null;
  const caps: number[] = [];
  if (hasWeeklyTotal(rule)) caps.push(rule.weeklyHours as number);
  const days = ALL_DAYS.map((day) => dailyOn(rule, day));
  if (days.every((hours) => hours !== null)) caps.push((days as number[]).reduce((a, b) => a + b, 0));
  return caps.length ? Math.min(...caps) : null;
}

/**
 * The limits with Games and Social media held inside Entertainment, and the ids of the limits that
 * were lowered. Returns the same array when nothing was. A day on which Entertainment has no amount
 * caps nothing that day; a whole-day Games entry (allowed hours alone) is no amount and is left.
 */
export function withCapsInsideEntertainment<T extends LimitRule>(rules: T[]): { rules: T[]; lowered: string[] } {
  if (!Array.isArray(rules)) return { rules, lowered: [] };
  const ent = rules.find((rule) => rule?.id === ENTERTAINMENT_RULE_ID);
  if (!ent) return { rules, lowered: [] };
  const entWeekly = hasWeeklyTotal(ent) ? (ent.weeklyHours as number) : null;
  const weekCap = entertainmentWeekCapHours(ent);
  const lowered: string[] = [];

  const next = rules.map((rule) => {
    // An exception (HAT-1092) gives Games or Social media time of its own: Entertainment leaves it
    // out, so it is no longer held inside it.
    if (!rule || !isHeldInsideEntertainment(rules, rule.id)) return rule;
    let changed = false;
    const timeLimits = Array.isArray(rule.timeLimits)
      ? rule.timeLimits.map((limit) => {
          const hours = amountHours(limit?.hours);
          if (hours === null) return limit;
          const caps = (limit.daysOfWeek ?? []).map((day) => dailyOn(ent, day)).filter((h): h is number => h !== null);
          if (entWeekly !== null) caps.push(entWeekly);
          if (!caps.length) return limit;
          const cap = Math.min(...caps);
          if (hours <= cap) return limit;
          changed = true;
          return { ...limit, hours: cap };
        })
      : rule.timeLimits;
    let out: T = changed ? { ...rule, timeLimits } : rule;
    if (weekCap !== null && hasWeeklyTotal(out) && (out.weeklyHours as number) > weekCap) {
      out = { ...out, weeklyHours: weekCap };
      changed = true;
    }
    if (changed) lowered.push(rule.id);
    return out;
  });
  return lowered.length ? { rules: next, lowered } : { rules, lowered };
}
