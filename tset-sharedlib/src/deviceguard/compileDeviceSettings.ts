/**
 * Settings in, compiled ruleset out: the device-side compile of the device control plane redesign
 * (decision D2, proposal §4.2).
 *
 * The input is exactly what `POST /companion/settings/current` returns (`DeviceSettings`, DCP-5)
 * plus what only the device knows: its installed apps, the clock, and today's web time. It does
 * what Kindredly's `CompanionRuleSyncService.buildRuleSet` does today on the child's phone, in one
 * pure function with no service behind it.
 *
 * Who uses it:
 * - The shared decision fixtures (DCP-6) compile every case with it, so Guard's and the desktop
 *   Companion's evaluators are held to the same decisions.
 * - The desktop Companion compiles its fetched settings with it (DCP-8).
 * - Guard's Kotlin compiler and the iPhone's Swift compiler port it (DCP-7, DCP-14). Where they
 *   differ, the fixtures fail.
 */

import type { LimitRule } from '../types/usage-limits.types'
import type {
  CompiledDeviceRuleSet,
  DeviceAppInventoryEntry,
  DeviceAppPolicy,
  DeviceSettings,
} from '../types/device-guard.types'
import type { EarnAccessOpenings } from '../types/earn-access.types'
import { buildAppCatalog, catalogAppId, chosenBrowsersLevel, compileAppPolicy, type AppCatalogEntry } from './deviceAppPolicy'
import { withNewAppsBlocked } from './newApps'
import { deviceAppGrants } from '../restrictions/appGrants'
import { compileNotCountedAppIds } from './notScreenTime'
import {
  EARN_ACCESS_DEVICE_HORIZON_DAYS,
  earnAccessDayStarts,
  earnAccessHoldsAsLimitRules,
  earnAccessOpenTimes,
  earnAccessRuleHolding,
  earnAccessRuleIsComplete,
  normalizeEarnAccessSettings,
} from '../restrictions/earnAccess'
import { familyClock, familyWeekKey } from './familyClock'
import { checkpointSettingsOf } from '../restrictions/checkinRule'
import { CHECKPOINT_FORBIDDEN_EDU_VALUE, resolveCheckpointMode } from '../restrictions/checkpoint'
import type { CheckpointException, LimitMatchCondition } from '../types/usage-limits.types'
import type { EduValue } from '../content.types'
import { applySchoolDays } from '../restrictions/schoolDays'
import {
  ALL_DEVICE_APPS,
  applyOverrides,
  compileDeviceRules,
  isDeviceAppRule,
  resolveAppIds,
  type CategoryExpansion,
} from './deviceRuleCompiler'

/** Bump together with the device parsers, like `RULESET_FORMAT_VERSION` in the rule sync. */
export const COMPILED_RULESET_VERSION = 1

export type DeviceSettingsCompileInput = {
  settings: DeviceSettings
  nowMs: number
  /**
   * IANA id schedules are evaluated in (D3). The compiled ruleset carries its UTC offset at `nowMs`,
   * so a device must recompile when the family date rolls over or the offset changes.
   */
  familyTimeZone: string
  /** Every app on this device, with its platform stamped (one inventory reports it once). */
  installedApps: DeviceAppInventoryEntry[]
  /**
   * Today's web time per rule, in the family date. Missing counts as none.
   *
   * HAT-1086: `perRuleWeekUsedMs` is this family week's web time per rule, today's included, counted
   * under `weekKey` (`familyWeekKey`). One from another week counts as none, as a day's seed does.
   */
  usageSeed?: { perRuleUsedMs: Record<string, number>; weekKey?: string; perRuleWeekUsedMs?: Record<string, number> }
  serverTimeSkewMs?: number
}

// One formatter per timezone: building one costs far more than using it, and the activity report
// asks for a date per activity row.
const offsetFormatters = new Map<string, Intl.DateTimeFormat>()

function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = offsetFormatters.get(timeZone)
  if (!formatter) {
    // Throws for an unknown timezone, as before, and keeps nothing.
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    offsetFormatters.set(timeZone, formatter)
  }
  return formatter
}

