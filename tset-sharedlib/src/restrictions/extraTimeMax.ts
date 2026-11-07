/**
 * The most extra time a day a limit can be given (HAT-950 rule B), shared by every writer of extra
 * time and by the server, which holds each save to it.
 *
 * A limit's ceiling is its `extraTimeMax` entry: minutes, or 'same' for today's daily limit (a
 * 10-minute limit takes up to 10 more minutes a day). No entry, or 'any', is no ceiling (HAT-998:
 * a guardian's grant must land where they gave it). 'same' on a limit with no time today, or the
 * whole day, has no daily limit to measure against and so no ceiling. Extra time already given today, the
 * override's hours above today's limit, counts against it.
 */
import type {ExtraTimeMax, LimitRule, RuleOverride, TimeLimit} from '../types/usage-limits.types';

/**
 * The limit a child is held to on a weekday: that day's entry, else a legacy entry with no days at
 * all, as enforcement reads it (UsageSummaryCache, useRuleOverrides.getTodaysLimit).
 */
export function enforcedTimeLimitOn(rule: LimitRule | null | undefined, dayOfWeek: number): TimeLimit | null {
  const list = Array.isArray(rule?.timeLimits) ? rule!.timeLimits : [];
  return (
    list.find(tl => Array.isArray(tl?.daysOfWeek) && tl.daysOfWeek.includes(dayOfWeek)) ||
    list.find(tl => !Array.isArray(tl?.daysOfWeek) || tl.daysOfWeek.length === 0) ||
    null
  );
}

/** The ceiling in minutes for a limit on a weekday, before what was given; null when it has none. */
export function extraTimeCeilingMinutes(
  rule: LimitRule | null | undefined,
  extraTimeMax: ExtraTimeMax | null | undefined,
  dayOfWeek: number,
): number | null {
  const set = rule?.id ? extraTimeMax?.[rule.id] : undefined;
  if (typeof set === 'number' && Number.isFinite(set)) return Math.max(0, Math.round(set));
  if (set !== 'same') return null;
  const hours = enforcedTimeLimitOn(rule, dayOfWeek)?.hours;
  return typeof hours === 'number' && hours > 0 && hours < 24 ? Math.round(hours * 60) : null;
}

/** Extra time an override gives above the limit, in minutes. */
function givenMinutes(rule: LimitRule, override: RuleOverride | null | undefined, dayOfWeek: number): number {
  const overrideHours = override?.timeLimit?.hours;
  if (typeof overrideHours !== 'number') return 0;
  const base = enforcedTimeLimitOn(rule, dayOfWeek)?.hours;
  return Math.max(0, Math.round((overrideHours - (typeof base === 'number' ? base : 0)) * 60));
}

/** The most extra time a limit can still be given today, in minutes; null when it has no ceiling. */
export function extraTimeLeftMinutes(input: {
  rule: LimitRule;
  override?: RuleOverride | null;
  extraTimeMax?: ExtraTimeMax | null;
  todayIndex: number;
}): number | null {
  const ceiling = extraTimeCeilingMinutes(input.rule, input.extraTimeMax, input.todayIndex);
  if (ceiling === null) return null;
  return Math.max(0, ceiling - givenMinutes(input.rule, input.override, input.todayIndex));
}

/**
 * Each override held to its limit's ceiling: one that gives more extra time than that comes down to
 * today's limit plus the ceiling. Its day is the one the override was written for. Overrides that
 * give less, or for limits with no ceiling, are returned as they are.
 */
export function holdOverridesToExtraTimeMax(input: {
  overrides: RuleOverride[];
  rules: LimitRule[];
  extraTimeMax: ExtraTimeMax | null | undefined;
}): RuleOverride[] {
  const rules = Array.isArray(input.rules) ? input.rules : [];
  return (Array.isArray(input.overrides) ? input.overrides : []).map(override => {
    const rule = rules.find(r => r?.id === override?.ruleId);
    const day = override?.timeLimit?.daysOfWeek?.[0];
    if (!rule || typeof day !== 'number') return override;
    const ceiling = extraTimeCeilingMinutes(rule, input.extraTimeMax, day);
    if (ceiling === null || givenMinutes(rule, override, day) <= ceiling) return override;
    const base = enforcedTimeLimitOn(rule, day)?.hours || 0;
    return {...override, timeLimit: {...override.timeLimit, hours: Math.min(24, base + ceiling / 60)}};
  });
}
