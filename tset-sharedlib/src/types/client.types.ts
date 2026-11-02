/**
 * Client-specific UI and platform types
 */

import type { ItemTypePrimary } from '../content.types';
import type { EncInfo } from './encryption.types';

export interface TabItemView {
  id: string;
  type: Extract<ItemTypePrimary, 'tab'>;
}

export type AppType = 'webapp' | 'android' | 'extension' | 'ios';

export type ContentOpenBehavior = 'inApp' | 'external';
export type ContentOpenBehaviorOverrides = Record<string, ContentOpenBehavior>;

export interface TempShareData {
  type: string;
  data: {
    mimeType?: string;
    dataType?: string;
    filename?: string;
    /** The name a new item made from this file starts with, when better than the filename: a right-clicked picture's page title. */
    itemName?: string;
    path?: string;
    data?: string;
    file?: File;
    size?: number;
    /** A large file shared on an iPhone, left where it is and read by byte range when added (IFX-20). */
    filePath?: string;
    /** A large file shared on Android, read over the native port by this handle when added (IFX-20). */
    nativeHandle?: string;
  };
  preppedData?: {
    fileType?: string;
    fileData?: string;
    imagePreview?: string;
    imageType?: string;
    /** A video's first frame at full size, as a data URL: the item's picture when one is made. */
    posterImage?: string;
  };
}

export interface ClientSettings {
  showCollections: boolean;
  background: string;
  customBackground: string | null;
  showLogo: boolean;
  newTabOverrideValue: string | null;
  quickBarIconsOnly: boolean;
  fullscreen: boolean;
  collapseSidebar: boolean;
  defaultViewType: string;
  contentOpenBehaviorOverrides: ContentOpenBehaviorOverrides | null;
  youtubeVideoOpenBehavior: 'inApp' | 'external' | null;
  youtubeHideSearch: boolean | null;
  youtubeHideComments: boolean | null;
  youtubeHideRecommendations: boolean | null;
  youtubeHideOtherDistractions: boolean | null;
  redditHideSearch: boolean | null;
  redditHideComments: boolean | null;
  redditHideOtherDistractions: boolean | null;
  /** One video, then stop (D13, SMB-20). Null: on for a child, off for anyone else. */
  tiktokPlayOnce: boolean | null;
  instagramPlayOnce: boolean | null;
  youtubeShortsPlayOnce: boolean | null;
  /**
   * Google Search AI (HAT-128). `noChat`: AI Overviews stay, AI Mode and follow-ups go.
   * `hideAll`: no AI Overviews, AI Mode or People also ask. `null`: Google as it comes.
   */
  googleAILimit: 'noChat' | 'hideAll' | null;
  showRedirectsInHistory: boolean;
  disableAllImageScanningOnDevice: boolean;
  developerMode: boolean;

  /**
   * Per-entry on/off for item-attached site CSS, keyed `<itemId>::<entryId>`.
   * A missing key means "unset" and falls back to the entry's category default,
   * so one map replaces what would otherwise be a settings key per cleanup.
   */
  siteStyleSettings: Record<string, boolean> | null;

  /**
   * Entries a guardian has pinned on, same key shape as `siteStyleSettings`.
   *
   * Guardian-only: see `GUARDIAN_ONLY_PREF_KEYS`. It is a separate key from the
   * preferences above precisely so the server can refuse a restricted user's write
   * here while still letting them set their own preferences.
   */
  siteStyleLocks: Record<string, boolean> | null;
}

/**
 * Pref keys only an account admin may write, even for their own user.
 *
 * `updateUserPrefs` otherwise authorizes with `verifySelfOrAdmin` and then writes any
 * key it is handed, so "self" includes a restricted user writing their own prefs. Any
 * setting meant to constrain a restricted user has to be listed here or it is advisory
 * only — the UI disabling a control is not enforcement.
 */
