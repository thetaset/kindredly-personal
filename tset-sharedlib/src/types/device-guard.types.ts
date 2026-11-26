/**
 * Kindredly Companion (device-guard) shared contracts.
 *
 * Shared between the Companion Android satellite app, the main-app background
 * services, and parent-facing UI. The Companion app itself is Kotlin — these
 * types document the JSON wire/IPC shapes it produces and consumes.
 * See docs/proposals/kindredly-companion-device-app-controls.md.
 */

import type { SchoolDaysSettings } from '../restrictions/schoolDays';
import type { EncInfoKey } from './encryption.types';
import type { InterventionMode } from './activity.types';
import type { CheckpointRelease, CheckpointSettings, LimitRule, RuleOverride } from './usage-limits.types';
import type { EarnAccessOpenings, EarnAccessSettings } from './earn-access.types';
import type { TemporaryLimitRule } from './reward.types';
import type { DeviceHealth } from '../deviceguard/deviceHealth';

/** Marker-URL base for device app sessions in activity logs (…/device-app/android/<pkg>). */
export const DEVICE_APP_MARKER_BASE = 'https://kindredly.ai/device-app/';

/** Catch-all sentinel for rules that apply to every device app. */
export const ALL_DEVICE_APPS = 'all-device-apps';

/**
 * How long a Guard device may go without checking in before anything says so.
 *
 * Shared because the two sides used to disagree by 6x and the parent-facing side
 * was the wrong one: the card called a device "not reporting" after 1 hour while
 * the server's own tamper watch documented anything under 6h as Doze noise and
 * refused to open an incident. Guard uploads on a 15-minute WorkManager period,
 * which Android routinely defers well past an hour on an idle phone — so the card
 * raised a false alarm on healthy devices, which is how parents learn to ignore
 * the alarm that matters.
 *
 * Detecting an actually-removed Guard is the server's job, not the card's; it
 * escalates at 6h/12h/48h (see companionTamperPolicy).
 */
export const DEVICE_GUARD_QUIET_GAP_MS = 6 * 60 * 60 * 1000;

/** One foreground session of one app on the child device. */
export interface DeviceAppSession {
  pkg: string;
  appLabel?: string;
  startTime: number;
  endTime: number;
  /** Absent = android (the original platform). See restrictions/deviceAppIds.ts. */
  platform?: string;
}

export interface DeviceAppInventoryEntry {
  pkg: string;
  label: string;
  /**
   * Still present on the device but no longer installed. Written by the main app
   * when it diffs a fresh collection against the stored row — Guard only reports
   * what it can see. Kept so a parent who blocked an app still sees it (and their
   * decision) after the child uninstalls it; otherwise uninstall-reinstall would
   * read as a successful bypass.
   */
  removed?: boolean;
  removedAt?: number;
  /**
   * When this package was first seen on this device, so the parent can be told
   * "3 new apps since you last looked" rather than being handed the whole list.
   *
   * Stamped by `reconcileInventory` on the child's device, the one place that
   * holds both the previous and the fresh collection. A REINSTALL deliberately
   * keeps the tombstoned original's value: otherwise uninstalling and reinstalling
   * would launder an app back into "already reviewed".
   */
  firstSeenAt?: number;
  /**
   * Android: when the phone says the app was installed (`PackageInfo.firstInstallTime`), sent by
   * Kindredly Companion for phones (NAP-8). A phone app's arrival for New apps start blocked, so Guard,
   * which keeps no list of its own, and the guardian's screens decide alike.
   */
  installedAt?: number;
  /**
   * Android: when Kindredly Companion for phones told the guardian about this app itself (NAP-7), so
   * Kindredly's own list read does not tell them again.
   */
  reportedAt?: number;
  /**
   * Android's own `ApplicationInfo.category` (API 26+). Omitted when UNDEFINED(-1).
   * Developer-self-reported, so it is a hint, not the truth — the curated seed map
   * in kinds/appCategorySeed.ts deliberately outranks it.
   */
  androidCategory?: number;
  /** `ApplicationInfo.FLAG_SYSTEM` on Android; `/System/Applications` on macOS. Omitted when false. */
  isSystem?: boolean;
  /**
   * Android: the phone names this app as its clock, calculator, camera, dialer or Settings, so its
   * time counts toward no limit (HAT-952, `deviceguard/notScreenTime.ts`). Omitted when false.
   */
  notScreenTime?: boolean;
  /** Desktop only: install path (bundle path / exe path) — display + kill targeting, never uploaded elsewhere. */
  path?: string;
  /** Desktop only: a hint from the platform ('game' for a Steam library entry, 'store' for launchers). */
  hint?: 'game' | 'store';
  /**
   * Which platform this app belongs to. NOT reported per app — a device reports it once for the
   * whole inventory; the client stamps it onto each entry when it merges several devices into one
   * list, which is the only place a row stops carrying its device with it.
   */
  platform?: string;
  /** @deprecated Never read by any client; no longer collected. */
  versionName?: string;
}

/** Installed-app inventory synced (encrypted) for parent display and rule editing. */
export interface DeviceAppInventory {
  deviceId: string;
  updatedAt: number;
  apps: DeviceAppInventoryEntry[];
  /** Absent = android. Desktop Companions set 'macos' | 'windows' | 'linux'. */
  platform?: string;
}

