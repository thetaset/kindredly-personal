/**
 * What the desktop Companion knows about the machine it is running on.
 *
 * ONE definition, three consumers: the Companion main process builds it
 * (`tset-electron/src/main.ts` `getDesktopStatus`), the preload hands it to the Companion
 * renderer, and the browser extension receives it over the bridge (`GET_DESKTOP_STATUS`).
 *
 * It used to be hand-typed twice — once in `tset-electron/src/preload.ts` and once in
 * `tset-client/src/typings/electron.d.ts` — and the two drifted constantly, because `tsc` does not
 * parse `.vue` so no caller ever caught it. Same precedent as
 * `tset-sharedlib/src/restrictions/companionAccess.ts`, which all three surfaces already import.
 *
 * A note on what these fields actually prove, because the UI renders claims from them:
 *  - `status: 'confirmed'` means an extension manifest was found in a profile directory ON DISK.
 *    Not that it is enabled, loaded, or running.
 *  - `extensions[].enabled` is a flag read out of the browser's own profile database.
 *  - `protectionState.entries[].active` means the managed-preferences plist carries our marker AND
 *    incognito is disabled. A browser already running has NOT picked that up — see `restartRequired`.
 *  - Safari cannot be audited at all; absence of Safari evidence is not evidence of absence.
 */

export type DesktopBrowserFamily = 'chromium' | 'firefox' | 'safari';

export type DesktopBrowserStatus = {
  id: string;
  label: string;
  family: DesktopBrowserFamily;
  installed: boolean;
  supported: boolean;
  /** `confirmed` = manifest found on disk. `inferred` = native-host/config only, not confirmed. */
  status: 'confirmed' | 'inferred' | 'missing' | 'unsupported';
  detectionSource: string;
  detectionMessage: string;
  browserAppName: string;
  appPath: string;
  isOpen: boolean;
  controlsUrl: string;
  extensionId: string;
  updateUrl: string;
  nativeHostDetected: boolean;
  profileDetected: boolean;
  /**
   * `name` is what the person called the profile ("Work", "Kid"); `dir` is what the BROWSER calls
   * it on disk ("Default", "Profile 2") and is the only one `--profile-directory=` accepts.
   *
   * Both, because they are genuinely different strings for chromium and confusing them means
   * opening the wrong profile — or, worse, opening a new one. `dir` is absent on a status from an
   * older Companion, which falls back to opening the browser without naming a profile.
   */
  profiles: Array<{ name: string; present: boolean; path: string; dir?: string }>;
  profilesTotal: number;
  profilesProtected: number;
  profilesUnprotected: string[];
  allProfilesProtected: boolean;
  extensions: Array<{ id: string; name: string; enabled: boolean }>;
};

export type DesktopProtectionEntry = {
  id: string;
  label: string;
  /**
   * The browser's app bundle is actually on this machine.
   *
   * Distinct from `applicable`, which is true for an uninstalled browser that has a policy plist —
   * deliberately, so a browser installed later starts out protected. Only `browserDetected` should
   * decide whether a row is shown to a parent.
   */
  browserDetected?: boolean;
  applicable: boolean;
  /** The policy is written. A browser open since before it was written has not applied it. */
  active: boolean;
  detail: string;
  browserAppName?: string;
  isOpen?: boolean;
  appPath?: string;
  /** True when the browser is running and must be restarted before `active` means anything to it. */
  restartRequired?: boolean;
  relaunchUrl?: string;
};

export type DesktopProtectionState = {
  state: 'on' | 'off' | 'partial' | 'unknown';
  label: string;
  summary: string;
  checkedAtMs: number;
  activeCount: number;
  applicableCount: number;
  entries: DesktopProtectionEntry[];
};

export type DesktopActionRecord = {
  action: 'apply' | 'remove';
  ok: boolean;
  error: string;
  stdout: string;
  stderr: string;
  finishedAtMs: number;
  source: 'extension' | 'electron';
};

export type DesktopActiveChallenge = {
  id: string;
  action: 'apply' | 'remove';
  extensionId: string;
  updateUrl: string;
  source: 'extension' | 'electron';
  reason: string;
  requestedAtMs: number;
  expiresAtSec: number;
  requestedByUserId: string;
};

export type DesktopBridgeSummary = {
  live: boolean;
  userType: string;
  mode: string;
  lastContextEpochMs: number;
  unlockWithoutPin: boolean;
  socketPath: string;
  registeredBrowsers: string[];
  registrationOk: boolean;
  registrationFailed: { target: string; error: string }[];
  /** Bundle id of the browser holding the extension, from the relay pid-walk. macOS only, '' when unresolved. */
  browserPkg: string;
  /**
   * Every browser with Kindredly connected right now, by the same ids as `browserPkg` (CMP-16), so
   * two connected browsers are both named. Absent on older builds.
   */
  browserPkgs?: string[];
  /** 'chromium' | 'firefox' from the relay origin scheme, '' when nothing is attached. */
  originFamily: 'chromium' | 'firefox' | '';
  /** The attached extension's id. Note every Chromium browser ships the same one. */
  originExtensionId: string;
};

export type DesktopCompanionSummary = {
  state: 'connector-missing' | 'connector-inactive' | 'admin-users-unavailable' | 'unlock-required' | 'unlocked';
  currentBlockerReason: 'connector-missing' | 'connector-inactive' | 'admin-users-unavailable' | 'unlock-required' | 'none';
  title: string;
  detail: string;
  tone: 'ok' | 'warn' | 'info';
  actionLabel: string;
  canOpenConnector: boolean;
  canModify: boolean;
  connectorInstalled: boolean;
  connectorHostInstalled: boolean;
  connectorBrowserInstalled: boolean;
  connectorActive: boolean;
  lastConnectorHeartbeatMs: number;
  adminUserCount: number;
  modifyAuthorized: boolean;
};

