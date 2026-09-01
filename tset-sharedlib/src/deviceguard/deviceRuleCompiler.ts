/**
 * Kindredly Companion — Phase 0/1 spike: rule compiler.
 *
 * Compiles the existing browser-scoped `LimitRule[]` down to a small, flat
 * `CompiledDeviceRuleSet` the on-device native evaluator (Android
 * DeviceGuardService / iOS ScreenTimePlugin) can enforce WITHOUT the main
 * app's decision engine being alive. This is the concrete proof of the
 * proposal's "reuse the LimitRule model, push it down to native" claim
 * (docs/proposals/kindredly-companion-device-app-controls.md §5.3).
 *
 * Rule/ruleset types live in tset-sharedlib/types/device-guard.types (shared
 * with the Companion satellite and parent UI); this module owns only the
 * compile step and its options.
 */

import type {
  LimitRule,
  LimitMatchCondition,
  RuleOverride,
  TimeLimit,
} from '../types/usage-limits.types';
import type { InterventionMode } from '../types/activity.types';
import type {
  CompiledDeviceRule,
  CompiledDeviceRuleSet,
  CompiledScheduleWindow,
} from '../types/device-guard.types';
import { ALL_DEVICE_APPS } from '../types/device-guard.types'
import type { CompiledAppPolicy } from '../types/device-guard.types'
import { catalogAppId, type AppCatalogEntry } from './deviceAppPolicy';

const HR_OF_MS = 1000 * 60 * 60

export { ALL_DEVICE_APPS }
export type {
  CompiledDeviceRule,
  CompiledDeviceRuleSet,
  CompiledScheduleWindow,
  CompiledTimeRange,
} from '../types/device-guard.types'

export type CompileOptions = {
  version: number
  now: number
  tzOffsetMinutes: number
  serverTimeSkewMs?: number
  /** Account-level intervention mode (accessControlSettings.usageLimitInterventionMode); default 'block'. */
  mode?: InterventionMode
  safetyAllowlist?: string[]
  usageSeed?: { dateKey: string; perRuleUsedMs: Record<string, number> }
  /**
   * The child's installed apps with a resolved eduValue, so an `eduValue` limit
   * condition can reach phone apps. Defaults to empty, which reproduces the
   * pre-catalog behaviour exactly — that is what keeps every existing compiler
   * test valid unchanged.
   */
  appCatalog?: AppCatalogEntry[]
  /**
   * Which rules may reach phone apps through a CATEGORY condition (`eduValue`,
   * `socialDesignation`). Defaults to `'all'`, which is the pre-existing behaviour
   * and what every family who has not opted out gets.
   *
   * `'blocksOnly'` is the parent's "don't count phone apps toward usage limits"
   * choice. See `CATEGORY_EXPANSION` below for why that is not the same as
   * withholding the catalog.
   */
  categoryExpansion?: CategoryExpansion
  /**
   * Fully materialized protections. Optional: omitted entirely when the family has
   * nothing blocked, so their ruleset stays byte-identical to a pre-feature one
   * and `fingerprintOf` does not flap.
   */
  appPolicy?: CompiledAppPolicy
}

/**
 * CATEGORY_EXPANSION — what "don't count phone apps toward usage limits" means.
 *
 * It used to mean "withhold the app catalog entirely", which had a consequence
 * nobody chose: a category the parent set to **Blocked** also stopped blocking on the
 * phone. "Social media: Blocked" left Instagram and TikTok completely free on the
 * handset while the parent's screen said they were off.
 *
 * So the opt-out is about ACCOUNTING, not about enforcement. Under `'blocksOnly'` an
 * all-day block still expands to the matching packages; only budgeted rules stop.
 *
 * The report side (`deviceAppAttribution.ts`) still withholds categories under the
 * same setting, and that asymmetry is correct rather than a divergence: the coupling
 * invariant is "the device must never enforce a BUDGET the parent's report cannot
 * explain", and a blocked rule has no budget to spend.
 */
export type CategoryExpansion = 'all' | 'blocksOnly'