// --- App allow/block policy -------------------------------------------------
//
// A posture, deliberately separate from usage limits. A limit answers "how long";
// this answers "at all". Before this existed the only way to express "off" was a
// degenerate zero-minute budget, which the authoring UI could not even save.

export type DeviceAppDecision = 'allow' | 'block';

export interface DeviceAppPolicyEntry {
  /** Raw package, no `android:` prefix — matches DeviceAppInventoryEntry.pkg. */
  pkg: string;
  /** Absent = follow the category decision, and failing that, allowed. */
  decision?: DeviceAppDecision;
  /**
   * Parent's category override. Also FREEZES the category: once a parent has an
   * opinion about an app, a later edit to the shipped seed map must not silently
   * move it (and with it, which usage limit it counts under).
   */
  categoryId?: string;
  /** Overrides the category's defaultEduValue. */
  eduValue?: string;
  updatedAt: number;
}

/**
 * Per-CHILD, not per-device: a parent decides "Roblox is off" about their kid,
 * not about a handset, and package names are stable across phones.
 *
 * Stored in ref_state (stateKey 'appPolicy', stateSubKey '') beside the inventory,
 * NOT in UserOptions, which is SSE-broadcast to every client on every change.
 *
 * READABLE since DCP-5 (decision D1, 2026-09-13): settings are not encrypted, history is. It was
 * end-to-end encrypted, which is why the server's ruleset never held an app block (UX-063).
 * Consequence accepted in the review: a blocked package reveals that the app exists, while the
 * inventory itself stays encrypted. Rows written before DCP-5 stay encrypted until a guardian's
 * client rewrites them (`DeviceAppPolicyService`).
 *
 * BLOCKLIST ONLY, deliberately. An allowlist's mistakes are omissions — forget
 * the Clock app and the phone breaks in a way the parent cannot diagnose, because
 * the allowlist would also gate packages the inventory never lists (share sheets,
 * permission dialogs, the package installer). A blocklist's mistakes are gaps:
 * the child uses something we did not name, and it is added later. One of those
 * is recoverable.
 *
 * `blockedCategories` is the primary control and holds curated category ids
 * ('stores', 'browsers', …). It is expanded from the SEED MAP, not the inventory,
 * so a protection covers apps that are not installed yet and phones that have
 * never checked in. `entries` holds only the apps a parent overrode individually.
 * Both together stay far under the 64KB ref_state cap.
 */
/**
 * The Browsers setting (HAT-1348): where a child may browse, the same on every device. `any`: nothing
 * is closed. `withKindredly`: only where Kindredly filters — a phone blocks every other browser, a
 * computer closes a browser with no Kindredly in it. `lockedDown`: that, and Browser lockdown on each
 * computer (Kindredly forced into every browser, no private windows), which is turned on at the
 * computer. Absent: `withKindredly` for a child, `any` for an admin's own policy.
 */
export type DeviceBrowsersLevel = 'any' | 'withKindredly' | 'lockedDown';

export interface DeviceAppPolicy {
  version: 1;
  /** The Browsers setting (HAT-1348). Absent: see `DeviceBrowsersLevel`. */
  browsers?: DeviceBrowsersLevel;
  /** Curated categories the parent turned off wholesale. */
  blockedCategories: string[];
  /** Per-app exceptions ONLY; an entry.decision outranks its category. */
  entries: Record<string, DeviceAppPolicyEntry>;
  /**
   * Retired (HAT-042, BTL-3). Was the "count device apps toward usage limits" switch; every reader
   * now ignores it and every save from Blocked or Counting rules drops it. Kept so old rows parse.
   */
  countInUsageLimits?: boolean;
  /**
   * When a guardian last pressed Mark all seen on All apps (HAT-1044): an app first seen before it is
   * not new. Until 2026-11-07 every save set it.
   */
  reviewedAt?: number;
  /**
   * Apps a guardian left open from All apps' New section, by app id (`<platform>:<pkg>`), with when.
   * Readable, as the rest of the policy is: a new app's name already reaches the server in its notice.
   * Entries before `reviewedAt` say nothing more and are dropped on save.
   */
  seenApps?: Record<string, number>;
  /**
   * New apps start blocked (NAP-6, HAT-1046): when a guardian turned it on; absent is off. An app
   * first seen on a device after this, and after the device's first list, is blocked there until a
   * guardian decides about it or leaves it open. Apps that came with the device are never blocked.
   */
  newAppsBlockedAt?: number;
  updatedAt: number;
}

/**
 * The fully materialized posture the device enforces. `blocked` preserves the
 * Android wire format; `scopedBlocked` lets desktop clients distinguish apps
 * that share an identifier across platforms. Every judgement (category
 * resolution, curated-list expansion, safety-floor subtraction) happens on
 * the authoring side.
 *
 * A package NOT in this set is not thereby allowed — it falls through to the
 * normal rule loop, so a time limit can still govern it. "Not blocked" never
 * means "unlimited"; only SafetyFloor short-circuits.
 *
 * Sorting is load-bearing, not tidiness: `queryIntentActivities` order is not
 * stable, and an unsorted array would make `fingerprintOf()` flap and re-push an
 * identical ruleset over IPC every 15 minutes forever.
 */
