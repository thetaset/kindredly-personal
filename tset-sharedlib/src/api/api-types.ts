import { UsageStatus, UsageSummaryData, TakeBreakAdvisory } from '../types';
import type {
  AccountType,
  ActivityContentInfo,
  ClientInfoView,
  DateString,
  EncInfo,
  FilePreview,
  Item,
  ItemFeedbackView,
  ItemInfoView,
  ItemMatchTypes,
  ItemMeta,
  ItemPermissionDetails,
  ItemRelTypes,
  ItemReaction,
  KeyEntry,
  PathTreeNode,
  PermissionType,
  PermissionWithUser,
  PluginInfo,
  Published,
  ReasonCode,
  StoredFamilyPolicyRule,
  ManagedRemoteActionCommandView,
  User,
  UserType,
  UserView
} from '../shared.types';
import type { ContentType, EduValue, MinAgeGroup, TopicTag } from '../content.types';
import type { SearchProviderId, SearchProviderPageState } from '../search-provider.utils';
import type { PostImportProcessingState, ResourceFetchInfoResponse } from '../types/item.types';
import { SystemOptions } from '../schemas/public/Account';
import type FamilyPolicyRuleRecord from '../schemas/public/FamilyPolicyRule';
import type UserActivityLog from '../schemas/public/UserActivityLog';
import type { TaskOccurrenceView } from '../types/task.types';
import type { StandaloneAppBootstrapResult, StandaloneAppCatalogEntry } from '../types/standalone-app.types';

export interface UserAuthInfo {
  user: User;
  userId: string;
  sessionId: string;
  accountId: string;
}

export interface RegisterResponse {
  user: User;
  tokenData: { token: string; expiresIn: number };
  passwordForClient?: string;
  recoveryKeyForClient?: string;
  message?: string;
}

export interface AuthResponse {
  user: UserView;
  tokenData: TokenData;
  passwordForClient?: string;
  recoveryKeyForClient?: string;
  message?: string;
  success: boolean;
  statusCode?: number;
}

// Passkey/WebAuthn types
export interface PasskeyCredential {
  credentialId: string; // Base64URL encoded
  publicKey: string; // Base64URL encoded COSE public key
  userId: string;
  createdAt: string;
  transports?: string[];
  prfSupported: boolean;
  deviceName?: string;
}

export interface PasskeyChallengeRequest {
  userId?: string;
  usernameOrEmail?: string;
  type: 'register' | 'authenticate';
  operation?: 'default' | 'remove-recovery-key';
}

export interface PasskeyChallengeResponse {
  challenge: string; // Base64URL encoded
  rpId: string;
  rpName: string;
  existingCredentialIds?: string[];
  credentialIds?: string[];
  timeout: number;
}

export interface PasskeyRegisterRequest {
  credential: {
    credentialId: string;
    publicKey: string;
    transports?: string[];
    prfSupported: boolean;
  };
  attestationObject: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
  deviceName?: string;
}

export interface PasskeyRegisterResponse {
  success: boolean;
  credential?: PasskeyCredential;
}

export interface PasskeyAuthenticateRequest {
  credentialId: string;
  signature: string; // Base64URL encoded
  authenticatorData: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
}

export interface PasskeyAuthenticateResponse {
  success: boolean;
  userId?: string;
  verified: boolean;
}

export interface PasskeyListResponse {
  credentials: PasskeyCredential[];
}

export interface PasskeyDeleteRequest {
  credentialId: string;
}

export type RemoveRecoveryKeyFromServerRequest =
  | {
      method: 'password';
      password: string;
      userId?: string;
    }
  | {
      method: 'passkey';
      passkey: PasskeyAuthenticateRequest;
      userId?: string;
    };

export interface CreateCollectionOptions {
  collectionIds?: string[];
  permList?: Array<{ userId: string; permission: PermissionType }>;
  customPermissions?: boolean;
  skipNotifications?: boolean;
}

// Media catalog (default banner library)
export interface BannerAsset {
  id: string;
  title: string;
  filename: string;
  thumbFilename?: string;
  categories: string[];
  tags: string[];
}

