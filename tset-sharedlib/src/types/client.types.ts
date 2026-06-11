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
}

export interface StorageCleanupSettings {
  enabled?: boolean;
  cadenceMs?: number;
  startupDelayMs?: number;
  batchSize?: number;
  pipelineRetentionMs?: number;
  embeddingsRetentionMs?: number;
  metaLookupRetentionMs?: number;
  emailCacheRetentionMs?: number;
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
