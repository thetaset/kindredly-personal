/**
 * One answer to "is this device doing its job?" (DCP-10, device control plane redesign §4.7).
 *
 * Health used to be worked out in four places that disagreed: `companionDeviceMerge.ts` (a quiet gap
 * measured from the device's own upload time), `deviceStatusView.ts` (which called a computer with
 * no browser open "Kindredly was removed"), `companionSummary` and `companionDevicesSummary` (which
 * never read `serviceRunning`). Every surface now calls this, with the same thresholds.
 *
 * Inputs are what the server holds: the heartbeat status blob and when the server received it. The
 * device's own clock is never used to decide "not heard from": a phone with a wrong clock would
 * otherwise look silent, or alive, at will.
 */

import { DEVICE_GUARD_QUIET_GAP_MS, type DeviceGuardStatus } from '../types/device-guard.types'
import { canEnforceAppBlocking, isDesktopPlatform } from '../restrictions/deviceAppIds'

/** The thresholds every health surface and the server's tamper watch share. */
export const DEVICE_HEALTH_THRESHOLDS = {
  /**
   * No heartbeat for this long: not heard from. Guard uploads on a 15-minute WorkManager period that
   * Android routinely defers past an hour on an idle phone, so anything shorter raises false alarms.
   */
  quietGapMs: DEVICE_GUARD_QUIET_GAP_MS,
  /**
   * A heartbeat whose monitor had not ticked for this long before it was received: stopped. Guard
   * ticks every poll (15 s at most) and persists a tick at least once a minute.
   */
  tickStaleMs: 3 * 60 * 1000,
  /**
   * Today's web time older than this: not reported. No device sends `usageSeedAgeMs` until DCP-9,
   * which settles the number.
   */
  usageSeedStaleMs: 60 * 60 * 1000,
} as const

/** Worst first. The first that applies is the device's state. */
export const DEVICE_HEALTH_STATES = [
  'not-heard-from',
  'stopped',
  'behind',
  'cant-block',
  'web-time-not-reported',
  'protected',
] as const

export type DeviceHealthState = (typeof DEVICE_HEALTH_STATES)[number]

export type DeviceHealth = {
  state: DeviceHealthState
  /** When the server last received a heartbeat. Null: never. */
  lastHeardAt: number | null
  /** Why it cannot do its job, when `cant-block`: usage access (sees no apps), overlay (Android: cannot shield). */
  missingPermission: 'usageAccess' | 'overlay' | null
  /** The settings version the device applied, and the latest, when both are known. */
  appliedSettingsVersion: number | null
  latestSettingsVersion: number | null
  /**
   * Facts that are not a health state, for the surface to say when relevant.
   * - `noBrowserAttached`: a computer with no browser running Kindredly. Not "removed" (DCP-10).
   * - `kindredlyMissing`: a phone the Kindredly app was uninstalled from.
   * - `watchOnly`: a platform that records app time but cannot block apps.
   */
  noBrowserAttached: boolean
  kindredlyMissing: boolean
  watchOnly: boolean
}

export function deviceHealth(
  status: DeviceGuardStatus | null | undefined,
  receivedAt: number | null | undefined,
  now: number,
  opts: { latestSettingsVersion?: number | null } = {},
): DeviceHealth {
  const desktop = isDesktopPlatform(status?.platform)
  const applied =
    typeof status?.appliedSettingsVersion === 'number' && status.appliedSettingsVersion >= 0
      ? status.appliedSettingsVersion
      : null
  const latest = typeof opts.latestSettingsVersion === 'number' ? opts.latestSettingsVersion : null
  const base = {
    lastHeardAt: receivedAt ?? null,
    missingPermission: null,
    appliedSettingsVersion: applied,
    latestSettingsVersion: latest,
    noBrowserAttached: desktop && status?.bridgeLive === false,
    kindredlyMissing: !desktop && status?.mainAppPresent === false,
    watchOnly: !!status && !canEnforceAppBlocking(status.platform),
  } satisfies Omit<DeviceHealth, 'state'>

  if (!status || receivedAt == null || now - receivedAt > DEVICE_HEALTH_THRESHOLDS.quietGapMs) {
    return { ...base, state: 'not-heard-from' }
  }

  const tickStale =
    typeof status.lastTickAt === 'number' &&
    status.lastTickAt > 0 &&
    receivedAt - status.lastTickAt > DEVICE_HEALTH_THRESHOLDS.tickStaleMs
  if (status.serviceRunning === false || tickStale) return { ...base, state: 'stopped' }

  // Compared with !==: a restored server can hold a lower version than a device applied, and the
  // device fetches it on its next check. Unknown on either side is not "behind".
  if (applied !== null && latest !== null && applied !== latest) return { ...base, state: 'behind' }

  if (status.permissions?.usageAccess === false) {
    return { ...base, state: 'cant-block', missingPermission: 'usageAccess' }
  }
  if (!desktop && !base.watchOnly && status.permissions?.overlay === false) {
    return { ...base, state: 'cant-block', missingPermission: 'overlay' }
  }

  if (
    typeof status.usageSeedAgeMs === 'number' &&
    status.usageSeedAgeMs > DEVICE_HEALTH_THRESHOLDS.usageSeedStaleMs
  ) {
    return { ...base, state: 'web-time-not-reported' }
  }

  return { ...base, state: 'protected' }
}

/** The worst of several devices, for one line above a list. Null for none. */
export function worstDeviceHealth(healths: DeviceHealth[]): DeviceHealth | null {
  let worst: DeviceHealth | null = null
  for (const h of healths) {
    if (!worst || DEVICE_HEALTH_STATES.indexOf(h.state) < DEVICE_HEALTH_STATES.indexOf(worst.state)) worst = h
  }
  return worst
}
