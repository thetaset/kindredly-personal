import type { TokenData } from '../api';
import type User from '../schemas/public/User';
import type { DateString, DynObj } from './common.types';
import type { ContentOpenBehaviorOverrides } from './client.types';
import { RuleOverrideSettings } from './usage-limits.types';
import type { RewardSettings, DailyRewardStates } from './reward.types';
import { AccountOptions, SystemOptions } from '../schemas/public/Account';
import type { CategorySet } from './categoryExplorer.types';
import type { SearchProviderId } from '../search-provider.utils';

export enum UserType {
  admin = 'admin',
  restricted = 'restricted',
}

export enum AccountType {
  standard = 'standard',
  plus = 'plus',
  superplus = 'superplus',
}

export enum LoginType {
  google = 'google',
  apple = 'apple',
  internal = 'internal',
}

export enum VerificationType {
  loginToken = 'loginToken',
  joinFamily = 'joinFamily',
  passwordReset = 'passwordReset',
  accountRecovery = 'accountRecovery',
  regToken = 'regToken',
  confirmEmail = 'confirmEmail',
}

export interface UserOptions {
  whitelistingEnabled: boolean;
  codeInjectionEnabled: boolean;
  contentFilteringEnabled: boolean;
  usageLimitsData?: any;
  logActivity: boolean;
  /** Keep all links inside the in-app browser instead of opening external apps. */
  containLinksInternally?: boolean;
  aiChatEnabled?: boolean;
  /** App Builder: create and edit the code behind Kindredly apps. Admin-granted per child. */
  appEditorEnabled?: boolean;
  /** Library-mode kids: allow browsing the published catalog and requesting adds. */
  explorePublishedEnabled?: boolean;
  accessControlSettings?: any;
  ruleOverrideSettings?: RuleOverrideSettings;
  /** Reward rules and categories configured for this user. */
  rewardSettings?: RewardSettings;
  /** Per-day earned/claimed state for the reward rules above. */
  dailyRewardStates?: DailyRewardStates;
  /**
   * Device-capability grants for this (restricted) user's sandboxed apps, written by a guardian
   * via /user/options/update. Outer key is the app's stable identity (AppStorageRef.refId), so a
   * re-imported published app keeps its grant. Restricted users cannot write their own options,
   * which is exactly why grants live here and not in userPrefs.
   */
  appCapabilityGrants?: Record<string, Partial<Record<string, AppCapabilityGrant>>>;
  /**
   * Email addresses this (restricted) user is allowed to correspond with, written by a
   * guardian via /user/options/update. Same reasoning as appCapabilityGrants above: the
   * equivalent userPref is writable by the user it describes, so a child could approve
   * their own correspondents. Friends and family are allowlisted automatically and are
   * NOT stored here — this is only the addresses a guardian added by hand or approved.
   */
  emailAllowedSenders?: string[];
}

export interface AppCapabilityGrant {
  grantedBy: string;
  grantedAt: number;
  expiresAtMs?: number;
}



export interface UserView extends User {
  _id: string;
  localUser?: boolean;
  profileImage?: Record<string, any> | null;
  encEnabled?: boolean;
  encSettings?: DynObj;
  options?: UserOptions;
  lastLoginAt?: Date;
  accountType?: AccountType;
  hasPassword?: boolean;
  hasPin?: boolean;
  hasPasswordCopy?: boolean;
  hasRecoveryKeyStored?: boolean;
  publicId?: string;
  // SYNC-6. The highest changelog id recorded for this user, computed when the user
  // record is read. The client's "I am already up to date, skip the request" check
  // compares it against the revision it last synced to. Absent from an older server's
  // response, where the client falls back to comparing `updatedAt` dates.
  syncRevision?: number;
}



export interface AccountView {
  _id: string;
  accountType: AccountType;
  subscriptionInfo?: any;
  sysOptions?: SystemOptions;
  options?: AccountOptions;
}

export interface UserAuthInfo {
  user: User;
  userId: string;
  sessionId: string;
  accountId: string;
}

