/**
 * Deciding what an app IS — its category, and the usage bucket it counts under.
 *
 * Pure and I/O-free so every precedence rule is testable without a transport or a
 * device. The output feeds two very different consumers: the rule compiler (which
 * expands an `eduValue` limit condition into concrete packages) and the parent's
 * Apps page (which groups and labels).
 *
 * Why this matters more than it looks: an app that resolves to `other` gets
 * `eduval_unknown`, which matches NO category budget. So a classification miss
 * does not degrade the feature gracefully — it silently switches it off for that
 * app. Coverage of the seed map is the feature, not decoration.
 */

import {
  appCategoryFromAndroid,
  getAppCategory,
  isAppCategoryId,
  DEVICE_SAFETY_FLOOR_MACOS,
  DEVICE_SAFETY_FLOOR_STATIC,
  type AppCategoryId,
} from '../kinds/appCategories'
import { APP_CATEGORY_SEED } from '../kinds/appCategorySeed'
import type {
  CompiledAppPolicy,
  DeviceAppInventoryEntry,
  DeviceAppPolicy,
  DeviceAppPolicyEntry,
} from '../types/device-guard.types'
import { parseDeviceAppId, toDeviceAppId, type DevicePlatform } from '../restrictions/deviceAppIds'
import type { EduValue } from '../content.types'

/** One resolved app: what it is, and which budget it counts under. */
export type AppCatalogEntry = {
  pkg: string
  label: string
  categoryId: AppCategoryId
  eduValue: EduValue
  /**
   * Which device family this app is on. Absent = android, which is what every entry meant before
   * a computer could report one.
   */
  platform?: DevicePlatform
  /** `<platform>:<pkg>` — what a rule names. Absent on hand-built entries; use `catalogAppId`. */
  appId?: string
  /** Carried through so the Apps page can flag what arrived since the last review. */
  firstSeenAt?: number
}

/** The id a rule uses for this app, for entries built before `appId` existed too. */
export function catalogAppId(app: Pick<AppCatalogEntry, 'pkg' | 'platform' | 'appId'>): string {
  return app.appId || toDeviceAppId(app.platform || 'android', app.pkg)
}

/**
 * Resolution order: parent override → curated seed → Android's declared int → other.
 *
 * The seed deliberately OUTRANKS the declared category. `ApplicationInfo.category`
 * is developer-self-reported, and WhatsApp, Messenger, Signal and Telegram all
 * declare SOCIAL — so trusting it would make "block social media" cut a child off
 * from their family. We report the declared value; we do not defer to it.
 *
 * The parent override outranks everything and is why it gets persisted the moment
 * a parent expresses any opinion: it freezes their view against later edits to the
 * shipped seed map, which would otherwise move an app between usage budgets
 * without anyone touching a setting.
 */
export function resolveAppCategory(
  app: Pick<DeviceAppInventoryEntry, 'pkg' | 'androidCategory' | 'platform'>,
  policy?: DeviceAppPolicy | null,
): AppCategoryId {
  const override = policyEntryFor(app, policy)?.categoryId
  if (isAppCategoryId(override)) return override

  const seeded = APP_CATEGORY_SEED[app.pkg]
  if (isAppCategoryId(seeded)) return seeded

  const inferred = inferAppCategory(app)
  if (inferred) return inferred

  return appCategoryFromAndroid(app.androidCategory) ?? 'other'
}

/**
 * Two structural guesses for apps the seed has never heard of.
 *
 * Both sit BELOW the seed so a curated answer always wins — `com.apple.Chess` is
 * seeded as a game and stays one — and above Android's declared category, which is
 * irrelevant on a Mac.
 *
 * They exist because `other` is not a neutral bucket. It resolves to
 * `eduval_unknown`, which matches no category budget at all, so every app that
 * lands there is silently exempt from the family's limits. On a real Mac the seed
 * missed roughly four apps in five, and the great majority of those misses were one
 * of these two shapes.
 */
function inferAppCategory(
  app: Pick<DeviceAppInventoryEntry, 'pkg' | 'platform'>,
): AppCategoryId | null {
  // Everything in a Steam library is a game. Enumerating them would be endless and
  // is never more accurate than the platform already is.
  if (app.platform === 'steam') return 'games'

  // An unrecognized first-party Apple binary is a system tool — Font Book, Time
  // Machine, Mission Control. Filing them under Utilities keeps them out of the
  // parent's way while leaving them blockable as a group; leaving them in `other`
  // put 30-odd rows of furniture at the bottom of the page for a parent to triage.
  if (app.pkg?.startsWith('com.apple.')) return 'utilities'

  return null
}

/**
 * Basic system furniture, which counts toward nothing.
 *
 * Finder, System Settings, the Dock and the rest of the operating system are not something a child
 * "spends time on", and now that an unplaceable app defaults to Task rather than to nothing
 * (`appCategories.ts`), leaving these in would quietly eat a child's daily total with the machine's
 * own chrome. Two sources, both already the source of truth for exactly this idea: the inventory's
 * own `isSystem` flag (set for `/System/Applications` and `/Applications/Utilities`), and the
 * anti-brick safety floors, which are the ids we have already promised can never be blocked.
 */