export interface CompiledAppPolicy {
  blocked: string[];
  /** Platform-qualified identities. Desktop uses this when present so an Android
   * package with the same name cannot block or allow the desktop app. */
  scopedBlocked?: string[];
  /**
   * Of the blocked apps, the ones blocked only for being new (NAP-6), platform-qualified. They are
   * in `blocked` and `scopedBlocked` too, so a device that does not read this still blocks them; it
   * picks the shield's words ("Among Us is new").
   */
  newApps?: string[];
  /**
   * The App controls category (`AppCategoryId`, e.g. `social`) that blocked each app, so a block
   * screen can name the setting (HAT-1348): category → ids, sorted. An id is a bare package for a
   * category's own apps (the same on every platform) or a platform-qualified one for an app found
   * on a device. An app blocked by its own choice, or only for being new, is in none.
   */
  blockedBy?: Record<string, string[]>;
}

/**
 * How hard the device is to strip protection off. Additive tiers; each degrades
 * to the one below without breaking anything, because each has a realistic kill
 * condition (parent declines, Google revokes the accessibility grant, the child
 * disables the service).
 */
export type DeviceProtectionTier = 'none' | 'admin' | 'admin+screenGuard';

/** Why a tamper alert fired. */
export type DeviceTamperKind =
  | 'adminDisableRequested'
  | 'adminDisabled'
  | 'screenGuardDisabled'
  | 'uninstallScreen'
  | 'usageAccessRevoked'
  | 'mainAppMissing'
  /**
   * Desktop: the Companion exited without a parent asking it to — the child quit it. It is brought
   * straight back by its launchd job, so this is a report of what happened, not of a device that is
   * still down. A heartbeat gap remains the signal for one that did not come back.
   */
  | 'companionQuit'
  /**
   * Desktop: a parent's Unlock PIN was entered on the block window itself, pausing ALL enforcement
   * on that Mac for a short, self-expiring window.
   *
   * Reported for the same reason `companionQuit` is: from the parent's side a paused Companion and
   * a killed one look identical, and staying quiet about the pause would make the honest recovery
   * path indistinguishable from tampering. A parent who did it themselves ignores the line; one
   * who did not has just learned their PIN is out.
   */
  | 'escapeHatch'
  /**
   * Linux desktop: the root guard saw someone working to keep the Companion from coming back — its
   * restart file deleted while the account is supervised, or a process posing as the Companion
   * (CMP-48). The guard keeps restarting it regardless, so this too is a report, not an outage.
   */
  | 'companionTampered'
  /**
   * Linux desktop: the link record (provisioning.enc) was deleted from the child's folder, and the
   * Companion put it back from the root guard's copy (CMP-69). Deleting it used to end enforcement.
   */
  | 'linkRemoved'
  /**
   * Linux desktop: the guard kept the Companion closed for a stay-down the Companion never wrote:
   * one with no signature under this computer's key (CMP-69). Up to 30 minutes, then it came back.
   */
  | 'stayDownForged';

/**
 * Companion self-reported health, persisted server-side in a ref_state row.
 *
 * NOTE: stored UNENCRYPTED — `/user/client/heartbeat` upserts without `encInfo`,
 * so `ref_state.encrypted` is false. That is deliberate and load-bearing: it is
 * what lets a server job detect a missing check-in without the device spending
 * any battery reporting its own absence. Keep it free of anything sensitive —
 * app usage itself stays E2E-encrypted on the separate activity-push path.
 */