export interface UserPreferences {
  [key: string]: any;
}

/**
 * A user-curated Essentials category: a labelled group of collections surfaced in
 * the launcher. Stored in `essentials.categoryList`.
 *
 * Essentials is retired — the launcher block is off by default and its entry points
 * are gone, but saved categories are kept so turning it back on restores everything.
 */
export interface EssentialsCategory {
  id: string;
  title: string;
  /** Bootstrap icon name (e.g. 'heart-pulse'). */
  icon: string;
  /** Ordered ids of the collections that fill this category. */
  collectionIds: string[];
  /** Set when seeded from a suggested preset, so it's hidden from suggestions. */
  suggestedKey?: string;
}

/**
 * Opt-in to contributing image-filtering decisions.
 *
 * Shared because the server re-checks it before accepting an upload — the two
 * sides must agree on the exact key or the gate silently rejects everyone.
 */
export const IMAGE_IMPROVEMENT_PREF_KEY = 'features.imageImprovement.enabled';

export interface UserPrefsData {
  pinnedToHome?: string[];
  taskbar?: TaskButtonEntry[];
  notificationSettings?: any;
  uiWelcome?: boolean;
  'ui.addGlobal.mode'?: 'auto' | 'kidFirst' | 'adultFirst' | null;
  contentOpenBehaviorOverrides?: ContentOpenBehaviorOverrides | null;
  youtubeVideoOpenBehavior?: 'inApp' | 'external' | null;
  youtubeHideSearch?: boolean | null;
  youtubeHideComments?: boolean | null;
  youtubeHideRecommendations?: boolean | null;
  youtubeHideOtherDistractions?: boolean | null;
  redditHideSearch?: boolean | null;
  redditHideComments?: boolean | null;
  redditHideOtherDistractions?: boolean | null;
  customCategorySets?: CategorySet[];
  /**
   * "Big and Simple" appearance scale — larger type, taller controls, higher
   * contrast on secondary text. Appearance only; it changes nothing about
   * filtering or restrictions.
   *
   * Tri-state on purpose. `undefined` means "never decided", which is what lets
   * the client derive a default from the user's age exactly once and then
   * persist it (see resolveBigSimpleDefault). Once a value is stored — whether
   * derived or chosen by a parent — it is never recomputed, so the setting does
   * not silently flip on a birthday.
   */
  'appearance.bigSimple.enabled'?: boolean | null;
  'features.searchSidekick.enabled'?: boolean | null;
  'features.monitorWidget.enabled'?: boolean | null;
  'features.unifiedFeedHome.enabled'?: boolean | null;
  'features.learnedClassifier.mode'?: 'off' | 'shadow' | 'on' | null;
  /**
   * Contribute image-filtering decisions so the filter can be improved.
   *
   * Off unless a guardian turns it on. It is written onto each family member
   * individually rather than read from the account owner, because a restricted
   * user cannot read another user's prefs — so the guardian's settings screen
   * fans the value out, and each device only ever reads its own.
   */
  'features.imageImprovement.enabled'?: boolean | null;
  'search.defaultEngine'?: SearchProviderId | null;
  /**
   * Search targets/sources the user switched off — see utils/searchTargets.ts.
   * Stores what is OFF rather than what is on, so a target added later is
   * available to everyone without a migration.
   */
  'search.disabledTargets'?: string[] | null;
  /** Per-kind default item ("apps.email" → itemId) — see kinds/kindRegistry.ts */
  'defaults.byKind'?: Record<string, string> | null;
  /** Slot kind ids the user dismissed from kind-template dashboards */
  'kinds.hiddenSlots'?: string[] | null;
  /** Home top-bar "Apps" shortcut (mobile entry to the all-apps grid) — default on */
  'home.shortcuts.apps.visible'?: boolean | null;
  /** Show the Essentials block inside the app launcher overlay — retired, default OFF */
  'essentials.launcher.visible'?: boolean | null;
  /** Two-level Essentials: categories that each group one or more collections */
  'essentials.categoryList'?: EssentialsCategory[] | null;
  /**
   * How the library browse grids (Categories / Item Types / Usage Types) draw a tile:
   * `compact` rows (default) or the original `card` poster tiles. One shared value, so
   * the choice carries across all three axes.
   */
  'ui.categoryGrid.density'?: 'compact' | 'card' | null;
  /**
   * Advanced mode — opt in to the full item-type list and the power-user surfaces
   * (change item type, collection advanced options, library analysis, App Builder).
   *
   * Off by default, set by the person themselves, and synced across their devices.
   * It only decides what is *offered*: it never bypasses a restriction, a per-user
   * permission, or a plan gate. Developer Mode implies it — see
   * `tset-client/src/config/advancedMode.ts`.
   */
  'ui.advancedMode.enabled'?: boolean | null;
}