const SAFETY_FLOOR_PKGS = new Set<string>([...DEVICE_SAFETY_FLOOR_STATIC, ...DEVICE_SAFETY_FLOOR_MACOS])

export function isSystemFurniture(
  app: Pick<DeviceAppInventoryEntry, 'pkg' | 'isSystem'>,
): boolean {
  return Boolean(app?.isSystem) || SAFETY_FLOOR_PKGS.has(app?.pkg || '')
}

/**
 * Parent's per-app override, else whatever the resolved category counts as.
 *
 * The parent's override outranks the system-furniture exemption too: if someone has deliberately
 * filed Terminal as a task, that is a decision, not a mistake to correct.
 */
export function resolveAppEduValue(
  app: Pick<DeviceAppInventoryEntry, 'pkg' | 'androidCategory' | 'platform' | 'isSystem'>,
  policy?: DeviceAppPolicy | null,
): EduValue {
  const override = policyEntryFor(app, policy)?.eduValue
  if (override) return override as EduValue
  if (isSystemFurniture(app)) return 'eduval_unknown'
  return getAppCategory(resolveAppCategory(app, policy)).defaultEduValue
}

/**
 * The parent's per-app row for this app.
 *
 * Keyed by `<platform>:<pkg>` since desktop apps arrived, and by the bare package before that —
 * so a family's existing Android choices keep applying instead of silently reverting to the
 * category default the day their computer reports in.
 */
export function policyEntryFor(
  app: Pick<DeviceAppInventoryEntry, 'pkg' | 'platform'>,
  policy?: DeviceAppPolicy | null,
): DeviceAppPolicyEntry | undefined {
  const entries = policy?.entries
  if (!entries) return undefined
  const direct = entries[policyKeyFor(app)]
  if (direct) return direct
  // Android's key IS the bare package, so the only alternate spelling to accept is the
  // platform-qualified one. Never fall back to the bare package for a desktop app: a Mac binary
  // that happens to share a bundle id with an Android package is a different app, and inheriting
  // the phone's decision would silently block something the parent never chose.
  const platform = (app.platform || 'android') as DevicePlatform
  return platform === 'android' ? entries[toDeviceAppId('android', app.pkg)] : undefined
}

/**
 * The key a parent's choice about this app is stored under.
 *
 * Android keeps the bare package it has always used — re-keying every existing family's saved
 * choices to `android:<pkg>` would drop them all on the floor for nothing. Every other platform
 * is stored by appId, because bundle ids and exe names share one table.
 */
export function policyKeyFor(app: Pick<DeviceAppInventoryEntry, 'pkg' | 'platform'>): string {
  const platform = (app.platform || 'android') as DevicePlatform
  return platform === 'android' ? app.pkg : toDeviceAppId(platform, app.pkg)
}

/**
 * Resolve a whole inventory into the catalog the compiler and the UI share.
 *
 * Uninstalled apps are excluded: a tombstone keeps a parent's DECISION visible on
 * their screen, but an app that is not on the phone must not widen a limit that
 * governs it. Their policy entries survive regardless — the policy is keyed by
 * package, not by inventory membership.
 */
export function buildAppCatalog(
  apps: DeviceAppInventoryEntry[] | null | undefined,
  policy?: DeviceAppPolicy | null,
): AppCatalogEntry[] {
  const out: AppCatalogEntry[] = []
  for (const app of apps || []) {
    if (!app?.pkg || app.removed) continue
    const categoryId = resolveAppCategory(app, policy)
    const platform = (app.platform || 'android') as DevicePlatform
    out.push({
      pkg: app.pkg,
      label: app.label || app.pkg,
      categoryId,
      eduValue: resolveAppEduValue(app, policy),
      platform,
      appId: toDeviceAppId(platform, app.pkg),
      ...(app.firstSeenAt ? { firstSeenAt: app.firstSeenAt } : {}),
    })
  }
  return out
}

// --- Protections → the flat set the device enforces --------------------------

/** category id -> every seeded package in it. Built once; the seed is a const. */
const PACKAGES_BY_CATEGORY: Map<string, string[]> = (() => {
  const byCategory = new Map<string, string[]>()
  for (const [pkg, categoryId] of Object.entries(APP_CATEGORY_SEED)) {
    const list = byCategory.get(categoryId)
    if (list) list.push(pkg)
    else byCategory.set(categoryId, [pkg])
  }
  return byCategory
})()

/** Every package a protection covers, installed or not. Exported for the UI's counts. */
export function packagesInCategory(categoryId: string): string[] {
  return PACKAGES_BY_CATEGORY.get(categoryId) ?? []
}