export interface DeviceGuardStatus {
  deviceId: string;
  companionVersion: string;
  serviceRunning: boolean;
  /**
   * Android Guard: why Android refused the last attempt to start monitoring, e.g.
   * `ForegroundServiceStartNotAllowedException (status)`. Empty or absent once a start goes through.
   * Recorded instead of crashing (DCP-3).
   */
  monitorStartRefused?: string;
  /** When that refusal happened; 0 when there is none. */
  monitorStartRefusedAt?: number;
  /** True once the device-agent token + key have been handed over (Companion is linked). */
  provisioned?: boolean;
  lastPollAt?: number;
  lastUploadAt?: number;
  mainAppPresent: boolean;
  permissions: {
    usageAccess: boolean;
    notifications: boolean;
    batteryUnrestricted: boolean;
    /** Required for ENFORCEMENT only; monitoring works without it. */
    overlay?: boolean;
    /** Faster blocking (the accessibility service) is on. Absent from builds before HAT-930. */
    fasterBlocking?: boolean;
  };
  /** Compiled limits currently cached on the device (Phase 2 enforcement). */
  rulesCount?: number;
  /** When the main app last compiled the ruleset the device is holding. */
  rulesGeneratedAt?: number;
  /** Last time a limit actually blocked an app on the device. */
  lastBlockedAt?: number;
  /** Anti-tamper posture. Absent on older Companion builds — treat as 'none'. */
  protection?: {
    tier: DeviceProtectionTier;
    /** Live from DevicePolicyManager.isAdminActive(), never a stored boolean. */
    deviceAdminActive: boolean;
    /** Our accessibility service is in Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES. */
    screenGuardEnabled: boolean;
    /** A parent asked for protection on this device — drives the child-facing prompt. */
    optIn: boolean;
  };
  /** Most recent tamper signal, for alerting. Absent means none recorded. */
  tamper?: {
    lastEventAt?: number;
    lastEventKind?: DeviceTamperKind;
    count24h?: number;
  };
  /** Absent = android. Desktop Companions report 'macos' | 'windows' | 'linux'. */
  platform?: string;
  /** Desktop only: a friendly host name for the Devices list ("Brandyn's MacBook"). */
  deviceLabel?: string;
  /** Desktop only: registered to start at login (removing it is the obvious tamper vector). */
  loginItemEnabled?: boolean;
  /** Desktop only: the browser extension is attached over the local bridge right now. */
  bridgeLive?: boolean;
  /** Desktop only: foreground-app monitoring is running. */
  monitorRunning?: boolean;
  /**
   * The child this computer or phone is linked to. The parent's UI needs it to say WHOSE app
   * time this device reports, and the rule push needs it to compile that child's limits rather than
   * the signed-in user's; it is not a secret (the row is already the child's). Guard on Android
   * reports it from 2026-09-13; an older Guard build omits it.
   */
  linkedUserId?: string;
  /**
   * Desktop only: the linked child's display name, captured when the link was made.
   *
   * The Companion has no way to resolve a user id into a name — names live in the account data,
   * which is encrypted and only the extension can read. Without this the pane can say "linked" but
   * not to whom, which is the one thing a parent standing at the computer wants to know. Captured
   * at link time rather than looked up, because the pane's whole job is to work with no browser
   * attached. A rename leaves this stale until the next link; the id is the truth, this is a label.
   */
  linkedUserName?: string;
  // --- DCP-10 heartbeat fields (redesign §4.7). Absent on older builds; `deviceHealth` treats absent as unknown. ---
  /** The monitor loop's real last tick, from the device clock. Stale against the receive time: stopped. */
  lastTickAt?: number;
  /** The settings version the sealed ruleset was compiled from; -1 when never compiled from fetched settings. */
  appliedSettingsVersion?: number;
  /** Age of today's web time (usage seed) on the device. Sent from DCP-9. */
  usageSeedAgeMs?: number;
  /**
   * How the device notices the app in front: OS events, or polling at an interval. `running` is a
   * Linux desktop that hides the app in front (GNOME or KDE on Wayland): blocked apps are closed
   * whenever they run, and no app time is counted.
   */
  detection?: { kind: 'events' | 'poll' | 'running'; intervalMs?: number };
  /**
   * Linux computers: the account the Companion runs in is an administrator, so whoever uses it can
   * use sudo, and sudo stops and removes the Companion. Sent only while linked to a child (HAT-198).
   * Absent: not known, or not a child's computer.
   */
  accountIsAdmin?: boolean;
  /**
   * Computers: Browser lockdown over the browsers installed here (HAT-1348), so App controls can say
   * which computers still need it under Locked down. `off` also covers a computer nobody linked yet.
   * Absent: an older build, or nothing to lock down (no supported browser).
   */
  browserLockdown?: 'on' | 'partial' | 'off';
  /** The device's timezone differs from the family's (D3). Schedules still follow the family's. */
  timeZoneMismatch?: boolean;
  /** The device clock is far from the server's, which a child can do to slide a schedule. */
  clockJump?: boolean;
  /** What this build can do: `settingsFetch` (compiles its own rules, DCP-7), `guardPush` (the server holds Guard's own FCM token, DCP-7). */
  capabilities?: string[];
  /**
   * Which admin code this build takes (UI: "Admin code"; code: unlockPin). `device`: only its own,
   * from the device key it was linked with (CMP-5, CMP-62). Absent: an older build, which takes the
   * clock code every install shares, so the parent's Admin code page shows that one for it.
   */
  adminCode?: 'device';
}

/**
 * Which Android surface to open from the setup wizard (main app deep-links to it). `fasterBlocking`
 * opens the Companion on its own explanation of the accessibility service, which Play requires the
 * Companion itself to show before the service is turned on (HAT-930).
 */
export type CompanionOpenTarget = 'app' | 'usageAccess' | 'notifications' | 'battery' | 'overlay' | 'fasterBlocking';

/**
 * Guard's live answer for one app: would it block `pkg` right now, from the ruleset it is enforcing.
 * `ok: false` means the answer is not known — Guard not running, too old to answer, or not reached —
 * which is never the same as "allowed".
 */
export type CompanionAppDecision = {
  ok: boolean;
  pkg: string;
  action?: 'allow' | 'warn' | 'block';
  /** Guard's block reason in wire form (`app-blocked`, `family-downtime`, `budget-exhausted`, …). */
  reason?: string | null;
  unlockAtMs?: number | null;
  error?: string;
};

/**
 * Result of probing the Companion satellite from the main app. Every layer is
 * reported independently so the wizard never conflates "not installed" with
 * "installed but not responding" or "installed but permission not granted".
 */
export interface CompanionProbeResult {
  /** The native round-trip completed (not an error/timeout in the bridge itself). */
  ok: boolean;
  /** Companion package is present (PackageManager — always reliable). */
  installed: boolean;
  /** Companion is signed with the same certificate as the main app. */
  signatureOk?: boolean;
  /** Companion's provisioning provider responded to the status probe. */
  reachable?: boolean;
  /** Live self-reported status, present only when reachable. */
  status?: DeviceGuardStatus | null;
  /**
   * Whether the server holds a provisioning row for this device.
   *
   * Separate from `status.provisioned`, which is Guard's own on-disk answer.
   * The two can disagree: Guard is provisioned during the IPC handshake, before
   * the server row is written, so a failure of that later write leaves the phone
   * enforcing rules no parent can see or revoke.
   *
   * `undefined` means "could not tell" (offline, or no deviceId yet) and must be
   * treated as fine — only an explicit `false` is evidence of the split.
   */
  serverLinked?: boolean;
  error?: string;
}