export interface BannerCatalogSearchRequest {
  q?: string;
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface BannerCatalogSearchResponse {
  items: BannerAsset[];
  total: number;
  page: number;
  pageSize: number;
  categories?: Array<{ key: string; label: string; count: number }>;
}

export interface BannerRecommendRequest {
  context: {
    kind: 'collection' | 'item';
    name: string;
    tags?: string[];
  };
}

export interface BannerRecommendResponse {
  items: BannerAsset[];
}

export interface SaveItemRequest {
  itemId?: string;
  details: Partial<Item>;
  isNew?: boolean;
  collectionIds?: string[];
  bannerQuery?: string;
  removeMissingCollections?: boolean;
  quickShareUserIds?: string[];
  accessRequestId?: string;
  feedbackUpdate?: { attr: string; value: any };
  options?: CreateCollectionOptions;
  targetUserId?: string;
  tempAuthToken?: TokenData;
}

export interface SavePostAttachmentToLibraryRequest {
  postId: string;
  bundleId: string;
  saveRequest: SaveItemRequest;
  bundleSource?: SaveItemRequest['details'];
}

export interface SavePostAttachmentToLibraryResponse {
  action: 'saved' | 'request-required';
  itemId?: string | null;
  requestPrefill?: {
    key: string;
    type: 'url' | 'item';
    details?: AccessRequestDetails;
    allowSwitchType?: boolean;
  } | null;
}

export interface UpdateItemRequest {
  itemId: string;
  data: Partial<Item>;
  encInfo?: EncInfo;
  allowDecrypt?: boolean;
  skipEncUpdate?: boolean;
  tempAuthToken?: TokenData;
}

export interface RemoveItemFromUserLibraryRequest {
  itemIds: string[];
}

export interface AddItemToUserLibraryRequest {
  itemIds: string[];
}

export interface StandaloneAppBootstrapRequest {
  slug: string;
  redirectPath?: string | null;
}

export type StandaloneAppBootstrapResponse = StandaloneAppBootstrapResult;

export interface StandaloneAppListRequest {
}

export interface StandaloneAppListResponse {
  apps: StandaloneAppCatalogEntry[];
}

export type ItemImageApproval = {
  approved: boolean;
  updatedAt?: number;
  updatedByUserId?: string | null;
}

export interface ItemImageApprovalGetRequest {
  itemId: string;
}

export interface ItemImageApprovalGetResponse {
  itemId: string;
  approval: ItemImageApproval | null;
}

export interface ItemImageApprovalSetRequest {
  itemId: string;
  approved: boolean;
}

export interface ItemImageApprovalSetResponse {
  itemId: string;
  approval: ItemImageApproval | null;
}

export interface ItemImageApprovalListByIdsRequest {
  itemIds: string[];
}

export interface ItemImageApprovalListByIdsResponse {
  approvedItemIds: string[];
  approvals: Array<{
    itemId: string;
    approval: ItemImageApproval;
  }>;
}



export interface GetItemRelationshipInfoRequest {
  itemId: string;
  collectionId: string;
  userId?: string;
}

export interface ItemRelationshipInfo {
  parents: ItemInfoView[];
  children: ItemInfoView[];
}

export interface GetItemsWithInfoRequest {
  userId?: string;
  ids?: string[];
}

export interface ListItemsWithFeedbackRequest {
  userId?: string;
  feedbackType?: string;
  limit?: number;
}

export interface SaveCollectionItemDetailsRequest {
  collectionId: string;
  itemId: string;
  details?: {
    name?: string;
    description?: string;
    comment?: string;
  };
  order?: number;
  dontEncrypt?: boolean;
  publishedAvailableAt?: string | Date;
  encInfo?: EncInfo | {decrypt: true};
}

export interface CollectionListByUserRequest {
  userId?: string;
  includePath?: boolean;
  includeParents?: boolean;
  permissionsIncluded?: string[];
  sharedOnly?: boolean;
  includeUserPermissions?: boolean;
}

export interface CollectionListByIdsRequest {
  ids: string[];
  userId?: string;
  allowListAll?: boolean;
  includePath?: boolean;
  includeUserPermissions?: boolean;
  tempAuthToken?: TokenData;
}



export interface SuggestCollectionsResponse {
  suggestions: Array<{
    collectionId?: string;
    title: string;
    reason?: string;
    confidence?: number;
  }>;
}

export interface MetadataResponse {
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  siteName?: string;
  type?: string;
  [key: string]: unknown;
}

export interface UrlContentSuggestionRequest {
  url: string;
  metadata?: {
    title?: string;
    description?: string;
    extractedText?: string;
    channelId?: string;
  };
  options?: {
    fetchMetadata?: boolean;
    runLocalClassification?: boolean;
    runRemoteClassification?: boolean;
    includeLibraryLookup?: boolean;
  };
}

export type UrlSuggestionSource = 'library' | 'local-classifier' | 'remote-classifier' | 'none';

export interface UrlSuggestedCriteria {
  eduValue?: EduValue;
  minAgeGroup?: MinAgeGroup;
  contentTypes?: ContentType[];
  topics?: TopicTag[];
}

export interface UrlContentSuggestionLibraryMatch {
  itemId: string;
  name?: string | null;
  url?: string | null;
  rel: ItemRelTypes;
  matchType: ItemMatchTypes;
  suggestedCriteria: UrlSuggestedCriteria;
}

export interface UrlContentSuggestionResponse {
  suggestedCriteria: UrlSuggestedCriteria;
  meta?: ItemMeta | null;
  libraryMatch?: UrlContentSuggestionLibraryMatch | null;
  provenance: {
    source: UrlSuggestionSource;
    confidence?: number | null;
    metadataFieldsUsed?: string[];
  };
  skippedReasons?: string[];
}

export interface SourcePriorityClassificationResponse {
  classification: string;
  confidence?: number;
  details?: {
    eduValue?: { value: string; confidence: number } | null;
    categories?: Array<{ value: string; confidence: number }>;
    contentTypes?: Array<{ value: string; confidence: number }>;
    flags?: Array<{ value: string; confidence: number }>;
    topics?: Array<{ value: string; confidence: number }>;
    shortReason?: string;
    provenance?: {
      sourceUsed: string;
      sourcesChecked: string[];
      fallbackReason?: string | null;
      cacheAgeMs?: number | null;
      policyVersion?: string | null;
    };
  };
}

export interface ContentLookupRequest {
  url: string;
  features?: {
    title?: string;
    description?: string;
    extractedText?: string;
    channelId?: string;
  };
  options?: {
    includeMetadata?: boolean;
    includeResourceInfo?: boolean;
    includeClassification?: boolean;
    forceRefresh?: boolean;
  };
}

export interface ContentLookupResponse {
  canonicalUrl: string;
  meta?: ItemMeta | null;
  resourceInfo?: ResourceFetchInfoResponse | null;
  classification?: SourcePriorityClassificationResponse | null;
  lookupMeta: {
    resourceType?: string | null;
    metadataSourceId?: string | null;
    requestedMetadata: boolean;
    usedMetadata: boolean;
    metadataStatus: 'not-requested' | 'available' | 'unavailable';
    requestedResourceInfo: boolean;
    usedResourceInfo: boolean;
    resourceInfoStatus: 'not-requested' | 'available' | 'unavailable';
    requestedClassification: boolean;
    usedClassification: boolean;
    classificationStatus: 'not-requested' | 'available' | 'unavailable';
    libraryMatchLocation: 'client-only';
    libraryMatchReason: 'client-side-encryption';
  };
}

export interface SearchItemsResponse {
  items: ItemInfoView[];
  total?: number;
  hasMore?: boolean;
}

export interface SearchMainRequest {
  searchType: string;
  searchLookupValue: string;
  filters?: any;
}


export interface EncryptionStatusResponse {
  enabled: boolean;
  hasUserSecret: boolean;
  hasAccountSecret: boolean;
  keyCount?: number;
  lastRotated?: string;
}

export interface ListKeysWithStatusResponse {
  keys: KeyEntry[];
  statuses: Record<string, string>;
  primary?: string;
}

export interface CreateAccountBackupKeyRequest {
  password: string;
  userId?: string;
}

export type ListKeysResponse = KeyEntry[];

export interface ActivityMonitorEvidence {
  hasRecentTrustedInteraction?: boolean;
  hasEstablishedActivitySession?: boolean;
  pageVisible?: boolean;
  pageFocused?: boolean;
  playbackDetected?: boolean;
  playbackSessionActive?: boolean;
}

export interface UpdateActivityLogRequest {
  url?: string;
  userId?: string;
  targetUserId?: string;
  type?: string;
  title?: string;
  trigger?: string;
  activityEvidence?: ActivityMonitorEvidence;
  data?: any;
}

export interface GetUsageSummaryRequest {
  url: string;
  userId?: string;
  exact_match?: boolean;
  localOnlyCurrentUser?: boolean;
}

export interface UsageSummaryResponse {
    usageSummary: UsageSummaryData;
    selectedUsage: UsageStatus | null;
}

export type UsageInsightsPreset = '7d' | '30d';

export type UsageInsightsSyncStatus = 'fresh' | 'stale' | 'not-applicable';

export type UsageInsightsEntityType = 'platform' | 'creator' | 'resource' | 'domain' | 'site' | 'activity';

export type UsageInsightsResolverSource =
  | 'log-item'
  | 'log-channel'
  | 'platform-map'
  | 'domain'
  | 'url';

export interface GetUsageInsightsReportRequest {
  userId?: string;
  preset?: UsageInsightsPreset;
  syncCurrentUser?: boolean;
  viewerRestricted?: boolean;
}

export interface UsageInsightsMetricSummary {
  totalActiveMs: number;
  sessionCount: number;
  entryCount: number;
  activeDayCount: number;
}

export interface UsageInsightsTreeNode extends UsageInsightsMetricSummary {
  id: string;
  parentId: string | null;
  label: string;
  shortLabel?: string | null;
  entityType: UsageInsightsEntityType;
  resolverSource: UsageInsightsResolverSource;
  childCount: number;
  sampleUrl?: string | null;
  visitUrl?: string | null;
  redacted?: boolean;
}

export interface UsageInsightsLeaderboardEntry extends UsageInsightsMetricSummary {
  nodeId: string;
  label: string;
  shortLabel?: string | null;
  entityType: UsageInsightsEntityType;
  resolverSource: UsageInsightsResolverSource;
  visitUrl?: string | null;
}

export interface GetUsageInsightsReportResponse {
  preset: UsageInsightsPreset;
  generatedAt: number;
  window: {
    startTime: number;
    endTime: number;
  };
  syncStatus: UsageInsightsSyncStatus;
  lastSyncedAt: number | null;
  partialData: boolean;
  redactionApplied: boolean;
  hiddenNodeCount: number;
  totals: UsageInsightsMetricSummary;
  rootNodeIds: string[];
  tree: UsageInsightsTreeNode[];
  topPlatformsByTime: UsageInsightsLeaderboardEntry[];
  topResourcesByTime: UsageInsightsLeaderboardEntry[];
  topPlatformsBySessions: UsageInsightsLeaderboardEntry[];
  topResourcesBySessions: UsageInsightsLeaderboardEntry[];
  topChannelsByTime: UsageInsightsLeaderboardEntry[];
  topChannelsBySessions: UsageInsightsLeaderboardEntry[];
}

export interface GetUrlRuleExplanationRequest {
  url: string;
  userId?: string;
  exact_match?: boolean;
}

export type UrlRuleExplanationCategorySource =
  | 'custom-rule'
  | 'library-item'
  | 'search-provider'
  | 'recent-classification'
  | 'built-in-rule'
  | 'none';

export type UrlRuleExplanationAccessSource =
  | 'custom-rule'
  | 'usage-limit'
  | 'short-form-video'
  | 'none';

export interface UrlRuleExplanationSearchProviderInfo {
  id: SearchProviderId;
  displayName: string;
  pageState: SearchProviderPageState;
  query: string | null;
}

export interface GetUrlRuleExplanationResponse {
  url: string;
  contentInfo: ActivityContentInfo | null;
  selectedUsage: UsageStatus | null;
  matchingUsageRules: UsageStatus[];
  matchedFamilyPolicyRule: StoredFamilyPolicyRule | null;
  matchingFamilyPolicyRules: StoredFamilyPolicyRule[];
  effectiveEduValue: EduValue | null;
  effectiveEduSource: 'family-policy' | 'content-info' | 'none';
  categorySource: UrlRuleExplanationCategorySource;
  categorySourceNote: string | null;
  accessSource: UrlRuleExplanationAccessSource;
  accessSourceNote: string | null;
  searchProvider: UrlRuleExplanationSearchProviderInfo | null;
}

export type AccessEvaluationState = 'allowed' | 'blocked' | 'unknown';

export type LibraryAutoApprovalDecision = 'approved' | 'denied' | 'review';

export type LibraryAutoApprovalCriteria = {
  enabled: boolean;
  requireTrustedDomain: boolean;
  trustedDomains: string[];
  requireEducational: boolean;
  allowedAgeBands: Array<'child' | 'teen' | 'adult'>;
  customPolicyPrompt?: string;
};

export interface LibraryAutoApprovalSettings {
  enabled: boolean;
  experimental: boolean;
  criteria: LibraryAutoApprovalCriteria;
}

export interface LibraryAutoApprovalEvaluateRequest {
  userId?: string;
  url: string;
  meta?: any;
}

export interface LibraryAutoApprovalEvaluateResponse {
  enabled: boolean;
  settingsApplied: boolean;
  decision: LibraryAutoApprovalDecision;
  reason: string;
  confidence?: number;
  addedToLibrary?: boolean;
  accessRequestId?: string | null;
}

export interface AccessEvaluateRequest {
  url: string;
  userId?: string;
  exact_match?: boolean;
  meta?: any;
  denyAction?: 'redirectBlockedPage';
}

export interface AccessEvaluateResponse {
  allowedNow: boolean;
  state: AccessEvaluationState;
  reasonCode?: ReasonCode | null;
  libraryPermitted: boolean | null;
  usageAllowed: boolean | null;
  selectedUsage?: UsageStatus | null;
  noUsageLimits?: boolean;
  takeBreakAdvisory?: TakeBreakAdvisory | null;
  autoApprovalDecision?: LibraryAutoApprovalDecision | null;
  autoApprovalReason?: string | null;
}

export interface LogVisitRequest {
  url?: string;
  matchingItemIds?: string[];
  context?: any;
  tabDetails?: any;

}

export interface ListRecentVisitHistoryRequest {
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface RemoveLogEntryRequest {
  entryId?: string;
  userId: string;
  url: string;
  startTime?: number;
  clientId?: string;
}

export interface InvalidateActivityMonitorsRequest {
  userId?: string;
}

export interface InvalidateActivityMonitorsResponse {
  invalidateBeforeCreatedAtMs: number;
}

export interface UserActivityLogListResponse {
  userActivityLog: UserActivityLog[];
  invalidateBeforeCreatedAtMs: number;
}

export interface SaveUserActivityLogResponse {
  saved?: boolean;
  flushRequired?: boolean;
  invalidateBeforeCreatedAtMs?: number;
}

export type UsageSessionGroupBy = 'tab' | 'domain' | 'tab+domain';
export type UsageLogCollapseMode = 'raw' | 'redirect-burst';
export type UsageSummaryPhase = 'browsing' | 'video' | 'search';

export interface GetGroupedEntriesSinceRequest {
  createdAt: number;
  userId?: string;
  inactivityGapMs?: number;
  includeEntries?: boolean;
}

export interface GroupedEntryView {
  id: string;
  startTime: number;
  endTime: number;
  clientId: string;
  tabId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  originGroup: string | null;
  entryCount: number;
  blockedCount: number;
  hasEduValue: boolean;
  activeDurationMs: number;
  spanDurationMs: number;
  activityPhases?: UsageSummaryPhase[];
  entries?: any[];
}

export interface GetGroupedEntriesSinceResponse {
  entries: GroupedEntryView[];
}

export interface GetUsageSessionsSinceRequest {
  createdAt: number;
  userId?: string;
  groupBy?: UsageSessionGroupBy;
  sessionGapMs?: number;
  includeEntries?: boolean;
  collapseMode?: UsageLogCollapseMode;
}

export interface UsageSessionView {
  id: string;
  startTime: number;
  endTime: number;
  tabId: string;
  originGroups: string[];
  entryCount: number;
  blockedCount: number;
  hasEduValue: boolean;
  totalDurationMs: number;
  activityPhases?: UsageSummaryPhase[];
  entries?: any[];
}

export interface GetUsageSessionsSinceResponse {
  sessions: UsageSessionView[];
}

export interface SessionSummarySnapshotView {
  key: string;
  startedAt: number;
  lastSeenAt: number;
  totalActiveMs: number;
  intentDurationsMs: Record<string, number>;
  behaviorCounts: Record<string, number>;
}

export interface GetSessionSummarySnapshotRequest {
  sourceKey?: string;
  url?: string;
}

export interface GetSessionSummarySnapshotResponse {
  sourceKey: string | null;
  summary: SessionSummarySnapshotView | null;
}

export interface ReportClassificationIssueRequest {
  targetUserId?: string;
  source: {
    kind: 'activity-log';
    logRefId?: string | null;
    url?: string | null;
    startTime?: number;
    endTime?: number;
    clientId?: string | null;
  };
  classification: {
    restricted?: boolean | null;
    reasonCode?: string | null;
    eduValue?: string | null;
    flags?: string[];
    contentTypes?: string[];
    categories?: string[];
    topics?: string[];
  };
  feedback: {
    issueType:
      | 'wrong_edu_value'
      | 'wrong_blocking'
      | 'missing_flag'
      | 'false_positive'
      | 'other';
    comment?: string;
    expectedEduValue?: string | null;
    expectedRestricted?: boolean | null;
  };
  context?: {
    pipelineSummary?: {
      hasPipelineResult: boolean;
      contentInfoKeys?: string[];
      hasDebugInfo?: boolean;
      extractedTextLength?: number;
    };
  };
}

export interface ReportClassificationIssueResponse {
  reportId: number;
  deduped: boolean;
  reportCount: number;
}

export interface UploadClassificationDatasetSamplesRequest {
  targetUserId?: string;
  datasetName?: string;
  samples: Array<{
    source: {
      pipelineResultId?: string | null;
      url?: string | null;
      normalizedUrl?: string | null;
      timestamp?: number;
      tabId?: string | null;
    };
    classification: {
      restricted?: boolean | null;
      reasonCode?: string | null;
      eduValue?: string | null;
      flags?: string[];
      contentTypes?: string[];
      categories?: string[];
      topics?: string[];
    };
    pageData?: {
      pageTitle?: string | null;
      description?: string | null;
      extractedText?: string | null;
      imageAltText?: string | null;
      canonicalUrl?: string | null;
    };
    modelContext?: {
      classifierType?: string | null;
      modelName?: string | null;
      modelVersion?: string | null;
      runLabel?: string | null;
      modelConfigJson?: string | null;
      modelConfigHash?: string | null;
    };
    summary?: {
      hasPipelineResult?: boolean;
      hasDebugInfo?: boolean;
      extractedTextLength?: number;
      titleLength?: number;
      descriptionLength?: number;
    };
  }>;
}

export interface UploadClassificationDatasetSamplesResponse {
  datasetId: string;
  received: number;
  inserted: number;
  deduped: number;
}

export interface GetClassificationEvalProgramStatusRequest {
  targetUserId?: string;
}

export interface GetClassificationEvalProgramStatusResponse {
  enabled: boolean;
  reason: 'enabled' | 'developer_mode_required' | 'not_allowlisted';
}

export interface RemoveActivityLogEntryRequest {
  entryId: string;
  userId?: string;
}

export interface SaveMetaTempRequest {
  url: string;
  meta: any;
  userId?: string;
}

export interface ImageClassifyResponse {
  results: Array<{
    id?: string;
    classification: string;
    confidence: number;
    details?: any;
  }>;
}

export interface PipelineResultsResponse {
  results: Array<{
    url: string;
    classification: any;
    timestamp: string;
  }>;
}

export interface TempDisableBlockingStatusResponse {
  disabled: boolean;
  expiresAt?: string;
  minutesRemaining?: number;
}

export interface AISendMessageRequest {
  sessionId?: string;
  message?: string;
  messages?: Array<{role: string; content: string}>;
  userId?: string;
  context?: Record<string, any>;
  mode?: string;
  /** Optional model override (DEV/debug). */
  model?: string;
}

export interface AISendMessageResponse {
  response: string;
  sessionId: string;
  messageId: string;
}

export interface AIItemSuggestRequest {
  itemId?: string;
  url?: string;
  context?: string;
  userId?: string;
  instructions?: string;
  numItems?: string;
  collectionDetails?: any;
  previousItems?: any[];
}

export interface AIItemSuggestResponse {
  items: Array<{
    title: string;
    description?: string;
    url?: string;
    reason?: string;
  }>;
}

export interface AIItemUpdateRequest {
  itemId?: string;
  updates?: Record<string, any>;
  userId?: string;
  actionId?: string;
  itemDetails?: any;
  instructions?: string;
}

export interface AIItemUpdateResponse {
  updates: Record<string, any>;
  applied: boolean;
  reason?: string;
}

export interface AITextRequest {
  prompt?: string;
  instructions?: string;
  userId?: string;
  context?: any;
  schema?: any;
}

export interface AITextResponse {
  text: string;
  usage?: any;
}

export interface AIUserRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  context?: any;
}

export interface AIUserResponse {
  response: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// AI Usage Metering
// ---------------------------------------------------------------------------

export interface AIUsageGetSummaryRequest {
  /** ISO date string used to select the month (defaults to now). */
  forDate?: string;
}

export interface AIUsageGetSummaryResponse {
  period: 'month';
  periodStart: string;
  periodEnd: string;
  promptTokensUsed: number;
  completionTokensUsed: number;
  tokensUsed: number;
  /** Null means no limit configured yet. */
  limitTokens: number | null;
}

export interface AISessionResponse {
  sessionId: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  createdAt: string;
}

export interface UserTaskRequest 
{ taskname: string; data: any; system?: string; prompt?: string, maxTokens?: number; model?: string }

/** Request type for streaming AI tasks */
export interface UserTaskStreamRequest {
  taskname: 'agentInteraction';
  data: { messages: Array<{ role: string; content: string }> };
}

/** Request type for streaming chat messages */
export interface AISendMessageStreamRequest {
  sessionId?: string;
  messageId?: string;
  messages: Array<{ role: string; content: string }>;
  /** Optional model override (DEV/debug). */
  model?: string;
  /** Optional mode hint (e.g., 'app-editor') for server-side response formatting. */
  mode?: string;
}

/** SSE events from streaming chat endpoint */
export interface ChatStreamStartEvent {
  sessionId: string;
  messageId: string;
  timestamp: string;
}

export interface ChatStreamChunkEvent {
  sessionId: string;
  messageId: string;
  content: string;      // The new chunk content
  accumulated: string;  // Full accumulated content so far
}

export interface ChatStreamCompleteEvent {
  sessionId: string;
  messageId: string;
  content: string;
  finishReason: string | null;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  duration: number;
}

export interface ChatStreamErrorEvent {
  sessionId: string;
  messageId: string;
  message: string;
  timestamp: string;
}

/** SSE chunk events from streaming AI endpoint */
export interface StreamChunkEvent {
  content: string;
  accumulated: number;
}

export interface StreamCompleteEvent {
  content: string;
  finishReason: string | null;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  duration: number;
}


export interface GenerateImageRequest {
  prompt: string;
  options?: any;
  userId?: string;
}

export interface GenerateImageResponse {
  imageUrl: string;
  imageData?: string;
  taskId: string;
}

export const MAX_POST_ATTACHMENTS = 20;

export type CreatePostResponse = string | {
  postId: string;
  encInfo?: any;
};

export interface CreatePostRequest {
  postType?: string;

