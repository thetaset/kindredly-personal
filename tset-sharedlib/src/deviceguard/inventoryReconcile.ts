/**
 * A device's app list against the one stored before it: first sightings and removed apps (moved here
 * from the client's DeviceAppInventoryService for NAP-5, so the desktop Companion runs the same code).
 */
import type { DeviceAppInventory, DeviceAppInventoryEntry } from '../types/device-guard.types';

/** How long an uninstalled app stays visible before we stop carrying it forward. */
export const REMOVED_TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Reconcile a fresh collection against what we stored last time.
 *
 * Both halves of the diff live with whoever holds both sides: the browser's
 * `DeviceAppInventoryService` against the stored row, and the desktop Companion against
 * its own copy (NAP-5). Guard is a pure enumerator with no memory.
 *
 * **Gone:** uninstalled apps are carried forward as tombstones. A parent who
 * blocked an app must still see it — and their decision — after the child
 * uninstalls it, or the app silently vanishes from the list, which reads exactly
 * like a successful bypass. (The block itself survives regardless: the policy is
 * keyed by package, not by inventory membership. The tombstone keeps it VISIBLE.)
 *
 * **New:** first sighting stamps `firstSeenAt`, so the parent can be shown what
 * arrived since they last looked instead of the whole list.
 *
 * Exported for testing — the boundary conditions here are the whole point.
 */
export function reconcileInventory(
  prior: DeviceAppInventory | null | undefined,
  fresh: DeviceAppInventory,
  now: number = Date.now(),
): DeviceAppInventoryEntry[] {
  const priorByPkg = new Map<string, DeviceAppInventoryEntry>();
  for (const old of prior?.apps || []) {
    if (old?.pkg) priorByPkg.set(old.pkg, old);
  }

  const present = new Map<string, DeviceAppInventoryEntry>();
  for (const app of fresh.apps || []) {
    if (!app?.pkg) continue;
    // Carry the ORIGINAL first sighting across a reinstall. Taking `now` here would
    // let an uninstall/reinstall cycle launder an app back out of the reviewed set,
    // which is the one thing a "new apps" list must not allow.
    const firstSeenAt = priorByPkg.get(app.pkg)?.firstSeenAt ?? app.firstSeenAt ?? now;
    present.set(app.pkg, { ...app, removed: undefined, removedAt: undefined, firstSeenAt });
  }

  for (const old of priorByPkg.values()) {
    // A reinstall clears the tombstone: `present` already holds the live entry.
    if (present.has(old.pkg)) continue;
    const removedAt = old.removed ? (old.removedAt ?? now) : now;
    // Expired tombstones are simply not carried forward, which is what stops the
    // row growing without bound on a device that churns apps.
    if (now - removedAt >= REMOVED_TOMBSTONE_TTL_MS) continue;
    present.set(old.pkg, { ...old, removed: true, removedAt });
  }

  return [...present.values()];
}

/**
 * Packages present in the reconciled inventory that the previous one had never
 * recorded at all.
 *
 * Keyed off the PRIOR row rather than `firstSeenAt` timestamps so a clock change
 * on the device cannot manufacture or suppress a notice.
 */
export function newlySeen(
  prior: DeviceAppInventory,
  next: DeviceAppInventory,
): DeviceAppInventoryEntry[] {
  const known = new Set((prior.apps || []).map((a) => a?.pkg).filter(Boolean));
  // A tombstoned app is still KNOWN — a reinstall is not a new app, and treating it
  // as one would let uninstall/reinstall spam a parent on demand.
  return (next.apps || []).filter((a) => a?.pkg && !a.removed && !known.has(a.pkg));
}