/** Stored (encrypted) in ref_state by the provisioning client so the family can inspect/re-key. */
export interface CompanionProvisioningRecord {
  deviceId: string;
  keyId: string;
  encInfoKey: EncInfoKey;
  provisionedAt: number;
  tokenIssuedAt: number;
  status: 'active' | 'revoked';
}

/** IPC payload handed from the main app to Companion at provisioning. */
export interface CompanionProvisionPayload {
  deviceId: string;
  childUserId: string;
  /** Display name for the child, so the Companion can name them with no browser attached. */
  childDisplayName?: string;
  /**
   * Whether the person this computer is being linked to is a restricted user or an adult.
   *
   * The Companion cannot work this out for itself — it has no account data and no signed-in user —
   * and it needs to, because the one thing that turns on it is whether an open-ended "stop watching
   * this computer" pause is allowed. An adult tracking their own habits must be able to switch
   * Kindredly off on their own machine; a child's machine must not have that switch at all.
   *
   * Resolved on this side from the local user record, not passed in by a view, and stored in the
   * Companion's encrypted provisioning file. Absent — an older client, or a link made before this
   * field existed — is read as `restricted`, which keeps the four-hour ceiling.
   */
  linkedUserType?: 'admin' | 'restricted';
  /** Device-agent scoped JWT (activity push + heartbeat only). */
  token: string;
  /** Raw AES-256 device data key, base64. Companion re-wraps it with an Android Keystore key at rest. */
  rawKeyB64: string;
  /** Pre-wrapped for the child's user key; the constant `keys[0]` of every upload's encInfo. */
  encInfoKey: EncInfoKey;
  serverBaseUrl: string;
  uploadEnabled: boolean;
}

/** Parent-facing merged view of one Companion device (provisioning + status + inventory). */
export interface CompanionDeviceView {
  deviceId: string;
  provisioning: CompanionProvisioningRecord | null;
  status: DeviceGuardStatus | null;
  inventoryCount: number;
  /** When the server last received this device's heartbeat. Null: never. */
  lastSeenAt: number | null;
  /** The one health verdict every surface shows (`deviceguard/deviceHealth.ts`, DCP-10). */
  deviceHealth: DeviceHealth;
}

/**
 * One device on the parent's Admin code page (CMP-5, CMP-62). Computed in the background from the
 * device key; the key itself never leaves it.
 */
export interface DeviceAdminCodeView {
  device: CompanionDeviceView;
  /** The device's code for each 15-minute window, from the current one on. Empty when `reason` is set. */
  codes: { window: number; code: string }[];
  /** No code: the device's key could not be read on this account. */
  reason?: 'no-key';
}

// --- Compiled rules (graduated from the Phase-0 spike compiler; enforcement lands in Phase 2) ---

export interface CompiledTimeRange {
  start: string;
  end: string;
}

export interface CompiledScheduleWindow {
  daysOfWeek: number[];
  timeRanges: CompiledTimeRange[];
}

export interface CompiledDeviceRule {
  ruleId: string;
  name: string;
  mode: InterventionMode;
  /** Either an explicit app id list or the catch-all sentinel. */
  appIds: string[] | typeof ALL_DEVICE_APPS;
  /** Schedule windows this rule is active in (empty = always active). */
  schedule: CompiledScheduleWindow[];
  /** Daily budget in ms keyed by day-of-week (0=Sun..6=Sat). Absent day = no budget that day. */
  dailyBudgetMsByDow: Record<number, number>;
  /**
   * HAT-1086: the rule's weekly total in ms, from Monday's start on the family clock, with any extra
   * time given today already added (`applyOverrides`). It limits every day, including one with no
   * `dailyBudgetMsByDow` entry, and blocks once this week's web time (`usageSeed.perRuleWeekUsedMs`)
   * plus this device's own app time since Monday reaches it. Omitted when the rule has no weekly
   * total, so every other rule's JSON, and `fingerprintOf()`, is unchanged.
   */
  weeklyBudgetMs?: number;
  /** Lower = evaluated first; assigned from source order. */
  priority: number;
  /**
   * This rule is the child's overall allowance rather than a limit on one kind of
   * thing. Affects only what the shield tells the child: `name` is authored for the
   * parent's editor, and the overall rule's is the internal "All Content", which is
   * fine in a settings list and wrong on a screen whose whole job is explaining to a
   * kid why their phone stopped. Omitted when false so the pushed JSON — and its
   * fingerprint — is unchanged for every other rule.
   */
  coversEverything?: boolean;
}

