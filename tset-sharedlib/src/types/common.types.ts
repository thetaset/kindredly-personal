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
  /**
   * Legacy channel. Compared against `config.clientVersion`, which is derived from the API path
   * and is therefore the constant '3.0.0' for EVERY build — so this can never distinguish one
   * client from another. It must keep containing '3.0.0': deployed clients compute
   * `clientSupportedByServer` from it, and any other value makes all of them believe they are
   * unsupported. Do not repurpose this field; use supportedAppVersions instead.
   */
  supportedVersions: string[];
  /**
   * Real per-build gating, compared against `config.appVersion` (e.g. '3.0.246'). Optional and
   * absent by default; an empty or missing value means "no constraint", which is what every
   * client sees today. Clients older than this field ignore it, so populating it only affects
   * builds that understand it.
   */
  supportedAppVersions?: string[];
  /**
   * Additive server capabilities. Absent on servers older than the field; a client treats a
   * missing key as "not supported" and keeps the pre-capability behaviour. Removing a key is
   * the functional rollback for the feature it advertises.
   */
  capabilities?: {
    /** Encrypted user-file reads may ask for a logical rendition: `previewId` in `variants`. */
    imageRenditions?: { version: number; variants: string[] };
  };
}

/** Entry in kindredVersion.json for a specific app type */
export interface LatestVersionEntry {
  /**
   * Legacy field, compared against the constant `config.clientVersion` ('3.0.0'). Setting it
   * above 3.0.0 makes every already-deployed client report an update as available, so leave it
   * at '3.0.0' and use latestAppVersion instead.
   */
  latestVersion: string;
  lastUpdated?: string;
  /** Real latest build (e.g. '3.0.246'), compared against `config.appVersion`. */
  latestAppVersion?: string;
}

/** Shape of kindredVersion.json fetched from server */
export interface LatestVersionInfo {
  webapp?: LatestVersionEntry;
  extension?: LatestVersionEntry;
  electron?: LatestVersionEntry;
  android?: LatestVersionEntry;
  ios?: LatestVersionEntry;
  thetaserver?: LatestVersionEntry;
  [key: string]: LatestVersionEntry | undefined;
}

/** Computed version summary stored in authStore.versionSummary */
export interface VersionSummary {
  success: boolean;
  clientSupportedByServer: boolean;
  /** Always '3.0.0' — derived from the API path, not the build. Kept for back-compat. */
  currentClientVersion: string;
  /** The real build number (e.g. '3.0.246'); this is the one worth showing a user. */
  currentAppVersion?: string;
  currentServerVersion: string;
  lastUpdateTimestamp: number;
  // Only present when latestVersionInfo is available
  latestClientVersion?: string;
  newerClientVersionAvailable?: boolean;
  latestServerVersion?: string;
  newerServerVersionAvailable?: boolean;
}