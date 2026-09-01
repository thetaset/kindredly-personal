/**
 * Parent-facing categories for the apps installed on a child's phone.
 *
 * Deliberately its OWN small vocabulary rather than a reuse of the `gen_*`
 * content taxonomy (45 leaves — far too granular for a phone) or of Android's
 * own nine categories (which include Maps and Image, and omit Learning and
 * Shopping entirely). Fourteen buckets a parent recognises at a glance.
 *
 * Each category carries a default `EduValue`, which is what lets the usage
 * limits a family already set start covering phone apps: the rule compiler
 * expands an `eduValue` condition into the concrete packages that resolve to it.
 * Change a defaultEduValue and you change which limit an app counts under, so
 * treat this table as the contract it is.
 */

import type { EduValue } from '../content.types';

export type AppCategoryId =
  | 'games'
  | 'social'
  | 'video'
  | 'music'
  | 'communication'
  | 'learning'
  | 'creative'
  | 'productivity'
  | 'shopping'
  | 'news'
  | 'utilities'
  | 'stores'
  | 'browsers'
  | 'vpn'
  | 'remote'
  | 'other';

export interface AppCategoryDef {
  id: AppCategoryId;
  label: string;
  /** bootstrap-icons name. */
  icon: string;
  /** Which usage-limit bucket apps in this category count toward by default. */
  defaultEduValue: EduValue;
  /** Display order on the Apps page. */
  order: number;
}

export const APP_CATEGORY_DEFS: AppCategoryDef[] = [
  { id: 'games', label: 'Games', icon: 'controller', defaultEduValue: 'eduval_fun', order: 10 },
  { id: 'social', label: 'Social', icon: 'people', defaultEduValue: 'eduval_junk', order: 20 },
  { id: 'video', label: 'Video & streaming', icon: 'play-btn', defaultEduValue: 'eduval_fun', order: 30 },
  { id: 'music', label: 'Music & audio', icon: 'headphones', defaultEduValue: 'eduval_edutainment', order: 40 },
  // Messaging counts as a task, not junk: a kid needs to reach their family, and
  // burning a "junk" budget on that is the wrong trade.
  { id: 'communication', label: 'Messaging & calls', icon: 'chat-dots', defaultEduValue: 'eduval_task', order: 50 },
  { id: 'learning', label: 'Learning', icon: 'mortarboard', defaultEduValue: 'eduval_educational', order: 60 },
  { id: 'creative', label: 'Creative & photos', icon: 'palette', defaultEduValue: 'eduval_edutainment', order: 70 },
  { id: 'productivity', label: 'Productivity', icon: 'list-check', defaultEduValue: 'eduval_task', order: 80 },
  { id: 'shopping', label: 'Shopping & money', icon: 'bag', defaultEduValue: 'eduval_task', order: 90 },
  { id: 'news', label: 'News & reading', icon: 'newspaper', defaultEduValue: 'eduval_edutainment', order: 100 },
  { id: 'utilities', label: 'Utilities & system', icon: 'gear', defaultEduValue: 'eduval_task', order: 110 },
  // Stores and browsers are their own buckets rather than living under Utilities,
  // because they are the two highest-value things a parent can turn off and both
  // would otherwise be unreachable without also blocking Clock and Calculator.
  //
  // Browsers especially: Kindredly's filtering only exists inside the Kindredly
  // browser, and Chrome on Android has no extension support — so a third-party
  // browser on a child's phone is entirely unfiltered, and every web control the
  // family has set evaporates the moment it is opened.
  { id: 'stores', label: 'App stores', icon: 'bag-plus', defaultEduValue: 'eduval_task', order: 120 },
  { id: 'browsers', label: 'Other browsers', icon: 'globe', defaultEduValue: 'eduval_unknown', order: 130 },
  // The two bypass buckets, and the reason they are their own categories rather
  // than a corner of Utilities: both defeat the rest of the product outright, and
  // neither can be blocked without also blocking Calculator if it lives there.
  //
  // A VPN routes the child's traffic around any network-level filtering the family
  // has, and remote access (screen sharing, iPhone mirroring, KVM software) hands
  // them a whole second computer that Kindredly cannot see at all. A parent who has
  // blocked other browsers has almost certainly also meant to block these; until
  // now there was no switch to mean it with.
  { id: 'vpn', label: 'VPN & proxy', icon: 'shield-slash', defaultEduValue: 'eduval_unknown', order: 140 },
  { id: 'remote', label: 'Remote access', icon: 'display', defaultEduValue: 'eduval_unknown', order: 150 },
  // Last on purpose, and never hidden: an app we could not place is something the
  // parent should be able to see and file, not something we quietly guess at.
  //
  // It counts as a TASK rather than as nothing. `eduval_unknown` matches no category
  // budget at all, so everything landing here used to be silently exempt from the
  // family's limits — on a real Mac that was most of the apps on it. Task is the
  // honest default for an app we cannot place: its time shows up in the child's
  // total, and no category cap punishes them for our not recognising it.
  //
  // The three buckets above keep `eduval_unknown`, deliberately: `browsers` because
  // that time is ALREADY counted as web activity by the extension and counting the
  // app too would double it, and `vpn`/`remote` because they are postures a parent
  // turns off rather than time a child spends.
  { id: 'other', label: 'Other', icon: 'question-circle', defaultEduValue: 'eduval_task', order: 999 },
];