export const DEFAULT_SAFETY_ALLOWLIST = [
  'com.thetaset.companion',
  'com.thetaset.kindred',
]

function appIdConditions(conditions: LimitMatchCondition[] | undefined): LimitMatchCondition[] {
  return (conditions ?? []).filter((c) => c.type === 'appId')
}

/**
 * Fold today's `RuleOverride`s (bonus time, "block again at", temporary grants)
 * into the rules before compiling, so the device sees the same allowance the
 * browser does.
 *
 * This mirrors `UsageSummaryCache.buildLimitRuleListInfo`, where an override
 * REPLACES today's TimeLimit wholesale — hours and timeRanges both. The device
 * ruleset spans every day of the week, so we rewrite today's day-of-week only
 * and leave the other days as authored; overrides expire at midnight anyway.
 *
 * Without this, a parent granting extra time changes nothing on the phone and
 * the shield stays up.
 */
export function applyOverrides(
  rules: LimitRule[],
  overrides: RuleOverride[] | null | undefined,
  dowIndex: number,
  now: number,
): LimitRule[] {
  const byRuleId = new Map<string, RuleOverride>()
  for (const o of overrides ?? []) {
    if (o?.ruleId && o.timeLimit && o.expiresAt > now) byRuleId.set(o.ruleId, o)
  }
  if (byRuleId.size === 0) return rules

  return rules.map((rule) => {
    const override = byRuleId.get(rule.id)
    if (!override) return rule
    const otherDays = (rule.timeLimits ?? [])
      .map((tl) => ({ ...tl, daysOfWeek: (tl.daysOfWeek ?? []).filter((d) => d !== dowIndex) }))
      .filter((tl) => tl.daysOfWeek.length > 0)
    const today: TimeLimit = { ...override.timeLimit, daysOfWeek: [dowIndex] }
    return { ...rule, timeLimits: [today, ...otherDays] }
  })
}

/**
 * Packages whose resolved eduValue satisfies the rule's `eduValue` condition.
 *
 * This is what makes "2 hours of entertainment" mean two hours across the web AND
 * the phone. Before it, a category budget could not match a device app at all —
 * app sessions upload with no category — so a child could spend four hours in a
 * game and burn none of an entertainment limit.
 *
 * Returns nothing when the catalog is empty, which is what preserves the previous
 * behaviour for any caller that has no inventory (and every pre-existing test).
 */
export function expandEduValueAppIds(rule: LimitRule, catalog: AppCatalogEntry[]): string[] {
  const wanted = new Set(
    (rule.conditions ?? []).filter((c) => c.type === 'eduValue').flatMap((c) => c.values),
  )
  if (wanted.size === 0 || catalog.length === 0) return []
  return catalog.filter((a) => wanted.has(a.eduValue)).map(catalogAppId)
}

/** `non-social` in either spelling the browser side accepts (`ActivityUtils.ts:203`). */
const NON_SOCIAL_VALUES = new Set(['non-social', 'nonsocial'])

/**
 * Packages in the `social` app category, for a rule carrying a `socialDesignation`
 * condition — the "Social media" row in the limits editor.
 *
 * Without this the row is silently browser-only: it compiles to no device rule at
 * all, so "Social media: blocked" leaves Instagram, Snapchat and TikTok completely
 * unrestricted on the child's phone while the parent's screen says they are off.
 *
 * ⚠️ Only the AFFIRMATIVE direction crosses to the phone. On the web `non-social`
 * means "everything that isn't a feed"; on a phone that is every app the child
 * owns, so expanding it would turn a narrow social limit into a whole-device budget
 * the parent never authored. Those rules expand to nothing and stay browser-only.
 *
 * The graded values (`light`/`core`/`high`/`levelN`) are all "social to at least
 * degree N", and an app is either in the social category or it is not — there is no
 * per-app level to compare against — so every affirmative form resolves the same
 * way. An empty `values` array is affirmative too, matching `checkConditionList`.
 */
