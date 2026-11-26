/**
 * Time limits' exceptions (HAT-1092): a limit that leaves something out, so that it gets time of its
 * own instead of using that limit's.
 *
 * - Games can have more time than Entertainment: Entertainment leaves games out, so a game counts
 *   toward Games and Overall only, and Games is no longer held inside Entertainment.
 * - Social media can have more time than Entertainment: the same, for social sites and apps.
 * - Learning games don't use Games time: Games leaves out what is Educational or Edutainment
 *   (Prodigy, chess.com), which still counts toward its category and Overall.
 * - Lesson videos don't use Video time: Video leaves out the same, for a lesson on YouTube.
 * - Task-Related items in their library don't use Overall time: Overall leaves out the schoolwork a
 *   guardian put in the child's library. Not all of Task-Related, which is also email and tools and
 *   never takes a limit of its own, so it would have none.
 *
 * An exception lives on the rule it changes, as `LimitRule.excludes`, the way a weekly total lives
 * in `weeklyHours`: every place that holds a limit reads it there, and every writer that rebuilds
 * the rules carries it over (`carryLimitExceptions`). A rule that does not exist yet has nothing to
 * leave out, so turning an exception on needs that limit to have an amount.
 */

import type { LimitMatchCondition, LimitRule } from '../types/usage-limits.types';
import { GAME_ATTRIBUTE } from './games';

export type LimitExceptionId = 'games-past-entertainment' | 'social-past-entertainment' | 'learning-games' | 'lesson-videos' | 'task-library-items';

const LEARNING_EDU_VALUES = ['eduval_educational', 'eduval_edutainment'];

export const LIMIT_EXCEPTIONS: ReadonlyArray<{ id: LimitExceptionId; ruleId: string; condition: LimitMatchCondition }> = [
  { id: 'games-past-entertainment', ruleId: 'simple-entertainment', condition: { type: 'attribute', values: [GAME_ATTRIBUTE] } },
  { id: 'social-past-entertainment', ruleId: 'simple-entertainment', condition: { type: 'socialDesignation', values: ['social'] } },
  { id: 'learning-games', ruleId: 'simple-custom-games', condition: { type: 'eduValue', values: LEARNING_EDU_VALUES } },
  { id: 'lesson-videos', ruleId: 'simple-custom-video', condition: { type: 'eduValue', values: LEARNING_EDU_VALUES } },
  { id: 'task-library-items', ruleId: 'simple-overall', condition: { type: 'libraryItem', values: ['eduval_task'] } },
];

/**
 * The limit each "past Entertainment" exception gives time of its own: Entertainment leaves it out,
 * so it needs a limit there to catch it. The one place this pairing is written.
 */
const OWN_TIME_RULE_IDS: Partial<Record<LimitExceptionId, string>> = {
  'games-past-entertainment': 'simple-custom-games',
  'social-past-entertainment': 'simple-social',
};

/** The limit this exception gives time of its own (Games, Social media), or null for the others. */
export function ownTimeRuleIdOf(id: LimitExceptionId): string | null {
  return OWN_TIME_RULE_IDS[id] ?? null;
}

/** The exception that gives this limit time of its own, or null when no exception does. */
export function ownTimeExceptionOf(ruleId: string): LimitExceptionId | null {
  const found = (Object.keys(OWN_TIME_RULE_IDS) as LimitExceptionId[]).find((id) => OWN_TIME_RULE_IDS[id] === ruleId);
  return found ?? null;
}

function exceptionOf(id: LimitExceptionId) {
  return LIMIT_EXCEPTIONS.find((e) => e.id === id)!;
}

function sameCondition(a: LimitMatchCondition | null | undefined, b: LimitMatchCondition): boolean {
  if (!a || a.type !== b.type) return false;
  const values = [...(a.values ?? [])].sort();
  const wanted = [...b.values].sort();
  return values.length === wanted.length && values.every((v, i) => v === wanted[i]);
}

/** True when this rule leaves out what the exception names. */
function ruleHasException(rule: LimitRule | null | undefined, id: LimitExceptionId): boolean {
  const { ruleId, condition } = exceptionOf(id);
  return rule?.id === ruleId && (rule.excludes ?? []).some((c) => sameCondition(c, condition));
}

/** True when the limits hold this exception. */
export function hasLimitException(rules: LimitRule[] | null | undefined, id: LimitExceptionId): boolean {
  const { ruleId } = exceptionOf(id);
  return ruleHasException((rules ?? []).find((rule) => rule?.id === ruleId), id);
}

/**
 * The exception has a limit to change, and for Games or Social media past Entertainment, a limit of
 * their own to count toward: without one, what Entertainment leaves out would be limited by Overall
 * alone.
 */
export function canHoldLimitException(rules: LimitRule[] | null | undefined, id: LimitExceptionId): boolean {
  const { ruleId } = exceptionOf(id);
  const has = (wanted: string) => (rules ?? []).some((rule) => rule?.id === wanted);
  const ownTime = ownTimeRuleIdOf(id);
  return has(ruleId) && (!ownTime || has(ownTime));
}

/**
 * A copy of the limits with this exception on or off. Returns the same array when nothing changes,
 * including turning one on for a limit that has no rule.
 */
export function withLimitException<T extends LimitRule>(rules: T[], id: LimitExceptionId, on: boolean): T[] {
  const { ruleId, condition } = exceptionOf(id);
  let changed = false;
  const next = rules.map((rule) => {
    if (rule?.id !== ruleId || ruleHasException(rule, id) === on) return rule;
    changed = true;
    const others = (rule.excludes ?? []).filter((c) => !sameCondition(c, condition));
    const excludes = on ? [...others, { type: condition.type, values: [...condition.values] }] : others;
    const out = { ...rule, excludes } as T;
    if (!excludes.length) delete out.excludes;
    return out;
  });
  return changed ? next : rules;
}

/**
 * The exceptions of the limits a writer replaces, carried onto the ones it writes: Time limits,
 * the setup wizard and Kinbot rebuild rules from amounts, which would otherwise drop them. Only the
 * exceptions are carried; anything else a rule leaves out is the writer's own.
 */
export function carryLimitExceptions<T extends LimitRule>(next: T[], existing: LimitRule[] | null | undefined): T[] {
  let out = next;
  for (const { id } of LIMIT_EXCEPTIONS) {
    if (!hasLimitException(existing, id)) continue;
    // Games or Social media's limit was removed: Entertainment counts them again, rather than
    // leaving them to Overall alone.
    out = withLimitException(out, id, canHoldLimitException(out, id));
  }
  return out;
}