export interface CompiledDeviceRuleSet {
  version: number;
  generatedAt: number;
  /** Minutes offset from UTC on the compiling client, for schedule evaluation. */
  tzOffsetMinutes: number;
  /** Native adds server-time skew so schedules don't drift if the device clock is changed. */
  serverTimeSkewMs: number;
  rules: CompiledDeviceRule[];
  /** Never-blockable packages (dialer/emergency, launcher, Kindredly, system UI). */
  safetyAllowlist: string[];
  /**
   * Web usage already accrued today (per rule id), so combined web+app budgets start seeded.
   *
   * HAT-1086: `weekKey` (`familyWeekKey`, Monday's `yyyy-MM-dd`) and `perRuleWeekUsedMs`, this
   * family week's web time per rule with today's included, are present only when some rule has
   * `weeklyBudgetMs`. A device counts them only while `weekKey` is the current family week, and adds
   * its own app time since Monday, as it adds today's to `perRuleUsedMs`. Web-only like the day's.
   */
  usageSeed: {
    dateKey: string;
    perRuleUsedMs: Record<string, number>;
    weekKey?: string;
    perRuleWeekUsedMs?: Record<string, number>;
  };
  /**
   * Parent's allow/block posture. OPTIONAL on purpose: absent means "no posture",
   * so an older main app pushing to a newer Guard — or a family that never opened
   * the Apps page — behaves exactly as it did before this field existed.
   */
  appPolicy?: CompiledAppPolicy;
  /**
   * The Browsers setting as a guardian chose it (HAT-1348), for a computer, which closes a browser
   * with no Kindredly in it itself. Absent when nobody chose: the computer defaults by who is linked.
   */
  browsers?: DeviceBrowsersLevel;
  /**
   * Family Downtime, passed through from the settings unchanged apart from dropping stretches that
   * have already ended. Not gated on a pause. Absent from an older compile, which behaves as before.
   */
  familyDowntime?: DeviceFamilyDowntime;
  /**
   * Always allowed apps, passed through from the settings. After the floor, such an app skips Family
   * Downtime and the rule loop, and its time is left out of every budget; an app block still closes
   * it. Absent when there are none, so every other ruleset and its fingerprint are unchanged.
   */
  alwaysAllowAppIds?: string[];
  /**
   * Android packages whose time counts toward no budget: the Clock, calls, Settings, the keyboard,
   * the phone's own screens, Calculator and Camera (`deviceguard/notScreenTime.ts`, HAT-952). Unlike
   * Always allowed, nothing about blocking changes. Absent when the device reports no Android apps.
   */
  notCountedAppIds?: string[];
  /**
   * Apps a guardian allowed from a request, each until its `until` (`restrictions/appGrants.ts`,
   * HAT-178). Such an app is not blocked by anything until then, like the safety floor; the device
   * checks `until` on every decision, so the block comes back with no fetch. Absent when there are none.
   */
  appGrants?: { appId: string; until: number }[];
  /**
   * A guardian's "Pause all restrictions", while it is in force at compile time. App blocks and time
   * limits are suspended until `untilMs`; Family Downtime is not, because a pause does not lift it in
   * the browser either. `untilMs` 0 means until the guardian turns it off.
   *
   * An end time, not a ruleset with the blocks removed: the blocks stay in the ruleset and come back
   * on their own the moment the pause ends, with no push and no network. Dropping them instead would
   * leave a phone that loses its connection mid-pause unblocked for good.
   *
   * Absent from an older compile, which never paused on the device at all.
   */
  restrictionsPause?: { untilMs: number };
  /**
   * Earn access (HAT-836), with the apps each rule's holds cover on this device, expanded as a 0-minute
   * limit on the same condition is (`compileEarnAccess`). Below the floor, a guardian's grant, Family
   * Downtime, the pause, an app block and Always allowed, such an app is blocked with reason
   * `earn-access` while its rule holds.
   *
   * `rules` is every rule that can hold an app here, each with the times it is open (opened for its
   * day or week, or a day it does not apply), worked out in the family timezone up to `horizonEndMs`,
   * as Family Downtime's are. Outside those times it holds, past the horizon too. A device checks "is
   * now inside one" and nothing else, so a daily rule opened yesterday holds again at the family's
   * midnight on a device that cannot recompile (no stored settings, only what Kindredly pushed, EA-15).
   * A rule opened for good is left out: only a change to the settings can make it hold again.
   *
   * `holds` is the rules holding at compile time, for a device that predates `rules`; one that reads
   * `rules` ignores it. Absent when no rule can hold an app here, so every other ruleset and its
   * fingerprint are unchanged.
   */
  earnAccess?: {
    holds: Array<{ ruleId: string; name: string; appIds: string[] }>;
    rules?: Array<{ ruleId: string; name: string; appIds: string[]; open: Array<{ startMs: number; endMs: number }> }>;
    horizonEndMs?: number;
  };
  /**
   * "Block all access" (CMP-118), while it is on at compile time: the apps it closes on this device
   * until `untilMs` (0 means until a guardian turns it off). Every app that is not Task-Related or a
   * system app, and on a phone the other browsers, since Kindredly's filtering is not in them; the
   * founder's call (2026-11-23): Kindredly's own apps are left to handle themselves, and a task app
   * stays open. Below the floor and a guardian's grant, above everything else, as the browser checks
   * it before Always allowed. Absent while it is off, so every other ruleset is unchanged.
   */
  blockAll?: { untilMs: number; appIds: string[] };
  /**
   * The Daily Check-in (CMP-117, MAC-15), while it can block: on and not in reminder mode. Until
   * `releasedUntilMs` (0 when today's is not done), `appIds` are blocked: every app a time limit
   * covers on this device, less those the check-in's exceptions name (MAC-15's locked decision: what
   * the browser leaves unlimited, a device leaves alone). A release lasts until the check-in's reset,
   * so the device needs nothing but its clock to hold it again the next day. `self` means the child
   * clears it in Kindredly, `guardian` that a parent does. Absent when there is no such check-in.
   */
  checkin?: { mode: 'self' | 'guardian'; releasedUntilMs: number; appIds: string[] };
  /**
   * The linked child's display name, so a Companion can name them with no browser attached.
   *
   * It rides on the ruleset rather than only on the provisioning handshake because the handshake
   * happens once: a computer linked before the name existed, or a child renamed since, would show
   * "Linked to a child" forever. Rules are pushed on every change and on a periodic refresh, so
   * this is the channel that keeps it true. Optional — an older client sends no name, and the
   * Companion keeps whatever it already had rather than blanking it.
   */
  childDisplayName?: string;
}