export type DesktopStatus = {
  appName: string;
  appVersion: string;
  platform: string;
  arch: string;
  isDev: boolean;
  simpleDiagnosticsEnabled: boolean;
  uiMode: 'simple';
  nativeHostInstalled: boolean;
  nativeHostManifestPaths: string[];
  extensionDetected: boolean;
  extensionId: string;
  updateUrl: string;
  extensionDetectionSource: string;
  extensionDetectionMessage: string;
  extensionBrowserApp: string;
  extensionControlsUrl: string;
  browserStatuses: DesktopBrowserStatus[];
  devConfig: {
    extensionIds: { chrome: string; chromium: string; firefox: string; safari: string };
    updateUrl: string;
  };
  trayModifyAccess: {
    authorized: boolean;
    userLabel: string;
    expiresAtMs: number;
    bypassEnabled?: boolean;
  };
  devModifyBypassEnabled?: boolean;
  /**
   * Who this computer reports app time for.
   *
   * On the same payload as everything else the two surfaces render, deliberately: the extension's
   * device page used to learn this from a second probe (`/companion/status`) and read the wrong
   * field off it, so a successful link looked exactly like a failed one — and the Companion's own
   * pane could not say anything at all. One source, both surfaces.
   */
  activityLink?: {
    linked: boolean;
    childUserId: string;
    /** Captured at link time. '' when linked by an older client that did not send one. */
    childDisplayName: string;
    /**
     * Whether this computer is set up for a restricted user or for an adult tracking themselves.
     *
     * Drives what the Companion window OFFERS — "Monitoring" rather than "Protection", and whether
     * an open-ended pause appears at all. It never grants anything: the main process re-reads the
     * provisioning record when a pause is actually asked for.
     *
     * Absent on a link made before this field existed, which reads as `restricted`.
     */
    linkedUserType?: 'admin' | 'restricted';
    deviceId: string;
    /** The server this computer reports to, so the window's website links go to a box when it is linked to one (CMP-61). */
    serverBaseUrl?: string;
    /**
     * Linux, linked to a child: this computer's account is an administrator, so whoever uses it can
     * remove the Companion with sudo (HAT-198). Absent on older builds and on other systems.
     */
    accountIsAdmin?: boolean;
    /**
     * Whether any ruleset has reached this computer, and what it holds (CMP-31), so "App limits: On"
     * is not said with nothing to enforce. `rulesCount` is time limits and schedules;
     * `blockedAppsCount` is apps a guardian turned off. Absent on older builds.
     */
    rulesLoaded?: boolean;
    rulesCount?: number;
    blockedAppsCount?: number;
    /**
     * Whether this computer can reach Kindredly (CMP-56). The last check-in's and the last settings
     * fetch's error ('' while they work), and when the current run of failures began (epoch ms, 0
     * while they work), so the window can say "Can't reach Kindredly since 9:40". After a wake both
     * are retried within seconds, so a failure that outlasts the network coming back is real.
     */
    lastHeartbeatError?: string;
    lastHeartbeatErrorSince?: number;
    lastSettingsError?: string;
    lastSettingsErrorSince?: number;
    /**
     * When the link record became unreadable (CMP-52), or 0. While it is, `linked` is false and the
     * computer is still treated as linked: supervised, behind the settings gate, its sealed rules
     * kept, and the record retried every 30 s.
     */
    provisioningUnreadableSince?: number;
  };
  /**
   * Why this computer is not enforcing, when it is not. `null`/absent means it is.
   *
   * Nothing on this payload reported enforcement at all before — `protectionState` answers "are the
   * browsers locked down", which is a different question and was the only one a parent could ask.
   *
   * `source` says where to undo it: `device` in the Companion's own settings, `account` in
   * Kindredly ("Pause all restrictions"), `escape` from the admin code on the block screen (it
   * expires on its own, is reported as tamper, and `app:resumeProtection` ends it early, CMP-26).
   *
   * `until` is a real deadline EXCEPT when `indefinite` is true, where it is meaningless — read
   * that flag first. Open-ended: an off switch set in Companion settings, or an account pause a
   * guardian set to last until they turn it off (CMP-3).
   */
  enforcementPause?: {
    source: 'device' | 'account' | 'escape';
    until: number;
    indefinite?: boolean;
  } | null;
  extensionConnectionActive: boolean;
  extensionLastMessageEpochMs: number;
  extensionLastMessageType: string;
  extensionRuntimeUser: {
    userId: string;
    email: string;
    username: string;
    displayName: string;
    isAuthenticated: boolean;
  };
  extensionRuntimeAdminUsers: Array<{
    userId: string;
    username: string;
    email: string;
    displayName: string;
  }>;
  extensionRuntimeContext: {
    appType: string;
    stage: string;
    clientVersion: string;
    reason: string;
  };
  connectorInstalled: boolean;
  connectorHostInstalled: boolean;
  connectorBrowserInstalled: boolean;
  connectorActive: boolean;
  lastConnectorHeartbeatMs: number;
  adminUserCount: number;
  currentBlockerReason: 'connector-missing' | 'connector-inactive' | 'admin-users-unavailable' | 'unlock-required' | 'none';
  lastActionResult?: DesktopActionRecord | null;
  companion: DesktopCompanionSummary;
  protectionState: DesktopProtectionState;
  extensionAuthHandoffAvailable: boolean;
  extensionAuthHandoffExpiresAtSec: number;
  extensionAuthHandoffUserId: string;
  extensionActiveChallenge?: DesktopActiveChallenge | null;
  extensionLastAction?: DesktopActionRecord | null;
  bridge?: DesktopBridgeSummary;
};