export function expandSocialAppIds(rule: LimitRule, catalog: AppCatalogEntry[]): string[] {
  if (catalog.length === 0) return []
  const conditions = (rule.conditions ?? []).filter((c) => c.type === 'socialDesignation')
  if (conditions.length === 0) return []
  const affirmative = conditions.some((c) => {
    const values = (c.values ?? []).map((v) => String(v).toLowerCase())
    return values.length === 0 || values.some((v) => !NON_SOCIAL_VALUES.has(v))
  })
  if (!affirmative) return []
  return catalog.filter((a) => a.categoryId === 'social').map(catalogAppId)
}

/**
 * A rule that turns its content off for the whole day, every day it covers — what the
 * limits editor calls **Blocked**. It stores that as `hours: 0` (see the ladder note
 * in `UsageLimitsSimpleComponent`: "A 0-min cap = blocked").
 *
 * A rule with no `timeLimits` at all is NOT this: it imposes nothing, and treating it
 * as a block would turn an unconfigured category into a device-wide ban.
 *
 * ⚠️ An override granting bonus time rewrites today's TimeLimit (`applyOverrides`
 * above), so a Blocked rule the parent has just granted time on stops matching here
 * and, under `'blocksOnly'`, stops reaching the phone for the rest of the day. That is
 * the parent's own decision taking effect, not a leak — they lifted the block.
 */
export function isAllDayBlockRule(rule: LimitRule): boolean {
  const limits = rule.timeLimits ?? []
  if (limits.length === 0) return false
  return limits.every((tl) => (tl.hours ?? 0) === 0)
}

/** Whether this rule's CATEGORY conditions may expand under the current mode. */
function categoryExpansionAllowed(rule: LimitRule, mode: CategoryExpansion): boolean {
  return mode === 'all' || isAllDayBlockRule(rule)
}

/**
 * True when a rule should enforce against device apps at all.
 *
 * Three ways in: an explicit `appId` condition (specific packages, or the
 * `ALL_DEVICE_APPS` sentinel the "Also count time in phone apps" toggle appends),
 * an `eduValue` condition that some installed app resolves to, or a
 * `socialDesignation` condition with social apps installed.
 *
 * `type: 'all'` deliberately does NOT qualify — it used to imply whole-device
 * blocking, which meant setting an overall daily limit silently shielded every app
 * on the child's phone with nothing in the UI saying so.
 *
 * ⚠️ This is UNSAFE to pass to `Array.filter` directly: filter supplies
 * `(value, index, array)`, so the index arrives as `catalog` and the array as
 * `categoryExpansion`. It type-checks either way, so the compiler will not save you —
 * both call sites pass an arrow for this reason.
 *
 * The explicit throw below is deliberate, and it is checked rather than left to
 * happen incidentally further down. Letting a non-array catalog fall through would
 * turn the mistake into rules that quietly stop reaching the phone, which is far
 * harder to notice than a crash in a test. (It used to blow up on its own inside
 * `expandEduValueAppIds`; adding the third parameter gave the bad call a path that
 * returned `false` before ever getting there, so the guard is now stated outright.)
 */
export function isDeviceAppRule(
  rule: LimitRule,
  catalog: AppCatalogEntry[] = [],
  categoryExpansion: CategoryExpansion = 'all',
): boolean {
  if (!Array.isArray(catalog)) {
    throw new TypeError('isDeviceAppRule: catalog must be an array — did you pass it bare to Array.filter?')
  }
  // First and unconditionally: an explicit appId is a per-rule opt-in the parent made
  // deliberately, and no account-level accounting preference should undo it.
  if (appIdConditions(rule.conditions).length > 0) return true
  if (!categoryExpansionAllowed(rule, categoryExpansion)) return false
  if (expandEduValueAppIds(rule, catalog).length > 0) return true
  return expandSocialAppIds(rule, catalog).length > 0
}

