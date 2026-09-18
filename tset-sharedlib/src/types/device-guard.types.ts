/**
 * Kindredly Companion (device-guard) shared contracts.
 *
 * Shared between the Companion Android satellite app, the main-app background
 * services, and parent-facing UI. The Companion app itself is Kotlin — these
 * types document the JSON wire/IPC shapes it produces and consumes.
 * See docs/proposals/kindredly-companion-device-app-controls.md.
 */

import type { EncInfoKey } from './encryption.types';
import type { InterventionMode } from './activity.types';
import type { LimitRule, RuleOverride } from './usage-limits.types';
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
   * Android's own `ApplicationInfo.category` (API 26+). Omitted when UNDEFINED(-1).
   * Developer-self-reported, so it is a hint, not the truth — the curated seed map
   * in kinds/appCategorySeed.ts deliberately outranks it.
   */
  androidCategory?: number;
  /** `ApplicationInfo.FLAG_SYSTEM` on Android; `/System/Applications` on macOS. Omitted when false. */
  isSystem?: boolean;
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
export interface DeviceAppPolicy {
  version: 1;
  /** Curated categories the parent turned off wholesale. */
  blockedCategories: string[];
  /** Per-app exceptions ONLY; an entry.decision outranks its category. */
  entries: Record<string, DeviceAppPolicyEntry>;
  /** Expand eduValue limit conditions into phone apps. Default true. */
  countInUsageLimits?: boolean;
  /** Last time the parent saved, for the "new since you last looked" set. */
  reviewedAt?: number;
  updatedAt: number;
}

/**
 * The fully materialized posture the device enforces: one flat sorted set and
 * nothing else. Every judgement (category resolution, curated-list expansion,
 * safety-floor subtraction) happens on the authoring side so Guard stays dumb.
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
  | 'escapeHatch';

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
  /** How the device notices the app in front: OS events, or polling at an interval. */
  detection?: { kind: 'events' | 'poll'; intervalMs?: number };
  /** The device's timezone differs from the family's (D3). Schedules still follow the family's. */
  timeZoneMismatch?: boolean;
  /** The device clock is far from the server's, which a child can do to slide a schedule. */
  clockJump?: boolean;
  /** What this build can do: `settingsFetch` (compiles its own rules, DCP-7), `guardPush` (the server holds Guard's own FCM token, DCP-7). */
  capabilities?: string[];
}

/** Which Android surface to open from the setup wizard (main app deep-links to it). */
export type CompanionOpenTarget = 'app' | 'usageAccess' | 'notifications' | 'battery' | 'overlay';

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
  /** Web usage already accrued today (per rule id), so combined web+app budgets start seeded. */
  usageSeed: { dateKey: string; perRuleUsedMs: Record<string, number> };
  /**
   * Parent's allow/block posture. OPTIONAL on purpose: absent means "no posture",
   * so an older main app pushing to a newer Guard — or a family that never opened
   * the Apps page — behaves exactly as it did before this field existed.
   */
  appPolicy?: CompiledAppPolicy;
  /**
   * Family Downtime, passed through from the settings unchanged apart from dropping stretches that
   * have already ended. Not gated on a pause. Absent from an older compile, which behaves as before.
   */
  familyDowntime?: DeviceFamilyDowntime;
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
  /** Pause (with its expiry) and intervention mode. Only these fields reach a device. */
  accessControlSettings: {
    disableUsageLimits?: boolean;
    disableUsageLimitsExpires?: number;
    usageLimitInterventionMode?: InterventionMode;
    defaultInterventionMode?: InterventionMode;
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
}