export const GUARDIAN_ONLY_PREF_KEYS = [
  'siteStyleLocks',
  /*
   * Retired home of the "Assistant reviews requests" guidelines, kept guarded
   * rather than merely unused.
   *
   * The server no longer reads this key — the guidelines moved to
   * `account.options.assistantReview`, out of the child's reach entirely. Listing
   * it here closes the window on dev accounts that still have the old pref
   * written, and stops it becoming a live policy input again by accident. Note
   * this list only blocks WRITES: a read block would break `siteStyleLocks`,
   * which the child's own SiteStyleService legitimately reads.
   */
  'filters.autoApprovalSettings',

  /*
   * Content filtering (HAT-327 REG-4, closes observation #88). The child's own browser
   * enforces these (`SentryProcessor`, `bg/advancedFilteringPrefs.ts`), so a child who
   * could write them could set their own strictness to "relaxed" or empty their blocked
   * sites. Only the Filtering page, settings copy and Kinbot's admin tools write them, and
   * a parent unlocking a child's device is an admin by then (the temporary override).
   */
  'filters.strictnessPresetId',
  'filters.contentFilters',
  'filters.blockedUrlPatterns',
  'filters.serverDeepLookupEnabled',
  'filters.adLoadAnalysis.enabled',
  /** Per-family classification fixes, set by an admin. */
  'classification.overrides',

  /*
   * Distraction filters: what YouTube, Reddit and Google hide. Written only by their panels,
   * which are admin-only; a child unhiding YouTube comments was one request away.
   */
  'youtubeHideSearch',
  'youtubeHideComments',
  'youtubeHideRecommendations',
  'youtubeHideOtherDistractions',
  'redditHideSearch',
  'redditHideComments',
  'redditHideOtherDistractions',
  'tiktokPlayOnce',
  'instagramPlayOnce',
  'youtubeShortsPlayOnce',
  'googleAILimit',

  /*
   * A child's email allowlist lives in `options.emailAllowedSenders` (admin-only). This is
   * the adult's own list and the child's old one; a child writing it changes nothing today,
   * and guarding it keeps it that way if a reader ever looks here again.
   */
  'integrations.email.allowedSenders',

  /** Whether Kinbot may read this person's encrypted data. A parent's call for a child. */
  'features.aiPrivateData.enabled',

  /** Digital citizenship lessons a parent says they talked over with the child (HAT-534, DCL-10). */
  'lessonPacks.talkedAbout',
] as const;

/**
 * Key families only an admin may write, matched by prefix: a new member is guarded the day it
 * is added. Same rule as the list above.
 */
export const GUARDIAN_ONLY_PREF_PREFIXES = [
  /** What Kinbot may do for this person, by capability group. Set on a child's AI page. */
  'features.aiCapability.',
  /** Whether Kinbot may change parental controls without asking. A guardian's grant. */
  'features.aiParentalGrant.',
] as const;

export type GuardianOnlyPrefKey = (typeof GUARDIAN_ONLY_PREF_KEYS)[number];

export function isGuardianOnlyPrefKey(key: string): boolean {
  return (
    (GUARDIAN_ONLY_PREF_KEYS as readonly string[]).includes(key) ||
    GUARDIAN_ONLY_PREF_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

export interface StorageCleanupSettings {
  enabled?: boolean;
  cadenceMs?: number;
  startupDelayMs?: number;
  batchSize?: number;
  pipelineRetentionMs?: number;
  embeddingsRetentionMs?: number;
  activityEmbeddingsRetentionMs?: number;
  itemEmbeddingsRetentionMs?: number;
  metaLookupRetentionMs?: number;
  emailCacheRetentionMs?: number;
  finishedJobsRetentionMs?: number;
}

export interface SharedClientSettings {
  dismissedWhatsNew?: boolean;
  installDate?: string;
  installVersion?: string;
  offlineFallbackEnabled?: boolean;
  storageCleanup?: StorageCleanupSettings;
}

// Deprecated types - kept for backward compatibility

/**
 * @deprecated Use ItemAttachment from item.types.ts instead
 */
export interface ItemAttachmentForClient {
  id?: string;
  type: 'file' | 'snapshot';
  filename?: string;
  fileType?: string;
  previews?: { id?: string; data?: any; type?: string }[];
  data?: any;
  meta?: any;
  fileId?: string;
  createDate?: number;
}

/**
 * @deprecated Use FileUploadPrepData from file.types.ts instead
 */
export interface AttachmentInfo {
  type: 'file' | 'snapshot';
  filename: string;
  fileType: string;
  urlPrefix?: string;
  meta?: any;
  fileData?: any;
  objData?: Record<string, any>;
  filesize?: number;
  imagePreview?: any;
  imageType?: string;
}

/**
 * @deprecated Use UserFile schema instead
 */
export interface UserFileForClient {
  _id: string;
  accountId: string | null;
  userId: string | null;
  refId: string | null;
  refType: string | null;
  filename: string | null;
  fileType: string | null;
  fileSize: number | null;
  lastViewedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  encrypted: boolean;
  encInfo: null | EncInfo;
}