function resolveAppIds(
  rule: LimitRule,
  catalog: AppCatalogEntry[] = [],
  categoryExpansion: CategoryExpansion = 'all',
): string[] | typeof ALL_DEVICE_APPS {
  const explicit = appIdConditions(rule.conditions).flatMap((c) => c.values)
  if (explicit.includes(ALL_DEVICE_APPS)) return ALL_DEVICE_APPS
  if (!categoryExpansionAllowed(rule, categoryExpansion)) return [...new Set(explicit)]
  // Union, not intersection. `checkConditionList` ANDs conditions on the web side,
  // so a rule carrying two different condition types would mean something narrower
  // there than here. The authoring UI emits exactly one condition per rule (the
  // ALL_DEVICE_APPS sentinel only ever lands on the `type: 'all'` overall rule), so
  // no rule it produces can hit the difference. Revisit if that stops being true.
  //
  // De-dupe, preserve first-seen order for deterministic output.
  return [
    ...new Set([
      ...explicit,
      ...expandEduValueAppIds(rule, catalog),
      ...expandSocialAppIds(rule, catalog),
    ]),
  ]
}

function compileRule(
  rule: LimitRule,
  priority: number,
  mode: InterventionMode,
  catalog: AppCatalogEntry[],
  categoryExpansion: CategoryExpansion,
): CompiledDeviceRule {
  const dailyBudgetMsByDow: Record<number, number> = {}
  const schedule: CompiledScheduleWindow[] = []
  for (const tl of rule.timeLimits ?? []) {
    const budgetMs = Math.max(0, Math.round(tl.hours * HR_OF_MS))
    for (const dow of tl.daysOfWeek ?? []) {
      // Multiple TimeLimits touching the same day: take the most generous budget.
      dailyBudgetMsByDow[dow] = Math.max(dailyBudgetMsByDow[dow] ?? 0, budgetMs)
    }
    if (tl.timeRanges && tl.timeRanges.length > 0) {
      schedule.push({ daysOfWeek: [...(tl.daysOfWeek ?? [])], timeRanges: tl.timeRanges.map((r) => ({ ...r })) })
    }
  }
  return {
    ruleId: rule.id,
    name: rule.name,
    mode,
    appIds: resolveAppIds(rule, catalog, categoryExpansion),
    schedule,
    dailyBudgetMsByDow,
    priority,
    // Spread, so a normal rule emits no key at all and its JSON — and therefore
    // `fingerprintOf()` — is byte-identical to before. Emitting `false` everywhere
    // would re-push every ruleset once for a purely cosmetic field.
    ...(rule.type === 'all' ? { coversEverything: true } : {}),
  }
}

/**
 * Pure, deterministic compile. `now`/tz are passed in (not read from the
 * environment) so the output is reproducible and unit-testable.
 */
export function compileDeviceRules(rules: LimitRule[], opts: CompileOptions): CompiledDeviceRuleSet {
  const mode = opts.mode ?? 'block'
  const catalog = opts.appCatalog ?? []
  const categoryExpansion = opts.categoryExpansion ?? 'all'
  const deviceRules = rules
    // Arrow, NOT a bare reference: Array.filter passes (value, index, array), so
    // `isDeviceAppRule` would receive the index as its catalog. See its doc.
    .filter((rule) => isDeviceAppRule(rule, catalog, categoryExpansion))
    .map((rule, i) => compileRule(rule, i, mode, catalog, categoryExpansion))
  return {
    version: opts.version,
    generatedAt: opts.now,
    tzOffsetMinutes: opts.tzOffsetMinutes,
    serverTimeSkewMs: opts.serverTimeSkewMs ?? 0,
    rules: deviceRules,
    safetyAllowlist: opts.safetyAllowlist ?? DEFAULT_SAFETY_ALLOWLIST,
    usageSeed: opts.usageSeed ?? { dateKey: '', perRuleUsedMs: {} },
    // Spread rather than assigned, so an absent policy leaves no key at all.
    // Emitting `appPolicy: undefined` would still change the JSON and re-push.
    ...(opts.appPolicy ? { appPolicy: opts.appPolicy } : {}),
  }
}