// ---------------------------------------------------------------------------------------------
// Desktop bridge (browser extension ⇄ Kindredly Companion on macOS/Windows/Linux)
// ---------------------------------------------------------------------------------------------

/**
 * What the extension knows about its link to the desktop Companion. `companionLive` is the
 * useful bit: the relay answered AND the Companion behind it did. `portOpen` alone only says the
 * native-messaging port object exists.
 */
export type DesktopBridgeStatus = {
  enabled: boolean;
  portOpen: boolean;
  companionLive: boolean;
  companionVersion: string;
  platform: string;
  lastEventAtMs: number;
  lastUnavailableReason: string;
  nativePortId: string;
};

// ── Device settings contract (DCP-5, device control plane redesign §4.1/§4.3) ────────────────

/**
 * Whether the settings response could include the app policy.
 * - `readable`: `appPolicy` is the policy.
 * - `unreadable`: the stored row is still end-to-end encrypted. D1 moved it to readable, but only a
 *   guardian's client can rewrite an old row, on its next open of that child's app policy.
 * - `absent`: no policy row exists.
 *
 * **A device keeps its sealed app blocks whenever `appPolicy` is null**, whatever the status. A
 * missing input is never "nothing blocked" (tracker Gotchas). A guardian clearing every block
 * writes a readable policy with nothing in it, not a missing row.
 */
export type DeviceAppPolicyStatus = 'readable' | 'unreadable' | 'absent';

/**
 * The inputs a device compiles its rules from: the same settings the browser enforces, read from
 * the user's options, plus the app policy. Field names match `UserOptions` so each device reads
 * the types the browser already uses.
 */
export interface DeviceSettings {
  /**
   * `contentUsageLimits` are the authored rules. `temporaryRules` are reward-minted rules, each with
   * its own `expiresAtMs`; a device applies the unexpired ones on top of `contentUsageLimits`, as the
   * browser does (`ActivityLogDataService._getUsageLimitsData`).
   */
  usageLimitsData: { contentUsageLimits: LimitRule[]; temporaryRules: TemporaryLimitRule[] };
  /** Bonus time. Each override carries an absolute `expiresAt`, evaluated on the device. */
  ruleOverrideSettings: { ruleOverrides: RuleOverride[] };
  /**
   * The two pauses and "Block all access" (each with its expiry), and intervention mode. Only these
   * fields reach a device (`DEVICE_ACCESS_CONTROL_KEYS` on the server).
   */
  accessControlSettings: {
    disableUsageLimits?: boolean;
    disableUsageLimitsExpires?: number;
    disableRestrictions?: boolean;
    disableRestrictionsExpires?: number;
    restrictAll?: boolean;
    restrictAllExpires?: number;
    usageLimitInterventionMode?: InterventionMode;
    defaultInterventionMode?: InterventionMode;
    /** Earn access rules and when each was last opened (HAT-836). The device works out which hold. */
    earnAccessSettings?: EarnAccessSettings;
    earnAccessOpenings?: EarnAccessOpenings;
    /**
     * The Daily Check-in as data saved before HAT-913 holds it; newer data keeps it as an Earn access
     * rule (`checkinRuleOf`). Read through `checkpointSettingsOf`.
     */
    checkpointSettings?: CheckpointSettings;
    /** When today's check-in was done, until its reset (CMP-117). */
    checkpointRelease?: CheckpointRelease;
  };
  appPolicy: DeviceAppPolicy | null;
  appPolicyStatus: DeviceAppPolicyStatus;
  /**
   * Family Downtime, as actual start and end times for the next 28 days, worked out by the server in
   * the family timezone (`familyDowntimeForDevice`). A device checks "is now inside one" and nothing
   * else. Not gated on a pause: a pause does not lift downtime.
   *
   * These times move with the clock while the version does not, so a device refetches without its
   * `knownVersion` before `horizonEndMs` comes near. Absent from a server that predates it, and
   * `intervals` is empty for a family with no downtime.
   */
  familyDowntime?: DeviceFamilyDowntime;
  /**
   * School days (HAT-1283): the family's school week and breaks and days off, as stored. A device
   * applies `applySchoolDays` (Guard: `DeviceSettingsCompiler.applySchoolDays`) before extra time, so a
   * day off uses the Not school days schedule. Absent from a server that predates it.
   */
  schoolDays?: SchoolDaysSettings;
  /**
   * Always allowed apps (`user.options.alwaysAllowed.appIds`, HAT-152), `<platform>:<id>`. Open during
   * Family Downtime and past every time limit; an app block still wins. Absent when there are none,
   * and from a server that predates it.
   */
  alwaysAllowAppIds?: string[];
  /**
   * Apps a guardian allowed from a request (`options.appGrants`, HAT-178), `<platform>:<id>` until
   * `until`. Ended ones may still be here; a device ignores them. Absent when there are none.
   */
  appGrants?: { appId: string; until: number }[];
}

