/**
 * New apps start blocked (NAP-6, HAT-1046, founder 2026-11-07): with the switch on, an app that
 * arrives on a child's device waits for a guardian.
 *
 * Added to the compiled block list rather than given a rule of its own, so every device that blocks
 * an app blocks a new one, older builds and the sealed fallbacks included. An allowlist ("block what
 * is not known") was set aside: a device lists only the apps a person opens from its menu, so it would
 * block share sheets, installers, helpers and Steam games running under ids no scan lists.
 *
 * An app waits when it arrived on this device after all of: the switch going on, the last Mark all
 * seen, and the device's own first list (every app on a newly linked device is "first seen" then). It
 * stops waiting once a guardian blocks or allows it, or leaves it open. Apps that came with the
 * device, the safety floors, and the phone's own screens (`notScreenTime.ts`) never wait.
 *
 * An app arrived when it was first seen, or, on a phone, when Android says it was installed
 * (`installedAt`, NAP-8): Guard keeps no list, so it reads install times, and the guardian's screens
 * read the same times from the list Guard sent.
 */
import type { CompiledAppPolicy, DeviceAppInventoryEntry, DeviceAppPolicy } from '../types/device-guard.types'
import { isSystemFurniture, policyEntryFor, policyKeyFor } from './deviceAppPolicy'
import { isNotScreenTimeApp } from './notScreenTime'
import { platformPrefixOf, toDeviceAppId, type DevicePlatform } from '../restrictions/deviceAppIds'

/** The platform-qualified ids of one device's apps that wait for a guardian, sorted. */
export function newAppsWaiting(
  installedApps: DeviceAppInventoryEntry[] | null | undefined,
  policy: DeviceAppPolicy | null | undefined,
): string[] {
  if (!policy?.newAppsBlockedAt) return []
  const present = (installedApps || []).filter((app) => app?.pkg && !app.removed)
  const sightings = present.map((app) => app.firstSeenAt).filter((t): t is number => typeof t === 'number')
  if (!sightings.length) return []
  const after = Math.max(Math.min(...sightings), policy.newAppsBlockedAt, policy.reviewedAt || 0)
  const out = new Set<string>()
  for (const app of present) {
    const arrivedAt = typeof app.installedAt === 'number' ? app.installedAt : app.firstSeenAt
    if (typeof arrivedAt !== 'number' || arrivedAt <= after) continue
    const prefix = platformPrefixOf(app.pkg)
    const platform = (prefix || app.platform || 'android') as DevicePlatform
    const pkg = prefix ? app.pkg.slice(prefix.length + 1) : app.pkg
    const entry = { ...app, pkg, platform }
    if (isSystemFurniture(entry) || isNotScreenTimeApp(entry, policy)) continue
    const appId = toDeviceAppId(platform, pkg)
    if (policy.seenApps?.[appId] || policyEntryFor(entry, policy)?.decision) continue
    out.add(appId)
  }
  return [...out].sort()
}

/**
 * `compiled` with the waiting apps blocked and named in `newApps`; unchanged when none wait. An app
 * the policy blocks already (its app type, say) is left out of `newApps`: Allow would not open it, so
 * the shield names the block, not the newness.
 */
export function withNewAppsBlocked(
  compiled: CompiledAppPolicy | undefined,
  installedApps: DeviceAppInventoryEntry[] | null | undefined,
  policy: DeviceAppPolicy | null | undefined,
): CompiledAppPolicy | undefined {
  const blocked = new Set(compiled?.blocked || [])
  const scopedBlocked = new Set(compiled?.scopedBlocked || [])
  const keyOf = (appId: string) => {
    const prefix = platformPrefixOf(appId)!
    return policyKeyFor({ pkg: appId.slice(prefix.length + 1), platform: prefix })
  }
  const waiting = newAppsWaiting(installedApps, policy).filter((appId) => !blocked.has(keyOf(appId)) && !scopedBlocked.has(appId))
  if (!waiting.length) return compiled
  for (const appId of waiting) {
    blocked.add(keyOf(appId))
    scopedBlocked.add(appId)
  }
  return { blocked: [...blocked].sort(), scopedBlocked: [...scopedBlocked].sort(), newApps: waiting }
}