  data: any;
  attachedItems?: Array<{
    itemId?: string;
    bundleId?: string;
    type: string;
    data: any;
  }>;
  sharedWith?: string[];
  visibility?: 'public' | 'private' | 'friends';
  userId?: string;
  encInfo?: EncInfo;
}
//{ postType: string; data: any; attachedItems?: any[]; sharedWith?: string[]; encInfo?: any }

export interface PostReadReceiptMarkRequest {
  postId: string;
  isRead?: boolean;
}

export interface PostReadReceiptMarkResponse {
  postId: string;
  readAt: string | null;
}

export interface PostReadReceiptListRequest {
  postId: string;
}

export interface PostReadReceiptListResponse {
  readers: Array<{
    userId: string;
    displayedName?: string;
    username: string;
    profileImage?: Record<string, any>;
    readAt: string;
  }>;
  count: number;
}

export interface CreateCommentRequest {
  refType: 'post' | 'item';
  refId: string;
  parentId?: string;
  data: any;
  comment?: string;
  userId?: string;
  encInfo?: EncInfo;
}

export interface FeedListCursor {
  createdAt: string;
  feedId: string;
}

export interface ListFeedItemsRequest {
  userId?: string;
  pageInfo?: {
    currentPage?: number;
    perPage?: number;
    includeTotalRows?: boolean;
  };
  includeComments?: boolean;
  newOnly?: boolean;
}

export interface SearchFeedPostsRequest {
  userId?: string;
  limit?: number;
  includeComments?: boolean;
  createdAfter?: string;
  cursor?: FeedListCursor;
}

export interface SharedFeedbackFeedListRequest {
  sinceDays?: number;
  onlyAfterLastSeen?: boolean;
  limit?: number;
}

export interface SharedFeedbackFeedEvent {
  eventId: string;
  actor: {
    userId: string;
    displayedName?: string;
    username: string;
    profileImage?: Record<string, any>;
  };
  item: {
    id: string;
    type: string;
    url?: string;
    name?: string;
  };
  feedback: {
    type: 'reaction';
    reaction: string;
    at: string;
  };
}

export interface SharedFeedbackFeedListResponse {
  events: SharedFeedbackFeedEvent[];
  prefs?: {
    lastSeenAt?: string;
    lastDismissedAt?: string;
  };
}

export interface SharedFeedbackFeedMarkSeenRequest {
  seenAt: string;
  dismissedAt?: string;
}

export interface SharedFeedbackFeedMarkSeenResponse {
  success: true;
}

export interface PublishedWithItems {
  published: Published;
  items: ItemInfoView[];
}

export interface PublishedFeedItem {
  published: Published;
  item: ItemInfoView;
}

export interface GetPublishedViewRequest {
  pubId?: string;
  itemId?: string;
}

export interface SubscribeToPublishedRequest {
  collectionId: string;
  userIds?: string[];
  forceClientImport?: boolean;
}

export interface ImportFromPublishedRequest {
  itemId: string;
  collectionIds?: string[];
  userIds?: string[];
  targetUserId?: string;
  forceClientImport?: boolean;
}

export interface RecommendContentBundlesRequest {
  age?: number | null;
  limitPerBundle?: number;
}

export interface ContentBundleLinkItem {
  linkId: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  categories?: string[];
}

export type ContentBundleSectionSelectionMode = 'multiple' | 'single';

export interface ContentBundleSelectionEntry {
  entryId: string;
  kind: 'published' | 'link';
  title: string;
  itemId?: string;
  publishedType?: string;
  url?: string;
  description?: string;
}

export interface ContentBundleSectionView {
  sectionId: string;
  title: string;
  description: string;
  kind: 'published' | 'links';
  selectionMode: ContentBundleSectionSelectionMode;
  defaultSelectedEntryIds: string[];
  items?: Published[];
  links?: ContentBundleLinkItem[];
}

export interface ContentBundleView {
  bundleId: string;
  title: string;
  description: string;
  recommendedAgesLabel: string;
  minAge: number;
  maxAge: number;
  itemLimit: number;
  source: 'dynamic_curated' | 'manual';
  sections: ContentBundleSectionView[];
}

export interface RecommendContentBundlesResponse {
  recommendedBundleId: string | null;
  bundles: ContentBundleView[];
}

export interface AdminContentBundleDefinition {
  bundleId: string;
  title: string;
  description: string;
  recommendedAgesLabel: string;
  minAge: number;
  maxAge: number;
  minAgeGroups?: MinAgeGroup[];
  itemLimit?: number;
  itemIds?: string[];
  curated?: boolean;
  source: 'dynamic_curated' | 'manual';
  sections?: AdminContentBundleSectionDefinition[];
}

export interface AdminContentBundleSectionDefinition {
  sectionId: string;
  title: string;
  description?: string;
  kind: 'published' | 'links';
  selectionMode?: ContentBundleSectionSelectionMode;
  source?: 'dynamic_curated' | 'manual';
  minAgeGroups?: MinAgeGroup[];
  itemLimit?: number;
  itemIds?: string[];
  curated?: boolean;
  links?: ContentBundleLinkItem[];
}

export interface AdminContentBundleCatalogEntry extends AdminContentBundleDefinition {
  sections: AdminContentBundleCatalogSectionEntry[];
}

export interface AdminContentBundleCatalogSectionEntry extends AdminContentBundleSectionDefinition {
  itemPreviews: Published[];
}

export interface AdminContentBundleCatalogResponse {
  bundles: AdminContentBundleCatalogEntry[];
  usesDefaultCatalog: boolean;
}

export interface AdminUpdateContentBundleCatalogRequest {
  bundles: AdminContentBundleDefinition[];
}

export interface AdminContentLoaderManifestRecord {
  localId: string;
  itemId?: string;
  easyId?: string;
  sourceItemId?: string;
  type: string;
  name: string;
  description?: string;
  url?: string;
  categories: string[];
  useCriteria: string[];
  childLocalIds: string[];
  imageAssetId?: string | null;
  imageFilename?: string | null;
  attachments?: AdminContentLoaderAttachmentEntry[];
  data?: Record<string, any>;
  meta?: Record<string, any>;
  published: boolean;
}

export type AdminContentLoaderAssetKind = 'banner_image' | 'published_attachment';

export interface AdminContentLoaderManifestAsset {
  assetId: string;
  ownerLocalId: string;
  kind: AdminContentLoaderAssetKind;
  filename?: string | null;
  fileType?: string | null;
  tempUploadId?: string | null;
  remoteUrl?: string | null;
  meta?: Record<string, any> | null;
}

export interface AdminContentLoaderAttachmentEntry {
  id?: string;
  type: 'file' | 'snapshot' | 'snip' | 'uri';
  filename?: string;
  fileType: string;
  fileId?: string;
  info?: Record<string, any>;
  meta?: Record<string, any>;
  previews?: Array<Record<string, any>>;
  encryptedInfo?: boolean;
  createDate?: number;
  assetId?: string | null;
}

export interface AdminContentLoaderManifest {
  records: AdminContentLoaderManifestRecord[];
  assets?: AdminContentLoaderManifestAsset[];
}

export interface AdminContentLoaderDryRunRequest {
  manifestText: string;
}

export interface AdminContentLoaderMatchPreview {
  _id: string;
  name?: string;
  easyId?: string;
  type?: string;
  url?: string;
}

export type AdminContentLoaderDryRunDecision = 'create' | 'update' | 'conflict' | 'invalid';

export type AdminContentLoaderAdvisoryStatus = 'clear' | 'suggested' | 'review' | 'warning';

export interface AdminContentLoaderAdvisory {
  status: AdminContentLoaderAdvisoryStatus;
  notes: string[];
  moderation: {
    approved: boolean;
    severity: string;
    suggestedAction?: string;
    flags: string[];
  } | null;
  enrichment: {
    suggestedUseCriteria: string[];
    reasons: string[];
    resourceHints: {
      rtype?: string | null;
      hasLookupData?: boolean;
      madeForKids?: boolean;
      ageRestricted?: boolean;
    } | null;
  } | null;
}

export interface AdminContentLoaderDryRunRecordResult {
  localId: string;
  decision: AdminContentLoaderDryRunDecision;
  issues: string[];
  matchedPublishedIds: string[];
  matchedRecords: AdminContentLoaderMatchPreview[];
  normalizedRecord: AdminContentLoaderManifestRecord | null;
  advisory: AdminContentLoaderAdvisory | null;
}

export interface AdminContentLoaderDryRunResponse {
  manifestHash: string;
  manifest: AdminContentLoaderManifest;
  summary: {
    totalRecords: number;
    createCount: number;
    updateCount: number;
    conflictCount: number;
    invalidCount: number;
    advisorySuggestedCount: number;
    advisoryReviewCount: number;
    advisoryWarningCount: number;
  };
  results: AdminContentLoaderDryRunRecordResult[];
}

export type AdminContentLoaderVerificationStatus = 'checked' | 'failed' | 'skipped';

export interface AdminContentLoaderVerification {
  status: AdminContentLoaderVerificationStatus;
  checkedUrl?: string | null;
  resourceType?: string | null;
  hasMetadata: boolean;
  notes: string[];
}

export type AdminContentLoaderEnrichmentSource = 'metadata' | 'deterministic' | 'ai';

export interface AdminContentLoaderEnrichmentPatch {
  field: string;
  operation: 'set' | 'merge';
  source: AdminContentLoaderEnrichmentSource;
  value: unknown;
  reason: string;
  confidence?: number | null;
}

export interface AdminContentLoaderEnrichRowResult extends AdminContentLoaderDryRunRecordResult {
  verification: AdminContentLoaderVerification;
  patches: AdminContentLoaderEnrichmentPatch[];
}

export interface AdminContentLoaderExecuteRequest {
  manifestText: string;
  expectedManifestHash?: string;
  selectedLocalIds?: string[];
  importVisibility?: 'inactive' | 'live';
  batchLabel?: string;
}

export interface AdminContentLoaderExecuteRowResult {
  localId: string;
  publishId: string;
  action: 'created' | 'updated';
  type: string;
  name: string;
  processingState: PostImportProcessingState;
  importedAssetCount?: number;
}

export interface AdminContentLoaderExecuteResponse {
  summary: {
    createdCount: number;
    updatedCount: number;
    relationCount: number;
    pendingProcessingCount: number;
    importedBannerCount: number;
    importedAttachmentCount: number;
    batchId: string;
  };
  dryRun: AdminContentLoaderDryRunResponse;
  results: AdminContentLoaderExecuteRowResult[];
}

export interface AdminContentLoaderUploadAssetRequest {
  ownerLocalId: string;
  kind: AdminContentLoaderAssetKind;
  filename: string;
  fileType: string;
  fileData: string;
}

export interface AdminContentLoaderUploadAssetResponse {
  asset: AdminContentLoaderManifestAsset;
}

export type AdminPublishedPackageAssetKind = 'banner_image' | 'published_attachment';

export interface AdminPublishedPackageAsset {
  assetId: string;
  ownerLocalId: string;
  ownerPublishedId?: string | null;
  kind: AdminPublishedPackageAssetKind;
  filename?: string | null;
  sourceRuntimeRef?: string | null;
  bundlePath?: string | null;
  byteSize?: number | null;
  checksumSha256?: string | null;
  attachmentId?: string | null;
  fileType?: string | null;
  meta?: Record<string, any> | null;
}

export interface AdminPublishedPackageAttachmentEntry {
  id?: string;
  type: 'file' | 'snapshot' | 'snip' | 'uri';
  filename?: string;
  fileType: string;
  fileId?: string;
  info?: Record<string, any>;
  meta?: Record<string, any>;
  previews?: Array<Record<string, any>>;
  encryptedInfo?: boolean;
  createDate?: number;
  assetId?: string | null;
}

export interface AdminPublishedPackageRecord {
  localId: string;
  publishId?: string | null;
  easyId?: string | null;
  sourceItemId?: string | null;
  type: string;
  subType?: string | null;
  name: string;
  description?: string | null;
  url?: string | null;
  categories?: string[];
  useCriteria?: string[];
  imageFilename?: string | null;
  imageAssetId?: string | null;
  published?: boolean | null;
  blockedAt?: string | null;
  blockContext?: Record<string, any> | null;
  visibilityCode?: number | null;
  curated?: boolean | null;
  curationStatus?: string | null;
  publishType?: string | null;
  publishConfig?: Record<string, any> | null;
  excludeFromSearch?: boolean | null;
  curatorComment?: string | null;
  availableAt?: string | null;
  data?: Record<string, any> | null;
  meta?: Record<string, any> | null;
  info?: Record<string, any> | null;
  sysInfo?: Record<string, any> | null;
  sourceInfo?: Record<string, any> | null;
  attachments?: AdminPublishedPackageAttachmentEntry[];
}

export interface AdminPublishedPackageRelation {
  parentLocalId: string;
  childLocalId: string;
  order?: number | null;
  details?: Record<string, any> | null;
  availableAt?: string | null;
}

export interface AdminPublishedPackageDataManifest {
  kind: 'published-package-data';
  packageVersion: 1 | 2;
  exportedAt: string;
  records: AdminPublishedPackageRecord[];
  relations: AdminPublishedPackageRelation[];
  assets: AdminPublishedPackageAsset[];
}

export interface AdminPublishedPackageExportRequest {
  publishedIds: string[];
  includeChildren?: boolean;
}

export interface AdminPublishedPackageExportResponse {
  manifest: AdminPublishedPackageDataManifest;
  bundleBase64?: string | null;
  bundleFileName?: string | null;
  bundleMimeType?: string | null;
  summary: {
    requestedCount: number;
    recordCount: number;
    relationCount: number;
    assetCount: number;
    childInclusionCount: number;
  };
  warnings: string[];
}

export interface AdminPublishedPackageImportRequest {
  packageText?: string;
  packageDataBase64?: string;
  packageFileName?: string | null;
  dryRun?: boolean;
  importVisibility?: 'inactive' | 'preserve';
  batchLabel?: string;
}

export interface AdminPublishedPackageImportRowResult {
  localId: string;
  publishId: string | null;
  action: 'created' | 'updated';
  type: string;
  name: string;
  importedAssetCount: number;
  existingName?: string | null;
}

export interface AdminPublishedPackageImportResponse {
  manifest: AdminPublishedPackageDataManifest;
  dryRun?: boolean;
  batchId?: string | null;
  summary: {
    createdCount: number;
    updatedCount: number;
    relationCount: number;
    relationDeletedCount: number;
    importedBannerCount: number;
    importedAttachmentCount: number;
    pendingBannerAssetCount?: number;
    pendingAttachmentCount?: number;
    skippedRelationCount: number;
  };
  results: AdminPublishedPackageImportRowResult[];
  warnings: string[];
}

export interface AdminPublishedEnrichRequest {
  itemIds: string[];
}

export interface AdminPublishedEnrichItemResult {
  itemId: string;
  name: string;
  verification: AdminContentLoaderVerification;
  patches: AdminContentLoaderEnrichmentPatch[];
}

export interface AdminPublishedEnrichResponse {
  summary: {
    requestedCount: number;
    enrichedCount: number;
    patchCount: number;
  };
  results: AdminPublishedEnrichItemResult[];
}

export interface AdminPublishedApplyPatchesRequest {
  itemId: string;
  patches: AdminContentLoaderEnrichmentPatch[];
  markState?: PostImportProcessingState;
}

export interface AdminPublishedApplyPatchesResponse {
  itemId: string;
  appliedCount: number;
  item: Published;
}

export interface AdminPublishedImportBatchesRequest {
  limit?: number;
}

export interface AdminPublishedImportBatchSummary {
  batchId: string;
  batchLabel: string | null;
  batchSource: string | null;
  importedAt: string | null;
  total: number;
  stateCounts: Record<string, number>;
  publishedCount: number;
}

export interface AdminPublishedImportBatchesResponse {
  batches: AdminPublishedImportBatchSummary[];
}

export interface AdminPublishedApproveBatchRequest {
  batchId?: string;
  itemIds?: string[];
}

export interface AdminPublishedApproveBatchResponse {
  approvedCount: number;
  skippedBlockedCount: number;
  skippedNotReadyCount: number;
  itemIds: string[];
}

export interface AdminPublishedModerationReport {
  _id?: number;
  category?: string;
  adminStatus?: string | null;
  createdAt?: Date | string;
  details?: Record<string, any> | null;
}

export interface AdminPublishedInfoResponse {
  published: Published | null;
  children: Published[];
  moderationReport: AdminPublishedModerationReport | null;
}

export interface AdminPublishedChangeTypeRequest {
  itemId: string;
  type: string;
  subType?: string | null;
}

export interface AdminPublishedChangeTypeResponse {
  type: string;
  subType: string | null;
}

export interface AdminPublishedReplaceImageRequest {
  itemId: string;
  imageData: string;
}

export interface AdminPublishedReplaceImageResponse {
  imageFilename: string;
}

export interface AdminPublishedDeleteRequest {
  itemId: string;
}

export interface AdminPublishedDeleteResponse {
  deleted: boolean;
}

export type AdminPublishedProcessAction = 'reload_metadata' | 'verify_source';

export interface AdminPublishedProcessRequest {
  itemIds: string[];
  action: AdminPublishedProcessAction;
}

export interface AdminPublishedProcessRowResult {
  itemId: string;
  status: 'processed' | 'failed' | 'skipped';
  state: PostImportProcessingState;
  message: string;
  processedUrl?: string | null;
}

export interface AdminPublishedProcessResponse {
  summary: {
    requestedCount: number;
    processedCount: number;
    failedCount: number;
    skippedCount: number;
  };
  results: AdminPublishedProcessRowResult[];
}

export interface GetItemByPubOrSubIdRequest {
  pubId?: string;
  subId?: string;
}

export interface AddSubscriptionRequest {
  refId: string;
  refType: string;
  userId?: string;
  data?: any;
  encInfo?: any;
}

export interface EditSubscriptionRequest {
  subscriptionId: string;
  data?: any;
  encInfo?: any;
}

export interface ListSubscriptionsForUserRequest {
  userId?: string;
  targetUserId?: string;
}

export interface ListSubscriptionsForRefRequest {
  refId: string;
  refType: string;
}

// RefState (generic encrypted/plaintext state storage)
export type RefStateOwnerType = 'user' | 'account' | 'session';
export type RefStateRefType = 'item' | 'post' | 'feed_item' | 'app_global';

export type RefStateEntry = {
  _id: string;
  refType: RefStateRefType;
  refId: string;
  ownerType: RefStateOwnerType;
  ownerId: string;
  stateKey: string;
  stateSubKey?: string | null;
  data?: any;
  encrypted?: boolean;
  encInfo?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type RefStateUpsertRequest = {
  refType: RefStateRefType;
  refId: string;
  stateKey: string;
  stateSubKey?: string | null;
  data?: any;
  ownerId?: string;
};

export type RefStateUpsertResponse = { entry: RefStateEntry };

export type RefStateListRequest = {
  refType: RefStateRefType;
  refId: string;
  stateKey?: string;
  stateSubKey?: string | null;
  limit?: number;
  cursorUpdatedAt?: string;
  ownerId?: string;
};

export type RefStateListResponse = {
  entries: RefStateEntry[];
  nextCursorUpdatedAt?: string;
};

export type RefStateDeleteRequest = {
  refType: RefStateRefType;
  refId: string;
  stateKey: string;
  stateSubKey?: string | null;
  ownerId?: string;
};

export type RefStateDeleteResponse = { deletedCount: number };

export type FamilyPolicyRuleUpsertRequest = {
  _id?: string;
  data: StoredFamilyPolicyRule;
  encInfo?: EncInfo | null;
};

export type FamilyPolicyRuleUpsertResponse = {
  entry: FamilyPolicyRuleRecord;
};

export type FamilyPolicyRuleListRequest = {};

export type FamilyPolicyRuleListResponse = {
  entries: FamilyPolicyRuleRecord[];
};

export type FamilyPolicyRuleDeleteRequest = {
  ruleId: string;
};

export type FamilyPolicyRuleDeleteResponse = {
  deleted: boolean;
};

// Artifacts (local-first, sync via RefState)
// Artifacts are stored per ref (typically an item) and are namespaced by (artifactType, artifactKey)
// so new item subtypes (ebooks, podcasts, videos, games, todos, feeds) can persist state cleanly.
export type ArtifactRefType = 'item' | 'app_global';

export type ArtifactEntry = {
  _id: string;
  refType: ArtifactRefType;
  refId: string;
  artifactType: string;
  artifactKey: string;
  data?: any;
  createdAt?: string;
  updatedAt?: string;

  // Client-local bookkeeping (not stored on server)
  dirty?: boolean;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
};

export type ArtifactUpsertRequest = {
  refType: ArtifactRefType;
  refId: string;
  artifactType: string;
  artifactKey: string;
  data?: any;
  sync?: boolean;
};

export type ArtifactUpsertResponse = {
  entry: ArtifactEntry;
  synced?: boolean;
};

export type ArtifactGetRequest = {
  refType: ArtifactRefType;
  refId: string;
  artifactType: string;
  artifactKey: string;
  forceRemote?: boolean;
};

export type ArtifactGetResponse = {
  entry: ArtifactEntry | null;
};

export type ArtifactListRequest = {
  refType: ArtifactRefType;
  refId: string;
  artifactType?: string;
  forceRemote?: boolean;
};

export type ArtifactListResponse = {
  entries: ArtifactEntry[];
};

export type ArtifactDeleteRequest = {
  refType: ArtifactRefType;
  refId: string;
  artifactType: string;
  artifactKey: string;
};

export type ArtifactDeleteResponse = {
  deletedCount: number;
};

export type ArtifactSyncPendingRequest = {
  limit?: number;
};

export type ArtifactSyncPendingResponse = {
  attempted: number;
  synced: number;
  failed: number;
};

export interface AccountInfoResponse {
  _id: string;
  accountType: AccountType;
  subscriptionInfo?: any;
  sysOptions?: SystemOptions;
  options?: any;
}





export interface UserPreferences {
  [key: string]: unknown;
}

export type GetUserPrefsResponse = UserPreferences;

export type UserSettingsCopyGroup = 'contentFiltering' | 'usageLimits' | 'websiteSettings';

export type UserSettingsCopySourceSnapshot = {
  optionsPatch?: Record<string, unknown>;
  preferenceUpdates?: Record<string, unknown>;
};

export interface CopyUserSettingsRequest {
  sourceUserId: string;
  targetUserId: string;
  groups: UserSettingsCopyGroup[];
}

export interface CopyUserSettingsResponse {
  targetUserId: string;
  sourceUserId: string;
  appliedGroups: UserSettingsCopyGroup[];
  appliedSnapshot: Partial<Record<UserSettingsCopyGroup, UserSettingsCopySourceSnapshot>>;
}

export interface SendManagedClientDebugToastRequest {
  userId?: string;
  clientIds?: string[];
  encryptedPayload: string;
}

export interface SendManagedClientDebugToastResponse {
  targetUserId: string;
  deliveredClientIds: string[];
  skippedTargets: Array<{
    clientId: string;
    reason: 'offline' | 'unsupported' | 'unknown-client';
  }>;
}

export interface QueueManagedRemoteActionRequest {
  userId?: string;
  clientId: string;
  kind: 'openUrl' | 'forceSyncSettings' | 'syncActivity' | 'getScreenshot';
  encryptedPayload: string;
}

export interface QueueManagedRemoteActionResponse {
  action: ManagedRemoteActionCommandView;
  deliveredClientIds: string[];
  skippedTargets: Array<{
    clientId: string;
    reason: 'offline' | 'unsupported' | 'unknown-client';
  }>;
}

export interface GetManagedRemoteActionStatusRequest {
  actionId: string;
}

export interface GetManagedRemoteActionStatusResponse {
  action: ManagedRemoteActionCommandView | null;
}

export interface AckManagedRemoteActionRequest {
  actionId: string;
  status: 'completed' | 'failed';
  errorMessage?: string;
  screenshotDataUrl?: string;
}

export interface AckManagedRemoteActionResponse {
  action: ManagedRemoteActionCommandView;
}




export type ProfileImageUpdateData =
  | string
  | { type: 'path'; data: string }
  | { type: 'base64'; data: string }
  | { type: 'data'; data: any }
  | Record<string, any>;

export interface UpdateProfileImageRequest {
  imageData: ProfileImageUpdateData;
  userId?: string;
}

export interface UpdatePublicProfileRequest {
  username?: string;
  fullName?: string;
  enabled?: boolean;
  about?: string;
  profileImage?: {
    type: string;
    filename: string;
  };
}

export interface MiscNotificationStats {
  unreadCount: number;
  unreadFeedCount: number;
}

export interface FriendListResponse {
  friends: Array<{
    userId: string;
    _id?: string;
    username?: string;
    displayedName?: string;
    email?: string;
    profileImage?: any;
    friendshipCreatedAt?: string;
  }>;

  requestedOutBound: Array<{
    userId: string;
    inviteCode?: string;
    username?: string;
    displayedName?: string;
    email?: string;
    profileImage?: any;
    createdAt?: string;
    expiresAt?: string;
  }>;

  requestedInBound: Array<{
    userId: string;
    username?: string;
    displayedName?: string;
    email?: string;
    profileImage?: any;
    createdAt?: string;
  }>;
}


export interface FriendTakeActionRequest {
  requestId?: string;
  friendUserId?: string;
  action: 'accept' | 'reject' | 'remove' | 'confirm' | 'deny' | 'cancel';
  userId?: string;
}

/** Request with userId - client caching options passed separately */
export interface UserScopedRequest {
  userId?: string;
}

/** Request with itemId and optional userId */
export interface ItemScopedRequest {
  itemId: string;
  userId?: string;
}


export interface GetLoggedInfoForItemIdRequest {
  itemId: string;
  targetUserId?: string;
}

export interface RefreshItemMetaRequest {
  itemIds: string[];
  updateSubType?: boolean;
}

export interface SimilarItemsByURLRequest {
  url: string;
  itemId?: string;
  needOwnerUserType?: boolean;
  targetUserId?: string;
}

export interface ListItemsByFilterRequest {
  filter?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface SearchItemsRequest {
  searchTerm: string;
  userId?: string;
}
export interface UpdateItemFeedbackRequest {
  itemId: string;
  attr?: string;
  value?: number | boolean;
}
export interface GetItemInfoById {
  itemId: string;
  userId?: string;
  includeUserPermissions?: boolean;
  includeFeedback?: boolean;
}
//{ userId?: string; collectionId: string; includeUserPermissions?: boolean; includeFeedback?: boolean }

export interface ListItemsWithInfoByUserRequest {
  collectionId: string;
  userId?: string;
  typeFilter?: string;
}


export interface AddItemAttachmentRequest {
  itemId: string;
  attachment: {
    type: string;
    url?: string;
    fileId?: string;
    data?: Record<string, any>;
  };
}


export interface SignInRequest {
  username?: string;
  password?: string;
  loginType?: string;
  loginPayload?: any;
  recaptchaToken?: string;
  clientInfoData?: ClientInfoView;
}

export interface RegisterRequest {
  username: string;
  displayedName?: string;
  email: string;
  type: UserType;
  loginType?: string;
  loginPayload?: any;
  serverCopyOfPassword?: string;
  password?: string;
  inviteVerification?: {
    code: string | null;
  };
  refData?: {
    inviteCode: string | null;
    accessToken?: string;
    sessionToken?: string;
  };
  recaptchaToken?: string;
  /** If true, skip automatic server backup of encryption key - user will use passkey instead */
  deferEncryptionBackup?: boolean;
}

export interface SavePipelineResultsRequest {
  id?: string;
  url: string;
  userId: string;
  results?: any;
  metadata?: any;
}

export interface SwitchUserRequest {
  userId: string;
  pinpass?: string;
  clientInfo?: ClientInfoView;
}



export interface UpdateUserInfoRequest {
  userId?: string;
  data: {
    displayedName?: string;
    email?: string;
    avatar?: string;
  };
}


export interface CreateUserRequest {
  username: string;
  displayedName?: string;
  email: string;
  type: UserType;
  localUser?: boolean;
  loginType?: string;
  loginPayload?: any;
  serverCopyOfPassword?: string;
  password?: string;
  inviteVerification?: {
    code: string | null;
  };
  refData?: {
    inviteCode: string | null;
    accessToken?: string;
    sessionToken?: string;
  };
  recaptchaToken?: string;
}


export type PluginListResponse = PluginInfo[];

export interface InviteCreateRequest {
  inviteData: {
    email: string;
    inviterName: string;
    message: string;
    type?: string;
  };
}


export interface PermissionOverrideRequest {
  // Admin user id to verify PIN/password for.
  overrideUserId: string;
  pinpass: string;
  password?: string;
  pin?: string;
}


export interface GetRankedMatchesForURLRequest {
  url: string;
  itemId?: string;
  targetUserId?: string;
}



export interface CreatePageSnapshotRequest {
  itemId: string;
  snapshot: any;
}


export interface FileUploadRequest {
  ufId?: string;        // If updating existing file (optional)
  refId: string;        // What this file belongs to (itemId, postId, etc)
  refType: string;      // Type of reference: 'item', 'post', 'profile', etc

  filename: string;     // Original filename
  fileType: string;     // MIME type
  fileData: string;     // Base64 encoded file content

  previews?: FilePreview[];     // Optional thumbnails/previews
  encInfo?: EncInfo | null;     // Encryption info if encrypted
  secure?: boolean;             // If true, file will be uploaded to secure storage
}

export interface AccessRequestView {
  _id?: string;
  userId?: string;
  status?: string;
  key?: string | null;
  type?: string | null;
  approverNote?: string | null;

  requesterNote?: string | null;
  requesterId?: string | null;
  createdAt?: DateString;
  updatedAt?: DateString;
  details?: AccessRequestDetails;
}

export interface AccessRequestDetails {
  url?: string;
  srcId?: string;
  srcType?: string;
  /** Optional user-friendly title for srcId (e.g. collection title) */
  srcTitle?: string;
  ts?: number;
  limitId?: string;
  reasonCode?: ReasonCode;
  contentInfo?: ActivityContentInfo;
  /** For non-URL access requests (e.g., approve a specific in-app action). */
  actionCode?: string;
  /** Optional visibility/variant for the action (e.g. link-only vs friends & family). */
  publishVisibilityCode?: number;
}

// ============================================================================
// MISSING API REQUEST/RESPONSE TYPES
// ============================================================================

// User-related requests
export interface GetMiscStatsRequest {
  userId?: string;
}

export interface GetAccountInfoRequest {
  userId?: string;
}

export interface ListAccountUsersRequest {
  userId?: string;
}

export interface GetUserInfoRequest {
  userId: string;
}




export interface GetUserPrefValueRequest {
  key: string;
  userId?: string;
}

export interface TokenLoginRequest {
  token: string;
  clientInfoData?: ClientInfoView;
}

export interface DesktopAuthHandoffCreateResponse {
  tokenData: TokenData;
}

export interface ResetPasswordRequest {
  email?: string;
  token?: string;
  newPassword?: string;
}

export interface UpdatePasswordRequest {
  password: string;
  passwordCopy: string;
  userId?: string;
}

export interface UpdatePINRequest {
  userId: string;
  pin: string;
}

export interface GetUserOptionsRequest {
  userId?: string;
}

export interface ListTaskOccurrencesByRangeRequest {
  userId: string;
  startMs: number;
  endMs: number;
  nowMs?: number;
  includeCompleted?: boolean;
}

export interface ListTaskOccurrencesByRangeResponse {
  nowMs: number;
  occurrences: TaskOccurrenceView[];
}



export interface RefreshServerSettingsRequest {
  [key: string]: any;
}

export interface GetServerSettingsRequest {
  [key: string]: any;
}


// Item-related requests
export interface CreateCollectionRequest {
  details: Partial<Item>;
  options?: {
    collectionIds?: string[];
    permList?: any[];
    customPermissions?: boolean;
    skipNotifications?: boolean;
  };
}

export interface SaveItemResponse {
  itemId: string;
  encInfo?: any;
  feedback?: ItemFeedbackView;
}

export interface ListPermissionsAndReactionsResponse {
  permissions: PermissionWithUser[];
  reactions: ItemReaction[];
}

export interface GetArchivedItemsRequest {
  userId?: string;
}

export interface GetHiddenItemsRequest {
  userId?: string;
}

export interface GetUncategorizedItemsRequest {
  userId?: string;
}

export interface ListLibraryRootRequest {
  userId?: string;
  includeUserPermissions?: boolean;
  limit?: number;
}

export interface GetItemPathTreeRequest {
  itemId: string;
  userId?: string;
}

export interface GetItemParentsRequest {
  itemId: string;
  userId?: string;
  includePath?: boolean;
}

export interface ListSharedWithUserRequest {
  userId?: string;
  sharedByUserId?: string;
}

export interface ListSharedByUserRequest {
  userId?: string;
}

export interface ListRecentAccessibleByUserRequest {
  userId?: string;
  limit?: number;
}

export interface ListCommentsRequest {
  refId: string;
  refType: 'post' | 'item';
}

export interface ListFilesByRefRequest {
  refId: string;
  refType: string;
}

export interface RediscoverQueueRequest {
  timeFrameDays?: number,
  showReadLater?: boolean,
  showCollections?: boolean,
}

export interface LibraryCleanupCandidatesRequest {
  limit?: number,
  minItemAgeDays?: number,
  minSinceTouchedDays?: number,
  includeCollections?: boolean,
  includeReadLater?: boolean,
  includeStarred?: boolean,
  onlyKept?: boolean,
}

export interface ReadLaterFeedRequest {
  limit?: number,
  showCollections?: boolean,
  hideArchived?: boolean,
  hideHidden?: boolean,
  includeSnoozed?: boolean,
}

// Text Embedding Service API Types
export interface GenerateEmbeddingRequest {
  text: string;
  options?: {
    normalize?: boolean;
    pooling?: 'mean' | 'cls';
    useFallback?: boolean;
  };
}

export interface GenerateEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  cached?: boolean;
  error?: string;
}

export interface BatchEmbeddingsRequest {
  texts: Array<{ id: string; text: string }>;
  options?: {
    normalize?: boolean;
    pooling?: 'mean' | 'cls';
    useFallback?: boolean;
  };
}

export interface BatchEmbeddingsResponse {
  results: Array<{
    id: string;
    embedding: number[];
    dimensions: number;
    model: string;
    cached?: boolean;
    error?: string;
  }>;
}

export interface FindSimilarRequest {
  queryText: string;
  candidates: Array<{
    id: string;
    text: string;
    embedding?: number[];
  }>;
  topK?: number;
}

export interface FindSimilarResponse {
  results: Array<{
    id: string;
    score: number;
    text?: string;
  }>;
}

// Server-side Embedding Vector Cache API Types
export interface EmbeddingCacheGetRequest {
  modelId: string;
  namespace?: string;
  cacheKeys: string[];
}

export interface EmbeddingCacheGetResponse {
  items: Array<{
    cacheKey: string;
    embedding: number[];
    dimensions: number;
    updatedAt: string;
  }>;
}

export interface EmbeddingCachePutRequest {
  modelId: string;
  namespace?: string;
  items: Array<{
    cacheKey: string;
    embedding: number[];
    dimensions?: number;
  }>;
}

export interface EmbeddingCachePutResponse {
  stored: number;
}

export interface EmbeddingCacheStatsRequest {
  modelId?: string;
  namespace?: string;
}

export interface EmbeddingCacheStatsResponse {
  totalEntries: number;
  byModelId: Record<string, number>;
  byNamespace: Record<string, number>;
}

export interface EmbeddingCacheClearRequest {
  modelId?: string;
  namespace?: string;
}

export interface EmbeddingCacheClearResponse {
  deleted: number;
}

export interface EmbeddingSuggestCollectionsRequest {
  itemText: string;
  userId?: string;
  topK?: number;
}

export interface EmbeddingSuggestCollectionsResponse {
  suggestions: Array<{
    collectionId: string;
    collectionName: string;
    score: number;
  }>;
}

export interface SuggestTagsRequest {
  itemText: string;
  topK?: number;
}

export interface SuggestTagsResponse {
  suggestions: Array<{
    tag: string;
    tagName: string;
    score: number;
  }>;
}

// ============================================================================
// UNIFIED ITEM QUERY INTERFACE
// ============================================================================

export type ItemQuerySortField = 'created' | 'modified' | 'visited' | 'title' | 'order' | 'sharedAt' | 'name';
export type ItemQuerySortOrder = 'asc' | 'desc';

/**
 * Query modes determine the permission resolution and data shaping strategy.
 * - 'standard': Basic query with direct permission check (default)
 * - 'allUserItems': Two-phase query - items with direct permission UNION items in permitted collections
 * - 'libraryRoot': Root collections with permission propagation (no parent with permission)
 * - 'collectionItems': Items within a specific collection with relation details
 * - 'sharedWith': Items shared TO the user by others
 * - 'sharedBy': Items shared BY the user to others
 * - 'archived': Archived items across all accessible contexts
 * - 'withFeedback': Items filtered by a specific feedback field
 */
export type ItemQueryMode = 
  | 'standard'
  | 'allUserItems'
  | 'libraryRoot'
  | 'collectionItems'
  | 'sharedWith'
  | 'sharedBy'
  | 'archived'
  | 'withFeedback'
   | 'recent' | 'similar' | 'related' | 'suggestions' | 'inCollection'

export interface ItemQueryFilters {
  // Status filters
  archived?: boolean;
  hidden?: boolean;
  uncategorized?: boolean;

  // Feedback filters
  feedbackTypes?: string[]; // e.g., ['starred', 'visited', 'reactionDate']
  feedbackField?: string; // For 'withFeedback' mode - specific field to filter by

  // Item type filters
  itemTypes?: string[]; // e.g., ['col', 'item', 'feed']
  typeFilter?: string; // For collectionItems mode - filter by item_relation.itemType

  // Subtype filters (e.g. subType === 'task')
  subTypes?: string[];

  // Collection context
  inCollections?: string[];
  collectionId?: string; // For 'collectionItems' mode

  // Visibility filters (for libraryRoot mode)
  visibility?: 'shared' | 'private' | 'all';

  // Sharing filters
  sharedOnly?: boolean;

  // Attribute filters
  attributeKey?: string;
  attributeValue?: string;

  // ID filters
  ids?: string[];
  idsRequired?: boolean;
  publishIds?: string[]; // Match by details.publishId
  urls?: string[]; // Match by exact URL

  // Archive behavior for collectionItems mode
  hideArchived?: boolean;
}

export interface ItemQueryIncludes {
  // Include additional data
  feedback?: boolean | string[]; // true = all, string[] = specific types
  permissions?: boolean;
  path?: boolean;
  parents?: boolean;
  allCollections?: boolean;
  
  // Extended includes for specialized queries
  userPermissions?: boolean; // All users' permissions on items (for libraryRoot)
  collectionRelation?: boolean; // Include item_relation details (order, publishedAt, etc.)
  sharerInfo?: boolean; // Include user info for sharer (sharedWith mode)
  recipientInfo?: boolean; // Include user info for recipient (sharedBy mode)
  parentCollectionIds?: boolean; // Include all parent collection IDs
}

export interface ItemQueryPagination {
  limit?: number;
  offset?: number;
  cursor?: string; // For cursor-based pagination (future)
}

export interface ItemQuerySort {
  field?: ItemQuerySortField;
  order?: ItemQuerySortOrder;
}

export interface ItemQueryRequest {
  userId?: string;
  
  // Query mode determines permission resolution and data shaping strategy
  // Defaults to 'standard' if not specified
  mode?: ItemQueryMode;
  
  filters?: ItemQueryFilters;
  includes?: ItemQueryIncludes;
  pagination?: ItemQueryPagination;
  sort?: ItemQuerySort;
  params?: Record<string, any>;


  // Post-processing for custom queries
  postProcess?: {
    additionalFilters?: ItemQueryFilters;
    transform?: 'preserveOrder' | 'deduplicate';
  };

  // Options
  tempAuthToken?: TokenData;
}

export interface ItemQueryResponse {
  items: ItemInfoView[];
  total?: number;
  hasMore?: boolean;
  cursor?: string;
}

// ============================================================================
// Attachment Types
// ============================================================================

export interface AttachmentAddResponse {
  attachmentId: string;
  url?: string;
  fileId?: string;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncStatusResponse {
  enabled: boolean;
  lastSync?: number;
  pendingOperations?: number;
  syncInProgress?: boolean;
  errors?: string[];
}export interface TokenData {
  token: string;
  expAtSec: number;
}

