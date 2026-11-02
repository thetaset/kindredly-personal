/**
 * A guardian's "yes" to one blocked app, for a while (HAT-178).
 *
 * A child on a computer or phone presses "Send request" on the block screen; the request names the
 * app as `<platform>:<id>` (`linux:org.gnome.Software`, `macos:com.valvesoftware.steam`,
 * `android:com.roblox.client`). Approving it used to go through the website path — "This page
 * only", "Add to Emma's library" — which can never reach a device, so no platform could unblock an
 * app from a request. Now the approval writes one of these into the child's options
 * (`options.appGrants`); the server passes it to devices with their settings, and each device
 * lifts its block on that app until `until`, as the Companion's "Ask in person" does.
 *
 * Like every grant (`deviceGrants.ts`), it can only loosen: it removes one app from what is
 * blocked, never adds one, and it always ends.
 */

export type AppGrant = {
  /** `<platform>:<id>`, as the request carried it. */
  appId: string
  /** Epoch ms when the app is blocked again. */
  until: number
  grantedAt?: number
  grantedBy?: string
}

/** What a device needs: the app and the end. Who said yes stays on the server. */
export type DeviceAppGrant = { appId: string; until: number }

/** The choices a guardian has. `today` ends at the guardian's local midnight. */
export type AppGrantDuration = 15 | 60 | 'today'

/** More than this many live grants for one child is a mistake, not a decision. */
export const MAX_APP_GRANTS = 50

/** A grant longer than a day is a rule change, which belongs on the App blocking page. */
export const MAX_APP_GRANT_MS = 24 * 60 * 60_000

const APP_ID = /^(android|macos|linux|windows|ios|steam):\S{1,300}$/

/**
 * Valid grants, newest end per app, sorted by app id so the stored value and a device's fingerprint
 * do not change with write order. With `nowMs`, ended grants are dropped.
 */
export function normalizeAppGrants(raw: unknown, nowMs?: number): AppGrant[] {
  const byApp = new Map<string, AppGrant>()
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (!entry || typeof entry !== 'object') continue
    const appId = typeof entry.appId === 'string' ? entry.appId.trim() : ''
    const until = Number(entry.until)
    if (!APP_ID.test(appId) || !Number.isFinite(until) || until <= 0) continue
    if (nowMs !== undefined && until <= nowMs) continue
    const grant: AppGrant = { appId, until }
    if (Number.isFinite(entry.grantedAt)) grant.grantedAt = Number(entry.grantedAt)
    if (typeof entry.grantedBy === 'string' && entry.grantedBy) grant.grantedBy = entry.grantedBy
    const kept = byApp.get(appId)
    if (!kept || kept.until < until) byApp.set(appId, grant)
  }
  return [...byApp.values()].sort((a, b) => (a.appId < b.appId ? -1 : a.appId > b.appId ? 1 : 0)).slice(0, MAX_APP_GRANTS)
}

/**
 * The grants a device receives. Ended ones are left in: the same function decides whether a write
 * changed a device's settings, so it cannot depend on the clock. A device checks `until` itself.
 */
export function deviceAppGrants(raw: unknown): DeviceAppGrant[] {
  return normalizeAppGrants(raw).map(({ appId, until }) => ({ appId, until }))
}

/** When a grant made at `nowMs` ends. `today` is the next local midnight in `tzOffsetMinutes` (local minus UTC). */
export function appGrantUntil(duration: AppGrantDuration, nowMs: number, tzOffsetMinutes: number): number {
  if (duration === 15 || duration === 60) return nowMs + duration * 60_000
  const dayMs = 24 * 60 * 60_000
  const offsetMs = tzOffsetMinutes * 60_000
  return (Math.floor((nowMs + offsetMs) / dayMs) + 1) * dayMs - offsetMs
}

/** The child's grants with this one added: ended ones dropped, the same app's earlier grant replaced. */
export function withAppGrant(existing: unknown, grant: AppGrant, nowMs: number): AppGrant[] {
  const rest = normalizeAppGrants(existing, nowMs).filter((g) => g.appId !== grant.appId)
  const bounded = { ...grant, until: Math.min(grant.until, nowMs + MAX_APP_GRANT_MS) }
  return normalizeAppGrants([...rest, bounded], nowMs)
}

/** What a request is about, when it is about an app: the id, its name, and the device kind. */
export function appRequestSubject(details: unknown): { appId: string; name: string; platform: string } | null {
  const d = (details && typeof details === 'object' ? details : {}) as Record<string, unknown>
  if (d.srcType !== 'app') return null
  const appId = String(d.srcId || d.url || '').trim()
  const colon = appId.indexOf(':')
  if (colon <= 0 || colon === appId.length - 1) return null
  const platform = appId.slice(0, colon)
  const pkg = appId.slice(colon + 1)
  const title = String(d.srcTitle || d.appLabel || '').trim()
  return { appId, name: title || pkg, platform }
}

/** The device an app request came from, in words: "Mac", "Linux computer", "Android phone". */
export function appPlatformLabel(platform: string): string {
  switch (platform) {
    case 'macos':
      return 'Mac'
    case 'linux':
      return 'Linux computer'
    case 'windows':
      return 'Windows computer'
    case 'android':
      return 'Android phone'
    case 'ios':
      return 'iPhone'
    case 'steam':
      return 'computer'
    default:
      return 'device'
  }
}
