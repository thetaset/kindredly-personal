/**
 * Device-app identity across platforms — the ONE place that knows how an app on a child's
 * device is named in rules (`appId`), in the inventory (`pkg` + `platform`), and in activity
 * logs (marker URL). Android was the first platform and its rules/logs are `android:<pkg>` /
 * `…/device-app/android/<pkg>`; desktop platforms slot in beside it without touching those.
 *
 * Shared by the client (rule authoring, usage attribution, History display), the desktop
 * Companion (Node), and tests. Keep it dependency-free.
 */
import { ALL_DEVICE_APPS, DEVICE_APP_MARKER_BASE } from '../types/device-guard.types';

export type DevicePlatform = 'android' | 'ios' | 'macos' | 'windows' | 'linux' | 'steam';

export const DEVICE_PLATFORMS: readonly DevicePlatform[] = ['android', 'ios', 'macos', 'windows', 'linux', 'steam'];

/** Platforms whose apps run on a computer (as opposed to a phone). */
export const DESKTOP_PLATFORMS: readonly DevicePlatform[] = ['macos', 'windows', 'linux', 'steam'];

export function isDevicePlatform(value: unknown): value is DevicePlatform {
  return typeof value === 'string' && (DEVICE_PLATFORMS as readonly string[]).includes(value);
}

export function isDesktopPlatform(platform: string | undefined | null): boolean {
  return Boolean(platform) && (DESKTOP_PLATFORMS as readonly string[]).includes(String(platform));
}

/**
 * Platforms where a parent's block is actually ENFORCED, as opposed to merely
 * recorded.
 *
 * Android and macOS. Guard's `RuleEvaluator` and the desktop Companion's
 * `rules/ruleEvaluator.ts` are the two consumers of a compiled `appPolicy`, and both
 * are pinned to the same golden wire fixture so they cannot drift apart. A Steam
 * title counts too: the Companion resolves a running game back to its `steam:<appid>`
 * from the install path the library scan already knows.
 *
 * iOS is still absent, and for a structural reason rather than an unfinished one: its
 * blocking runs off a device-local `FamilyActivitySelection` that never reaches the
 * server, so a parent's choices cannot reach an iPhone at all.
 *
 * This exists so the UI can stop offering a control it cannot honour. Showing a live
 * "Blocked" switch beside a Mac app — which the Apps page did before the Companion
 * could act on one — let a parent block something, see "Saved", and get no
 * enforcement whatsoever. Do not widen it ahead of the device.
 */
const ENFORCING_PLATFORMS: ReadonlySet<string> = new Set(['android', 'macos', 'steam']);

export function canEnforceAppBlocking(platform: string | undefined | null): boolean {
  return ENFORCING_PLATFORMS.has(String(platform || 'android'));
}

/**
 * `<platform>:<pkg>`. Android callers still get the historical `android:<pkg>`; iOS keeps its
 * `ios:selection:<uuid>` shape (the pkg already carries the `selection:` part).
 */
export function toDeviceAppId(platform: DevicePlatform, pkg: string): string {
  return `${platform}:${String(pkg || '').trim()}`;
}

/**
 * Inverse of toDeviceAppId. Unknown/legacy prefixes are treated as Android, which is what every
 * pre-platform rule meant. The sentinel `all-device-apps` has no platform.
 */
export function parseDeviceAppId(appId: string): { platform: DevicePlatform | null; pkg: string } {
  const raw = String(appId || '').trim();
  if (!raw) return { platform: null, pkg: '' };
  if (raw === ALL_DEVICE_APPS) return { platform: null, pkg: raw };
  const colon = raw.indexOf(':');
  if (colon > 0) {
    const prefix = raw.slice(0, colon);
    if (isDevicePlatform(prefix)) return { platform: prefix, pkg: raw.slice(colon + 1) };
  }
  return { platform: 'android', pkg: raw };
}

/**
 * The `<platform>:` prefix a raw value ALREADY carries, or null when it carries none.
 *
 * Unlike parseDeviceAppId this never guesses: an inventory reports bare packages, and the
 * platform they belong to comes from the inventory itself — except for a Steam game, which the
 * Companion namespaces as `steam:<appid>` inside a macOS/Windows inventory because the game is
 * governed as a Steam app, not as the launcher's platform.
 */
export function platformPrefixOf(value: string): DevicePlatform | null {
  const raw = String(value || '').trim();
  const colon = raw.indexOf(':');
  if (colon <= 0) return null;
  const prefix = raw.slice(0, colon);
  return isDevicePlatform(prefix) ? prefix : null;
}

/** `https://kindredly.ai/device-app/<platform>/<pkg>` — what an app session looks like in the activity log. */
export function deviceAppMarkerUrl(platform: DevicePlatform, pkg: string): string {
  return `${DEVICE_APP_MARKER_BASE}${platform}/${encodeURIComponent(String(pkg || '').trim())}`;
}

/** Inverse of deviceAppMarkerUrl; null for any other URL. */
export function parseDeviceAppMarkerUrl(url: string): { platform: DevicePlatform; pkg: string } | null {
  const raw = String(url || '');
  if (!raw.startsWith(DEVICE_APP_MARKER_BASE)) return null;
  const rest = raw.slice(DEVICE_APP_MARKER_BASE.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const platform = rest.slice(0, slash);
  if (!isDevicePlatform(platform)) return null;
  let pkg = rest.slice(slash + 1);
  const cut = pkg.search(/[?#]/);
  if (cut >= 0) pkg = pkg.slice(0, cut);
  try {
    pkg = decodeURIComponent(pkg);
  } catch {
    // keep raw
  }
  return pkg ? { platform, pkg } : null;
}