export interface TaskButtonEntry {
  name: string;
  label: string;
  icon: string;
  enabled: boolean;
  /** 'items' — a slot filled with library items. 'builtin' — a Kindredly feature
   * (Tasks, Audio) with no library item behind it, launched by name instead. */
  type: string;
  builtin: boolean;
  items: any[];
  itemCache: any[];
  tabs: any[];
  order: number;
  /** Whether this slot appears on the desktop Launchpad strip. Default true; Core Apps
   * manages all app slots, but some (e.g. Notes, AI) are hidden from the strip by default. */
  showInTaskbar?: boolean;
}

export interface ClientInfoView {
  clientId: string;
  clientVersion: string;
  appId: string;
  appVersion: string;
  appType: string;
}

export type ManagedSessionStatus = 'offline' | 'stale' | 'online-unverified' | 'verified-live';

export type RemoteActionCommandKind = 'openUrl' | 'forceSyncSettings' | 'syncActivity' | 'getScreenshot';

export type RemoteActionCommandStatus = 'sent' | 'completed' | 'failed' | 'expired';

export interface ManagedClientSessionView extends ClientInfoView {
  deviceName?: string | null;
  deviceType?: string | null;
  lastSeen?: DateString | null;
  lastLogin?: DateString | null;
  lastHeartbeatAt?: DateString | null;
  lastVerifiedAt?: DateString | null;
  status: ManagedSessionStatus;
  supportsRemoteCommands: boolean;
  remoteCommandReady: boolean;
}

export interface ManagedRemoteActionCommandView {
  actionId: string;
  targetUserId: string;
  requestedByUserId: string;
  clientId: string;
  kind: RemoteActionCommandKind;
  status: RemoteActionCommandStatus;
  createdAt: DateString;
  updatedAt: DateString;
  completedAt?: DateString | null;
  errorMessage?: string | null;
  screenshotDataUrl?: string | null;
}

/**
 * Live View — a guardian watching a child's screen in near-real-time.
 *
 * Frames are E2E-encrypted by the child with its own user key and are never
 * readable by the server. Nothing here is durable: sessions and frames live in
 * Redis with short TTLs and no history is kept.
 */
export type LiveViewFrameKind = 'screen' | 'no-visible-page' | 'permission-needed';

export interface LiveViewFrameView {
  clientId: string;
  frameId: string;
  capturedAt: DateString;
  kind: LiveViewFrameKind;
  width: number;
  height: number;
  /** Ciphertext. Contains the JPEG plus the page url/title. Server never decrypts. */
  encryptedFrame: string;
}

export interface LiveViewDeviceView extends ClientInfoView {
  userId: string;
  deviceName?: string | null;
  deviceType?: string | null;
  lastSeen?: DateString | null;
  status: ManagedSessionStatus;
  /** False for client types that cannot capture (e.g. plain webapp sessions). */
  supportsLiveView: boolean;
  frame?: LiveViewFrameView | null;
}

export interface LiveViewSessionView {
  sessionId: string;
  watchedUserIds: string[];
  cadenceMs: number;
  expiresAt: DateString;
}

export interface AuthInfo {
  user?: UserView;
  tokenData?: TokenData;
  lastUpdated?: Date;
  passwordForClient?: string;
  recoveryKeyForClient?: string;
  success: boolean;
}