export const APP_CATEGORY_BY_ID: Record<string, AppCategoryDef> = Object.fromEntries(
  APP_CATEGORY_DEFS.map((c) => [c.id, c]),
);

export const APP_CATEGORY_IDS: Set<string> = new Set(APP_CATEGORY_DEFS.map((c) => c.id));

export function getAppCategory(id: string | null | undefined): AppCategoryDef {
  return APP_CATEGORY_BY_ID[String(id ?? '')] ?? APP_CATEGORY_BY_ID.other;
}

export function isAppCategoryId(value: unknown): value is AppCategoryId {
  return typeof value === 'string' && APP_CATEGORY_IDS.has(value);
}

/**
 * `ApplicationInfo.category` int -> our bucket. Values from the Android SDK:
 * GAME(0) AUDIO(1) VIDEO(2) IMAGE(3) SOCIAL(4) NEWS(5) MAPS(6) PRODUCTIVITY(7)
 * ACCESSIBILITY(8); UNDEFINED is -1.
 *
 * Anything unmapped (including UNDEFINED and future SDK additions) falls through
 * to 'other' at the resolver rather than being guessed at here.
 */
export const ANDROID_CATEGORY_TO_APP_CATEGORY: Record<number, AppCategoryId> = {
  0: 'games',
  1: 'music',
  2: 'video',
  3: 'creative',
  4: 'social',
  5: 'news',
  6: 'utilities',
  7: 'productivity',
  8: 'utilities',
};

export function appCategoryFromAndroid(androidCategory: number | null | undefined): AppCategoryId | null {
  if (androidCategory == null) return null;
  return ANDROID_CATEGORY_TO_APP_CATEGORY[androidCategory] ?? null;
}

/**
 * The statically-known half of the device's anti-brick floor, mirroring
 * SafetyFloor.kt. The other half (default launcher, dialer, settings handler,
 * current IME) is resolved on-device and cannot be listed here.
 *
 * These packages stay in the seed map so they still DISPLAY with a sensible
 * category — but the policy compiler subtracts them before emitting a blocked
 * list. Without that subtraction, "block all Utilities" would show Settings as
 * blocked in the parent's UI while SafetyFloor silently ignored it on the phone:
 * a disagreement between what we promise and what we do, invisible in testing.
 *
 * Belt and braces — the device enforces its own floor regardless. This exists so
 * the PARENT is never shown a block that will not happen.
 */
export const DEVICE_SAFETY_FLOOR_STATIC: readonly string[] = [
  'com.thetaset.companion',
  'com.thetaset.kindred',
  'com.android.systemui',
  'android',
  'com.android.settings',
];

/**
 * The same idea for a Mac, mirroring `tset-electron/src/rules/macSafetyFloor.ts`.
 *
 * A separate list because the two platforms share no ids: subtracting Android package names from a
 * Mac's blocked set removes nothing, so before this existed the Apps page would happily offer a
 * parent a block on Finder that the Companion's floor then silently refused — exactly the
 * promise-we-do-not-keep the Android list above was added to prevent.
 *
 * Browsers, Terminal and Activity Monitor are deliberately absent; see the note on the Electron
 * side for why each one stays blockable.
 */
export const DEVICE_SAFETY_FLOOR_MACOS: readonly string[] = [
  'com.apple.finder',
  'com.apple.systempreferences',
  'com.apple.loginwindow',
  'com.apple.dock',
  'com.apple.controlcenter',
  'com.apple.notificationcenterui',
  'com.apple.Spotlight',
  'com.apple.SecurityAgent',
  'com.kindredly.app',
];
