import type { TokenData } from '../api';
import type { PageNoteReminder } from '../pageNote.utils';
import type User from '../schemas/public/User';
import type { DateString, DynObj } from './common.types';
import type { ContentOpenBehaviorOverrides } from './client.types';
import { RuleOverrideSettings } from './usage-limits.types';
import type { RewardSettings, DailyRewardStates } from './reward.types';
import { AccountOptions, SystemOptions } from '../schemas/public/Account';
import type { CategorySet } from './categoryExplorer.types';
import type { SearchProviderId } from '../search-provider.utils';
import type { AllowList } from '../restrictions/alwaysAllowed';
import type { SocialMediaSettings } from '../restrictions/socialMedia';

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
  /** Always allowed (HAT-152): opens whatever this person's time. See `restrictions/alwaysAllowed.ts`. */
  alwaysAllowed?: AllowList;
  /** Block social media and its Exceptions (SMB). Absent = the older rules decide. See `restrictions/socialMedia.ts`. */
  socialMedia?: SocialMediaSettings;
  /** Page notes reminders (PGN-9): on these YouTube channels and sites, offer Take notes. See `pageNote.utils.ts`. */
  pageNoteReminders?: PageNoteReminder[];
  logActivity: boolean;
  /** Keep all links inside the in-app browser instead of opening external apps. */
  containLinksInternally?: boolean;
  /** "Open YouTube in the YouTube app" (`other-apps.ts`). Absent means off; never for a child. */
  openYouTubeInApp?: boolean;
  /** Kinbot, the chat assistant. Off until an admin turns it on for this person (`family-ai.ts`). */
  aiChatEnabled?: boolean;
  /**
   * AI tools — scanning a page, image generation, suggestions, lessons. Absent = on; an admin turns
   * it off for one person. Independent of Kinbot, so a child can have AI tools without chat.
   */
  aiToolsEnabled?: boolean;
  /** Kinbot may search the web (HAT-288). Off until an admin turns it on (`personAllowsWebSearch`). */
  aiWebSearchEnabled?: boolean;
  /**
   * "Assistant reviews requests": whether blocked-site requests from this child get
   * checked against the family's guidelines before reaching a parent.
   *
   * Deliberately independent of `aiChatEnabled` and of hosted-AI availability. AI
   * Chat governs something the child talks to; this answers on the parent's behalf
   * using words the parent wrote, and a family that did not want a chatbot has not
   * thereby declined it.
   *
   * On user.options rather than a userPref so a child cannot grant it to
   * themselves. Unlike the guidelines text, this one is safe for them to READ —
   * the block page has to know whether to promise a check.
   */
  assistantReviewEnabled?: boolean;
  /** App Builder: create and edit the code behind Kindredly apps. Admin-granted per child. */
  appEditorEnabled?: boolean;
  /**
   * Command bar: "/" to search, go anywhere and run commands, in the bar and in the chat window.
   * Admin-granted per person, including for themselves; off until an admin turns it on.
   */
  commandBarEnabled?: boolean;
  /**
   * Search your history: pages this person visited come up on the Search page, in their own
   * group. Their own history only. While it is on, a few keywords from each page are kept in
   * their (encrypted) history so those pages can be found by more than title and address.
   * Admin-granted per person; off until an admin turns it on.
   */
  historySearchEnabled?: boolean;
  /**
   * Curated email: whether this person has the Email app at all. Admin-granted per person, so a
   * child cannot switch their own inbox on — the reason every permission below lives here rather
   * than in a userPref the person it describes can write.
   */
  emailEnabled?: boolean;
  /** Speech mode: talk to the assistant and hear the reply. Admin-granted per person. */
  speechModeEnabled?: boolean;
  /** The wake word inside speech mode. Admin-granted per person. */
  wakeWordEnabled?: boolean;
  /**
   * "Keep history for", in days: how long this person's activity history is kept. Admin-written, so
   * a child can never shorten their own history. Absent means the plan's default (14); always read
   * through `effectiveHistoryRetentionDays`, which caps it at the plan's maximum (PLN-9).
   */
  historyRetentionDays?: number;
  /** Explore's Community scope — collections other families published. Admin-granted per person. */
  communityContentEnabled?: boolean;
  /** Kindredly Guard: app time and limits on a child's phone. Admin-granted per person. */
  companionDevicesEnabled?: boolean;
  /** Remote actions into a managed child browser session. Admin-granted per person. */
  remoteChildActionsEnabled?: boolean;
  /** Shopping carts: products saved from stores, in a collection with a cart view. Admin-granted per person. */
  shoppingCartEnabled?: boolean;
  /** Library-mode kids: allow browsing the published catalog and requesting adds. */
  explorePublishedEnabled?: boolean;
  accessControlSettings?: any;
  /**
   * Sent, never stored: the fields of `accessControlSettings` a save changes, `null` removing one.
   * A server that knows it applies it to its own copy instead of the whole object sent beside it.
   * See `restrictions/accessControlSettingsPatch.ts` (HAT-327, REG-7).
   */
  accessControlSettingsPatch?: Record<string, unknown>;
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
   * Blocked apps a guardian allowed from a request, each until `until` (HAT-178,
   * `restrictions/appGrants.ts`). Written by a guardian via /user/options/update and sent to the
   * child's devices with their settings.
   */
  appGrants?: { appId: string; until: number; grantedAt?: number; grantedBy?: string }[];
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
  tiktokPlayOnce?: boolean | null;
  instagramPlayOnce?: boolean | null;
  youtubeShortsPlayOnce?: boolean | null;
  googleAILimit?: 'noChat' | 'hideAll' | null;
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
  'features.categoryExplorer.enabled'?: boolean | null;
  'features.today.enabled'?: boolean | null;
  'features.topicInsights.enabled'?: boolean | null;
  'features.entityNotes.enabled'?: boolean | null;
  'features.entityNotesAI.enabled'?: boolean | null;
  'features.unifiedFeedHome.enabled'?: boolean | null;
  'features.learnedClassifier.mode'?: 'off' | 'shadow' | 'on' | null;
  /** The text model that reads pages: an id from the client's model list (HAT-784). Developer Mode. */
  'features.textModel'?: string | null;
  /** The picture filter's engine: 'tfjs' or 'onnx' (HAT-784). Developer Mode. */
  'features.pictureEngine'?: 'tfjs' | 'onnx' | null;
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
  /** Can receive a pushed command of any kind, including a debug toast. True for phones too. */
  supportsRemoteCommands: boolean;
  remoteCommandReady: boolean;
  /**
   * Can actually run a remote action. Only the browser extension has an executor; a phone
   * connects, receives the command and drops it. Absent from an older server's response, where
   * the client falls back to reading appType.
   */
  canExecuteRemoteActions?: boolean;
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
