/**
 * Common utility types used across the application
 */

export interface DynObj {
  [key: string]: any;
}

export type DateString = string | null;

export type Modify<T, R> = Omit<T, keyof R> & R;

export interface PluginInfo {
  [key: string]: any;
}

export type PluginListResponse = PluginInfo[];

export interface TopicCategory {
  name: string;
  id: string;
  available?: boolean;
}

export interface MiscNotificationStats {
  unreadFeedItems: number;
  notificationCount: number;
  notificationCountUnread: number;
  accessRequestCount: number;
}

export type SyncMode = 'online-only' | 'offline-first' | 'local-only';

export interface ServerSettings {
  apiURL: string;
  isCustomServer?: boolean;
  syncMode?: SyncMode;
}

export interface SearchLogEntry {
  text: string;
  results: any[];
  context?: DynObj;
  actionInfo?: DynObj;
  timestamp: number;
}

export interface TabDetails {
  url?: string;
  tabId: string | number;
  tabInfo?: any;
  context?: any;
}

export interface RemoteStoreOptions {
  method?: string;
  /** @deprecated Use authOptional instead. Auth is now required by default. */
  needAuth?: boolean;
  /** If true, allows request to proceed without auth token. Token still included if available. */
  authOptional?: boolean;
  forceEncrypt?: boolean;
  dontEncrypt?: boolean;
  includeSentDataInResult?: boolean;
  encryptionUserId?: string;
  additionalWrappingKeyIds?: string[];
  serverBaseURLOverride?: string;
}

export type StreamResult = void

// ==================== Version Types ====================

/** Response from /system/version endpoint */
export interface ServerVersionInfo {
  serverVersion: string;
  versionMessage: string | null;
  supportedVersions: string[];
}

/** Entry in kindredVersion.json for a specific app type */
export interface LatestVersionEntry {
  latestVersion: string;
  lastUpdated?: string;
}

/** Shape of kindredVersion.json fetched from server */
export interface LatestVersionInfo {
  webapp?: LatestVersionEntry;
  extension?: LatestVersionEntry;
  android?: LatestVersionEntry;
  ios?: LatestVersionEntry;
  thetaserver?: LatestVersionEntry;
  [key: string]: LatestVersionEntry | undefined;
}

/** Computed version summary stored in authStore.versionSummary */
export interface VersionSummary {
  success: boolean;
  clientSupportedByServer: boolean;
  currentClientVersion: string;
  currentServerVersion: string;
  lastUpdateTimestamp: number;
  // Only present when latestVersionInfo is available
  latestClientVersion?: string;
  newerClientVersionAvailable?: boolean;
  latestServerVersion?: string;
  newerServerVersionAvailable?: boolean;
}