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
  DeviceSettings,
} from '../types/device-guard.types'
import { buildAppCatalog, compileAppPolicy } from './deviceAppPolicy'
import {
  applyOverrides,
  compileDeviceRules,
  isDeviceAppRule,
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
  /** Today's web time per rule, in the family date. Missing counts as none. */
  usageSeed?: { perRuleUsedMs: Record<string, number> }
  serverTimeSkewMs?: number
}

/** Minutes to add to UTC for local time in `timeZone` at `nowMs`. -420 for Los Angeles in summer. */
export function timeZoneOffsetMinutes(nowMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(nowMs))
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

export function compileDeviceSettings(input: DeviceSettingsCompileInput): CompiledDeviceRuleSet {
  const { settings, nowMs, familyTimeZone } = input
  const paused = isPaused(settings, nowMs)

  // Bonus time replaces today's allowance for its rule until `expiresAt` (`applyOverrides` drops the
  // expired ones). Today is the family's today, not the device's.
  const rules = applyOverrides(
    activeLimitRules(settings, nowMs),
    paused ? [] : settings.ruleOverrideSettings?.ruleOverrides,
    dayOfWeekInTimeZone(nowMs, familyTimeZone),
    nowMs,
  )

  // A null policy compiles to no `appPolicy` key. The device keeps its sealed app blocks in that
  // case (DCP-5); deciding that is the device's job, not this function's.
  const policy = settings.appPolicy
  const catalog = buildAppCatalog(input.installedApps, policy)
  const categoryExpansion: CategoryExpansion = policy?.countInUsageLimits === false ? 'blocksOnly' : 'all'
  const deviceRules = rules.filter((rule) => isDeviceAppRule(rule, catalog, categoryExpansion))

  // Only rules that reach this device carry a seed, as in the rule sync's `buildUsageSeed`.
  const deviceRuleIds = new Set(deviceRules.map((rule) => rule.id))
  const perRuleUsedMs: Record<string, number> = {}
  for (const [ruleId, ms] of Object.entries(input.usageSeed?.perRuleUsedMs || {})) {
    if (deviceRuleIds.has(ruleId) && typeof ms === 'number' && ms > 0) perRuleUsedMs[ruleId] = ms
  }

  const access = settings.accessControlSettings || {}
  const appPolicy = compileAppPolicy(policy, catalog)
  const familyDowntime = compileFamilyDowntime(settings.familyDowntime, nowMs)
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
    },
    appCatalog: catalog,
    categoryExpansion,
    ...(appPolicy ? { appPolicy } : {}),
  })
  return familyDowntime ? { ...compiled, familyDowntime } : compiled
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