/** Minutes to add to UTC for local time in `timeZone` at `nowMs`. -420 for Los Angeles in summer. */
export function timeZoneOffsetMinutes(nowMs: number, timeZone: string): number {
  const parts = offsetFormatter(timeZone).formatToParts(new Date(nowMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  const localAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return Math.round((localAsUtc - Math.floor(nowMs / 1000) * 1000) / 60_000)
}

/** `yyyy-MM-dd` in `timeZone`: the day usage is bucketed under and the usage seed is keyed by. */
export function dateKeyInTimeZone(nowMs: number, timeZone: string): string {
  const localMs = nowMs + timeZoneOffsetMinutes(nowMs, timeZone) * 60_000
  return new Date(localMs).toISOString().slice(0, 10)
}

/** 0 = Sunday … 6 = Saturday in `timeZone`, JavaScript's convention. */
export function dayOfWeekInTimeZone(nowMs: number, timeZone: string): number {
  const localMs = nowMs + timeZoneOffsetMinutes(nowMs, timeZone) * 60_000
  return new Date(localMs).getUTCDay()
}

/** Whether a guardian's pause is on at `nowMs`. An expiry of 0 or none means until turned off. */
export function isPaused(settings: DeviceSettings, nowMs: number): boolean {
  const access = settings.accessControlSettings || {}
  if (access.disableUsageLimits !== true) return false
  const expires = access.disableUsageLimitsExpires
  return !expires || expires > nowMs
}

/**
 * "Pause all restrictions" at `nowMs`, or null when it is not in force. `untilMs` 0 means until the
 * guardian turns it off.
 *
 * Line for line the browser's own reading (`getRestrictionEffectiveStatus` in the client's
 * `restrictionState.ts`), so a paused child is paused on every surface at once:
 * - "Block all access" wins outright. While `restrictAll` is set there is no pause, even an expired
 *   `restrictAll` — the browser checks it first and never reaches the pause.
 * - Then the pause: on with no expiry, or with an expiry still ahead.
 *
 * The device cannot block everything yet, so under "Block all access" the most it does is decline
 * to pause. It never lifts blocks the browser is holding closed.
 *
 * Distinct from `isPaused`, which is "Pause just usage limits" and deliberately leaves app blocks up.
 */
export function restrictionsPauseAt(settings: Pick<DeviceSettings, 'accessControlSettings'>, nowMs: number): { untilMs: number } | null {
  const access = settings.accessControlSettings || {}
  if (access.restrictAll) return null
  if (!access.disableRestrictions) return null
  const untilMs = access.disableRestrictionsExpires || 0
  if (untilMs && untilMs <= nowMs) return null
  return { untilMs }
}

/**
 * The rules in force at `nowMs`: the authored limits plus every unexpired reward-minted rule, the
 * same merge the browser makes (`ActivityLogDataService._getUsageLimitsData`). Empty while paused.
 */
export function activeLimitRules(settings: DeviceSettings, nowMs: number): LimitRule[] {
  if (isPaused(settings, nowMs)) return []
  const authored = settings.usageLimitsData?.contentUsageLimits || []
  const rewards = (settings.usageLimitsData?.temporaryRules || [])
    .filter((rule) => typeof rule?.expiresAtMs === 'number' && rule.expiresAtMs > nowMs)
    .map(({ expiresAtMs: _expiresAtMs, ...rule }) => rule as LimitRule)
  return [...authored, ...rewards]
}

/** What a child with no App controls row is compiled as: nothing chosen, so every default applies. */
const ABSENT_POLICY: DeviceAppPolicy = { version: 1, blockedCategories: [], entries: {}, updatedAt: 0 }

export function compileDeviceSettings(input: DeviceSettingsCompileInput): CompiledDeviceRuleSet {
  const { settings, nowMs, familyTimeZone } = input
  const paused = isPaused(settings, nowMs)

  // Bonus time replaces today's allowance for its rule until `expiresAt` (`applyOverrides` drops the
  // expired ones). Today is the family's today, not the device's.
  // School days first (HAT-1283): a day off takes the Not school days schedule, and extra time then
  // replaces whichever schedule today has.
  const rules = applyOverrides(
    applySchoolDays(activeLimitRules(settings, nowMs), settings.schoolDays, familyClock(nowMs, familyTimeZone)),
    paused ? [] : settings.ruleOverrideSettings?.ruleOverrides,
    dayOfWeekInTimeZone(nowMs, familyTimeZone),
    nowMs,
  )

  // A null policy compiles to no `appPolicy` key. The device keeps its sealed app blocks in that
  // case (DCP-5); deciding that is the device's job, not this function's.
  // No row at all compiles as an empty one, so a child's phone gets the Browsers default (HAT-1348:
  // Browsers with Kindredly, founder 2026-11-25). A row that cannot be read stays null, as above.
  const policy = settings.appPolicy ?? (settings.appPolicyStatus === 'absent' ? ABSENT_POLICY : null)
  const catalog = buildAppCatalog(input.installedApps, policy)
  // A stored `countInUsageLimits: false` is ignored: the switch is gone (HAT-042, BTL-3).
  const categoryExpansion: CategoryExpansion = 'all'
  const deviceRules = rules.filter((rule) => isDeviceAppRule(rule, catalog, categoryExpansion))

  // Only rules that reach this device carry a seed, as in the rule sync's `buildUsageSeed`.
  const deviceRuleIds = new Set(deviceRules.map((rule) => rule.id))
  const perRuleUsedMs: Record<string, number> = {}
  for (const [ruleId, ms] of Object.entries(input.usageSeed?.perRuleUsedMs || {})) {
    if (deviceRuleIds.has(ruleId) && typeof ms === 'number' && ms > 0) perRuleUsedMs[ruleId] = ms
  }
  // The week's web time (HAT-1086), only when counted this family week. `compileDeviceRules` keeps it
  // only for rules with a weekly total, and drops the week entirely when no rule has one.
  const weekKey = familyWeekKey(familyClock(nowMs, familyTimeZone))
  const perRuleWeekUsedMs: Record<string, number> = {}
  if (input.usageSeed?.weekKey === weekKey) {
    for (const [ruleId, ms] of Object.entries(input.usageSeed.perRuleWeekUsedMs || {})) {
      if (deviceRuleIds.has(ruleId) && typeof ms === 'number' && ms > 0) perRuleWeekUsedMs[ruleId] = ms
    }
  }

  const access = settings.accessControlSettings || {}
  // New apps start blocked (NAP-6): added to the list, from this device's own apps.
  const appPolicy = withNewAppsBlocked(compileAppPolicy(policy, catalog), input.installedApps, policy)
  const familyDowntime = compileFamilyDowntime(settings.familyDowntime, nowMs)
  // The blocks and limits are compiled as usual underneath it, so they resume when it ends.
  const restrictionsPause = restrictionsPauseAt(settings, nowMs)
  const compiled = compileDeviceRules(deviceRules, {
    version: COMPILED_RULESET_VERSION,
    now: nowMs,
    tzOffsetMinutes: timeZoneOffsetMinutes(nowMs, familyTimeZone),
    serverTimeSkewMs: input.serverTimeSkewMs ?? 0,
    // Absent means block: a family that never chose reminder mode must not be given it.
    mode: access.usageLimitInterventionMode || access.defaultInterventionMode || 'block',
    usageSeed: {
      dateKey: dateKeyInTimeZone(nowMs, familyTimeZone),
      perRuleUsedMs,
      weekKey,
      perRuleWeekUsedMs,
    },
    appCatalog: catalog,
    categoryExpansion,
    ...(appPolicy ? { appPolicy } : {}),
  })
  const withDowntime = familyDowntime ? { ...compiled, familyDowntime } : compiled
  const alwaysAllowAppIds = compileAlwaysAllowAppIds(settings.alwaysAllowAppIds)
  // Time that is not screen time (HAT-952); only for a phone, so a computer's ruleset is unchanged.
  const isPhone = (input.installedApps || []).some((app) => (app?.platform || 'android') === 'android')
  const notCountedAppIds = isPhone ? compileNotCountedAppIds(input.installedApps, policy) : []
  const withNotCounted = notCountedAppIds.length ? { ...withDowntime, notCountedAppIds } : withDowntime
  const withAlwaysAllowed = alwaysAllowAppIds.length ? { ...withNotCounted, alwaysAllowAppIds } : withNotCounted
  // A guardian's yes to one app from a request. Only the live ones; the device re-checks `until`.
  const appGrants = deviceAppGrants(settings.appGrants).filter((grant) => grant.until > nowMs)
  const withGrants = appGrants.length ? { ...withAlwaysAllowed, appGrants } : withAlwaysAllowed
  // Earn access (HAT-836). Not gated on "Pause just usage limits", which does not lift it in the
  // browser either; "Pause all restrictions" is the device's to apply, as for every block.
  const earnAccess = compileEarnAccess(access, catalog, nowMs, familyTimeZone)
  const withEarnAccess = earnAccess ? { ...withGrants, earnAccess } : withGrants
  const blockAll = compileBlockAll(access, catalog, nowMs)
  const withBlockAll = blockAll ? { ...withEarnAccess, blockAll } : withEarnAccess
  // From every authored limit, paused or not: "Pause just usage limits" lifts the limits, not the
  // check-in, which the browser holds through it too.
  const checkin = compileCheckin(access, activeLimitRules({ ...settings, accessControlSettings: {} }, nowMs), catalog)
  const withCheckin = checkin ? { ...withBlockAll, checkin } : withBlockAll
  // The Browsers setting as chosen (HAT-1348), for a computer; a phone's half is in `appPolicy`.
  const browsers = chosenBrowsersLevel(policy)
  const withBrowsers = browsers ? { ...withCheckin, browsers } : withCheckin
  return restrictionsPause ? { ...withBrowsers, restrictionsPause } : withBrowsers
}

/**
 * What "Block all access" closes on a device (CMP-118): every app but Task-Related and system ones,
 * and on a phone the other browsers, which Kindredly does not filter. Kindredly and the Companion are
 * in the floor, which the device checks first. Null while it is off or has run out. Guard's Kotlin
 * compile ports it (`DeviceSettingsCompiler.compileBlockAll`).
 */
export const BLOCK_ALL_OPEN_EDU_VALUES: ReadonlySet<EduValue> = new Set<EduValue>(['eduval_task', 'eduval_unknown'])

export function compileBlockAll(
  access: { restrictAll?: boolean; restrictAllExpires?: number } | null | undefined,
  catalog: AppCatalogEntry[],
  nowMs: number,
): CompiledDeviceRuleSet['blockAll'] | null {
  if (access?.restrictAll !== true) return null
  const untilMs = Number(access.restrictAllExpires) || 0
  if (untilMs && untilMs <= nowMs) return null
  const appIds = catalog
    .filter((app) => !BLOCK_ALL_OPEN_EDU_VALUES.has(app.eduValue) || (app.categoryId === 'browsers' && (app.platform || 'android') === 'android'))
    .map(catalogAppId)
  return { untilMs, appIds: [...new Set(appIds)].sort() }
}

/** Conditions an app can answer. A site, library item or page condition can never match one. */
const APP_CONDITION_TYPES: ReadonlySet<LimitMatchCondition['type']> = new Set(['appId', 'eduValue', 'attribute', 'socialDesignation'] as LimitMatchCondition['type'][])

/**
 * The apps a check-in exception leaves open on a device: one with only app-shaped conditions, read
 * as a limit on them would be. "Unknown" is stripped, as the browser strips it, since it would open
 * everything.
 */
function checkinExceptionAppIds(exception: CheckpointException, catalog: AppCatalogEntry[]): string[] {
  const conditions = (exception?.conditions || [])
    .filter(Boolean)
    .map((c) => (c.type === 'eduValue' ? { ...c, values: (c.values || []).filter((v) => String(v) !== CHECKPOINT_FORBIDDEN_EDU_VALUE) } : c))
  if (!conditions.length || conditions.some((c) => !APP_CONDITION_TYPES.has(c.type))) return []
  const ids = resolveAppIds({ id: `checkin-exception:${exception.id}`, conditions } as unknown as LimitRule, catalog, 'all')
  return Array.isArray(ids) ? ids : []
}

/**
 * The Daily Check-in for a device (CMP-117): the apps it holds until today's is done, which are the
 * apps the time limits cover here less the exceptions'. Null when it is off, a reminder, or covers no
 * app here. Guard's Kotlin compile ports it (`DeviceSettingsCompiler.compileCheckin`).
 */
export function compileCheckin(
  access: DeviceSettings['accessControlSettings'] | null | undefined,
  rules: LimitRule[],
  catalog: AppCatalogEntry[],
): CompiledDeviceRuleSet['checkin'] | null {
  const settings = checkpointSettingsOf(access)
  if (settings?.enabled !== true) return null
  const mode = resolveCheckpointMode(settings)
  if (mode === 'reminder') return null
  const covered = new Set<string>()
  for (const rule of rules) {
    if (!isDeviceAppRule(rule, catalog, 'all')) continue
    const ids = resolveAppIds(rule, catalog, 'all')
    for (const id of ids === ALL_DEVICE_APPS ? catalog.map(catalogAppId) : ids) covered.add(id)
  }
  for (const exception of settings.exceptions || []) {
    for (const id of checkinExceptionAppIds(exception, catalog)) covered.delete(id)
  }
  if (!covered.size) return null
  const releasedUntilMs = Number(access?.checkpointRelease?.releasedUntilMs)
  return { mode, releasedUntilMs: Number.isFinite(releasedUntilMs) && releasedUntilMs > 0 ? releasedUntilMs : 0, appIds: [...covered].sort() }
}

/**
 * Earn access for the compiled ruleset (HAT-836): every rule that is on and can hold, with the apps
 * its holds cover and the times it is open up to the horizon, in the family timezone; and, for a
 * device that predates those times, the rules holding at `nowMs`. Each hold is expanded as a 0-minute
 * limit on the same condition (`earnAccessHoldsAsLimitRules`) through `resolveAppIds`, so a rule
 * holding Games closes exactly the apps the Games limit counts. The floor is left to the device, as
 * for every limit.
 *
 * A rule that covers no app on this device is left out, and the field is null when none is left.
 * The child's Kindredly pushes the same thing (`CompanionRuleSyncService`), and Guard's Kotlin
 * compile ports it (`DeviceSettingsCompiler.compileEarnAccess`).
 */
export function compileEarnAccess(
  access: { earnAccessSettings?: unknown; earnAccessOpenings?: EarnAccessOpenings | null } | null | undefined,
  catalog: AppCatalogEntry[],
  nowMs: number,
  familyTimeZone: string | null | undefined,
): CompiledDeviceRuleSet['earnAccess'] | null {
  const openings = access?.earnAccessOpenings
  const now = familyClock(nowMs, familyTimeZone)
  const dayStarts = earnAccessDayStarts(nowMs, familyTimeZone, EARN_ACCESS_DEVICE_HORIZON_DAYS)
  const earnAccess: NonNullable<CompiledDeviceRuleSet['earnAccess']> = { holds: [], rules: [] }
  for (const rule of normalizeEarnAccessSettings(access?.earnAccessSettings).rules) {
    if (!rule.enabled || !earnAccessRuleIsComplete(rule)) continue
    const open = earnAccessOpenTimes(rule, openings, dayStarts, familyTimeZone)
    if (!open) continue
    const appIds = new Set<string>()
    for (const limit of earnAccessHoldsAsLimitRules(rule)) {
      const ids = resolveAppIds(limit, catalog, 'all')
      // A hold names no app explicitly, so this is always a list; the sentinel would mean every app.
      if (Array.isArray(ids)) for (const id of ids) appIds.add(id)
    }
    if (!appIds.size) continue
    earnAccess.rules!.push({ ruleId: rule.id, name: rule.name, appIds: [...appIds], open })
    if (earnAccessRuleHolding(rule, openings, now)) earnAccess.holds.push({ ruleId: rule.id, name: rule.name, appIds: [...appIds] })
  }
  if (!earnAccess.rules!.length) return null
  return { ...earnAccess, horizonEndMs: dayStarts[dayStarts.length - 1] }
}

/**
 * Always allowed apps for the compiled ruleset: the settings' ids, deduplicated, in their order.
 * Guard's Kotlin compile does the same (`DeviceSettingsCompiler.compileAlwaysAllowAppIds`).
 */
export function compileAlwaysAllowAppIds(ids: unknown): string[] {
  const out: string[] = []
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id === 'string' && id.trim() && !out.includes(id.trim())) out.push(id.trim())
  }
  return out
}

/**
 * Family Downtime for the compiled ruleset: the settings' own times, less the stretches already over.
 * Nothing is worked out here; the server did that in the family timezone. Guard's Kotlin compile
 * does exactly this too (`DeviceSettingsCompiler.compileFamilyDowntime`), and the decision fixtures
 * hold the two to the same output.
 */
export function compileFamilyDowntime(
  downtime: DeviceSettings['familyDowntime'] | null | undefined,
  nowMs: number,
): CompiledDeviceRuleSet['familyDowntime'] | null {
  if (!downtime || !Array.isArray(downtime.intervals)) return null
  const intervals = downtime.intervals
    .filter((i) => Number.isFinite(i?.startMs) && Number.isFinite(i?.endMs) && i.endMs > nowMs && i.endMs > i.startMs)
    .map((i) => ({ startMs: i.startMs, endMs: i.endMs }))
  return {
    intervals,
    horizonEndMs: Number(downtime.horizonEndMs) || 0,
    allowAppIds: (Array.isArray(downtime.allowAppIds) ? downtime.allowAppIds : []).filter((id) => typeof id === 'string' && !!id),
    ...(typeof downtime.note === 'string' && downtime.note.trim() ? { note: downtime.note.trim() } : {}),
  }
}