/**
 * The id the DEVICE tests membership against, from any spelling that reaches us.
 *
 * The compiled set used to hold the bare package for everything, which worked by luck and only
 * on one platform. A Mac strips `macos:` before testing (`rules/deviceRuleModel.normalizePkg`),
 * so a bare bundle id matched; a Steam title does not, because it runs under its own bundle id
 * and answers to `steam:<appid>`. A parent blocking a game stored `892970` and the Mac looked
 * for `steam:892970` — the block compiled, synced, and silently never fired.
 *
 * So: everything non-Android is emitted platform-qualified, exactly as `policyKeyFor` stores it
 * and as a limit rule's `appId` already names it. Android stays BARE, deliberately — that is the
 * id Guard has always enforced, it is what the golden wire fixture pins, and re-spelling it would
 * put every existing family's protections through an untested prefix-stripping path on the device
 * for no gain.
 */
function deviceBlockId(value: string): string {
  const { platform, pkg } = parseDeviceAppId(value)
  return !platform || platform === 'android' ? pkg : toDeviceAppId(platform, pkg)
}

/** Every spelling of an id that could be in the set, so a removal cannot miss one. */
function blockIdSpellings(value: string): string[] {
  const { pkg } = parseDeviceAppId(value)
  return [...new Set([value, deviceBlockId(value), pkg])]
}

/**
 * Materialize the parent's protections into the one flat set Guard enforces.
 *
 * Expanded from the SEED MAP, not from the inventory. That is the whole point of
 * enforce-by-name: "block app stores" has to cover a store the child installs next
 * month, and a phone that has never reported its apps at all. The cost is a few
 * hundred strings over local IPC, where there is no size cap.
 *
 * Precedence: a per-app `entries[pkg].decision` always outranks its category, in
 * both directions — so a parent can block all browsers and still allow one.
 */
export function compileAppPolicy(
  policy?: DeviceAppPolicy | null,
  catalog?: AppCatalogEntry[] | null,
): CompiledAppPolicy | undefined {
  if (!policy) return undefined

  const blockedCategories = new Set(policy.blockedCategories || [])

  const blocked = new Set<string>()
  for (const categoryId of blockedCategories) {
    for (const pkg of packagesInCategory(categoryId)) blocked.add(pkg)
  }

  // ...and again from what is actually ON the child's devices.
  //
  // The seed pass above is what makes a protection work on a phone we have never
  // seen, and on an app the child installs next month. But it can only ever cover
  // packages somebody typed into `APP_CATEGORY_SEED` by hand — so on a real device
  // most of the apps a protection APPEARS to cover were never in the compiled set
  // at all. A parent ticked "Block other browsers", the page counted the browsers
  // it could see, and the phone was handed a list that did not include them.
  //
  // Categories here are already resolved through the same precedence the parent's
  // page uses (override → seed → inference → declared), so an app the parent
  // re-filed by hand is expanded under the category they chose, not ours.
  for (const app of catalog || []) {
    if (app?.pkg && blockedCategories.has(app.categoryId)) blocked.add(policyKeyFor(app))
  }

  // Keyed, not `entry.pkg`: the KEY is the platform-qualified id (`policyKeyFor`), and `pkg` is
  // the bare package it was reduced to for display. Reading the wrong one is what lost `steam:`.
  for (const [key, entry] of Object.entries(policy.entries || {})) {
    if (!key || !entry?.pkg) continue
    if (entry.decision === 'block') blocked.add(deviceBlockId(key))
    // An explicit allow is an exception to a blocked category, so it must be
    // applied AFTER the expansion above rather than alongside it. Every spelling goes: the seed
    // pass adds bare ids and the catalog pass adds qualified ones, so deleting only one shape
    // would leave a parent's "block browsers, except this one" half-applied.
    else if (entry.decision === 'allow') {
      for (const spelling of blockIdSpellings(key)) blocked.delete(spelling)
    }
  }

  // SafetyFloor short-circuits on the device, so a floored package here would
  // produce a block that silently never fires — the parent would be shown a
  // promise we do not keep. Drop them so the compiled set only ever contains
  // blocks that will actually happen.
  // Both platforms' floors: the sets share no ids, so subtracting only the Android one left every
  // Mac floor entry (Finder, System Settings, the Dock) blockable in the UI and refused on the
  // device — the same invisible disagreement, one platform later.
  //
  // Both spellings of each, for the same reason the allow pass above takes them all: since the
  // catalog pass emits qualified ids, `macos:com.apple.finder` and `com.apple.finder` can both
  // be in the set, and subtracting one shape would leave the other promising a block the device
  // refuses.
  for (const pkg of [...DEVICE_SAFETY_FLOOR_STATIC, ...DEVICE_SAFETY_FLOOR_MACOS]) {
    blocked.delete(pkg)
    blocked.delete(toDeviceAppId('macos', pkg))
  }

  // Nothing to enforce → no field at all, so a family that never opens the page
  // produces a ruleset byte-identical to today and `fingerprintOf` stays stable.
  if (blocked.size === 0) return undefined

  // Sorted because `fingerprintOf(set)` hashes the JSON: an unstable order would
  // re-push an identical ruleset over IPC every 15 minutes forever.
  return { blocked: [...blocked].sort() }
}
