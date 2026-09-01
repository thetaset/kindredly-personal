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
    path?: string;
    data?: string;
    file?: File;
    size?: number;
  };
  preppedData?: {
    fileType?: string;
    fileData?: string;
    imagePreview?: string;
    imageType?: string;
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
export const GUARDIAN_ONLY_PREF_KEYS = ['siteStyleLocks'] as const;

export type GuardianOnlyPrefKey = (typeof GUARDIAN_ONLY_PREF_KEYS)[number];

export function isGuardianOnlyPrefKey(key: string): key is GuardianOnlyPrefKey {
  return (GUARDIAN_ONLY_PREF_KEYS as readonly string[]).includes(key);
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
  /**
   * Offer the experimental encryption-password choice during Google/Apple signup.
   *
   * Device-level and pre-auth on purpose: the choice has to be made before an account
   * exists, so it cannot live on a user pref or an account feature flag. Same shape as
   * Custom Server Settings, which is reachable from the sign-in screen for the same reason.
   */
  encryptionPasswordAtSignup?: boolean;
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