/**
 * Family Downtime as a device enforces it: actual start and end times, never a schedule. A device
 * checks "is now inside one" and nothing else, so no device re-implements the family's midnight and
 * daylight-saving rules. Past `horizonEndMs` the device treats it as absent and fetches again.
 */
export interface DeviceFamilyDowntime {
  intervals: Array<{ startMs: number; endMs: number }>;
  horizonEndMs: number;
  /** Apps the family left open during downtime, `<platform>:<id>` or a bare id. */
  allowAppIds: string[];
  /** The person's Blocked message, for the shield. Absent when they have none. */
  note?: string;
}

/** `POST /companion/settings/current`. Device-agent token only; takes no user or device id. */
export interface DeviceSettingsCurrentRequest {
  /** The version the device last applied. Absent on a device that has never fetched. */
  knownVersion?: number;
}

/**
 * `settings` and `familyTimeZone` are present only when `version` differs from `knownVersion`.
 *
 * **Compare with `!==`, never `>`.** The version is `GREATEST(previous + 1, epoch ms)`, so it never
 * repeats, but a restored database serves an older value until its next write, and a device that
 * refused a lower number would keep settings the server no longer holds.
 */
export interface DeviceSettingsCurrentResponse {
  version: number;
  /** Server clock at response time, for the device's trusted time (§4.2). */
  serverTimeMs: number;
  settings?: DeviceSettings;
  /** IANA id a guardian set for the family (D3), e.g. `America/Los_Angeles`. Null until one is set. */
  familyTimeZone?: string | null;
  /**
   * The server's Ed25519 public key (PEM), which a Linux computer's root guard records once (HAT-766).
   * Sent to a device token only.
   */
  signingKey?: string;
  /**
   * While a guardian has paused all restrictions: the server's signed statement that browser lockdown
   * may be lifted on this device until `untilMs`, at most 30 minutes ahead and renewed on every fetch.
   * The Companion hands `message` and `signature` to the root guard unchanged.
   */
  browserPause?: {message: string; signature: string; untilMs: number};
}

/**
 * DCP-27: app time added up across a child's devices. Each device reports its own time per limit,
 * sealed with the child's usage key before it leaves the device; the server stores the latest one
 * per device and passes it to the child's other devices, and never reads it (usage is history and
 * stays encrypted; founder, 2026-11-10). Design: docs/proposals/app-time-across-devices.md.
 *
 * Rows, under `refType: 'device-guard'`, `refId: USAGE_REF_ID`, owned by the child:
 * - `report/<deviceId>`: `{report: SealedUsageBlob, receivedAtMs}`, written only by
 *   `/companion/usage/sync` with that device's token.
 * - `deviceKey/<deviceId>`: the usage key's raw bytes sealed with that device's own data key, written
 *   by a Kindredly app (unencrypted row; the blob is the encryption).
 * - `childKey/child`: a `ChildUsageKeyRecord`, encrypted for the child like any ref_state row.
 */
export const USAGE_REF_ID = 'usage';
export const USAGE_REPORT_STATE = 'report';
export const USAGE_DEVICE_KEY_STATE = 'deviceKey';
export const USAGE_CHILD_KEY_STATE = 'childKey';
export const USAGE_CHILD_KEY_SUBKEY = 'child';

/** AES-256-GCM: a 12-byte `iv` and `data` as ciphertext followed by the 16-byte tag, both standard base64. */
export interface SealedUsageBlob {
  /** The usage key's id, so a device holding an older key knows to wait for the new one. */
  keyId: string;
  iv: string;
  data: string;
}

/**
 * What a sealed report opens to: the device's own app time per limit id, on the family's day and
 * week (`familyClock`). Never web time or other devices' time, so nothing is counted twice.
 */
export interface DeviceUsageReport {
  dateKey: string;
  perRuleUsedMs: Record<string, number>;
  weekKey?: string;
  perRuleWeekUsedMs?: Record<string, number>;
}

export interface OtherDeviceUsageReport {
  deviceId: string;
  /** When the server received it, on the server's clock. */
  receivedAtMs: number;
  report: SealedUsageBlob;
}

/**
 * A device's report and pull in one call. `report` absent is a pull. `limitUsedUp`: a limit ran
 * out on this device, so the server nudges the child's other devices to pull now.
 */
export interface DeviceUsageSyncRequest {
  report?: SealedUsageBlob;
  limitUsedUp?: boolean;
}

export interface DeviceUsageSyncResponse {
  serverTimeMs: number;
  /** The usage key, sealed with the calling device's own data key. Absent until a Kindredly app has made one. */
  usageKey?: SealedUsageBlob;
  /** The child's other devices' latest reports, newest first. */
  others: OtherDeviceUsageReport[];
}

/** The child's usage key, held in the child's encrypted `childKey/child` row. */
export interface ChildUsageKeyRecord {
  keyId: string;
  rawKeyB64: string;
  /** The devices it was sealed for. One no longer linked means the key is replaced (rotation). */
  deviceIds: string[];
  createdAtMs: number;
}
