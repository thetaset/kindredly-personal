import type { DeviceGrant } from "../restrictions/deviceGrants";
import type {
  FamilyDowntimeAllow,
  FamilyDowntimeSchedule,
  FamilyDowntimeSettings,
  FamilyDowntimeView,
} from "../restrictions/familyDowntime";
import type { SiteStyleEntryV1 } from "../types/item.types";
import type { AiImageCredits } from "../ai-image-credits";
import type {
  AccessRequestAddResponse,
  AccountInfoResponse,
  SiteStyleForUrlRequest,
  SiteStyleGenerateRequest,
  SiteStyleGenerateResponse,
  SiteStyleListRequest,
  SiteStyleRevertEntryRequest,
  SiteStyleRevertEntryResponse,
  SiteStyleSaveEntryRequest,
  SiteStyleSaveEntryResponse,
  SiteStyleMatchReportsRequest,
  SiteStyleMatchReportsResponse,
  SiteStyleReportMatchRequest,
  SiteStyleReportMatchResponse,
  SiteStyleListResponse,
  SiteStyleForUrlResponse,
  AIItemSuggestRequest,
  AIItemSuggestResponse,
  AIItemUpdateRequest,
  AIItemUpdateResponse,
  AISendMessageRequest,
  AISendMessageResponse,
  AISendMessageStreamRequest,
  AISessionResponse,
  AITextRequest,
  AITextResponse,
  AIUsageGetSummaryRequest,
  AIUsageGetSummaryResponse,
  AiExtraUsageGrantView,
  AiLimitState,
  AttachmentAddResponse,
  AccessEvaluateRequest,
  AccessEvaluateResponse,
  AdminContentBundleCatalogResponse,
  AdminSetupCatalogResponse,
  AdminUpdateSetupCatalogRequest,
  GetSetupCatalogRequest,
  GetSetupCatalogResponse,
  AdminPuzzleContentListRequest,
  AdminPuzzleContentListResponse,
  AdminPuzzleContentSaveRequest,
  AdminPuzzleContentSaveResponse,
  AdminPuzzleContentSetStatusRequest,
  AdminPuzzleContentDeleteRequest,
  AdminPuzzleContentDeleteResponse,
  AdminPuzzleContentImportSeedRequest,
  AdminPuzzleContentImportSeedResponse,
  ThinkingPuzzlesCatalogRequest,
  ThinkingPuzzlesCatalogResponse,
  AdminContentLoaderDryRunRequest,
  AdminContentLoaderDryRunResponse,
  AdminContentLoaderExecuteRequest,
  AdminContentLoaderExecuteResponse,
  AdminContentLoaderUploadAssetRequest,
  AdminContentLoaderUploadAssetResponse,
  AdminContentSourceSearchPodcastsRequest,
  AdminContentSourceSearchPodcastsResponse,
  AdminContentSourceParseFeedRequest,
  AdminContentSourceParseFeedResponse,
  AdminContentSourceFetchUrlsRequest,
  AdminContentSourceFetchUrlsResponse,
  AdminContentSourceCreateDraftRequest,
  AdminContentSourceCreateDraftResponse,
  AdminContentSourceListDraftsResponse,
  AdminContentSourceGetDraftRequest,
  AdminContentSourceGetDraftResponse,
  AdminContentSourceAppendCandidatesRequest,
  AdminContentSourceAppendCandidatesResponse,
  AdminContentSourceRemoveCandidateRequest,
  AdminContentSourceRemoveCandidateResponse,
  AdminContentSourcePromoteDraftRequest,
  AdminContentSourcePromoteDraftResponse,
  AdminFeedGenPlanRequest,
  AdminFeedGenPlanResponse,
  AdminFeedGenGeneratePostsRequest,
  AdminFeedGenGeneratePostsResponse,
  AdminFeedGenSearchSourcesRequest,
  AdminFeedGenSearchSourcesResponse,
  AdminFeedGenListFeedsResponse,
  AdminFeedGenLoadFeedRequest,
  AdminFeedGenLoadFeedResponse,
  AdminPublishedPackageExportRequest,
  AdminPublishedPackageExportResponse,
  AdminPublishedChangeTypeRequest,
  AdminPublishedChangeTypeResponse,
  AdminPublishedDeleteRequest,
  AdminPublishedDeleteResponse,
  AdminPublishedInfoResponse,
  AdminPublishedReplaceImageRequest,
  AdminPublishedReplaceImageResponse,
  AdminPublishedAssignBannerImageRequest,
  AdminPublishedProcessRequest,
  AdminPublishedProcessResponse,
  AdminPublishedPackageImportRequest,
  AdminPublishedPackageImportResponse,
  AdminPublishedEnrichRequest,
  AdminPublishedEnrichResponse,
  AdminPublishedApplyPatchesRequest,
  AdminPublishedApplyPatchesResponse,
  AdminPublishedImportBatchesRequest,
  AdminPublishedImportBatchesResponse,
  AdminPublishedApproveBatchRequest,
  AdminPublishedApproveBatchResponse,
  AdminUpdateContentBundleCatalogRequest,
  ChatStreamCompleteEvent,
  CollectionListByIdsRequest,
  CollectionListByUserRequest,
  CreateCommentRequest,
  CreateCollectionRequest,
  CopyUserSettingsRequest,
  CopyUserSettingsResponse,
  AckManagedRemoteActionRequest,
  AckManagedRemoteActionResponse,
  GetManagedRemoteActionStatusRequest,
  GetManagedRemoteActionStatusResponse,
  QueueManagedRemoteActionRequest,
  QueueManagedRemoteActionResponse,
  GetLiveViewFramesRequest,
  GetLiveViewFramesResponse,
  PushLiveViewFrameRequest,
  PushLiveViewFrameResponse,
  StartLiveViewRequest,
  StartLiveViewResponse,
  StopLiveViewRequest,
  StopLiveViewResponse,
  RequestActivitySyncAllRequest,
  RequestActivitySyncAllResponse,
  SendManagedClientDebugToastRequest,
  SendManagedClientDebugToastResponse,
  ContentLookupRequest,
  ContentLookupResponse,
  CreatePostRequest,
  CreatePostResponse,
  CreateGroupedPostRequest,
  CreateGroupedPostResponse,
  ListByShareGroupRequest,
  PodcastFeedLookupRequest,
  PodcastFeedLookupResponse,
  PostReadReceiptListRequest,
  PostReadReceiptListResponse,
  PostReadReceiptMarkRequest,
  PostReadReceiptMarkResponse,
  CreateUserRequest,
  EncryptionStatusResponse,
  FileUploadRequest,
  FamilyPolicyRuleDeleteRequest,
  FamilyPolicyRuleDeleteResponse,
  FamilyPolicyRuleListRequest,
  FamilyPolicyRuleListResponse,
  FamilyPolicyRuleUpsertRequest,
  FamilyPolicyRuleUpsertResponse,
  FriendListResponse,
  FriendTakeActionRequest,
  GenerateImageRequest,
  GenerateImageResponse,
  AddItemToUserLibraryRequest,
  GetArchivedItemsRequest,
  GetHiddenItemsRequest,
  GetItemRelationshipInfoRequest,
  GetPublishedViewRequest,
  RemoveItemFromUserLibraryRequest,
  LibraryCleanupCandidatesRequest,
  LibraryDuplicateCandidatesRequest,
  LibraryDuplicateCandidatesResponse,
  MergeLibraryDuplicatesRequest,
  MergeLibraryDuplicatesResponse,
  RecommendContentBundlesRequest,
  RecommendContentBundlesResponse,
  GetRankedMatchesForURLRequest,
  GetUrlRuleExplanationRequest,
  GetUrlRuleExplanationResponse,
  GetUncategorizedItemsRequest,
  GetUsageSummaryRequest,
  GetUserPrefsResponse,
  ImportFromPublishedRequest,
  ItemImageApprovalGetRequest,
  ItemImageApprovalGetResponse,
  ItemImageApprovalListByIdsRequest,
  ItemImageApprovalListByIdsResponse,
  ItemImageApprovalSetRequest,
  ItemImageApprovalSetResponse,
  InviteCreateRequest,
  ItemQueryRequest,
  ItemQueryResponse,
  ListItemsWithFeedbackRequest,
  ListTaskOccurrencesByRangeRequest,
  ListTaskOccurrencesByRangeResponse,
  ListKeysResponse,
  ListKeysWithStatusResponse,
  ListLibraryRootRequest,
  ListRecentAccessibleByUserRequest,
  ListSharedByUserRequest,
  ListSharedWithUserRequest,
  LogVisitRequest,
  MetadataResponse,
  PasskeyAuthenticateRequest,
  PasskeyAuthenticateResponse,
  PasskeyChallengeRequest,
  PasskeyChallengeResponse,
  PasskeyCredential,
  PasskeyDeleteRequest,
  RemoveRecoveryKeyFromServerRequest,
  PasskeyListResponse,
  PasskeyRegisterRequest,
  PasskeyRegisterResponse,
  PermissionOverrideRequest,
  PipelineResultsResponse,
  ReadLaterFeedRequest,
  RediscoverQueueRequest,
  RegisterRequest,
  RegisterResponse,
  RemoveLogEntryRequest,
  SaveCollectionItemDetailsRequest,
  SaveItemRequest,
  SaveItemResponse,
  SavePostAttachmentToLibraryRequest,
  SavePostAttachmentToLibraryResponse,
  SaveMetaTempRequest,
  SearchMainRequest,
  SignInRequest,
  AuthResponse,
  StandaloneAppBootstrapRequest,
  StandaloneAppBootstrapResponse,
  StandaloneAppListRequest,
  StandaloneAppListResponse,
  SubscribeToPublishedRequest,
  SwitchUserRequest,
  SharedFeedbackFeedListRequest,
  SharedFeedbackFeedListResponse,
  SharedFeedbackFeedMarkSeenRequest,
  SharedFeedbackFeedMarkSeenResponse,
  SyncStatusResponse,
  TempDisableBlockingStatusResponse,
  SourcePriorityClassificationResponse,
  UpdateActivityLogRequest,
  RecordInAppActivityRequest,
  UpdateItemRequest,
  UpdatePostEncInfoRequest,
  UpdateProfileImageRequest,
  UpdatePublicProfileRequest,
  UpdateUserInfoRequest,
  UrlContentSuggestionRequest,
  UrlContentSuggestionResponse,
  UsageSummaryResponse,
  UserTaskRequest,
  UserTaskStreamRequest,
  StreamCompleteEvent,
  TokenData,
  RefStateUpsertRequest,
  RefStateUpsertResponse,
  RefStateListRequest,
  RefStateListResponse,
  RefStateDeleteRequest,
  RefStateDeleteResponse,
  BannerCatalogSearchRequest,
  BannerCatalogSearchResponse,
  BannerRecommendRequest,
  BannerRecommendResponse,
  AdminBannerListResponse,
  AdminBannerGenerateRequest,
  AdminBannerGenerateResponse,
  AdminBannerGenerateFromPromptRequest,
  AdminBannerGenerateFromPromptResponse,
  AdminBannerSuggestPromptRequest,
  AdminBannerSuggestPromptResponse,
  AdminBannerPublishRequest,
  AdminBannerPublishResponse,
  AdminBannerTestLocalRequest,
  AdminBannerTestLocalResponse,
  AdminBannerGeneratorSaveRequest,
  AdminBannerGeneratorSelectRequest,
  AdminBannerGeneratorDeleteRequest,
  AdminBannerGeneratorResponse,
  AdminBannerSaveRequest,
  AdminBannerCreateRequest,
  AdminBannerMutateResponse,
  AdminBannerBulkStyleRequest,
  AdminBannerBulkStyleResponse,
  AdminBannerStyleAddRequest,
  AdminBannerStyleDeleteRequest,
  AdminBannerStylesResponse,
  AdminBannerEnhanceRequest,
  AdminBannerEnhanceResponse,
  AdminBannerInpaintRequest,
  AdminBannerInpaintResponse,
  AdminBannerCategoryAddRequest,
  AdminBannerCategoryAddResponse,
  AdminBannerHideRequest,
  AdminBannerDeleteRequest,
  AdminBannerDeleteResponse,
  AdminBannerSuggestionsRequest,
  AdminBannerSuggestionsResponse,
  AdminBannerSuggestionAddRequest,
  FreeImageSearchRequest,
  FreeImageSearchResponse,
  FreeImageFetchRequest,
  FreeImageFetchResponse,
  AdminCategorySetsResponse,
  AdminCategorySetSaveRequest,
  AdminCategorySetDeleteRequest,
  AdminCategorySetUploadIconRequest,
  AdminCategorySetUploadIconResponse,
  AdminCategoryCoverageResponse,
  CategorySetsResponse,
  PublishedCategoryCoverageResponse,
  AdminAiConfigResponse,
  AdminAiConfigSaveRequest,
  AdminDashboardStatsResponse,
  EmbeddingCacheClearRequest,
  EmbeddingCacheClearResponse,
  EmbeddingCacheGetRequest,
  EmbeddingCacheGetResponse,
  EmbeddingCachePutRequest,
  EmbeddingCachePutResponse,
  EmbeddingCacheStatsRequest,
  EmbeddingCacheStatsResponse,
  CurationQueueEntry,
  CurationReviewAiDraft,
  CurationReviewCuratorView,
  CurationReviewForCuratorResponse,
  CurationReviewListForItemResponse,
  CurationReviewQueueEntry,
  CurationReviewSaveRequest,
  OwnerPublishStatus,
  PublishResult,
  GetServerSettingsRequest,
  ServerSettingsView,
  UpdateServerSettingsRequest,
  DiscoverServersRequest,
  DiscoverServersResponse,
  CheckServerUrlRequest,
  CheckServerUrlResponse,
} from "./api-types";

import type { AccountType } from "../types/user.types";
import type { StoredFamilyPolicyRule } from "../types/family-policy.types";
import type { DeviceGuardStatus, DeviceAppInventory, DeviceAppPolicy, CompanionDeviceView, CompanionProbeResult, CompanionOpenTarget, DesktopBridgeStatus, CompiledDeviceRuleSet, DeviceSettingsCurrentRequest, DeviceSettingsCurrentResponse } from "../types/device-guard.types";
import type { LessonGenRequest, LessonGenResponse, LessonGradeRequest, LessonGradeResponse } from "../lesson.utils";

import type { KeyEntry } from "../shared.types";

import UserFile from "../schemas/public/UserFile";
import type {
  ActivityLogEntry,
  AuthInfo,
  ClassificationRequestInfo,
  ClientInfoView,
  ManagedClientSessionView,
  CommentInfo,
  EncInfo,
  EncStatus,
  FeedListResponse,
  FileRefInfo,
  ItemChangeLogUpdate,
  // Domain types only (NOT request/response types)
  ItemInfoView,
  ItemInfoViewWithSearchFields,
  ItemMeta,
  ItemReaction,
  SharedItemReactionView,
  ItemRelationshipInfo,
  MatchResult,
  MiscNotificationStats,
  Notification,
  PathTreeNode,
  PermissionType,
  PermissionWithUser,
  PluginListResponse,
  Post,
  Published,
  PublishedFeedItem,
  PublishedInfoView,
  PublishedMapFeedRow,
  ReactionInfo,
  ResourceFetchInfoResponse,
  ServerVersionInfo,
  StreamResult,
  SubscriptionInfo,
  SubscriptionRefType,
  UserFeed,
  UserOptions,
  UserPublic,
  UserType,
  UserView,
} from "../shared.types";
import { AccountOptions } from "../schemas/public/Account";
import type { SystemOptions } from "../schemas/public/Account";
import type { TaskCompletion, TaskDefinition } from "../types/task.types";
import type { EventDefinition, EventOccurrenceView } from "../types/event.types";

// Types previously referenced with inline import() syntax, which the request-schema generator
// cannot resolve. Same types, ordinary imports.
import type {SiteOverridesEnvelope} from '../content.types';
import type {EduValue} from '../shared.types';
import type {ArticleAnalyzeRequest, ArticleAnalyzeResponse} from '../types/articleTrust.types';
import type {DailyRewardStates, RewardSettings} from '../types/reward.types';
import type {CheckpointRelease, CheckpointTaskGateStatus} from '../types/usage-limits.types';
import type {TaskCompletionStatus} from '../types/task.types';
import type {ArtifactDeleteRequest, ArtifactDeleteResponse, ArtifactGetRequest, ArtifactGetResponse, ArtifactListRequest, ArtifactListResponse, ArtifactSyncPendingRequest, ArtifactSyncPendingResponse, ArtifactUpsertRequest, ArtifactUpsertResponse, GetClassificationEvalProgramStatusRequest, GetClassificationEvalProgramStatusResponse, GetGroupedEntriesSinceRequest, GetGroupedEntriesSinceResponse, PlatformAlertReceiverView, GetSessionSummarySnapshotRequest, GetSessionSummarySnapshotResponse, GetTopicAttentionRequest, GetTopicAttentionResponse, GetUsageInsightsReportRequest, GetUsageInsightsReportResponse, GetUsageSessionsSinceRequest, GetUsageSessionsSinceResponse, InvalidateActivityMonitorsRequest, InvalidateActivityMonitorsResponse, LearnedClassifierArtifact, ReportClassificationIssueRequest, ReportClassificationIssueResponse, SaveUserActivityLogResponse, UploadClassificationDatasetSamplesRequest, UploadClassificationDatasetSamplesResponse, UploadImageClassificationSamplesRequest, UploadImageClassificationSamplesResponse, UsageLogCollapseMode, UserActivityLogListResponse} from './api-types';

/** Queue widths as the classifier currently has them, with the build's defaults alongside. */
export type ImageClassifyQueueWidths = {
  maxConcurrentFetches: number;
  maxConcurrentClassifications: number;
  defaults: {maxConcurrentFetches: number; maxConcurrentClassifications: number};
};

/** Durable verdict cache state. `supported` is the browser; `available` is this profile. */
export type ImageVerdictCacheStatus = {
  supported: boolean;
  available: boolean;
  disabled: boolean;
  entries: number;
  schema: number;
  /** The cache's key namespace: schema + runtime + model tag, or null before it is published. */
  namespace: {schema: number; runtime: string; modelTag: string} | null;
  lastSweepAt: number;
  stats: {lookups: number; hits: number; writes: number; swept: number};
};

export interface ApiRouteMap {
  "/": { request: {}; response: void };

  '/standaloneApp/bootstrap': {
    request: StandaloneAppBootstrapRequest;
    response: StandaloneAppBootstrapResponse;
  };

  '/standaloneApp/list': {
    request: StandaloneAppListRequest;
    response: StandaloneAppListResponse;
  };

  // Local encryption at rest (client-side) - currently dev-only controls
  "/localAtRest/getSettings": {
    request: { accountId: string };
    response: {
      settings: {
        enabled: boolean;
        rememberDeviceMode: 'sessionOnly' | 'notImplementedYet';
        autoInitKeyset: boolean;
      };
      hasWrappedKeyset: boolean;
      keysetCreatedAtMs: number | null;
    };
  };
  "/localAtRest/setSettings": {
    request: {
      accountId: string;
      patch: {
        enabled?: boolean;
        rememberDeviceMode?: 'sessionOnly' | 'notImplementedYet';
        autoInitKeyset?: boolean;
      };
    };
    response: {
      settings: {
        enabled: boolean;
        rememberDeviceMode: 'sessionOnly' | 'notImplementedYet';
        autoInitKeyset: boolean;
      };
      hasWrappedKeyset: boolean;
      keysetCreatedAtMs: number | null;
    };
  };
  "/localAtRest/lock": {
    request: { accountId?: string };
    response: { ok: true };
  };
  "/localAtRest/initKeyset": {
    request: { accountId: string };
    response: { ok: boolean; created: boolean; keysetCreatedAtMs: number | null };
  };

  "/localAtRest/getKeyAccess": {
    request: { accountId: string };
    response: { ok: boolean; hasKeyManager: boolean; hasAcntSecretKey: boolean };
  };

  "/localAtRest/sampleEncryptDecrypt": {
    request: {
      accountId: string;
      payload: any;
      ctx?: { schemaVersion?: number; recordType?: string; recordId?: string; fieldPath?: string };
    };
    response: {
      ok: boolean;
      envelope: { format: 'atrest-v1'; alg: 'AES-GCM'; keyId: string; iv: string; data: string };
      decrypted: any;
      aad: { schemaVersion: number; acntId: string; recordType: string; recordId: string; fieldPath?: string };
    };
  };

  "/localAtRest/migrateAiSessionKv": {
    request: { accountId: string };
    response: {
      ok: boolean;
      migrated: number;
      skipped: number;
      errors: Array<{ key: string; error: string }>;
    };
  };

  "/localAtRest/userKv/get": {
    request: { key: string };
    response: any;
  };

  "/localAtRest/userKv/set": {
    request: { key: string; value: any };
    response: { ok: true };
  };

  "/localAtRest/userKv/clear": {
    request: { key: string };
    response: { ok: true };
  };

  // Article trust: source-reputation lookup + rule-based analysis.
  // Backend-driven and non-LLM by default (optional LLM enrichment is off by default).
  "/article/analyze": {
    request: ArticleAnalyzeRequest;
    response: ArticleAnalyzeResponse;
  };

  // Tasks
  "/task/list": {
    request: { assignedToUserId?: string; includeArchived?: boolean };
    response: { tasks: TaskDefinition[] };
  };
  "/task/upsert": {
    request: { task: TaskDefinition };
    response: { task: TaskDefinition };
  };
  "/task/archive": {
    request: { taskId: string; archived: boolean };
    response: { success: true };
  };
  "/task/complete": {
    request: { completion: TaskCompletion };
    response: { completion: TaskCompletion };
  };
  "/task/skip": {
    request: { completion: TaskCompletion };
    response: { completion: TaskCompletion };
  };
  "/task/snooze": {
    request: { taskId: string; snoozeMs?: number };
    response: { task: TaskDefinition };
  };
  "/task/uncomplete": {
    request: { taskId: string; userId: string; occurrenceStartMs: number };
    response: { success: true };
  };
  "/task/status/list": {
    request: { userId: string; nowMs?: number };
    response: {
      nowMs: number;
      due: Array<{
        task: TaskDefinition;
        occurrenceStartMs: number;
        completed: boolean;
        completionStatus?: TaskCompletionStatus;
        completionAtMs?: number;
        completionNote?: string;
        completedByUserId?: string;
        dueAtMs?: number;
        overdue?: boolean;
      }>;
    };
  };
  "/task/occurrences/listByRange": {
    request: ListTaskOccurrencesByRangeRequest;
    response: ListTaskOccurrencesByRangeResponse;
  };

  // Daily Check-in task gate. Client background route only — there is no server
  // handler, because task state is client-side and encrypted. Read-only: the
  // gate that refuses a clear lives on /user/checkpoint/clear.
  "/checkpoint/taskgate/status": {
    request: { userId?: string | null; forceRefresh?: boolean };
    response: CheckpointTaskGateStatus;
  };

  // Calendar events. Client background routes only — there are no server
  // handlers, for the same reason tasks have none: an event is an item whose
  // times, title and location live in the encrypted `info` blob, so only a
  // signed-in client can read or expand them.
  "/event_items/upsert": {
    request: { event: EventDefinition };
    response: { event: EventDefinition };
  };
  "/event_items/get": {
    request: { eventId: string };
    response: { event: EventDefinition | null };
  };
  "/event_items/archive": {
    request: { eventId: string; archived: boolean };
    response: { success: true };
  };
  "/event_items/listForUser": {
    request: { userId: string; includeArchived?: boolean };
    response: { events: EventDefinition[] };
  };
  "/event/occurrences/listByRange": {
    request: { userId: string; startMs: number; endMs: number };
    response: { nowMs: number; occurrences: EventOccurrenceView[] };
  };

  // Rewards
  "/reward/state/get": {
    request: { userId?: string | null };
    response: {
      rewardSettings: RewardSettings;
      dailyState: DailyRewardStates;
      triggerProgress: Record<string, { progressMinutes?: number; completedTaskIds?: string[] }>;
    };
  };
  "/reward/claim": {
    request: { userId?: string | null; rewardRuleId: string };
    response: { success: boolean; error?: string };
  };
  "/reward/grant/manual": {
    request: { userId?: string | null; rewardRuleId: string };
    response: { success: boolean; error?: string };
  };

  "/user/showcase/get": {
    request: { tempAuthToken?: TokenData };
    response: {
      entries: Array<{
        publishId: string;
        addedAtMs?: number;
        label?: string | null;
        groupId?: string | null;
      }>;
      config?: Record<string, any> | null;
      publicEnabled: boolean;
    };
  };
  "/user/showcase/update": {
    request: {
      entries?: Array<{
        publishId: string;
        addedAtMs?: number;
        label?: string | null;
        groupId?: string | null;
      }>;
      /** Back-compat: older clients can still send a list of publishIds. */
      publishIds?: string[];
      config?: Record<string, any> | null;
      publicEnabled?: boolean;
      tempAuthToken?: TokenData;
    };
    response: void;
  };

  // Library Showcase Collection (private, per-user system collection)
  "/collection/showcase/create": {
    request: Partial<CreateCollectionRequest> & { userId?: string };
    response: string; // collectionId
  };
  "/collection/showcase/get": {
    request: { userId?: string };
    response: string | null; // collectionId
  };

  "/collection/showcase/repairFriendEncryption": {
    request: { userId?: string };
    response:
      | { success: true; itemCount: number }
      | { success: false; message: string };
  };

  "/collection/healChildEncryptionKeys": {
    request: { collectionId: string; maxDepth?: number };
    response: { success: true; maxDepth: number } | { success: false; message: string };
  };
  "/user/showcase/getByPublicId": {
    request: { publicId: string };
    response: {
      entries: Array<{
        publishId: string;
        addedAtMs?: number;
        label?: string | null;
        groupId?: string | null;
      }>;
      config?: Record<string, any> | null;
    };
  };

  "/user/showcase/getByUserId": {
    request: { userId: string };
    response: {
      entries: Array<{
        publishId: string;
        addedAtMs?: number;
        label?: string | null;
        groupId?: string | null;
      }>;
      config?: Record<string, any> | null;
    };
  };

  // Task Items (v1: Tasks as Items)
  "/task_items/upsert": {
    request: { task: TaskDefinition };
    response: { task: TaskDefinition };
  };
  "/task_items/listAssigned": {
    request: { userId: string; includeArchived?: boolean };
    response: { tasks: Array<TaskDefinition> };
  };
  "/task_items/assignees": {
    request: { taskId: string };
    response: { assignees: Array<{ _id: string; label: string }> };
  };
  // The collections each task is in, for the Tasks page's labels and collection filters.
  // Client background route only. Only collections the signed-in person can read are
  // returned, so a collection they cannot open is never named. `collectionIds` names
  // extra collections (a remembered filter) that no listed task is in.
  "/task_items/collections": {
    request: { taskIds: string[]; collectionIds?: string[] };
    response: {
      collectionIdsByTaskId: Record<string, string[]>;
      collections: Array<{ _id: string; name: string }>;
    };
  };

  // Task completion via RefState (user-owned)
  "/task_completion/upsert": {
    request: {
      taskId: string;
      occurrenceStartMs: number;
      completed: boolean;
      note?: string;
      evidenceSummary?: { type: 'manual' | 'activity' | 'item_reference' | 'questionnaire'; details?: any };
      completionData?: any;
    };
    response: { entry: any };
  };
  "/task_completion/listForTask": {
    request: { taskId: string; ownerId?: string; limit?: number };
    response: { entries: any[]; nextCursorUpdatedAt?: string };
  };

  // Lesson progress & quiz scores via RefState (user-owned, item-scoped)
  "/lesson_progress/get": {
    request: { lessonItemId: string; ownerId?: string };
    response: { position: any; attemptsByQuiz: Record<string, any> };
  };
  "/lesson_progress/savePosition": {
    request: {
      lessonItemId: string;
      ownerId?: string;
      completedThroughKey?: string | null;
      currentStepKey?: string | null;
      visitedStepKeys?: string[];
      progressPct?: number;
      completed?: boolean;
      completedAtMs?: number;
      bestOverallScorePct?: number;
      lastOverallScorePct?: number;
      startedAtMs?: number;
    };
    response: { entry: any };
  };
  "/lesson_progress/recordQuizAttempt": {
    request: {
      lessonItemId: string;
      ownerId?: string;
      quizStepKey: string;
      answers: Record<string, any>;
      earned: number;
      total: number;
      pct: number;
      passed: boolean;
    };
    response: any;
  };
  "/lesson_progress/reset": {
    request: { lessonItemId: string; ownerId?: string; quizStepKeys: string[] };
    response: { success: boolean };
  };

  // Background route: proxies to the server's /article/analyze, or short-circuits to
  // { status: 'offline' } in local mode.
  "/monitor/analyzeContent": {
    request: { url?: string; title?: string; text?: string; byline?: string };
    response: any;
  };

  // Dev-only dataset generation: drives real tabs through the classification pipeline so
  // its output can be exported as labelled samples. Background-only, never a server route.
  "/datasetgen/status": {
    request: {};
    response: { localMode: boolean; canRunTabs: boolean; running: boolean };
  };
  "/datasetgen/run": {
    request: { urls?: string[]; concurrency?: number; dwellMs?: number; loadTimeoutMs?: number };
    response: any;
  };
  "/datasetgen/export": {
    request: {};
    response: { count: number; records: Array<Record<string, any>> };
  };
  "/datasetgen/clear": {
    request: {};
    response: any;
  };

  // Personal lesson generation (user-scoped, metered). Returns a plaintext draft
  // the builder shows for review/edit before the client encrypts + saves it.
  "/usertask/lessonGen/generate": {
    request: LessonGenRequest;
    response: LessonGenResponse;
  };
  "/usertask/lessonGen/grade": {
    request: LessonGradeRequest;
    response: LessonGradeResponse;
  };
  "/access_request/add": {
    request: { key: string; type?: string; details?: any; message?: string };
    response: AccessRequestAddResponse;
  };
  "/access_request/listall": {
    request: {};
    response: Array<{
      id: string;
      userId: string;
      resourceId: string;
      status: string;
    }>;
  };
  "/access_request/listForUser": {
    request: { userId?: string };
    response: Array<{
      id: string;
      resourceId: string;
      status: string;
      requestedAt: number;
    }>;
  };
  "/access_request/process": {
    request: { id: string; status: string; approverNote?: string };
    response: void;
  };
  "/access_request/remove": { request: { id: string }; response: void };
  "/access_request/reviewStatus": {
    request: {};
    response: { enabled: boolean; remainingThisWeek: number | null };
  };
  "/account/content/getTermDict": {
    request: { key: string };
    response: { terms: string[] };
  };
  "/account/delete": { request: { confirmation: string }; response: void };
  "/account/getSpaceUsage": {
    request: {};
    response: {
      tables: Array<{ tableName: string; filesize: number; filerow: number }>;
      userFileData: number;
      totalUsage: number;
    };
  };

  "/account/extendedFeatures/get": {
    request: {};
    response: { extendedFeatures: NonNullable<SystemOptions["extendedFeatures"]> };
  };

  "/account/extendedFeatures/update": {
    request: { updates: NonNullable<SystemOptions["extendedFeatures"]> };
    response: { success: true };
  };

  /**
   * Family-wide key custody policy (D5). Turning it on is refused while any member
   * still has key material on the server, so the response reports who is blocking.
   */
  "/account/keyStoragePolicy/update": {
    request: { noServerKeyStorage: boolean };
    response: {
      noServerKeyStorage: boolean;
      blockedBy?: Array<{ userId: string; displayedName: string }>;
    };
  };
  "/account/info": {
    request: { forceSubSync?: boolean };
    response: AccountInfoResponse;
  };
  "/account/invites/cancel": { request: { code: string }; response: void };
  "/account/invites/list": {
    request: {};
    response: Array<{
      id: string;
      code: string;
      email?: string;
      status: string;
    }>;
  };
  "/account/options/update": {
    request: { options: AccountOptions };
    response: void;
  };
  "/account/assistantReview/update": {
    request: {
      targetUserId?: string;
      entry?: { presets: string[]; customText: string } | null;
      /**
       * Append one line to the existing free text instead of replacing the entry.
       *
       * Exists because the alternative — read the entry, concatenate, send it back —
       * is exactly the lost-update race this route was created to close: two
       * guardians appending at the same moment would each overwrite the other.
       * Mutually exclusive with `entry`.
       */
      appendCustomText?: string;
      /**
       * Save or remove one reusable template. A patch for the same reason the rest of this
       * route is: sending the whole array back would let two guardians drop each other's.
       * Mutually exclusive with `entry` and `appendCustomText`.
       */
      template?:
        | {save: {id?: string; name: string; entry: {presets: string[]; customText: string}}}
        | {remove: string};
    };
    response: void;
  };

  /**
   * Family Downtime (`restrictions/familyDowntime.ts`). Admin-only, each a patch on the account's
   * `familyDowntime` under a row lock, so two admins saving at once keep both edits. Every write
   * returns the stored settings.
   *
   * `update` replaces only the fields it is sent. Recurring schedules need the family timezone.
   */
  "/account/familyDowntime/update": {
    request: { enabled?: boolean; schedules?: FamilyDowntimeSchedule[]; allow?: FamilyDowntimeAllow };
    response: { familyDowntime: FamilyDowntimeSettings };
  };
  /** A one-off, including "Start now". Refused with a sentence when the times cannot be saved. */
  "/account/familyDowntime/oneOff/add": {
    request: { startAt: number; endAt: number };
    response: { familyDowntime: FamilyDowntimeSettings };
  };
  "/account/familyDowntime/oneOff/remove": {
    request: { id: string };
    response: { familyDowntime: FamilyDowntimeSettings };
  };
  /** Ends the downtime running now, for everyone. Tomorrow's schedule is untouched. */
  "/account/familyDowntime/endNow": {
    request: {};
    response: { familyDowntime: FamilyDowntimeSettings };
  };
  /** The calling admin only, until the downtime running now ends. Refused when it is not on. */
  "/account/familyDowntime/dismiss": {
    request: {};
    response: { familyDowntime: FamilyDowntimeSettings };
  };
  /**
   * Background only. The signed-in person's Family Downtime right now, from this device's account
   * copy. `view` is null when signed out.
   */
  "/familyDowntime/state": {
    request: {};
    response: { view: FamilyDowntimeView | null };
  };

  // RefState: generic state storage with optional client-side encryption
  "/ref_state/user/upsert": {
    request: RefStateUpsertRequest;
    response: RefStateUpsertResponse;
  };
  "/ref_state/user/list": {
    request: RefStateListRequest;
    response: RefStateListResponse;
  };
  "/ref_state/user/delete": {
    request: RefStateDeleteRequest;
    response: RefStateDeleteResponse;
  };
  "/ref_state/account/upsert": {
    request: RefStateUpsertRequest;
    response: RefStateUpsertResponse;
  };
  "/ref_state/account/list": {
    request: RefStateListRequest;
    response: RefStateListResponse;
  };
  "/ref_state/account/delete": {
    request: RefStateDeleteRequest;
    response: RefStateDeleteResponse;
  };
  "/familyPolicyRule/upsert": {
    request: FamilyPolicyRuleUpsertRequest;
    response: FamilyPolicyRuleUpsertResponse;
  };
  "/familyPolicyRule/list": {
    request: FamilyPolicyRuleListRequest;
    response: FamilyPolicyRuleListResponse;
  };
  "/familyPolicyRule/delete": {
    request: FamilyPolicyRuleDeleteRequest;
    response: FamilyPolicyRuleDeleteResponse;
  };

  // Local-only: item-attached site CSS, resolved in the client background
  "/sitestyle/saveEntry": {
    request: SiteStyleSaveEntryRequest;
    response: SiteStyleSaveEntryResponse;
  };

  "/sitestyle/revertEntry": {
    request: SiteStyleRevertEntryRequest;
    response: SiteStyleRevertEntryResponse;
  };

  "/sitestyle/generate": {
    request: SiteStyleGenerateRequest;
    response: SiteStyleGenerateResponse;
  };

  "/sitestyle/reportMatch": {
    request: SiteStyleReportMatchRequest;
    response: SiteStyleReportMatchResponse;
  };

  "/sitestyle/matchReports": {
    request: SiteStyleMatchReportsRequest;
    response: SiteStyleMatchReportsResponse;
  };

  "/sitestyle/list": {
    request: SiteStyleListRequest;
    response: SiteStyleListResponse;
  };

  "/sitestyle/forUrl": {
    request: SiteStyleForUrlRequest;
    response: SiteStyleForUrlResponse;
  };

  // Local-only session state (handled in client background, not the server)
  "/ref_state/session/upsert": {
    request: RefStateUpsertRequest;
    response: RefStateUpsertResponse;
  };
  "/ref_state/session/list": {
    request: RefStateListRequest;
    response: RefStateListResponse;
  };
  "/ref_state/session/delete": {
    request: RefStateDeleteRequest;
    response: RefStateDeleteResponse;
  };

  // Artifacts: local-first store with immediate sync (client background)
  "/artifact/upsert": {
    request: ArtifactUpsertRequest;
    response: ArtifactUpsertResponse;
  };
  "/artifact/get": {
    request: ArtifactGetRequest;
    response: ArtifactGetResponse;
  };
  "/artifact/list": {
    request: ArtifactListRequest;
    response: ArtifactListResponse;
  };
  "/artifact/delete": {
    request: ArtifactDeleteRequest;
    response: ArtifactDeleteResponse;
  };
  "/artifact/syncPending": {
    request: ArtifactSyncPendingRequest;
    response: ArtifactSyncPendingResponse;
  };
  "/account/stats": {
    request: {};
    response: { userCount: number; itemCount: number; collectionCount: number };
  };
  "/account/users": { request: {}; response: UserView[] };
  "/activity/clearHistory": { request: { userId?: string }; response: void };
  "/activity/expireRemoteState": { request: { userId?: string | null }; response: any };
  "/activity/getCurrentUsageSummary": {
    request: GetUsageSummaryRequest;
    response: UsageSummaryResponse;
  };
  "/activity/getUsageInsightsReport": {
    request: GetUsageInsightsReportRequest;
    response: GetUsageInsightsReportResponse;
  };
  "/activity/lookupChannelNames": {
    request: { channelIds: string[] };
    response: { names: Record<string, string> };
  };
  "/activity/getTopicAttention": {
    request: GetTopicAttentionRequest;
    response: GetTopicAttentionResponse;
  };
  "/activity/getUrlRuleExplanation": {
    request: GetUrlRuleExplanationRequest;
    response: GetUrlRuleExplanationResponse;
  };
  "/activity/getPipelineSettings": {
    request: { userId?: string; createdAt: number };
    response: any;
  };
  "/activity/getUsageSince": {
    request: { userId?: string; createdAt: number; collapseMode?: UsageLogCollapseMode };
    response: any[];
  };
  "/activity/getGroupedEntriesSince": {
    request: GetGroupedEntriesSinceRequest;
    response: GetGroupedEntriesSinceResponse;
  };
  "/activity/getSessionsSince": {
    request: GetUsageSessionsSinceRequest;
    response: GetUsageSessionsSinceResponse;
  };
  "/activity/getSessionSummarySnapshot": {
    request: GetSessionSummarySnapshotRequest;
    response: GetSessionSummarySnapshotResponse;
  };
  "/activity/list": {
    request: { userId?: string; limit?: number };
    response: any[];
  };
  "/activity/removeLogEntry": {
    request: RemoveLogEntryRequest;
    response: void;
  };
  "/activity/reportClassificationIssue": {
    request: ReportClassificationIssueRequest;
    response: ReportClassificationIssueResponse;
  };
  "/activity/getClassificationEvalProgramStatus": {
    request: GetClassificationEvalProgramStatusRequest;
    response: GetClassificationEvalProgramStatusResponse;
  };
  "/activity/uploadClassificationDatasetSamples": {
    request: UploadClassificationDatasetSamplesRequest;
    response: UploadClassificationDatasetSamplesResponse;
  };
  "/activity/uploadImageClassificationSamples": {
    request: UploadImageClassificationSamplesRequest;
    response: UploadImageClassificationSamplesResponse;
  };
  "/activity/syncUsageLog": { request: {}; response: any };
  "/activityMonitor/startFrameEventTrackingForCurrentTab": {
    request: { url: string; userId?: string };
    response: void;
  };
  "/activityMonitor/update": {
    request: UpdateActivityLogRequest;
    response: void;
  };
  "/activityMonitor/recordInApp": {
    request: RecordInAppActivityRequest;
    response: void;
  };
  "/admin/account/changeSysOptions": {
    request: { accountId: string; optionName: string; optionValue: any };
    response: void;
  };
  /** A family's 5-hour and weekly AI limits as they stand, and its grants of extra AI usage. */
  "/admin/aiLimits/getAccount": {
    request: { accountId: string };
    response: { state: AiLimitState; grants: AiExtraUsageGrantView[] };
  };
  /** Give a family extra AI usage, spent once a limit is used up. `expiresAt` is ISO, or null for none. */
  "/admin/aiExtraUsage/grant": {
    request: { accountId: string; usd: number; expiresAt?: string | null; note?: string | null };
    response: AiExtraUsageGrantView;
  };
  /** Revoke a grant: what is left of it can no longer be spent. */
  "/admin/aiExtraUsage/revoke": {
    request: { grantId: string };
    response: AiExtraUsageGrantView;
  };
  /** Turn hosted AI off or back on for a family. */
  "/admin/aiLimits/setHostedStopped": {
    request: { accountId: string; stopped: boolean };
    response: { accountId: string; stopped: boolean };
  };
  "/admin/account/changeType": {
    request: { accountId: string; accountType: AccountType };
    response: void;
  };
  "/admin/account/info": {
    request: { accountId: string };
    response: {
      id: string;
      name: string;
      accountType: AccountType;
      users: UserView[];
    };
  };
  "/admin/rollout/readiness": {
    request: { accountId: string };
    response: {
      reports: Array<{
        capKey: string;
        description: string;
        minClientVersion: string;
        ready: boolean;
        enabled: boolean;
        activeWindowDays: number;
        fleet: Array<{
          userId: string | null;
          appType: string | null;
          appVersion: string | null;
          lastSeen: string | null;
          ok: boolean;
          reason?: string;
        }>;
        blockedBy: string[];
      }>;
    };
  };
  "/admin/rollout/setReady": {
    request: { accountId: string; capKey: string; enabled: boolean; force?: boolean };
    response: { capKey: string; enabled: boolean; ready: boolean; blockedBy: string[] };
  };
  "/admin/contactrequest/list": {
    request: { pageInfo?: any };
    response: { records: any[]; count: number | null };
  };
  "/admin/contactrequest/update": {
    request: { id: string; processed: boolean; processNote?: string | null };
    response: any;
  };
  "/admin/alertReceivers/list": {
    request: {};
    response: { receivers: PlatformAlertReceiverView[] };
  };
  "/admin/alertReceivers/add": {
    request: { usernameOrEmail: string; note?: string };
    response: { receivers: PlatformAlertReceiverView[] };
  };
  "/admin/alertReceivers/remove": {
    request: { userId: string };
    response: { receivers: PlatformAlertReceiverView[] };
  };
  "/admin/user/stats": {
    request: {};
    response: { total: number; active7: number; active30: number; new30: number; disabled: number };
  };
  "/admin/dataRetention/run": {
    request: {};
    response: {
      tableResults: Array<{ table: string; deleted: number }>;
      deletedTotal: number;
      durationMs: number;
      completedAt: string;
    };
  };
  "/admin/rateLimit/get": {
    request: {};
    response: {
      enabled: boolean;
      /** Whether the live value comes from the runtime override or RATE_LIMITING_ENABLED. */
      source: "runtime_override" | "environment";
      envDefaultEnabled: boolean;
      /** Non-null when the last override read failed; the reported value is then stale. */
      lastError: string | null;
      pollIntervalMs: number;
    };
  };
  "/admin/rateLimit/set": {
    /** `disabled: null` clears the override and reverts to RATE_LIMITING_ENABLED. */
    request: { disabled: boolean | null };
    response: {
      enabled: boolean;
      source: "runtime_override" | "environment";
      envDefaultEnabled: boolean;
      lastError: string | null;
      pollIntervalMs: number;
    };
  };
  /**
   * The security ledger, summarised for the admin console.
   *
   * One call rather than three: the page shows totals, sources and a recent list together,
   * and splitting them would let the three disagree about which window they describe.
   */
  "/admin/security/summary": {
    request: {
      /** Window to summarise. Server clamps to a small allowed set. */
      hours?: number;
    };
    response: {
      windowHours: number;
      generatedAt: string;
      totalOccurrences: number;
      counts: Array<{
        eventType: string;
        severity: "info" | "warn" | "critical";
        /** Sum of coalesced occurrences, not the row count. */
        occurrences: number;
        rows: number;
      }>;
      /** Grouped to a /24 or /48 — the ledger never stores a raw address. */
      sources: Array<{ ipPrefix: string; occurrences: number }>;
      recent: Array<{
        _id: string;
        eventType: string;
        severity: "info" | "warn" | "critical";
        ipPrefix: string | null;
        route: string | null;
        actorAccountId: string | null;
        actorUserId: string | null;
        occurrences: number;
        createdAt: string;
      }>;
      /** What the digest would raise for this window right now. */
      findings: Array<{
        key: string;
        severity: "warn" | "critical";
        title: string;
        detail: Record<string, string | number>;
      }>;
      /** Shown beside the events, because "is limiting even on?" changes how to read them. */
      rateLimiting: {
        enabled: boolean;
        source: "runtime_override" | "environment";
      };
    };
  };
  "/admin/security/key0Sweep": {
    request: {
      /** Defaults to TRUE — mutation is opt-in. Pass false to actually tombstone. */
      dryRun?: boolean;
    };
    response: {
      dryRun: boolean;
      /** Live password-wrapped user-secret copies examined, across all users. */
      scanned: number;
      /** Users with a real password — their entry is a genuine unlock method, never touched. */
      skippedUserHasPassword: number;
      /** Entry's owner missing or deleted — left alone. */
      skippedUserMissing: number;
      /** Positively identified: the payload decrypts under the KEY-0 constant. */
      confirmedConstant: number;
      /** Tombstoned this run (0 on a dry run). */
      removed: number;
      /** Password-wrapped but NOT openable with the constant — left alone. */
      notConstant: number;
      /** Owners of confirmed entries, capped at 200. */
      confirmedUserIds: string[];
    };
  };
  "/admin/cache/list": {
    request: {
      filterBy: { resourceType?: string; sourceId?: string; search?: string } | null;
      pageInfo: {
        currentPage: number;
        perPage?: number;
        includeTotalRows?: boolean;
        sortBy?: string;
        sortDesc?: boolean;
      };
    };
    response: { records: any[]; count: number | null };
  };
  "/admin/cache/info": {
    request: { id: string };
    response: any;
  };
  "/admin/cache/stats": {
    request: {};
    response: any;
  };
  "/admin/cache/update": {
    request: {
      id: string;
      meta?: ItemMeta | null;
      extendedInfo?: any;
      sourceId?: string;
    };
    response: any;
  };
  "/admin/cache/delete": {
    request: { id: string };
    response: any;
  };
  "/admin/cache/deleteExpired": {
    request: {};
    response: { deletedCount: number };
  };
  "/admin/classificationEval/stats": {
    request: {};
    response: {
      feedbackReports: number;
      datasetSamples: number;
      distinctDatasets: number;
    };
  };
  "/admin/classificationEval/feedback/list": {
    request: {
      filterBy?: { userId?: string; search?: string } | null;
      pageInfo: {
        currentPage: number;
        perPage?: number;
        includeTotalRows?: boolean;
        sortBy?: string;
        sortDesc?: boolean;
      };
    };
    response: { records: any[]; count: number | null };
  };
  "/admin/classificationEval/feedback/delete": {
    request: { id: number };
    response: boolean;
  };
  "/admin/classificationEval/samples/list": {
    request: {
      filterBy?: { userId?: string; datasetId?: string; search?: string; mismatchOnly?: boolean } | null;
      pageInfo: {
        currentPage: number;
        perPage?: number;
        includeTotalRows?: boolean;
        sortBy?: string;
        sortDesc?: boolean;
      };
    };
    response: { records: any[]; count: number | null };
  };
  "/admin/classificationEval/datasets/list": {
    request: {
      filterBy?: { userId?: string; search?: string } | null;
      pageInfo: {
        currentPage: number;
        perPage?: number;
        includeTotalRows?: boolean;
        sortBy?: string;
        sortDesc?: boolean;
      };
    };
    response: {
      records: Array<{
        datasetId: string;
        rowCount: number;
        sampleCountTotal: number;
        userCount: number;
        lastSeenAt: string | null;
        comparableCount: number;
        mismatchCount: number;
        accuracy: number | null;
        // Registry decoration (null/defaulted when the dataset has no registry row).
        name?: string | null;
        task?: string;
        role?: string;
        frozen?: boolean;
      }>;
      count: number | null;
    };
  };
  "/admin/classificationEval/datasets/delete": {
    request: { datasetId: string };
    response: { deletedCount: number };
  };
  "/admin/classificationEval/datasets/buildFromCatalog": {
    request: {
      datasetId: string;
      perClass?: number;
      classes?: string[];
      curatedOnly?: boolean;
      includeStarterUrls?: boolean;
    };
    response: {
      datasetId: string;
      requested: number;
      fetched: number;
      inserted: number;
      skippedDuplicate: number;
      perClassRequested: Record<string, number>;
      perClassInserted: Record<string, number>;
      errors: Array<{ url: string; error: string }>;
    };
  };
  "/admin/classificationEval/datasets/buildFromUrls": {
    request: {
      datasetId: string;
      urls?: string[];
      feedUrls?: string[];
      eduValueHint?: string;
      maxPerFeed?: number;
    };
    response: {
      datasetId: string;
      requested: number;
      fetched: number;
      inserted: number;
      skippedDuplicate: number;
      errors: Array<{ url: string; error: string }>;
    };
  };
  "/admin/classificationEval/datasets/runGroundTruth": {
    request: {
      datasetId: string;
      maxSamples?: number;
      model?: string;
      onlyUnlabeled?: boolean;
      offset?: number;
      promptOverride?: string;
      sampleIds?: number[];
    };
    response: {
      datasetId: string;
      scanned: number;
      updated: number;
      failed: number;
      skipped: number;
      model: string;
    };
  };
  "/admin/classificationEval/datasets/runReplayClassification": {
    request: {
      datasetId: string;
      maxSamples?: number;
      classifierType?: 'source_priority' | 'task_runner';
      modelVersion?: string;
      runLabel?: string;
      modelConfigJson?: string;
    };
    response: {
      datasetId: string;
      runId: string;
      classifierType: string;
      scanned: number;
      updated: number;
      failed: number;
      skipped: number;
    };
  };
  "/admin/classificationEval/datasets/compareRuns": {
    request: {
      datasetId: string;
      runIdA: string;
      runIdB: string;
      maxSamples?: number;
    };
    response: {
      datasetId: string;
      runIdA: string;
      runIdB: string;
      scanned: number;
      bothPresent: number;
      mismatches: number;
      matches: number;
      missingRunA: number;
      missingRunB: number;
      mismatchSampleIds: number[];
    };
  };
  "/admin/classificationEval/samples/delete": {
    request: { id: number };
    response: boolean;
  };
  "/admin/classificationEval/samples/savePrediction": {
    request: { sampleId: number; eduValue: string | null; scores?: Record<string, number>; source?: string };
    response: { updated: boolean; eduValue: string | null };
  };
  "/admin/classificationEval/samples/saveLabelOverride": {
    request: { sampleId: number; humanOverride: string | null };
    response: { updated: boolean; humanOverride: string | null };
  };
  "/admin/classificationEval/datasets/recrawlPageText": {
    request: { datasetId: string; maxSamples?: number; offset?: number; onlyMissing?: boolean; sampleIds?: number[]; includeMetadata?: boolean };
    response: {
      datasetId: string;
      scanned: number;
      updated: number;
      failed: number;
      skipped: number;
      items: Array<{
        id: number;
        title: boolean;
        description: boolean;
        body: boolean;
        bodyReason: string | null;
        metaReason: string | null;
        outcome: "updated" | "failed" | "skipped";
      }>;
    };
  };
  "/admin/classificationEval/datasets/exportTrainingSamples": {
    request: { datasetId: string; offset?: number; limit?: number; onlyLabeled?: boolean };
    response: {
      datasetId: string;
      offset: number;
      limit: number;
      total: number;
      rows: Array<{
        id: number;
        pageData: { pageTitle: string | null; description: string | null; extractedText: string | null };
        groundTruth: any;
        sessionContext: any;
      }>;
    };
  };
  "/admin/classificationEval/datasets/exportFull": {
    request: { datasetId: string; offset?: number; limit?: number };
    response: {
      datasetId: string;
      offset: number;
      limit: number;
      total: number;
      rows: Array<{
        id: number;
        datasetId: string;
        sourceType: string;
        sourceId: string | null;
        sampleCount: number;
        lastSeenAt: string | null;
        createdAt: string | null;
        details: any;
      }>;
    };
  };
  "/admin/classificationEval/datasets/import": {
    request: {
      datasetId: string;
      rows: Array<{ details?: any; sourceType?: string | null; sampleCount?: number }>;
      preserveGroundTruth?: boolean;
    };
    response: { datasetId: string; received: number; inserted: number; updated: number; skipped: number };
  };
  "/admin/classificationEval/models/publish": {
    request: {
      version?: string;
      kind?: string;
      embeddingModelId?: string;
      artifact: LearnedClassifierArtifact;
      metrics?: any;
      datasetSnapshot?: any;
      activate?: boolean;
    };
    response: { version: string; kind: string; active: boolean; _id: number };
  };
  "/admin/classificationEval/models/list": {
    request: { kind?: string; limit?: number };
    response: { records: any[]; count: number };
  };
  "/admin/classificationEval/models/get": {
    request: { version: string };
    response: { record: any | null };
  };
  "/admin/classificationEval/models/activate": {
    request: { version: string };
    response: { version: string; active: boolean };
  };
  "/admin/classificationEval/models/delete": {
    request: { version: string };
    response: { deleted: boolean };
  };
  "/admin/classificationEval/anchors/generateCandidates": {
    request: { eduValueClass: string; n?: number; model?: string };
    response: { eduValueClass: string; phrases: string[]; model: string };
  };
  "/admin/classificationEval/anchors/save": {
    request: {
      version?: string;
      label?: string;
      anchors: Record<string, string[]>;
      metrics?: any;
      datasetId?: string;
      activate?: boolean;
    };
    response: { version: string; active: boolean; _id: number };
  };
  "/admin/classificationEval/anchors/list": {
    request: { limit?: number };
    response: {
      records: Array<{
        _id: number;
        version: string;
        label: string | null;
        anchors: Record<string, string[]>;
        metrics: any | null;
        datasetId: string | null;
        active: boolean;
        createdAt: string;
      }>;
    };
  };
  "/admin/classificationEval/anchors/activate": {
    request: { version: string };
    response: { version: string; active: boolean };
  };
  "/admin/classificationEval/anchors/getActive": {
    request: {};
    response: {
      version: string | null;
      label: string | null;
      anchors: Record<string, string[]> | null;
      metrics: any | null;
      datasetId: string | null;
      lastUpdatedAt: string | null;
    };
  };
  "/admin/classificationEval/anchors/delete": {
    request: { version: string };
    response: { deleted: boolean };
  };
  "/admin/classificationEval/labelPrompt/get": {
    request: {};
    response: { prompt: string; isCustom: boolean; default: string };
  };
  "/admin/classificationEval/labelPrompt/save": {
    request: { prompt: string };
    response: { prompt: string; isCustom: boolean };
  };
  "/admin/classificationEval/labelPrompt/reset": {
    request: {};
    response: { prompt: string; isCustom: boolean };
  };
  "/admin/classificationEval/datasets/create": {
    request: {
      datasetId: string;
      name?: string;
      description?: string;
      task?: string;
      role?: string;
      frozen?: boolean;
      sources: Array<{
        datasetId: string;
        mode?: "all" | "sample";
        limit?: number;
        onlyLabeled?: boolean;
        onlyDisagreements?: boolean;
        classes?: string[];
        samplingStrategy?: "first" | "random" | "balanced" | "newest" | "confidence";
        seed?: number;
      }>;
      dedupeByUrl?: boolean;
      excludeUrlsFrom?: string[];
    };
    response: { datasetId: string; inserted: number; perSource: Array<{ datasetId: string; copied: number }> };
  };
  "/admin/classificationEval/datasets/updateMeta": {
    request: { datasetId: string; name?: string; description?: string; task?: string; role?: string; frozen?: boolean };
    response: { datasetId: string; created: boolean };
  };
  "/admin/classificationEval/evalRuns/save": {
    request: {
      evalRunId?: string;
      task?: string;
      target?: string;
      testSetDatasetId: string;
      candidateKind: string;
      candidateRef?: any;
      candidateLabel?: string;
      runConfig?: any;
      status?: string;
      metrics: any;
      predictions: Array<{ sampleId: number; gold: string; predicted: string | null; scores?: Record<string, number> | null }>;
    };
    response: { evalRunId: string; testSetSignature: string; _id: number };
  };
  "/admin/classificationEval/evalRuns/list": {
    request: { testSetDatasetId?: string; task?: string; target?: string; candidateKind?: string; limit?: number };
    response: { records: any[]; count: number };
  };
  "/admin/classificationEval/evalRuns/get": {
    request: { evalRunId: string };
    response: { run: any; predictions: any[] } | null;
  };
  "/admin/classificationEval/evalRuns/delete": {
    request: { evalRunId: string };
    response: { deleted: boolean };
  };
  "/admin/classificationEval/models/classifySamples": {
    request: { datasetId: string; classifierType?: "source_priority" | "task_runner"; sampleIds?: number[]; maxSamples?: number };
    response: {
      datasetId: string;
      classifierType: string;
      predictions: Array<{ sampleId: number; predicted: string | null; restricted: boolean; confidence: number | null }>;
      scanned: number;
      failed: number;
      skipped: number;
    };
  };
  "/admin/classificationEval/models/classifyLlm": {
    request: { datasetId: string; model?: string; promptOverride?: string; sampleIds?: number[]; maxSamples?: number };
    response: {
      datasetId: string;
      model: string;
      predictions: Array<{ sampleId: number; predicted: string | null; restricted: boolean; confidence: number | null }>;
      scanned: number;
      failed: number;
      skipped: number;
    };
  };
  "/admin/contentBundles/get": {
    request: {};
    response: AdminContentBundleCatalogResponse;
  };
  "/admin/contentBundles/update": {
    request: AdminUpdateContentBundleCatalogRequest;
    response: AdminContentBundleCatalogResponse;
  };
  "/admin/contentBundles/reset": {
    request: {};
    response: AdminContentBundleCatalogResponse;
  };
  "/admin/setupCatalog/get": {
    request: {};
    response: AdminSetupCatalogResponse;
  };
  "/admin/setupCatalog/update": {
    request: AdminUpdateSetupCatalogRequest;
    response: AdminSetupCatalogResponse;
  };
  "/admin/setupCatalog/reset": {
    request: {};
    response: AdminSetupCatalogResponse;
  };
  // Thinking Puzzles content store (self-contained; not tied to published or library items)
  "/admin/thinkingPuzzles/list": {
    request: AdminPuzzleContentListRequest;
    response: AdminPuzzleContentListResponse;
  };
  "/admin/thinkingPuzzles/save": {
    request: AdminPuzzleContentSaveRequest;
    response: AdminPuzzleContentSaveResponse;
  };
  "/admin/thinkingPuzzles/setStatus": {
    request: AdminPuzzleContentSetStatusRequest;
    response: AdminPuzzleContentSaveResponse;
  };
  "/admin/thinkingPuzzles/delete": {
    request: AdminPuzzleContentDeleteRequest;
    response: AdminPuzzleContentDeleteResponse;
  };
  "/admin/thinkingPuzzles/importSeed": {
    request: AdminPuzzleContentImportSeedRequest;
    response: AdminPuzzleContentImportSeedResponse;
  };
  "/admin/contentLoader/dryRun": {
    request: AdminContentLoaderDryRunRequest;
    response: AdminContentLoaderDryRunResponse;
  };
  "/admin/contentLoader/execute": {
    request: AdminContentLoaderExecuteRequest;
    response: AdminContentLoaderExecuteResponse;
  };
  "/admin/contentLoader/uploadAsset": {
    request: AdminContentLoaderUploadAssetRequest;
    response: AdminContentLoaderUploadAssetResponse;
  };
  "/admin/contentSource/searchPodcasts": {
    request: AdminContentSourceSearchPodcastsRequest;
    response: AdminContentSourceSearchPodcastsResponse;
  };
  "/admin/contentSource/parseFeed": {
    request: AdminContentSourceParseFeedRequest;
    response: AdminContentSourceParseFeedResponse;
  };
  "/admin/contentSource/fetchUrls": {
    request: AdminContentSourceFetchUrlsRequest;
    response: AdminContentSourceFetchUrlsResponse;
  };
  "/admin/contentSource/draft/create": {
    request: AdminContentSourceCreateDraftRequest;
    response: AdminContentSourceCreateDraftResponse;
  };
  "/admin/contentSource/draft/list": {
    request: {};
    response: AdminContentSourceListDraftsResponse;
  };
  "/admin/contentSource/draft/get": {
    request: AdminContentSourceGetDraftRequest;
    response: AdminContentSourceGetDraftResponse;
  };
  "/admin/contentSource/draft/append": {
    request: AdminContentSourceAppendCandidatesRequest;
    response: AdminContentSourceAppendCandidatesResponse;
  };
  "/admin/contentSource/draft/removeCandidate": {
    request: AdminContentSourceRemoveCandidateRequest;
    response: AdminContentSourceRemoveCandidateResponse;
  };
  "/admin/contentSource/draft/promote": {
    request: AdminContentSourcePromoteDraftRequest;
    response: AdminContentSourcePromoteDraftResponse;
  };
  "/admin/feedGen/plan": {
    request: AdminFeedGenPlanRequest;
    response: AdminFeedGenPlanResponse;
  };
  "/admin/feedGen/generatePosts": {
    request: AdminFeedGenGeneratePostsRequest;
    response: AdminFeedGenGeneratePostsResponse;
  };
  "/admin/feedGen/searchSources": {
    request: AdminFeedGenSearchSourcesRequest;
    response: AdminFeedGenSearchSourcesResponse;
  };
  "/admin/feedGen/listFeeds": {
    request: Record<string, never>;
    response: AdminFeedGenListFeedsResponse;
  };
  "/admin/feedGen/loadFeed": {
    request: AdminFeedGenLoadFeedRequest;
    response: AdminFeedGenLoadFeedResponse;
  };
  "/admin/getGalleryDBs": {
    request: { dbId?: string };
    response: {
      galleryDBData: Array<{ _id: string; groupIds: string[] }>;
      galleryGroupDBData: Array<{ _id: string; name: string; itemIds: string[]; query?: string }>;
    };
  };
  "/admin/getItems": {
    request: { itemIds: string[] };
    response: { items: Published[] };
  };
  "/admin/item/list": {
    request: { filterBy?: any; pageInfo?: any };
    response: ItemInfoView[];
  };
  "/admin/published/changeBlockedStatus": {
    request: { itemId: string; blocked: boolean; message?: string };
    response: void;
  };
  "/admin/published/changeType": {
    request: AdminPublishedChangeTypeRequest;
    response: AdminPublishedChangeTypeResponse;
  };
  "/admin/apps/list": {
    request: Record<string, never>;
    response: Published[];
  };
  "/admin/apps/save": {
    request: {
      publishId?: string | null;
      title: string;
      summary?: string | null;
      path: string;
      categories?: string[] | null;
      icon?: string | null;
      accent?: string | null;
      eyebrow?: string | null;
      webappOnly?: boolean | null;
      imageFilename?: string | null;
    };
    response: Published;
  };
  "/admin/published/delete": {
    request: AdminPublishedDeleteRequest;
    response: AdminPublishedDeleteResponse;
  };
  "/admin/published/changeProcessingState": {
    request: {
      itemId: string;
      state: 'pending_metadata' | 'needs_review';
    };
    response: void;
  };
  "/admin/published/setCuration": {
    request: {
      itemId: string;
      curated: boolean;
      curatorComment?: string;
    };
    response: void;
  };
  "/admin/published/process": {
    request: AdminPublishedProcessRequest;
    response: AdminPublishedProcessResponse;
  };
  "/admin/published/create": {
    request: {
      type: string;
      subType?: string | null;
      name: string;
      description?: string;
      url?: string;
      textContent?: string;
      categories?: string[];
      useCriteria?: string[];
      // false (default) = create as an unpublished draft in the pipeline; true = publish now.
      published?: boolean;
    };
    response: { item: Published; heldForReview: boolean };
  };
  "/admin/published/updateContentFields": {
    request: {
      itemId: string;
      name?: string;
      description?: string;
      textContent?: string;
      categories?: string[];
      useCriteria?: string[];
      patterns?: string[];
      additionalLinks?: any[];
      feeds?: any[];
      url?: string;
      excludeFromSearch?: boolean;
      // Publish state. false = Unpublish (also hides from search); true = re-list.
      published?: boolean;
      // Semantic kind (podcast, yt_channel, website, …) — drives the Explore "Kind" facet.
      // Empty string clears it back to null.
      subType?: string | null;
    };
    response: { item: Published };
  };
  "/admin/published/attachment/add": {
    request: {
      itemId: string;
      filename: string;
      fileType: string;
      fileData: string;
    };
    response: { item: Published };
  };
  "/admin/published/attachment/remove": {
    request: {
      itemId: string;
      attachmentId: string;
    };
    response: { item: Published };
  };
  "/admin/published/attachment/get": {
    request: {
      itemId: string;
      attachmentId: string;
    };
    response: { filename: string; fileType: string; fileData: string };
  };
  "/admin/published/bulkCategories": {
    request: {
      itemIds: string[];
      add?: string[];
      remove?: string[];
    };
    response: { updated: number };
  };
  "/admin/published/remapCategories": {
    // Rewrite published.categories across all rows: { oldId: newId | null } (null/'' drops).
    // The reusable rename / merge / delete tool so the taxonomy is never a one-way door.
    request: {
      remap: Record<string, string | null>;
    };
    response: {
      total: number;
      updated: number;
      dropped: Record<string, number>;
    };
  };
  "/admin/published/info": {
    request: { itemId: string };
    response: AdminPublishedInfoResponse;
  };
  "/admin/published/replaceImage": {
    request: AdminPublishedReplaceImageRequest;
    response: AdminPublishedReplaceImageResponse;
  };
  "/admin/published/assignBannerImage": {
    request: AdminPublishedAssignBannerImageRequest;
    response: AdminPublishedReplaceImageResponse;
  };
  "/admin/published/package/export": {
    request: AdminPublishedPackageExportRequest;
    response: AdminPublishedPackageExportResponse;
  };
  "/admin/published/package/import": {
    request: AdminPublishedPackageImportRequest;
    response: AdminPublishedPackageImportResponse;
  };
  "/admin/published/enrich": {
    request: AdminPublishedEnrichRequest;
    response: AdminPublishedEnrichResponse;
  };
  "/admin/published/applyEnrichmentPatches": {
    request: AdminPublishedApplyPatchesRequest;
    response: AdminPublishedApplyPatchesResponse;
  };
  "/admin/published/importBatches": {
    request: AdminPublishedImportBatchesRequest;
    response: AdminPublishedImportBatchesResponse;
  };
  "/admin/published/approveBatch": {
    request: AdminPublishedApproveBatchRequest;
    response: AdminPublishedApproveBatchResponse;
  };
  "/admin/published/itemsSchemaUpdate": { request: void; response: void };
  "/admin/published/list": {
    request: { filterBy?: any; pageInfo?: any };
    response: { records: Published[]; count: number | null };
  };
  "/admin/signin": {
    request: { username: string; password: string };
    response: { token: string; user: UserView };
  };
  "/admin/diagnostics/list": {
    request: {};
    response: { checks: Array<{ id: string; title: string; description: string }> };
  };
  "/admin/diagnostics/run": {
    request: { checkId: string };
    response: {
      checkId: string;
      status: "ok" | "warn" | "fail";
      summary: string;
      recommendation?: string;
      details?: Record<string, string | number | boolean | null>;
      ranAt: string;
    };
  };
  "/admin/sse/clearAllData": { request: {}; response: void };
  "/admin/sse/clearHeartbeats": { request: {}; response: void };
  "/admin/sse/connectionStatus": {
    request: {};
    response: {
      connected: number;
      totalConnections: number;
      activeChannels: string[];
    };
  };
  "/admin/sse/testEvent": {
    request: { userId?: string; eventType?: string };
    response: void;
  };
  "/admin/sse/testHeartbeat": { request: { userId?: string }; response: void };
  "/admin/updateGallerys": {
    request: { dbId: string; galleryDBData?: any; galleryGroupDBData?: any };
    response: void;
  };
  "/admin/user/changeBlockedStatus": {
    request: { publicUserId: string; blocked: boolean; message?: string };
    response: void;
  };
  "/admin/user/changeCuratorStatus": {
    request: {
      publicUserId: string;
      curator: boolean;
      curatorApprovalBy?: string;
    };
    response: void;
  };
  "/admin/user/changeVerifiedStatus": {
    request: {
      publicUserId: string;
      verifiedType: "contributor" | null;
      message?: string;
    };
    response: void;
  };
  "/admin/user/changeLockStatus": {
    request: { userId: string; disabled: boolean };
    response: void;
  };
  "/admin/user/info": { request: { userId: string }; response: UserView };
  "/admin/user/list": {
    request: { filterBy?: any; pageInfo?: any };
    response: Array<{
      id: string;
      username: string;
      email?: string;
      accountType: string;
    }>;
  };
  "/ai/deleteSession": { request: { sessionId: string }; response: void };
  "/ai/getCurrentSessionId": { request: {}; response: string | null };
  "/ai/getSessionById": {
    request: { id: string };
    response: AISessionResponse;
  };
  "/ai/itemSuggestGenerator": {
    request: AIItemSuggestRequest;
    response: AIItemSuggestResponse;
  };
  "/ai/itemUpdateGenerator": {
    request: AIItemUpdateRequest;
    response: AIItemUpdateResponse;
  };
  "/ai/sendMessage": {
    request: AISendMessageRequest;
    response: AISendMessageResponse;
  };
  "/ai/sendMessageStream": {
    request: AISendMessageStreamRequest;
    response: ChatStreamCompleteEvent;
  };
  "/ai/usage/getSummary": {
    request: AIUsageGetSummaryRequest;
    response: AIUsageGetSummaryResponse;
  };
  "/ai/sendActionResult": {
    request: { sessionId: string; actionResult: any; context?: any; mode?: string; model?: string };
    response: ChatStreamCompleteEvent;
  };
  // Client-only bgroute: aborts the in-flight stream and halts the agent loop
  // for a session. No server handler (the fetch abort closes the SSE request).
  "/ai/cancel": {
    request: { sessionId: string };
    response: { success: boolean; cancelled: boolean };
  };
  "/ai/approval/respond": {
    request: { requestId: string; approved: boolean };
    response: { success: boolean };
  };
  "/ai/changeset/respond": {
    request: { changeSetId: string; decision: "apply" | "discard" };
    response: { success: boolean };
  };
  "/ai/changeset/undo": {
    request: { changeSetId: string };
    response: { success: boolean; changeSetId?: string; undoResults?: any; error?: string; alreadyUndone?: boolean };
  };
  /** Client-only: the record lives in account-scoped ref_state, read through the background. */
  "/ai/changeset/history": {
    request: { limit?: number };
    response: { success: boolean; entries: any[] };
  };
  "/ai/sessionList": { request: {}; response: AISessionResponse[] };
  "/ai/uiBridge/respond": {
    request: { requestId: string; result?: any };
    response: any;
  };
  // Client-only bgroute. No server handler. Use this rather than getSessionById +
  // updateSession: that pair round-trips a display copy of a guide session (privacy
  // tokens already rendered as real names) back into storage.
  "/ai/appendResponseToSession": {
    request: { sessionId: string; response: { id: string; respToUser: string } };
    response: { success: boolean; saved: boolean };
  };
  "/ai/setCurrentSessionId": { request: { id: string }; response: void };
  "/ai/updateSession": { request: { session: any }; response: { success: boolean } };
  /** Client-only: renames merge into the persisted record in the background. No server handler. */
  "/ai/renameSession": {
    request: { sessionId: string; name: string };
    response: { success: boolean };
  };
  "/ai/textRequest": { request: AITextRequest; response: AITextResponse };
  /** The collection builder's copy/paste JSON format spec, admin-editable server-side. */
  "/ai/collectionAuthoringPrompt": { request: {}; response: { formatSpec: string } };
  // Client-only (extension/native) direct-provider bgroutes. No server handler.
  "/ai/provider/listOllamaModels": {
    request: { endpoint: string };
    response: { ok: boolean; models: { name: string }[]; error?: string };
  };
  "/ai/provider/syncOriginRule": { request: {}; response: { success: boolean } };
  /**
   * Client-only image generation. No server handler: the background decides whether this
   * device's pictures come from Kindredly.ai (which does have a server route,
   * `/usertask/generateImage`) or from an image server the family runs, which our server
   * cannot reach at all.
   */
  "/ai/image/generate": {
    request: { prompt: string };
    response: { imageData?: string; imageUrl?: string; taskId: string };
  };
  "/ai/image/probeLocal": {
    request: { endpoint: string };
    response: { ok: boolean; models: string[]; error?: string };
  };
  /** The family's image credits: how many Kindredly.ai images are left, and when the next comes back. */
  "/ai/image/credits": {
    request: Record<string, never>;
    response: AiImageCredits;
  };
  /**
   * The active chat provider. A route rather than a direct settings read because `scope: 'client'`
   * settings live in the CURRENT origin's storage — a hosted frame reading them sees its own empty
   * store, never the extension's — and because it lets the AI bridge proxy the answer.
   */
  "/ai/provider/getConfig": {
    request: {};
    response: {
      supported: boolean;
      provider: "server" | "ollama" | "browser" | "browser-ff";
      endpoint: string;
      model: string;
      thinking: boolean;
      /** Firefox's on-device model id. Chrome's built-in model has no name to choose. */
      browserModelId: string;
    };
  };
  "/ai/provider/setConfig": {
    request: {
      provider?: "server" | "ollama" | "browser" | "browser-ff";
      endpoint?: string;
      model?: string;
      thinking?: boolean;
      browserModelId?: string;
    };
    response: { success: boolean; message?: string };
  };
  /**
   * Can the Chrome/Edge built-in model run here? Answered from the background, where inference
   * happens — an extension service worker's availability can differ from a page's.
   */
  "/ai/provider/browserStatus": {
    request: {};
    response: {
      apiPresent: boolean;
      availability: "unavailable" | "downloadable" | "downloading" | "available";
      contextWindow?: number;
      reason?: string;
    };
  };
  "/ai/provider/firefoxStatus": {
    request: { modelId?: string };
    response: { apiPresent: boolean; permissionGranted: boolean; modelId: string; reason?: string };
  };
  /**
   * Downloads Firefox's on-device model. In the background, unlike Chrome's, which the settings
   * page drives itself: `browser.trial.ml` installs one engine per extension, so a second caller
   * would fight this one. Progress arrives on the `ai-browser-model-progress` bus event.
   */
  "/ai/provider/firefoxDownload": {
    request: { modelId?: string };
    response: { ok: boolean; error?: string };
  };
  "/ai/provider/firefoxDeleteModels": { request: {}; response: { ok: boolean; error?: string } };
  "/auth/checkPassword": {
    request: { password: string; userId?: string };
    response: { valid: boolean };
  };
  "/auth/client/info": { request: any; response: void };
  "/auth/completeEmailVerification": {
    request: { verificationCode: string; confirm: boolean };
    response: void;
  };
  "/auth/desktopHandoff/create": {
    request: {};
    response: { tokenData: TokenData };
  };
  "/auth/mintCompanionToken": {
    /** `targetUserId`: an admin linking a device for a child they administer (desktop Companion). */
    request: { deviceId: string; deviceName?: string; targetUserId?: string };
    response: { token: string; deviceId: string };
  };
  "/auth/createUser": { request: CreateUserRequest; response: UserView };
  "/auth/forceResetPassword": { request: { userId?: string }; response: void };
  "/auth/genUniqueUsername": {
    request: {};
    response: { username: string; displayedName: string };
  };
  "/auth/linkAuthAccount": {
    request: { loginType: string; loginPayload?: any; loginUserDetails?: any };
    response: void;
  };
  "/auth/permissionOverride": {
    request: PermissionOverrideRequest;
    response: { tokenData: TokenData; success: boolean; overrideUserId: string };
  };
  "/auth/providerLogin/confirmSession": {
    request: { sessionToken: string };
    response: void;
  };
  "/auth/providerLogin/create": {
    request: {};
    response: { sessionToken: string; failToken: string; url?: string };
  };
  "/auth/providerLogin/fail": {
    request: { sessionToken: string; failToken: string; status?: "failed" | "cancelled" | "expired"; message?: string };
    response: { success: boolean };
  };
  "/auth/providerLogin/status": {
    request: { sessionToken: string };
    response: {
      status: "pending" | "authorized" | "registration-required" | "failed" | "cancelled" | "expired";
      authorized: boolean;
      tokenData: TokenData | null;
      message?: string;
      user?: UserView;
      registrationData?: {
        accessToken: string;
        loginType: "google" | "apple";
        email?: string;
        isPrivateEmail?: boolean;
        sourceId?: string;
        sessionToken?: string;
        failToken?: string;
        authType?: string;
        accountInvitationCode?: string;
      } | null;
    };
  };
  "/auth/providerLogin/verify": {
    request: { accessToken: string; sessionToken: string; loginType?: string; state?: string; strictRegisterIntent?: boolean };
    response: { verified?: boolean; token?: string; registrationRequired?: boolean; existingAccount?: boolean; message?: string };
  };
  "/auth/recoverAccountAccess": {
    request: { verificationCode: string; clientInfoData?: ClientInfoView };
    response: AuthResponse;
  };
  "/auth/recoverPassword": {
    request: { email?: string; username?: string; verificationCode?: string };
    response: { password: string | null };
  };
  "/auth/register": { request: RegisterRequest; response: AuthResponse };
  "/auth/completeEncryptionSetup": {
    request: { method: "passkey" | "server" };
    response: { success: boolean };
  };
  "/auth/removeRecoveryKeyFromServer": {
    request: RemoveRecoveryKeyFromServerRequest;
    response: void;
  };
  "/auth/resetPassword": {
    request: {
      email?: string;
      token?: string;
      newPassword?: string;
      verificationCode?: string;
      password?: string;
    };
    response: void;
  };
  "/auth/resetPasswordRequest": {
    request: { email: string };
    response: {
      requestAccepted: boolean;
      recoverable: boolean;
      nextStep: 'reset-password' | 'account-recovery';
      reason?: 'no_server_recovery_material';
      message?: string;
    };
  };
  "/auth/saveRecoveryKeyOnServer": {
    request: { userId?: string; recoveryKey: string };
    response: void;
  };
  "/auth/setStoredRecoveryKey": {
    request: { password: string; userId?: string };
    response: any;
  };
  "/auth/signin": { request: SignInRequest; response: AuthResponse };
  "/auth/signinlocal": { request: Record<string, any>; response: AuthResponse };
  "/auth/getRestrictedUser": { request: {}; response: UserView };
  "/auth/signout": { request: {}; response: void };
  // Extension → hosted-webapp transparent sign-in handoff (client bg routes only; never hit the server).
  "/auth/handoffExport": {
    request: {};
    response: {
      token: string;
      encPassword: string | null;
      userId: string;
      userSnapshot: UserView;
    } | null;
  };
  "/auth/handoffImport": {
    request: {
      token: string;
      encPassword?: string | null;
      userId: string;
      userSnapshot: UserView;
    };
    response: { success: boolean };
  };
  "/auth/startEmailVerification": {
    request: { verificationCode: string };
    response: void;
  };
  "/auth/switchUser": { request: SwitchUserRequest; response: AuthResponse };
  "/auth/tokenLogin": {
    request: { token: string; clientInfoData?: ClientInfoView };
    response: AuthResponse;
  };
  "/auth/updatePassword": {
    request: { password: string; passwordCopy: string; userId?: string };
    response: void;
  };
  "/auth/updatePIN": {
    request: { userId: string; pin: string };
    response: void;
  };
  "/auth/verifyPassword": {
    request: { password: string; userId?: string };
    response: { valid: boolean };
  };
  "/auth/passkey/challenge": {
    request: PasskeyChallengeRequest;
    response: PasskeyChallengeResponse;
  };
  "/auth/passkey/register": {
    request: PasskeyRegisterRequest;
    response: PasskeyRegisterResponse;
  };
  "/auth/passkey/authenticate": {
    request: PasskeyAuthenticateRequest;
    response: PasskeyAuthenticateResponse;
  };
  "/auth/passkey/login": {
    request: PasskeyAuthenticateRequest;
    response: AuthResponse;
  };
  "/auth/passkey/list": {
    request: { userId?: string };
    response: PasskeyListResponse;
  };
  "/auth/passkey/delete": {
    request: PasskeyDeleteRequest;
    response: { success: boolean };
  };
  "/auth/provider/apple": {
    request: { id_token: string; state: string; code: string; error?: string };
    response: { token: string; user?: UserView };
  };
  "/client/hometab": { request: {}; response: boolean };
  "/client/openAppPage": { request: { path?: string }; response: boolean };
  // Companion device-guard (client-only bg routes; Android child device)
  "/companion/provision": {
    /** `targetUserId`: link for this child (a guardian setting up a child's phone or computer). Default: the active user. */
    request: { deviceName?: string; targetUserId?: string; childDisplayName?: string };
    response: { ok: boolean; deviceId?: string; error?: string };
  };
  "/companion/unlink": {
    request: {};
    response: { ok: boolean; error?: string };
  };
  "/companion/status": {
    request: {};
    response: CompanionProbeResult;
  };
  "/companion/open": {
    request: { target: CompanionOpenTarget };
    response: { ok: boolean; error?: string };
  };
  "/companion/rules/push": {
    request: { forceRefresh?: boolean };
    response: { ok: boolean; rulesCount?: number; unchanged?: boolean; error?: string };
  };
  "/companion/inventory/sync": {
    request: { targetUserId?: string };
    response: { ok: boolean; count?: number; error?: string };
  };
  "/companion/inventory/list": {
    request: { childUserId?: string };
    response: { inventories: DeviceAppInventory[] };
  };
  "/companion/devices/list": {
    request: { childUserId: string };
    /** `latestSettingsVersion`: the child's current device settings version; null when unknown (DCP-10). */
    response: { devices: CompanionDeviceView[]; latestSettingsVersion?: number | null };
  };
  /**
   * The parent's app protections for one child. `policy: null` means never
   * configured, which the UI shows differently from "configured to block nothing".
   */
  "/companion/policy/get": {
    request: { childUserId?: string };
    response: { policy: DeviceAppPolicy | null };
  };
  "/companion/policy/save": {
    request: { childUserId?: string; policy: DeviceAppPolicy };
    response: { ok: boolean };
  };
  /**
   * SERVER route (unlike the rest of /companion/*): confirms a parent authorized
   * turning uninstall protection off. Requires a live permission-override token,
   * which the server verifies — the child is signed in on this phone, so the
   * decision can't be made client-side.
   */
  "/companion/protection/authorizeRemoval": {
    request: { deviceId?: string };
    response: { authorized: boolean; adminUserId?: string; at?: number; reason?: string };
  };
  /**
   * Server route: the child's own device reports newly installed apps so the
   * account's parents get a notification.
   *
   * The only server addition in the phone-apps feature. It lives here rather than
   * riding an existing route because the DETECTION has to happen on the child's
   * device — that is the one place holding both the decrypted inventory and the
   * decrypted policy. The app NAMES are sent in the clear deliberately: the
   * inventory stays encrypted, but a notification a parent can actually read has
   * to carry readable text, and "Roblox was installed" is not browsing history.
   */
  "/companion/apps/reportNew": {
    /** `platform` is the app list's (absent = Android), so the notice says phone or computer. */
    request: { pkgs: string[]; labels?: string[]; platform?: string };
    response: { ok: boolean; notified?: number };
  };
  /**
   * SERVER route, device token only. Answers with NO `ruleSet` since DCP-2 (2026-09-13).
   *
   * The server's compile could not read `appPolicy` or `appInventory` (end-to-end encrypted), so
   * its ruleset never held an app block, and Guard replacing its sealed set with it lifted every
   * block (UX-063). A missing `ruleSet` makes Guard keep what it has. An EMPTY ruleset would clear
   * every block, so the server never sends one. Replaced by `/companion/settings/current` (DCP-5).
   */
  "/companion/rules/current": {
    request: { tzOffsetMinutes?: number };
    response: { ruleSet?: CompiledDeviceRuleSet };
  };
  /**
   * SERVER route, device-agent token only (DCP-5). The settings a device compiles its own rules
   * from (D2), with the per-user settings version. The user comes from the token; the body carries
   * only the version the device last applied, and `settings` is omitted when it is unchanged.
   * A device keeps its sealed app blocks whenever `settings.appPolicy` is null.
   */
  "/companion/settings/current": {
    request: DeviceSettingsCurrentRequest;
    response: DeviceSettingsCurrentResponse;
  };
  /**
   * SERVER route (DCP-10): a user's current device settings version, for the user or a guardian over
   * them. Compared with a device's reported `appliedSettingsVersion` to say whether a save arrived.
   */
  "/companion/settings/version": {
    request: { userId?: string };
    response: { version: number };
  };
  /**
   * SERVER route, device-agent token only, GET (DCP-8): an SSE stream for the desktop Companion that
   * carries only the content-free `deviceSettingsChanged`, answered with a fetch of
   * `/companion/settings/current`. Returns an event stream, not JSON.
   */
  "/companion/settings/events": { request: {}; response: void }; // SSE endpoint - returns event stream
  /**
   * SERVER route: a parent removes one of a child's devices — disconnect and forget,
   * in that order.
   *
   * One endpoint rather than the client orchestrating a revoke plus four deletes,
   * because the order is the whole guarantee and only the server can hold it. The
   * worst partial failure — rows deleted, credential still live — is a device that
   * vanished from the parent's list and carried on reporting.
   *
   * Idempotent: removing an already-removed device revokes nothing and deletes
   * nothing, and says so rather than failing.
   */
  "/companion/devices/remove": {
    request: { childUserId: string; deviceId: string };
    response: { ok: boolean; revokedSessions: number; deletedRows: number };
  };
  /** Client bg route: authorize with the server, then tell Guard to stand down. */
  "/companion/protection/disable": {
    request: {};
    response: { ok: boolean; error?: string };
  };
  /** Client bg route: record the parent's opt-in and open Guard's protection screen. */
  "/companion/protection/enable": {
    request: {};
    response: { ok: boolean; error?: string };
  };
  "/client/widget/status": { request: {}; response: any };
  "/collection/listByUser": {
    request: CollectionListByUserRequest;
    response: ItemInfoView[];
  };
  "/collection/suggest": {
    request: { query?: string; url?: string };
    response: ItemInfoView[];
  };
  "/collection/recent": {
    request: { userId?: string; limit?: number };
    response: ItemInfoView[];
  };
  "/collection/related": {
    request: { collectionId: string };
    response: ItemInfoView[];
  };
  "/collection/create": { request: SaveItemRequest; response: string };
  "/collection/decrypt": {
    request: { collectionId: string; [key: string]: any };
    response: { data: any; encInfo?: any };
  };
  "/collection/encrypt": {
    request: { collectionId: string; [key: string]: any };
    response: { data: any; encInfo?: any };
  };
  "/collection/getItemRelInfo": {
    request: GetItemRelationshipInfoRequest;
    response: ItemRelationshipInfo;
  };
  "/collection/itemDetails/save": {
    request: SaveCollectionItemDetailsRequest;
    response: void;
  };
  "/collection/order/update": {
    request: { collectionId: string; itemOrder?: any; itemIds?: string[] };
    response: void;
  };
  "/collection/removeFromUserLibrary": {
    request: { collectionIds: string[]; fullRemove?: boolean };
    response: void;
  };
  "/collection/addToUserLibrary": {
    request: { collectionIds: string[] };
    response: void;
  };
  "/collection/items": {
    request: { collectionId: string; typeFilter?: string; userId?: string };
    response: ItemInfoView[];
  };
  "/collection/structure": {
    request: Record<string, never>;
    response: { relations: Array<{ collectionId: string; itemId: string; itemType: string }> };
  };
  "/collection/shareWithFriend": {
    request: { collectionId: string; friendUserId: string; permission: PermissionType };
    response: { success: boolean };
  };
  /**
   * Client-only: the command bar's execution path for gated tools. Handled in the
   * background (AIToolGate via AICommandSurface), never forwarded to the server.
   */
  "/command/runTool": {
    request: { toolId: string; params?: Record<string, unknown>; sessionId: string };
    response: { success: boolean; result?: any; error?: string };
  };
  "/comment/create": {
    request: CreateCommentRequest;
    response: { commentId: string; encInfo?: any };
  };
  "/comment/delete": { request: { commentId: string }; response: void };
  "/comment/list": {
    request: {
      userId?: string;
      refId: string;
      refType: "post" | "item";
      pageInfo?: any;
    };
    response: { records: CommentInfo[]; count: number | null };
  };
  "/content/clearPipelineResults": {
    request: { userId?: string };
    response: void;
  };
  "/content/getLoggedBlockingEntry": {
    request: { url: string; srcType?: string; srcId?: string; ts?: number };
    response: {
      logs: ActivityLogEntry[];
      targetLog: ActivityLogEntry | null;
    };
  };
  "/content/getLoggedInfoForItemId": { request: any; response: any };
  "/content/getLoggedInfoForLimitRuleId": {
    request: { limitRuleId: string; targetUserId?: string; daysBack?: number };
    response: any;
  };
  "/content/getLoggedInfoForURL": {
    request: { url: string; targetUserId?: string };
    response: any;
  };
  "/content/getPipelineResultsForId": {
    request: { id: string };
    response: any;
  };
  "/content/reclassifyFromPipelineResultId": {
    request: { id: string };
    response: any;
  };
  "/content/getTermDict": { request: { key: string }; response: any };
  "/content/checkAdultUrlSignal": {
    request: { url: string };
    response: any;
  };
  "/content/imageClassify": { request: { images: any }; response: Array<any> };
  "/content/imageClassifier/recoverInjection": {
    request: { url?: string };
    response: { injected: boolean; reason?: string } | any;
  };
  // Dev-only image-classifier perf instrumentation, driven by ImageClassTest.vue.
  "/content/imageClassifyRequestPerf/report": {
    request: any;
    response: { ok: boolean };
  };
  "/content/imageClassifyRequestPerf/get": {
    request: {};
    response: any;
  };
  "/content/imageClassifyRequestPerf/reset": {
    request: {};
    response: any;
  };
  "/content/imageClassifyCache/clear": {
    request: {};
    response: { clearedEntries: number };
  };
  /**
   * Content-script entry point: what the classifier should do on this tab before any
   * image is fetched. Resolved from the sender tab, so the request carries nothing.
   */
  "/content/imageClassifier/bootstrap": {
    request: {};
    response: { mode: string; reason?: string } | any;
  };
  /**
   * Dev-only: the classifier's queue widths, so one page can be measured at several
   * widths without a rebuild. `set` returns the widths as they now stand, so the caller
   * never has to guess how a null or an out-of-range value was clamped.
   */
  "/content/imageClassifyQueueWidths/get": {
    request: {};
    response: ImageClassifyQueueWidths;
  };
  "/content/imageClassifyQueueWidths/set": {
    request: {maxConcurrentFetches?: number | null; maxConcurrentClassifications?: number | null};
    response: ImageClassifyQueueWidths;
  };
  /**
   * Dev-only: the durable verdict cache — what it holds, its kill switch, and a clear.
   * `set` returns the count it cleared alongside the status the clear left behind.
   */
  "/content/imageVerdictCache/status": {
    request: {};
    response: ImageVerdictCacheStatus;
  };
  "/content/imageVerdictCache/set": {
    request: {disabled?: boolean; clear?: boolean};
    response: {cleared: number; status: ImageVerdictCacheStatus};
  };
  /**
   * Client-only: the local image-classification decision-sample buffer (developer
   * tools + page reports). Nothing here leaves the device; upload is a separate,
   * opted-in path.
   */
  "/content/imageClassifySamples/list": {
    request: { limit?: number };
    response: { total: number; samples: any[] };
  };
  "/content/imageClassifySamples/markReported": {
    request: { url?: string };
    response: { imageKeys: string[]; blocked: number; total: number };
  };
  "/content/imageClassifySamples/clear": {
    request: {};
    response: { ok: boolean };
  };
  "/content/imageClassifySkip/get": {
    request: { url: string };
    response: { skip: boolean };
  };
  "/content/imageClassifyRuntimeConfig/get": {
    request: {};
    response: {
      primaryRuntime: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
      candidateRuntime: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
      candidateTrafficPercent: number;
      shadowCompare: boolean;
      shadowSamplePercent: number;
    };
  };
  "/content/imageClassifyRuntimeConfig/set": {
    request: {
      primaryRuntime?: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
      candidateRuntime?: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
      candidateTrafficPercent?: number;
      shadowCompare?: boolean;
      shadowSamplePercent?: number;
    };
    response: {
      primaryRuntime: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
      candidateRuntime: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
      candidateTrafficPercent: number;
      shadowCompare: boolean;
      shadowSamplePercent: number;
    };
  };
  "/content/imageClassifyBenchmark": {
    request: {
      image: string;
      runtimes?: Array<'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw'>;
      iterations?: number;
      nativePayloadModes?: Array<'original-base64' | 'js-resized-jpeg-base64' | 'original-base64-trace'>;
      nativeDecodeStrategies?: Array<'bitmap-resize' | 'bitmap-draw' | 'image-decoder'>;
      nativeResizeQualities?: Array<'high' | 'medium' | 'low'>;
      nativeJpegQualities?: number[];
      nativeConcurrencyLevels?: number[];
    };
    response: {
      iterations: number;
      selectedRuntimes: Array<'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw'>;
      selectedNativePayloadModes?: Array<'original-base64' | 'js-resized-jpeg-base64' | 'original-base64-trace'>;
      selectedNativeDecodeStrategies?: Array<'bitmap-resize' | 'bitmap-draw' | 'image-decoder'>;
      selectedNativeResizeQualities?: Array<'high' | 'medium' | 'low'>;
      selectedNativeJpegQualities?: number[];
      selectedNativeConcurrencyLevels?: number[];
      availableRuntimes: Array<'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw'>;
      unavailableRuntimes: Array<{ runtime: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw'; error: string }>;
      results: Array<{
        runtime: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
        variant?: string;
        ok: boolean;
        warmupMs: number | null;
        runsMs: number[];
        avgMs: number | null;
        medianMs: number | null;
        result?: {
          flagged: boolean;
          predictions: Array<{ className: string; probability: number }>;
          error?: string;
          runtimeRequested?: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
          runtimeUsed?: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
          runtimeFallback?: boolean;
          timingsMs?: {
            decode?: number;
            preprocess?: number;
            inference?: number;
            postprocess?: number;
            total?: number;
          };
        };
        error?: string;
      }>;
    };
  };
  "/content/imageClassifyRuntimeAvailability": {
    request: {};
    response: {
      checkedAt: number;
      runtimes: Array<{
        runtime: 'tfjs-nsfw' | 'onnx-nsfw' | 'native-nsfw';
        available: boolean;
        detail: string;
        assetUrl?: string;
      }>;
    };
  };
  "/content/imageClassifyRuntimeDiagnostics": {
    request: {};
    response: {
      checkedAt: number;
      tfjs: {
        activeBackend: string;
        availableBackends: {
          wasm: boolean;
          webgl: boolean;
          cpu: boolean;
        };
        modelLoaded: boolean;
      };
      onnx: {
        executionProviders: string[];
        sessionLoaded: boolean;
        candidateModelUrls: string[];
      };
    };
  };
  "/content/imageClassifyLegacy": {
    request: { images: Array<{ data: string }> };
    response: any;
  };
  "/content/listPipelineResults": {
    request: { userId?: string | null };
    response: PipelineResultsResponse;
  };
  "/content/preblurRegistration/refresh": {
    request: {};
    response: {
      supported: boolean;
      enabled: boolean;
      registered: boolean;
      action: 'registered' | 'unregistered' | 'unchanged' | 'unsupported';
      userId: string | null;
    };
  };
  "/content/performDeepClassification": {
    request: { type: string; info: ClassificationRequestInfo };
    response: any;
  };
  "/content/performDeepMetaCheck": { request: any; response: any };
  "/content/performDocClassification": {
    request: { url: string; text: string };
    response: { success: boolean; error?: string };
  };
  "/content/suggestUrlContent": {
    request: UrlContentSuggestionRequest;
    response: UrlContentSuggestionResponse;
  };
  "/content/classificationPolicy/get": {
    request: {};
    response: {
      enabled: boolean;
      hasPolicy: boolean;
      lastRefreshAt: number | null;
      lastRefreshError: string | null;
      version: string | null;
      updatedAt: string | null;
      domainOverridesCount: number;
    };
  };
  "/content/classificationPolicy/refresh": {
    request: {};
    response: {
      ok: boolean;
      reason?: string;
      hasPolicy: boolean;
      lastRefreshAt: number | null;
      version?: string | null;
      updatedAt?: string | null;
      domainOverridesCount?: number;
    };
  };
  "/content/classificationOverrides/reload": {
    request: {};
    response: { ok: true };
  };
  "/content/familyPolicyRules/list": {
    request: FamilyPolicyRuleListRequest;
    response: FamilyPolicyRuleListResponse;
  };
  "/content/familyPolicyRules/upsert": {
    request: FamilyPolicyRuleUpsertRequest;
    response: FamilyPolicyRuleUpsertResponse;
  };
  "/content/familyPolicyRules/delete": {
    request: FamilyPolicyRuleDeleteRequest;
    response: FamilyPolicyRuleDeleteResponse;
  };
  /** A guardian's own check of an item under curation review. Encrypted; the server never reads it. */
  "/content/familyCurationChecks/list": {
    request: {};
    response: { checks: StoredFamilyPolicyRule[] };
  };
  "/content/familyCurationChecks/set": {
    request: { publishId: string; note?: string | null };
    response: { ok: boolean; rule?: StoredFamilyPolicyRule; synced?: boolean; syncError?: string | null };
  };
  "/content/familyCurationChecks/clear": {
    request: { publishId: string };
    response: { ok: boolean; deleted: number; syncError?: string | null };
  };
  "/content/familyPolicyBlockRules/sync": {
    request: { patterns?: string[] };
    response: {
      syncedPatterns?: string[];
      added?: string[];
      removed?: string[];
      ok?: boolean;
      success?: boolean;
    } | any;
  };
  "/content/fixPipelineClassification": {
    request: {
      pipelineResultId?: string | null;
      eduValue: EduValue;
      url?: string;
      startTime?: number;
      endTime?: number;
      monitorId?: string;
      targetUserId?: string | null;
      note?: string;
    };
    response: {
      success: boolean;
      error?: string;
      result?: {
        pipelineResultId: string | null;
        eduValue: EduValue;
        updatedPipeline: boolean;
        updatedActivityLog: boolean;
        updatedActivityLogEntries: number;
        rewroteRemoteActivityRows: number;
      };
    };
  };
  "/content/classificationLab": {
    request: {
      url?: string;
      title?: string;
      extractedText?: string;
      anchorMode?: 'current' | 'baseline' | 'updated' | 'compare';
    };
    response: any;
  };
  "/content/classifyLibraryMetadata": {
    request: {
      maxItems?: number;
      concurrency?: number;
      minScoreToLabel?: number;
      includeItemSamples?: boolean;
    };
    response: {
      ok: true;
      totalItems: number;
      requestedMaxItems: number;
      processed: number;
      skipped: number;
      durationMs: number;
      itemsPerSec: number | null;
      minScoreToLabel: number;
      concurrency: number;
      byLabel: Record<string, number>;
      errors: Array<{ itemId: string; error: string }>;
      samples?: Array<{ itemId: string; title: string; url: string; topLabel: string | null; topScore: number | null }>;
    };
  };
  "/content/savePipelineResults": { request: any; response: any };
  "/content/updateStatus": { request: any; response: any };
  "/data/categories": {
    request: {};
    response: Array<{ id: string; name: string; count?: number }>;
  };
  /** @deprecated Use /data/contentInfo with options.includeClassification instead. Kept for backward compatibility. */
  "/data/classifyContentType": {
    request: { info: { url: string; features?: Record<string, unknown> } };
    response: SourcePriorityClassificationResponse;
  };
  "/data/contentInfo": {
    request: ContentLookupRequest;
    response: ContentLookupResponse;
  };
  "/data/learnedClassifierModel/getActive": {
    request: { kind?: string };
    response: {
      model: {
        version: string;
        kind: string;
        embeddingModelId: string;
        artifact: LearnedClassifierArtifact;
        createdAt: string | null;
      } | null;
    };
  };
  "/data/siteOverrides/getActive": {
    request: Record<string, never>;
    response: {
      overrides: SiteOverridesEnvelope | null;
    };
  };
  /** @deprecated Use /data/contentInfo with options.includeMetadata instead. Kept for backward compatibility. */
  "/data/meta": { request: { url: string }; response: ItemMeta };
  /** @deprecated Use /data/contentInfo with options.includeResourceInfo instead. Kept for backward compatibility. */
  "/data/resourceInfo": {
    request: { url: string };
    response: ResourceFetchInfoResponse;
  };
  "/data/podcastFeedLookup": {
    request: PodcastFeedLookupRequest;
    response: PodcastFeedLookupResponse;
  };

  "/data/raw": {
    request: { url: string; mediaType?: any };
    response: { base64Data?: string; mimeType?: string };
  };
  "/data/file": {
    request: { url: string; filename?: string };
    response: { data: Buffer | string; contentType: string; filename?: string };
  };
  "/data/metaWithBanner": {
    request: { url: string };
    response: { meta: any | null; image: any | null };
  };
  "/data/text": {
    request: { url: string; options?: any };
    response: { data: any; contentType?: string; status: number };
  };
  "/device/updateInfo": { request: { deviceToken: string }; response: void };

  // Library Health & Recommendations
  "/libraryHealth/analyze": {
    request: {
      forceRefresh?: boolean;
      maxItems?: number;
      duplicateThreshold?: number;
      staleDaysThreshold?: number;
    };
    response: {
      recommendations: any[];
      smartCollections: any[];
      healthScore: any;
      durationMs: number;
      itemsAnalyzed: number;
      errors?: string[];
    };
  };
  "/libraryHealth/getRecommendations": {
    request: { includeAll?: boolean };
    response: { recommendations: any[]; healthScore?: any };
  };
  "/libraryHealth/dismissRecommendation": {
    request: { recommendationId: string };
    response: { success: boolean };
  };
  "/libraryHealth/snoozeRecommendation": {
    request: { recommendationId: string; days: number };
    response: { success: boolean };
  };
  "/libraryHealth/applyRecommendation": {
    request: { recommendationId: string; options?: any };
    response: { success: boolean; message?: string };
  };
  "/libraryHealth/getSmartCollections": {
    request: {};
    response: { smartCollections: any[] };
  };
  "/libraryHealth/getPreferences": {
    request: {};
    response: { preferences: any };
  };
  "/libraryHealth/updatePreferences": {
    request: { preferences: any };
    response: { success: boolean };
  };
  "/libraryHealth/clearCache": {
    request: {};
    response: { success: boolean };
  };
  "/libraryHealth/getStats": {
    request: {};
    response: { stats: any };
  };
  "/libraryHealth/getAnalyzableItems": {
    request: { maxItems?: number };
    response: { items: Array<{ id: string; name: string; url: string; text: string }> };
  };

  "/libraryHealth/listCollections": {
    request: { maxCollections?: number };
    response: { collections: Array<{ id: string; name: string; description: string }> };
  };

  "/libraryHealth/getSimilarCollections": {
    request: {
      sourceCollectionId?: string;
      sourceItemId?: string;
      sourceText?: string;
      sourceLabel?: string;
      method: 'rollup' | 'neighborVote';
      topK?: number;
      minScore?: number;
      maxCollections?: number;
      maxSourceItems?: number;
      neighborTopKPerItem?: number;
      maxItemsToIndex?: number;
    };
    response: {
      method: 'rollup' | 'neighborVote';
      sourceCollectionId?: string;
      sourceItemId?: string;
      sourceLabel?: string;
      results: Array<{
        collectionId: string;
        collectionName: string;
        score: number;
        reason?: string;
        debugTopSupportingItems?: Array<{ itemId: string; score: number }>;
      }>;
      debug?: any;
    };
  };

  "/embedding/batchEmbeddings": { request: any; response: any };
  "/embedding/clearCache": { request: {}; response: { success: boolean } };
  "/embedding/clusterItems": {
    request: {
      items: Array<{ id: string; embedding: number[] }>;
      k?: number;
      maxIterations?: number;
    };
    response: { clusters: any[] };
  };
  "/embedding/configure": { request: any; response: { success: boolean } };
  "/embedding/detectDuplicates": {
    request: {
      itemText: string;
      existingItems: Array<{ id: string; text: string; embedding?: number[] }>;
    };
    response: { duplicates: any[] };
  };
  "/embedding/findSimilar": { request: any; response: any };
  "/embedding/findSimilarItems": {
    request: {
      itemText: string;
      candidateItems: Array<{ id: string; text: string; embedding?: number[] }>;
      topK?: number;
    };
    response: { results: any[] };
  };
  "/embedding/generateEmbedding": { request: any; response: any };
  "/embedding/getStats": { request: {}; response: any };
  "/embedding/suggestCollections": {
    request: {
      itemText: string;
      collections: Array<{ id: string; name: string; description?: string }>;
      topK?: number;
    };
    response: { suggestions: any[] };
  };
  "/embedding/suggestTags": {
    request: {
      itemText: string;
      availableTags: Array<{ tag: string; name: string; description?: string }>;
      topK?: number;
    };
    response: { suggestions: any[] };
  };

  // Dedicated per-item embedding cache (background-only; inference stays in bg).
  "/itemEmbedding/getMany": {
    request: { items: Array<{ itemId: string; text: string }> };
    response: { results: Array<{ itemId: string; embedding: number[] }> };
  };
  "/itemEmbedding/stats": {
    request: {};
    response: { count: number; byModel: Record<string, number>; approxBytes: number };
  };

  // Dedicated per-page activity embedding cache (background-only; local-first, never synced).
  "/activityEmbedding/getBySession": {
    request: { activitySessionId: string };
    response: { results: Array<{ key: string; embedding: number[] }> };
  };
  "/activityEmbedding/stats": {
    request: {};
    response: { count: number; byModel: Record<string, number>; approxBytes: number };
  };

  "/embeddingCache/get": { request: EmbeddingCacheGetRequest; response: EmbeddingCacheGetResponse };
  "/embeddingCache/put": { request: EmbeddingCachePutRequest; response: EmbeddingCachePutResponse };
  "/embeddingCache/stats": { request: EmbeddingCacheStatsRequest; response: EmbeddingCacheStatsResponse };
  "/embeddingCache/clear": { request: EmbeddingCacheClearRequest; response: EmbeddingCacheClearResponse };
  "/encryption/allUserStatuses": {
    request: {};
    response: { userId: string; encStatus: EncStatus }[];
  };
  "/encryption/clearCachedEncValues": {
    request: { userId?: string };
    response: void;
  };
  "/encryption/createAccountBackupKey": { request: any; response: any };
  "/encryption/decrypt": {
    request: { encrypted: any; userId?: string };
    response: { data: any; encInfo?: any };
  };
  "/encryption/decryptCollectionOnly": {
    request: { collectionId: string };
    response: { ok: true };
  };
  "/encryption/enable": {
    request: { password: string; userId?: string };
    response: void;
  };
  "/encryption/encrypt": {
    request: { data: any; userId?: string };
    response: { data: any; encInfo?: any };
  };
  "/encryption/diagnoseEncInfo": {
    request: {
      encInfo: any | null;
      sample?: { field?: string; value?: unknown } | null;
    };
    response: {
      userEncSetup: boolean;
      encInfo: {
        totalKeys: number;
        missingUnwrappingKeyIds: string[];
        availableUnwrappingKeyIds: string[];
        unwrapSucceededUnwrappingKeyIds?: string[];
        unwrapFailed?: Array<{ unwrappingKeyId: string; error: string }>;
      };
      sample?: { attempted: boolean; ok: boolean; error?: string };
      sampleField?: string | null;
      diagnosis?: { cause: string; message?: string };
    };
  };
  "/encryption/reencryptUsingExistingEncInfo": {
    request: { itemId: string };
    response: { ok: true };
  };
  "/encryption/userLibrary/diagnose": {
    request: { userId: string; forceRefresh?: boolean; sampleSize?: number };
    response: {
      userId: string;
      summary: {
        total: number;
        encrypted: number;
        unencrypted: number;
        staleFlags: number;
        decryptFailed: number;
        decryptableEncrypted: number;
        collections: number;
        nonCollections: number;
      };
      candidates: {
        unencryptedCount: number;
        decryptableEncryptedCount: number;
        decryptFailedCount: number;
      };
      sample: {
        unencrypted: Array<{ itemId: string; type?: string; name?: string; encrypted?: boolean; decrypted?: boolean }>;
        decryptFailed: Array<{ itemId: string; type?: string; name?: string; encrypted?: boolean; decrypted?: boolean }>;
      };
    };
  };
  "/encryption/userLibrary/heal": {
    request: { userId: string; action: 'encryptUnencrypted' | 'reencryptDecryptable'; maxItems?: number };
    response: {
      ok: true;
      action: 'encryptUnencrypted' | 'reencryptDecryptable';
      requestedCandidates: number;
      processed: number;
      successCount?: number;
      failedCount?: number;
      failed?: Array<{ itemId: string; error: string }>;
    };
  };
  "/encryption/rekeyKeepingWrappingKeys": {
    request: { itemId: string };
    response: { ok: boolean; usedWrappingKeyIds?: string[] };
  };
  "/encryption/wipeAndRekey": {
    request: { itemId: string };
    response: { ok: boolean; usedWrappingKeyIds?: string[] };
  };
  "/encryption/generateRecoveryKey": {
    request: {};
    response: { recoveryKey: string; keyId: string; createdAt: string };
  };
  "/encryption/getKeyBackup": {
    request: { userId: string };
    response: { backup: string; keyId: string; createdAt: string };
  };
  "/encryption/getKeys": { request: { userId?: string }; response: any };
  "/encryption/getRecoveryKey": {
    request: {};
    response: { recoveryKey: string; keyId: string; createdAt: string };
  };
  "/encryption/listKeys": { request: { userId?: string }; response: any[] };
  "/encryption/listKeysWithStatus": {
    request: { userId?: string };
    response: ListKeysResponse;
  };
  // The handler reads `recoveryKey` and `password` (encryption.bgroute.ts:626); `secretKey` was
  // never a field it looked at, so every real caller failed the typecheck.
  "/encryption/recoverUsingKey": {
    request: { recoveryKey: string; password?: string; userId?: string };
    response: void;
  };
  "/encryption/removeRecoveryKeyFromServer": { request: RemoveRecoveryKeyFromServerRequest; response: void };
  "/encryption/saveRecoveryKeyOnServer": {
    request: { userId?: string };
    response: void;
  };
  "/encryption/shareAccountKey": {
    request: { userId?: string };
    response: void;
  };
  "/encryption/status": {
    request: { userId?: string };
    response: EncryptionStatusResponse;
  };
  "/encryption/wrapSecretWithPasskey": {
    request: { prfOutput?: number[]; credentialId: string; discoverablePrfOutput?: number[] };
    response: { success: boolean };
  };
  "/encryption/unlockWithPasskey": {
    request: { prfOutput: number[] };
    response: { success: boolean };
  };
  "/feed/getByPostId": {
    request: { postId: string };
    response: UserFeed | null;
  };
  "/feed/list": {
    request: {
      userId?: string;
      pageInfo?: {
        currentPage?: number;
        perPage?: number;
        includeTotalRows?: boolean;
      };
      includeComments?: boolean;
      newOnly?: boolean;
    };
    response: FeedListResponse;
  };
  "/feed/searchPosts": {
    request: {
      userId?: string;
      limit?: number;
      includeComments?: boolean;
      createdAfter?: string;
      cursor?: {
        createdAt: string;
        feedId: string;
      };
    };
    response: FeedListResponse;
  };
  "/feed/sharedFeedback/list": {
    request: SharedFeedbackFeedListRequest;
    response: SharedFeedbackFeedListResponse;
  };
  "/feed/sharedFeedback/markSeen": {
    request: SharedFeedbackFeedMarkSeenRequest;
    response: SharedFeedbackFeedMarkSeenResponse;
  };
  "/feed/proxy": { request: { url: string; type?: string }; response: string };
  /**
   * Background-only. Reads and consumes the feed offer the extension's navigation
   * watcher recorded for a tab, when a clicked RSS link was downloaded instead of
   * navigated to.
   */
  "/feed/pendingOffer": {
    request: { tabId?: number };
    response: { feedUrl: string; detectedAt: number } | null;
  };
  "/feed/resolveYouTubeFeedUrl": {
    request: { url: string; meta?: Record<string, any> | null; currentFeedURL?: string | null };
    response: string | null;
  };
  "/feed/removeById": { request: { feedId: string }; response: void };
  "/feed/removePost": {
    request: { userId?: string; postId: string; type: string };
    response: void;
  };
  "/feed/updateReadStatus": {
    request: { postId: string; isRead: boolean; commentIds?: string[] };
    response: void;
  };
  "/feed/updateReadStatusForMultipleEntries": {
    request: { ids: string[]; isRead: boolean };
    response: void;
  };
  "/following/add": {
    request: { userId?: string; refType: string; refId: string };
    response: void;
  };
  "/following/listByUserId": {
    request: { userId: string };
    response: Array<{ userId: string; followedAt: number }>;
  };
  "/following/listWithDetailsByUserId": {
    request: { userId: string };
    response: Array<{
      userId: string;
      username: string;
      displayName?: string;
      followedAt: number;
    }>;
  };
  "/following/remove": {
    request: { userId?: string; refId: string };
    response: void;
  };
  "/invite/checkCode": {
    request: { code: string };
    response: { isValidCode: boolean };
  };
  "/invite/create": {
    request: InviteCreateRequest;
    response: { code: string; id: string };
  };
  "/invite/getInfo": {
    request: { code: string };
    response: { email?: string; accountName?: string; valid: boolean };
  };
  "/item/addToCollections": {
    request: {
      itemId: string;
      collectionIds: string[];
      removeCollectionIds?: string[];
      tempAuthToken?: TokenData;
    };
    response: void;
  };
  "/item/archiveUpdate": {
    request: { itemId: string; value: boolean };
    response: void;
  };
  "/item/attachment/add": {
    request: {
      itemId: string;
      attachment?: any;
      attachmentInfo?: any;
      encInfo?: any;
      existingFileId?: string;
    };
    response: AttachmentAddResponse;
  };
  "/item/attachment/remove": {
    request: { itemId: string; attachmentId: string };
    response: void;
  };
  "/item/attachment/rename": {
    request: { itemId: string; attachmentId: string; filename: string };
    response: void;
  };
  "/item/createPageSnapshot": {
    request: { itemId: string; snapshot: any };
    response: string;
  };
  "/item/decryptItems": {
    request: { itemIds?: string[] };
    response: { data: any; encInfo?: any };
  };
  "/item/delete": {
    request: { itemId: string; deleteChildren?: boolean };
    response: void;
  };
  "/item/encryptItems": {
    request: { itemIds?: string[]; userId?: string };
    response: { data: any; encInfo?: any };
  };
  "/item/feedback/value/update": {
    request: { itemId: string; attr: string; value: any };
    response: void;
  };
  "/item/infoById": {
    request: {
      itemId: string;
      targetUserId?: string;
      detailsOnly?: boolean;
      includeUserPermissions?: boolean;
      includeFeedback?: boolean;
    };
    response: ItemInfoView;
  };
  "/item/familyPolicy/imageApproval/get": {
    request: ItemImageApprovalGetRequest;
    response: ItemImageApprovalGetResponse;
  };
  "/item/familyPolicy/imageApproval/set": {
    request: ItemImageApprovalSetRequest;
    response: ItemImageApprovalSetResponse;
  };
  "/item/familyPolicy/imageApproval/listByIds": {
    request: ItemImageApprovalListByIdsRequest;
    response: ItemImageApprovalListByIdsResponse;
  };

  "/item/listByIds": {
    request: {
      userId?: string;
      ids: string[];
      includeUserPermissions?: boolean;
      includeFeedback?: boolean;
    };
    response: ItemInfoView[];
  };
  "/item/listAll": {
    request: {
      userId?: string;
      ids?: string[];
      includeUserPermissions?: boolean;
      includeFeedback?: boolean;
    };
    response: ItemInfoView[];
  };
  "/item/findByAttribute": {
    request: { key: string; value: string };
    response: ItemInfoView[];
  };
  "/item/listWithFeedback": {
    request: ListItemsWithFeedbackRequest;
    response: ItemInfoView[];
  };
  "/collection/listByIds": {
    request: CollectionListByIdsRequest;
    response: ItemInfoView[];
  };

  "/library/root": {
    request: ListLibraryRootRequest;
    response: ItemInfoView[];
  };
  "/library/archived": {
    request: GetArchivedItemsRequest;
    response: ItemInfoView[];
  };
  "/library/hidden": {
    request: GetHiddenItemsRequest;
    response: ItemInfoView[];
  };
  "/library/uncategorized": {
    request: GetUncategorizedItemsRequest;
    response: ItemInfoView[];
  };
  "/item/listSharedWithUser": {
    request: ListSharedWithUserRequest;
    response: ItemInfoView[];
  };
  "/item/listRecentAccessibleByUser": {
    request: ListRecentAccessibleByUserRequest;
    response: ItemInfoView[];
  };
  "/item/listSharedByUser": {
    request: ListSharedByUserRequest;
    response: ItemInfoView[];
  };

  "/item/matchesForPubIds": {
    request: { pubIds: string[]; userId?: string };
    response: Array<{ pubId: string; item: ItemInfoView }>;
  };
  "/item/matchesForURLs": {
    request: { urls: string[]; userId?: string };
    response: Array<{ url: string; item: ItemInfoView }>;
  };
  "/item/matchForPublished": {
    request: { itemId: string };
    response: ItemInfoView | null;
  };
  "/item/meta/refreshWithIds": {
    request: { itemIds?: string[]; force?: boolean; updateSubType?: boolean };
    response: MetadataResponse;
  };
  "/item/parents/bychildid": {
    request: { itemId: string; userId?: string; includePath?: boolean };
    response: ItemInfoView[];
  };
  "/item/pathtree": {
    request: { itemId: string; userId?: string };
    response: PathTreeNode[];
  };
  "/item/permissions/list": {
    request: { itemId: string; userId?: string };
    response: PermissionWithUser[];
  };
  "/item/permissions/update": {
    request: { itemId: string; userId: string; permission: PermissionType };
    response: void;
  };
  "/item/permissions/remove": {
    request: { itemId: string; userId: string };
    response: void;
  };
  "/item/permissionsAndReactions/list": {
    request: { itemId: string; userId?: string };
    response: { permissions: PermissionWithUser[]; reactions: ItemReaction[] };
  };
  "/item/reactions/list": {
    request: { itemId: string; userId?: string };
    response: SharedItemReactionView[];
  };
  "/item/query": { request: ItemQueryRequest; response: ItemQueryResponse };
  "/item/cleanupCandidates": {
    request: LibraryCleanupCandidatesRequest;
    response: ItemInfoView[];
  };
  "/item/duplicates/candidates": {
    request: LibraryDuplicateCandidatesRequest;
    response: LibraryDuplicateCandidatesResponse;
  };
  "/item/duplicates/merge": {
    request: MergeLibraryDuplicatesRequest;
    response: MergeLibraryDuplicatesResponse;
  };
  "/item/readLaterFeed": {
    request: ReadLaterFeedRequest;
    response: ItemInfoView[];
  };
  /**
   * Local lookup — items assigned any of `kinds` (bg handler only). `kinds` is an
   * encrypted column, so the server can never answer this.
   */
  "/item/listByKinds": {
    request: { kinds: string[]; limit?: number };
    response: ItemInfoView[];
  };
  /** Local lookup — app-kind-tagged items plus library Kindredly apps (bg handler only). */
  "/item/listLibraryApps": {
    request: { kinds: string[] };
    response: ItemInfoView[];
  };
  /**
   * Item counts bucketed along one browse axis, for the Library's browse grids.
   * Local index only (bg handler); keyed by the raw facet key, never a display label.
   */
  "/item/facetCounts": {
    request: { dimension: "type" | "usage" | "status" };
    response: Record<string, number>;
  };
  "/item/rediscover": {
    request: RediscoverQueueRequest;
    response: ItemInfoView[];
  };
  "/item/quickbar/update": { request: { itemId: string }; response: void };
  "/item/removeFromParent": {
    request: { itemId: string; collectionId: string };
    response: void;
  };
  "/item/save": {
    request: SaveItemRequest;
    response: SaveItemResponse;
  };
  "/post/attachment/saveToLibrary": {
    request: SavePostAttachmentToLibraryRequest;
    response: SavePostAttachmentToLibraryResponse;
  };
  "/item/localLibrary/summary": {
    request: { includeRestricted?: boolean };
    response: any;
  };
  "/item/localLibrary/import": {
    request: {
      includeRestricted?: boolean;
      visibility?: 'shared' | 'network' | 'private';
      skipExactUrlDuplicates?: boolean;
    };
    response: any;
  };
  "/item/localLibrary/clear": {
    request: { includeRestricted?: boolean };
    response: any;
  };
  "/item/banner/localize": {
    request: { itemId: string };
    response: { queued: boolean };
  };
  "/item/setUserPermission": {
    request: { itemId: string; permission: PermissionType };
    response: void;
  };
  "/item/shareWithUsers": {
    request: {
      itemId: string;
      userIds: string[];
      permission: PermissionType;
      notInLibrary?: boolean;
      forceViewerForCrossAccount?: boolean;
    };
    response: { shared: number; users: string[] };
  };
  "/item/shareWithFriend": {
    request: { itemId: string; friendUserId: string; permission: PermissionType };
    response: { success: boolean };
  };
  "/item/similar/byURL": {
    request: { url: string; itemId?: string; targetUserId?: string };
    response: ItemInfoViewWithSearchFields[];
  };
  "/item/addToUserLibrary": {
    request: AddItemToUserLibraryRequest;
    response: void;
  };
  "/item/removeFromUserLibrary": {
    request: RemoveItemFromUserLibraryRequest;
    response: void;
  };
  "/item/transferOwnership": {
    request: { itemId: string; userId: string };
    response: void;
  };
  "/item/update": { request: UpdateItemRequest; response: void };
  "/item/updateParents": {
    request: {
      itemId: string;
      collectionIds: string[];
      removeMissingCollections?: boolean;
    };
    response: void;
  };
  "/item/updatePermissions": {
    request: { itemId: string; permissionUpdates: any };
    response: { success: boolean; updated: number };
  };
  "/item/userPermissionLookup": {
    request: { tempAuthToken?: TokenData; targetUserId?: string };
    response: {
      permission: PermissionType;
      direct: boolean;
      inheritedFrom?: string[];
    };
  };
  "/item/findWithPublishId": {
    request: { publishId: string; publishIdBlindKey?: string; targetUserId?: string };
    response: ItemInfoView[];
  };
  "/items/match": {
    request: GetRankedMatchesForURLRequest;
    response: MatchResult[];
  };
  "/localstore/lookupMetaTemp": {
    request: { id: string };
    response: { id: string; data: any; timestamp?: number } | null;
  };
  "/localstore/reset": { request: {}; response: { success: boolean } };
  "/localstore/saveMetaTemp": { request: SaveMetaTempRequest; response: void };
  "/native/speechStart": {
    request: { lang?: string; onDevice?: boolean; keepAlive?: boolean };
    response: { success: boolean; message?: string };
  };
  "/native/speechStop": { request: {}; response: { success: boolean } };
  "/nativeClientCheck": { request: {}; response: { success: boolean } };
  "/nativeMessage": {
    request: { type: string; data?: any };
    response: { success: boolean; message: string };
  };
  "/nativeDesktopStatus": {
    request: {};
    response: { success: boolean; bridge?: DesktopBridgeStatus; data?: any; error?: string };
  };
  "/nativeDesktopBridgeState": {
    request: {};
    response: { success: boolean; bridge: DesktopBridgeStatus };
  };
  "/nativeDesktopOpenControls": {
    request: {};
    response: { success: boolean; type?: string; error?: string };
  };
  /** Ask the Companion to quit and reopen the browsers still waiting on a restart. */
  "/nativeDesktopRelaunchBrowsers": {
    request: { entryIds?: string[] };
    response: {
      success: boolean;
      type?: string;
      data?: { relaunched?: string[]; failed?: { browserAppName: string; error: string }[] };
      error?: string;
    };
  };
  "/nativeDesktopLockdown": {
    request: {
      action: 'apply' | 'remove';
      grant: { expAtSec: number; overrideUserId?: string };
      extensionId?: string;
      updateUrl?: string;
    };
    response: { success: boolean; data?: any; error?: string };
  };
  "/nativeDesktopSetCheckup": {
    request: {
      audience?: string;
      firstRunDismissedAt?: string;
      /** Keyed by check id; the value is a `CheckupDisposition`, carried opaquely. */
      dispositions?: Record<string, unknown>;
    };
    response: { success: boolean; error?: string };
  };
  "/nativeDesktopAuthorizeChallenge": {
    request: {
      challengeId: string;
      grant: { expAtSec: number; overrideUserId?: string };
    };
    response: { success: boolean; data?: any; error?: string };
  };
  "/plans/list": {
    request: {};
    response: Array<{
      id: string;
      name: string;
      price: number;
      features: string[];
    }>;
  };
  "/plugin/list": {
    request: { userId?: string };
    response: PluginListResponse;
  };
  "/post/create": {
    request: CreatePostRequest;
    response: CreatePostResponse;
  };
  "/post/createGrouped": {
    request: CreateGroupedPostRequest;
    response: CreateGroupedPostResponse;
  };
  "/post/listByShareGroup": {
    request: ListByShareGroupRequest;
    response: Post[];
  };
  "/post/readReceipt/mark": {
    request: PostReadReceiptMarkRequest;
    response: PostReadReceiptMarkResponse;
  };
  "/post/readReceipt/list": {
    request: PostReadReceiptListRequest;
    response: PostReadReceiptListResponse;
  };
  "/post/delete": { request: { postId: string }; response: void };
  "/post/list": {
    request: { userId?: string; pageInfo?: any };
    response: Post[];
  };
  "/post/updateSharedWith": {
    request: { postId: string; sharedWith: string[] };
    response: void;
  };
  "/post/updateEncInfo": {
    request: UpdatePostEncInfoRequest;
    response: void;
  };
  "/pubfile/get": {
    request: { fileId?: string; pubId?: string; filename?: string };
    // Base64 file bytes. Published files are stored plaintext, so callers writing them into a
    // library item must supply the item's encInfo on upload to get them encrypted at rest.
    response: string;
  };
  "/published/collectionItemFeed": {
    request: { itemId: string };
    response: PublishedFeedItem[];
  };
  "/published/collectionsByUser": {
    request: {
      userId?: string;
      publicId?: string;
      viewAsUserId?: string;
      includeAll?: boolean;
    };
    response: Array<{ id: string; title: string; itemCount?: number }>;
  };
  "/published/countView": { request: { itemId: string }; response: void };
  "/published/filteredSearch": {
    request: { searchData?: any; pageInfo?: any };
    response: { rows: Published[]; moreAvailable: boolean };
  };
  "/published/categoryCoverage": {
    request: Record<string, never>;
    response: PublishedCategoryCoverageResponse;
  };
  "/content/bundle/recommend": {
    request: RecommendContentBundlesRequest;
    response: RecommendContentBundlesResponse;
  };
  "/setup/catalog/get": {
    request: GetSetupCatalogRequest;
    response: GetSetupCatalogResponse;
  };
  // Auth-optional: the puzzle app is `requiresLogin: false`, so guests must be able to read it.
  "/thinkingPuzzles/catalog": {
    request: ThinkingPuzzlesCatalogRequest;
    response: ThinkingPuzzlesCatalogResponse;
  };
  "/published/flag": {
    /**
     * A report of a catalog item. `reason` is a CATALOG_REPORT_REASONS code. `details.flagReason`
     * and `details.flagComment` are still read from older clients; who is reporting comes from the
     * session, never from the request.
     */
    request: { itemId: string; reason?: string; comment?: string | null; details?: Record<string, any> };
    /** `underReview`: the item is out of recommendations until a curator finishes the review. */
    response: { reviewOpen: boolean; underReview: boolean; alreadyReported: boolean };
  };
  "/published/get": {
    request: { itemId: string };
    response: PublishedInfoView;
  };
  "/published/getGalleryGroupAndItems": {
    request: { groupId: string; dbId?: string };
    response: { group: { id: string; name: string }; items: any[] };
  };
  "/published/curationQueue": {
    request: {};
    response: CurationQueueEntry[];
  };
  // Curation review (docs/specs/curation-review.md). `listForItem` is public; the rest are curators only.
  "/curationReview/listForItem": {
    request: { itemId: string };
    response: CurationReviewListForItemResponse;
  };
  "/curationReview/queue": {
    request: {};
    response: CurationReviewQueueEntry[];
  };
  "/curationReview/getForCurator": {
    /** `ensureOpen`: open a review now if none is open, so the curator can start one. */
    request: { itemId: string; ensureOpen?: boolean };
    response: CurationReviewForCuratorResponse;
  };
  "/curationReview/saveDraft": {
    request: CurationReviewSaveRequest;
    response: { version: number };
  };
  "/curationReview/finalize": {
    request: CurationReviewSaveRequest;
    response: CurationReviewCuratorView;
  };
  "/curationReview/screenshot/upload": {
    /** A PNG, JPEG or WebP data URL, at most 2 MB. Returns the public image filename to attach to a check. */
    request: { reviewId: string; imageData: string };
    response: { filename: string };
  };
  "/curationReview/requestAiDraft": {
    /** At most once every ten minutes per review. */
    request: { reviewId: string };
    response: CurationReviewAiDraft;
  };
  "/published/info/update": {
    request: { itemId: string; data: any };
    response: void;
  };
  "/published/item/importFromPublished": {
    request: ImportFromPublishedRequest;
    response: string;
  };
  "/published/listForMap": {
    request: { limit?: number };
    response: { rows: PublishedMapFeedRow[] };
  };
  "/published/listGroupIdsForGallery": {
    request: { galleryId: string; dbId?: string };
    response: string[];
  };
  "/published/listChildren": {
    request: { itemId: string };
    response: PublishedInfoView[];
  };
  "/published/listRecent": {
    request: { count?: number; curatedOnly?: boolean };
    response: Array<{
      id: string;
      title: string;
      createdAt: number;
      authorId: string;
    }>;
  };
  "/published/listWithEasyIds": {
    request: { ids: string[] };
    response: Published[];
  };
  "/published/listWithChild": {
    request: { itemId: string };
    response: Array<{ id: string; title: string; childItems?: any[] }>;
  };
  "/published/listWithIds": {
    request: { ids: string[] };
    response: Array<{ id: string; title: string; items?: any[] }>;
  };
  "/published/matchForURL": { request: { url: string }; response: Published[] };
  "/published/ownerStatus": {
    request: { itemId: string };
    response: OwnerPublishStatus;
  };
  "/published/publishCollection": {
    request: {
      itemId: string;
      tempAuthToken?: TokenData;
      actionApprovalRequestId?: string;
    };
    response: PublishResult;
  };
  "/published/publishCollectionClient/init": {
    request: {
      collectionId: string;
      publishVisibilityCode: number;
      actionApprovalRequestId?: string;
      publishType?: string;
      publishConfig?: any;
      publishName?: string | null;
      publishDescription?: string | null;
      description?: string | null;
      categories?: string[];
      useCriteria?: any;
      tempAuthToken?: TokenData;
      /**
       * Optional temporary, unencrypted UserFile id (no "uf_" prefix) containing the banner image bytes.
       * The server will copy it into published storage.
       */
      bannerTempUserFileId?: string | null;
      /**
       * For non-UserFile images (e.g. a URL), you can pass through an existing image filename.
       */
      bannerImageFilename?: string | null;
    };
    response: { publishId: string };
  };
  "/published/publishCollectionClient/addChild": {
    request: {
      parentPublishId: string;
      actionApprovalRequestId?: string;
      tempAuthToken?: TokenData;
      child: {
        itemId: string;
        /** Decrypted item details payload (server will treat as plaintext for publishing). */
        details: any;
        /** Decrypted collection relation payload (order/details/availability). */
        collectionRelation?: any;
      };
    };
    response: { childPublishId: string };
  };
  "/published/publishCollectionClient/finalize": {
    request: {
      collectionId: string;
      publishId: string;
      childPublishIds: string[];
      actionApprovalRequestId?: string;
      tempAuthToken?: TokenData;
    };
    response: PublishResult;
  };
  /**
   * UI -> BG orchestration route for client-upload publishing. Background decrypts locally and streams plaintext to server.
   */
  "/published/publishCollectionClientUpload": {
    request: {
      collectionId: string;
      publishVisibilityCode: number;
      actionApprovalRequestId?: string;
      publishType?: string;
      publishConfig?: any;
      publishName?: string | null;
      publishDescription?: string | null;
      description?: string | null;
      categories?: string[];
      useCriteria?: any;
      tempAuthToken?: TokenData;
    };
    response: PublishResult;
  };
  "/published/publishItem": {
    request: { itemId: string; itemData: any };
    response: PublishResult;
  };
  "/published/reviewsByUser": {
    request: { userId: string };
    response: Array<{
      id: string;
      itemId: string;
      rating?: number;
      review?: string;
    }>;
  };
  "/published/subscribe": {
    request: SubscribeToPublishedRequest;
    response: any;
  };
  "/published/subscription/update": {
    request: { collectionId?: string; publishId?: string };
    response: void;
  };
  "/published/unpublish": { request: { publishId: string }; response: void };
  "/published/updateCurationStatus": {
    request: {
      itemId: string;
      approved: boolean;
      comment?: string | null;
      /** Required when a family's suggestion is not added; one of DECLINE_REASONS. */
      declineReason?: string | null;
    };
    response: void;
  };
  "/published/updateEasyId": {
    request: { itemId: string; easyId: string };
    response: void;
  };
  "/published/view": {
    request: GetPublishedViewRequest;
    response: { info: Published; items: Published[] };
  };
  "/reaction/list": {
    request: { refId: string; refType: "post" | "item" };
    response: ReactionInfo[];
  };
  "/reaction/save": {
    request: { refId: string; refType: string; reaction: string };
    response: void;
  };

  "/review/getForUser": {
    request: { publishId: string };
    response: { _id: string; overallRating: number; comment?: string } | null;
  };
  "/review/listForItem": {
    request: {
      publishId: string;
      pageInfo?: {
        currentPage?: number;
        perPage?: number;
        includeTotalRows?: boolean;
      };
    };
    response: { records: any[]; count: number };
  };
  "/review/save": {
    request: {
      publishId: string;
      data: { reviewId?: string; overallRating: number; comment?: string };
    };
    response: { reviewId: string; success: boolean };
  };
  "/search/main": { request: SearchMainRequest; response: ItemInfoView[] };
  "/search/autocomplete": {
    request: { query: string; userId?: string };
    response: any[];
  };
  "/search/browser-address-autocomplete": {
    request: { query: string; limit?: number };
    response: any[];
  };
  "/search/embedded": { request: any; response: any };
  "/search/status": { request: {}; response: { indexRebuilding: boolean } };
  /**
   * Local lookup (bg handler only) — the search engines and reference sites this person
   * has, by kind marker or by their homepage being in the library URL index. `kinds` is
   * encrypted and the index is on-device, so the server can never answer this.
   */
  "/search/lookupProviders": {
    request: {};
    response: {
      providers: Array<{
        id: string;
        role: "engine" | "reference";
        displayName: string;
        iconName: string;
        origin: string;
        marked: boolean;
      }>;
      indexHydrated: boolean;
    };
  };
  // Read-only telemetry: library size (sampled, not scanned) plus a rolling
  // sample of recent search timings split by phase. Never carries query text.
  "/search/diagnostics": {
    request: {};
    response: {
      libraryStats: {
        itemCount: number;
        sampledRows: number;
        meanRowBytes: number;
        p95RowBytes: number;
        approxTotalBytes: number;
      } | null;
      summary: {
        sampleSize: number;
        p50Ms: number;
        p95Ms: number;
        maxMs: number;
        meanItemsScanned: number;
        meanScanMs: number;
        meanRankMs: number;
        meanEnrichMs: number;
        // Per-engine split. The corpus serves what it can; filtered and
        // browse-mode queries can only be answered by the full scan.
        corpusEngine: {
          sampleSize: number;
          p50Ms: number;
          p95Ms: number;
          maxMs: number;
          meanEnrichMs: number;
          // Cold = the packed record had to be read back. The MV3 case.
          coldSampleSize: number;
          coldP50Ms: number;
          warmSampleSize: number;
          warmP50Ms: number;
          meanQueryMs: number;
          meanHydrateMs: number;
          meanHydratedItems: number;
          rebuildCount: number;
          meanRebuildMs: number;
          corpusItems: number;
          corpusBytes: number;
        };
        scanEngine: {
          sampleSize: number;
          p50Ms: number;
          p95Ms: number;
          maxMs: number;
          meanEnrichMs: number;
        };
        // Read right after agreement: an engine that always falls back shows a
        // healthy p50 while doing nothing.
        fallbackRate: number;
        fallbackReasons: Record<string, number>;
        // Packed-corpus shadow engine. Warm and cold are reported separately
        // because the extension is MV3 and a blended number would hide the
        // service-worker-eviction case that matters most.
        shadow: {
          sampleSize: number;
          okCount: number;
          agreementRate: number;
          meanJaccard: number;
          warmSampleSize: number;
          warmP50Ms: number;
          warmP95Ms: number;
          coldSampleSize: number;
          coldP50Ms: number;
          coldP95Ms: number;
          meanLoadMs: number;
          meanWarmAcquireMs: number;
          meanQueryMs: number;
          rebuildCount: number;
          meanRebuildMs: number;
          corpusItems: number;
          corpusBytes: number;
        };
      };
      shadowEnabled: boolean;
      corpusEngineEnabled: boolean;
      recentSearches: Array<{
        at: string;
        // Absent on events recorded before the corpus was promoted; treat as 'scan'.
        engine?: "scan" | "corpus";
        fellBackReason?: "filters" | "browse-mode" | "flag-off" | "error";
        hydrateMs?: number;
        corpus?: {
          warm: boolean;
          loadMs: number;
          rebuildMs: number;
          deltaMs: number;
          deltaItems: number;
          queryMs: number;
          hydratedItems: number;
          corpusItems: number;
          corpusBytes: number;
        };
        queryLength: number;
        queryCount: number;
        itemsScanned: number;
        candidatesMatched: number;
        scanMs: number;
        rankMs: number;
        enrichMs: number;
        totalMs: number;
        shadow?: {
          ok: boolean;
          error?: string;
          warm: boolean;
          loadMs: number;
          rebuildMs: number;
          acquireMs: number;
          candidateMs: number;
          scoreMs: number;
          totalMs: number;
          corpusItems: number;
          corpusBytes: number;
          candidateCount: number;
          comparedQueries: number;
          topNMatch: boolean;
          jaccard: number;
          firstMismatchRank: number | null;
        };
      }>;
    };
  };
  "/search/setShadowEnabled": {
    request: { enabled: boolean };
    response: { enabled: boolean };
  };
  "/search/setCorpusEngineEnabled": {
    request: { enabled: boolean };
    response: { enabled: boolean };
  };
  "/search/terms": {
    request: { type: string; userId?: string };
    response: Array<{ key: string; text: string; count: number }>;
  };
  "/access/evaluate": {
    request: AccessEvaluateRequest;
    response: AccessEvaluateResponse;
  };
  "/sentry/clearTempDisableBlocking": { request: {}; response: void };
  "/sentry/getTempDisableBlockingStatus": {
    request: {};
    response: TempDisableBlockingStatusResponse;
  };
  "/sentry/giveTempAccess": {
    request: { patternList?: string[]; exactUrlList?: string[]; durationMinutes?: number | null };
    response: any;
  };
  "/sentry/givePrivilegedTempAccess": {
    request: { patternList?: string[]; exactUrlList?: string[]; durationMinutes?: number | null };
    response: any;
  };
  "/sentry/hasPrivilegedTempAccess": {
    request: { url?: string };
    response: boolean;
  };
  "/sentry/recheckRecentImagePageBlock": {
    request: { url: string; context?: any };
    response: any;
  };
  "/sentry/recheckEarlyUrlBlock": {
    request: { url: string; context?: any };
    response: any;
  };
  "/sentry/processRequestsForBlocking": {
    request: { url: string; context?: any };
    response: any;
  };
  "/sentry/processRequestsForInjection": {
    request: { url: string; context?: any };
    response: any;
  };
  "/sentry/tempDisableBlocking": {
    request: { minutes: number };
    response: any;
  };
  /** Walk a blocked tab back to the last page that was actually allowed. */
  "/sentry/rewindToSafety": {
    request: { tabId?: number };
    response: { started: boolean };
  };
  /** Whether that tab has an earlier page to return to at all. */
  "/sentry/hasBackTarget": {
    request: { tabId?: number };
    response: { hasBackTarget: boolean };
  };
  "/serverSettings/get": { request: GetServerSettingsRequest; response: ServerSettingsView | null };
  "/serverSettings/refresh": { request: {}; response: void };
  "/serverSettings/update": { request: UpdateServerSettingsRequest; response: void };
  /** Looks for a Kindredly server on this machine, on a named box, and optionally across a /24. */
  "/serverSettings/discover": { request: DiscoverServersRequest; response: DiscoverServersResponse };
  /** Confirms a hand-typed server address before it is saved. */
  "/serverSettings/checkUrl": { request: CheckServerUrlRequest; response: CheckServerUrlResponse };
  "/store/config": {
    request: {};
    response: { publicKey: string; environment: string };
  };
  "/store/createSubscription": {
    request: { planId: string; provider: string; paymentMethodId?: string };
    response: { subscriptionId: string; status: string };
  };
  "/store/webhooks": {
    request: { event: string; data: any };
    response: { success: boolean };
  };
  "/subscription/add": {
    request: {
      userId?: string;
      refId: string;
      refType: SubscriptionRefType;
      data?: any;
      encInfo?: EncInfo;
    };
    response: SubscriptionInfo;
  };
  "/subscription/edit": {
    request: { subscriptionId: string; data: any; encInfo: EncInfo };
    response: void;
  };
  "/subscription/listForRef": {
    request: { refId: string; refType: string };
    response: SubscriptionInfo[];
  };
  "/subscription/listForUser": {
    request: { userId?: string; targetUserId?: string };
    response: SubscriptionInfo[];
  };
  "/subscription/remove": {
    request: { refId: string; refType: string };
    response: void;
  };
  "/subscription/removeById": {
    request: { subscriptionId: string };
    response: void;
  };
  "/sync/clearAll": { request: {}; response: { success: boolean } };
  "/sync/clearOld": { request: { before: number }; response: void };
  "/sync/events": { request: { since?: number }; response: void }; // SSE endpoint - returns event stream
  "/sync/getAllOperations": { request: {}; response: { operations: any[] } };
  "/sync/getPending": { request: {}; response: { count: number } };
  "/sync/getStatus": { request: {}; response: SyncStatusResponse };
  "/sync/updateClient": {
    request: { quick?: boolean; overrideIndexRebuild?: boolean };
    response: boolean;
  };
  "/sync/fullResetLog": {
    request: {};
    response: { at: string; userId: string; source: string; reasons: string[] }[];
  };
  "/sync/retryFailed": { request: {}; response: void };
  "/sync/retryOperation": { request: { operationId: string }; response: void };
  "/sync/trigger": { request: {}; response: void };
  "/sync/update": {
    request: {
      // The legacy cursor: a wall-clock date. Superseded by lastRevision, kept for
      // clients that have not upgraded. Declared `number` and parsed with `new Date()`,
      // which is exactly why the revision needed a field of its own -- a bare revision
      // like 51291 would have parsed as 1970.
      lastUpdate?: number;
      // SYNC-4. The changelog id this client has already seen, from a previous
      // response's `revision`. Takes precedence over lastUpdate when both are sent.
      lastRevision?: number;
      userId?: string;
      // Client supports chunked full sync (server may respond with chunkedItemIds).
      chunked?: boolean;
      // Fetch details for one page of item ids (max 500 per request).
      fetchItemIds?: string[];
    };
    response: ItemChangeLogUpdate;
  };
  "/system/contactRequest": {
    // diagnostics: optional client-assembled bug-report bundle (redacted client-side);
    // the server folds it into userInfo.diagnostics for storage.
    // urgent: bug reports only — marks the platform alert high-priority.
    request: { contactType?: string; userInfo?: any; message: string; diagnostics?: any; urgent?: boolean };
    response: void;
  };
  // --- Realm recovery on a home box (REALM-8 / REALM-14) --------------------
  // Unauthenticated by necessity: an empty box has nobody to sign in as, and after a restore
  // nobody has a credential yet. The recovery phrase is the authority for everything that reads
  // family data, and the whole surface is refused unless the server is running the `lite` profile.
  "/realm/restore/list": {
    request: {};
    response: {
      available: boolean;
      snapshots: Array<{
        objectName: string;
        realmId: string;
        snapshotId: string;
        createdAt: string;
        bundleFormatVersion: number;
        sizeBytes: number;
      }>;
    };
  };
  "/realm/restore/preflight": {
    request: { objectName: string; phrase: string };
    response: {
      realmId: string;
      snapshotId: string;
      createdAt: string;
      isLatest: boolean;
      memberCount: number;
      recordCount: number;
      blobCount: number;
      excluded: string[];
      verifyOk: boolean;
      verifyProblems: string[];
      authorityOk: boolean;
      destinationHasRealm: boolean;
      ahead: Array<{ userId: string; liveRevision: number; bundleRevision: number }>;
      unlockMethods: {
        byPassword: string[];
        byRecoveryKey: string[];
        strandedMembers: string[];
        none: boolean;
      };
    };
  };
  "/realm/restore/run": {
    request: { objectName: string; phrase: string; acceptNoUnlockMethod?: boolean; allowUnverified?: boolean };
    response: {
      realmId: string;
      snapshotId: string;
      createdAt: string;
      memberIds: string[];
      recordsWritten: number;
      recordsSkipped: Array<{ table: string; recordId: string; reason: string }>;
      droppedColumns: string[];
      blobsWritten: number;
      blobsMissing: string[];
      excluded: string[];
      restoredWithoutUnlockMethod?: boolean;
      claimWindowExpiresAt: string;
    };
  };
  "/realm/claim/list": {
    request: { realmId: string };
    response: {
      windowOpen: boolean;
      members: Array<{
        userId: string;
        username: string | null;
        displayedName: string | null;
        type: string | null;
        passwordClaimable: boolean;
        alreadyHasCredential: boolean;
      }>;
    };
  };
  "/realm/claim/withPassword": {
    request: { realmId: string; userId: string; password: string };
    response: { userId: string; username: string };
  };
  "/system/status": {
    request: {};
    response: { underAccountLimit?: boolean; allowInviteCode?: boolean | null };
  };
  "/system/version": { request: {}; response: ServerVersionInfo };
  "/test/client/dbtest": { request: any; response: any };
  "/test/client/debugInfo": { request: {}; response: any };
  "/test/client/run": {
    request: { name: string; params?: any };
    response: any;
  };
  "/test/client/sendRemoteDebugToast": {
    request: SendManagedClientDebugToastRequest;
    response: SendManagedClientDebugToastResponse;
  };
  "/user/activity/clearUsageLog": { request: {}; response: void };
  "/user/activity/deleteAll": { request: {}; response: void };
  "/user/activity/list": {
    request: { userId?: string; options: any; limit?: number };
    response: Array<{
      id: string;
      timestamp: number;
      url?: string;
      title?: string;
    }>;
  };
  "/user/activity/logList": {
    request: { userId?: string; type?: string; options?: any };
    response: UserActivityLogListResponse;
  };
  "/activity/logNewVisit": {
    request: { itemId: string; userId?: string };
    response: void;
  };
  "/user/activity/push": {
    request: {
      userId?: string;
      monitorId: string;
      createdAt: number;
      updatedAt: number;
      type: string;
      data: any;
      encInfo?: any;
      complete?: boolean;
    };
    response: SaveUserActivityLogResponse;
  };
  "/user/activity/invalidateMonitors": {
    request: InvalidateActivityMonitorsRequest;
    response: InvalidateActivityMonitorsResponse;
  };
  "/user/activity/reportClassificationIssue": {
    request: ReportClassificationIssueRequest;
    response: ReportClassificationIssueResponse;
  };
  "/user/activity/getClassificationEvalProgramStatus": {
    request: GetClassificationEvalProgramStatusRequest;
    response: GetClassificationEvalProgramStatusResponse;
  };
  "/user/activity/uploadClassificationDatasetSamples": {
    request: UploadClassificationDatasetSamplesRequest;
    response: UploadClassificationDatasetSamplesResponse;
  };
  "/user/activity/uploadImageClassificationSamples": {
    request: UploadImageClassificationSamplesRequest;
    response: UploadImageClassificationSamplesResponse;
  };
  "/user/activity/pushEntries": { request: { entries: any[] }; response: void };
  "/user/activity/removeEntry": { request: { id: string }; response: void };
  "/activity/updateItemVisitHistory": {
    request: { updateList: { id: string; visitTime: string }[] };
    response: void;
  };

  "/audit_log/list": {
    request: {
      userId?: string;
      limit?: number;
      cursor?: { createdAt: string; id: string };
    };
    response: {
      entries: Array<{
        _id: string;
        actorUserId: string;
        action: string;
        entityType: string;
        entityId: string;
        relatedIds?: any;
        createdAt: string;
      }>;
      nextCursor?: { createdAt: string; id: string };
    };
  };

  "/user/client/heartbeat": {
    request: { status?: DeviceGuardStatus };
    response: {
      serverTimeMs: number;
      /**
       * A parent's approvals, in a form the device can apply to the ruleset it already cached.
       *
       * Here rather than on a channel of its own because this is the one call a Companion makes
       * with no browser running, which is exactly the situation an approval has to survive. Read
       * `restrictions/deviceGrants` before adding a kind: a grant may only ever LOOSEN.
       */
      grants?: DeviceGrant[];
    };
  };
  "/user/client/list": {
    request: { userId?: string };
    response: ClientInfoView[];
  };
  "/user/client/updateDeviceToken": {
    request: { deviceToken: string };
    response: void;
  };
  "/user/client/listManagedSessions": {
    request: { userId?: string };
    response: ManagedClientSessionView[];
  };
  "/user/client/sendDebugToast": {
    request: SendManagedClientDebugToastRequest;
    response: SendManagedClientDebugToastResponse;
  };
  "/user/client/remoteAction/queue": {
    request: QueueManagedRemoteActionRequest;
    response: QueueManagedRemoteActionResponse;
  };
  "/user/client/remoteAction/openUrl": {
    request: { userId?: string; clientId: string; url: string };
    response: QueueManagedRemoteActionResponse;
  };
  "/user/client/remoteAction/localDecision": {
    request: { token: string; approved: boolean };
    response: { success: boolean; result: { matched: boolean } };
  };
  "/user/client/remoteAction/forceSyncSettings": {
    request: { userId?: string; clientId: string; refreshCurrentUser?: boolean; refreshUserPrefs?: boolean };
    response: QueueManagedRemoteActionResponse;
  };
  "/user/client/remoteAction/syncActivity": {
    request: { userId?: string; clientId: string };
    response: QueueManagedRemoteActionResponse;
  };
  "/user/client/remoteAction/getScreenshot": {
    request: { userId?: string; clientId: string };
    response: QueueManagedRemoteActionResponse;
  };
  "/user/client/remoteAction/status": {
    request: GetManagedRemoteActionStatusRequest;
    response: GetManagedRemoteActionStatusResponse;
  };
  "/user/client/remoteAction/ack": {
    request: AckManagedRemoteActionRequest;
    response: AckManagedRemoteActionResponse;
  };
  "/user/client/remoteAction/syncActivityAll": {
    request: RequestActivitySyncAllRequest;
    response: RequestActivitySyncAllResponse;
  };
  /**
   * Client-only wrappers over /user/liveView/*: the background decrypts each
   * device's frame before handing it to the UI, so the frames stay E2E-encrypted
   * on the wire and the UI never touches key material.
   */
  "/liveView/start": {
    request: { userIds: string[]; cadenceMs?: number };
    response: { success: boolean; result: { session: any; devices: any[] } };
  };
  "/liveView/latest": {
    request: { sessionId: string; clientId?: string; cadenceMs?: number };
    response: { success: boolean; result: { session: any; devices: any[] } };
  };
  "/liveView/stop": {
    request: { sessionId: string };
    response: { success: boolean; result: any };
  };
  "/user/liveView/start": {
    request: StartLiveViewRequest;
    response: StartLiveViewResponse;
  };
  "/user/liveView/latest": {
    request: GetLiveViewFramesRequest;
    response: GetLiveViewFramesResponse;
  };
  "/user/liveView/stop": {
    request: StopLiveViewRequest;
    response: StopLiveViewResponse;
  };
  "/user/liveView/pushFrame": {
    request: PushLiveViewFrameRequest;
    response: PushLiveViewFrameResponse;
  };
  "/user/current": { request: {}; response: UserView };
  "/user/debug": { request: { data?: any }; response: { [key: string]: any } };
  "/user/debug/statusCheck": {
    request: {};
    response: { status: string; details?: any };
  };
  "/user/delete": { request: { userIdToDelete?: string }; response: void };
  "/user/email/update": {
    request: { userId?: string; email: string };
    response: void;
  };

  // Integrations: Gmail OAuth (refresh token stored server-side; access tokens minted on demand)
  "/user/integrations/gmail/oauth/status": {
    request: {};
    response: { connected: boolean };
  };
  "/user/integrations/gmail/oauth/disconnect": {
    request: {};
    response: {};
  };
  "/user/integrations/gmail/oauth/exchangeCode": {
    request: { code: string; redirectUri: string };
    response: { accessToken: string; expiresInSec: number; scope?: string; obtainedAtMs: number };
  };
  "/user/integrations/gmail/oauth/accessToken": {
    request: {};
    response: { accessToken: string; expiresInSec: number; scope?: string; obtainedAtMs: number };
  };
  "/user/encryption/deleteRecoveryKey": {
    request: { userId?: string };
    response: void;
  };
  /**
   * KEY-0 repair. Removes the password-wrapped copy of a user's secret when that user has
   * no password — for SSO accounts that copy was wrapped under a key derived from a null
   * password, which is a global constant. Refuses when the user actually has a password.
   */
  "/user/encryption/deletePasswordWrappedSecret": {
    request: { userId?: string };
    response: { removed: boolean };
  };
  "/user/encryption/listKeys": {
    request: { userId?: string };
    response: ListKeysResponse;
  };
  "/user/encryption/removeAllAccountKeys": { request: {}; response: void };
  "/user/encryption/removeKeys": {
    request: { userId?: string; deleteAccountKeys?: boolean };
    response: void;
  };
  "/user/encryption/saveAccountKeys": {
    request: { keyList: KeyEntry[]; userId?: string };
    response: void;
  };
  "/user/encryption/saveUserKeys": {
    request: { keyList: KeyEntry[]; userId?: string };
    response: void;
  };
  "/user/encryption/createKeyEntryForUser": {
    request: { targetUserId: string; keyEntry: KeyEntry };
    response: { id: string };
  };
  "/encryption/updateSettings": {
    request: { userId?: string; encSettings: Record<string, any> };
    response: void;
  };
  "/user/friend/list": {
    request: { userId?: string };
    response: FriendListResponse;
  };
  "/user/friend/profile": {
    request: { userId?: string; friendUserId: string };
    response: {
      userId: string;
      username: string;
      displayName?: string;
      profileImage?: string;
    };
  };
  "/user/friend/request": {
    request: {
      requestData: { email: string; inviterName?: string; message?: string };
      userId?: string;
    };
    response: { requestId: string; status: string };
  };
  "/user/friend/takeAction": {
    request: FriendTakeActionRequest;
    response: void;
  };
  "/user/image/upload": { request: UpdateProfileImageRequest; response: void };
  "/user/info": { request: { userId: string }; response: UserView | null };
  "/user/info/update": { request: UpdateUserInfoRequest; response: void };
  "/user/info/updateUsername": {
    request: { userId?: string; username: string };
    response: void;
  };
  "/activity/logVisit": { request: LogVisitRequest; response: void };
  "/user/migrate": {
    request: { email: string; inviteVerification: { code: string } };
    response: { success: boolean; message?: string };
  };
  "/user/miscStats": {
    request: { userId?: string };
    response: MiscNotificationStats;
  };
  "/user/mypublicprofile": { request: {}; response: UserPublic | null };
  "/user/notification/clear": { request: {}; response: void };
  "/user/notification/count": {
    request: {};
    response: { count: number; unread: number };
  };
  "/user/notification/list": {
    request: { userId?: string; pageInfo?: any };
    response: Notification[];
  };
  "/user/notification/markAllAsRead": { request: {}; response: void };
  "/user/notification/markRead": { request: { ids: string[] }; response: void };
  "/user/notification/markUnread": {
    request: { ids: string[] };
    response: void;
  };
  "/user/notification/remove": { request: { id: string }; response: void };
  "/user/options/get": {
    request: { userId?: string };
    response: { [key: string]: any };
  };
  "/user/options/update": {
    request: {
      userId?: string;
      options?: Partial<UserOptions>;
      tempAuthToken?: TokenData;
    };
    response: void;
  };
  /**
   * Mark your OWN daily check-in done for today.
   *
   * Deliberately takes no userId and no settings: it is the one write a
   * restricted user is allowed to make against their own access control, so it
   * touches nothing but `checkpointRelease` and refuses in guardian mode.
   * Everything else still goes through the admin-gated /user/options/update.
   */
  "/user/checkpoint/clear": {
    request: {};
    response: { release: CheckpointRelease };
  };
  "/user/settings/copy": {
    request: CopyUserSettingsRequest;
    response: CopyUserSettingsResponse;
  };
  /**
   * Admin-only. Writes `message` as the Blocked message of every family member who has none, and
   * leaves every message someone already wrote alone. Changes that one field and nothing else in
   * `accessControlSettings`. Returns who was changed.
   */
  "/user/blockedMessage/fillBlank": {
    request: { message: string };
    response: { updatedUserIds: string[] };
  };
  "/user/plugin/list": {
    request: { userId?: string };
    response:  PluginListResponse;
  };
  "/user/plugin/update": {
    request: { userId?: string; pluginIds: string[] };
    response: void;
  };
  "/user/prefs/defaultsByKey": {
    request: { key: string };
    response: { [key: string]: any };
  };
  "/user/prefs/get": {
    request: { userId?: string; keys: string[] };
    response: GetUserPrefsResponse;
  };
  "/user/prefs/getValue": {
    request: { userId?: string; key: string };
    response: { value: any };
  };
  "/user/prefs/update": { request: { userId?: string; updates: any }; response: boolean };
  "/user/profile/get": {
    request: { userId?: string; viewAsUserId?: string };
    response: UserView;
  };
  "/user/profileImage/update": {
    request: UpdateProfileImageRequest;
    response: void;
  };
  "/user/public/get": { request: { id: string }; response: UserPublic | null };
  "/user/public/update": {
    request: { data: UpdatePublicProfileRequest };
    response: string;
  };
  "/user/publicProfileImage/upload": {
    request: UpdateProfileImageRequest;
    response: string;
  };
  "/user/sendEmailVerification": {
    request: { userId?: string };
    response: void;
  };
  "/user/userType/update": {
    request: { userId: string; type: UserType };
    response: void;
  };
  "/user/publishing/update": {
    request: { userId: string; canPublishPublicly: boolean };
    response: void;
  };
  "/userdata/proxy": {
    request: { url: string };
    response: { data: any; contentType?: string };
  };
  "/userdata/proxyr": {
    request: { url: string; method?: string; type?: string };
    response: StreamResult;
  };
  "/userfile/getById": {
    request: { fileId: string; previewId?: string };
    response: {
      data: any;
      userFile?: UserFile;
      /** Which bytes came back: the preview's id, or null for the original. Absent from servers older than PERF-3. */
      resolvedPreviewId?: string | null;
      deliveryMetrics?: {
        source: 'account-db' | 'remote-multipart' | 'remote-binary' | 'remote-legacy' | 'remote-chunked';
        remoteFetchMs: number;
        decryptMs: number;
        remoteTransferredBytes: number;
        totalMs: number;
      };
    } | null;
  };
  "/userfile/getMetaById": {
    request: { fileId: string; previewId?: string };
    response: { userFile: UserFile } | null;
  };
  "/userfile/updateEncInfo": {
    request: { fileId: string; encInfo: EncInfo | null };
    response: { success: true };
  };
  "/userfile/listByUser": {
    request: { userId?: string };
    response: FileRefInfo[];
  };
  "/userfile/listFilesByRef": {
    request: { refId: string; refType: string };
    response: FileRefInfo[];
  };
  "/userfile/remove": {
    request: { fileId: string };
    response: {
      deleted: boolean;
      removedAttachmentCount: number;
      detachedFromItemCount: number;
      blockedItemIds: string[];
      remainingItemIds: string[];
    };
  };
  "/userfile/cleanupUnused": {
    request: {
      userId?: string;
      dryRun?: boolean;
      maxToScan?: number;
      maxToDelete?: number;
    };
    response: {
      scannedCount: number;
      candidateCount: number;
      deletedCount: number;
      bytesFreed: number;
      candidates: Array<{
        fileId: string;
        filename?: string | null;
        fileType?: string | null;
        fileSize?: number | null;
        refType?: string | null;
        refId?: string | null;
      }>;
      errors: Array<{ fileId: string; error: string }>;
    };
  };
  "/media/banner/search": {
    request: BannerCatalogSearchRequest;
    response: BannerCatalogSearchResponse;
  };
  "/media/banner/recommend": {
    request: BannerRecommendRequest;
    response: BannerRecommendResponse;
  };
  "/admin/banner/list": {
    request: Record<string, never>;
    response: AdminBannerListResponse;
  };
  "/admin/banner/generate": {
    request: AdminBannerGenerateRequest;
    response: AdminBannerGenerateResponse;
  };
  "/admin/banner/generateFromPrompt": {
    request: AdminBannerGenerateFromPromptRequest;
    response: AdminBannerGenerateFromPromptResponse;
  };
  "/admin/banner/suggestPrompt": {
    request: AdminBannerSuggestPromptRequest;
    response: AdminBannerSuggestPromptResponse;
  };
  "/admin/banner/publish": {
    request: AdminBannerPublishRequest;
    response: AdminBannerPublishResponse;
  };
  "/admin/banner/testLocal": {
    request: AdminBannerTestLocalRequest;
    response: AdminBannerTestLocalResponse;
  };
  "/admin/banner/generator/save": {
    request: AdminBannerGeneratorSaveRequest;
    response: AdminBannerGeneratorResponse;
  };
  "/admin/banner/generator/select": {
    request: AdminBannerGeneratorSelectRequest;
    response: AdminBannerGeneratorResponse;
  };
  "/admin/banner/generator/delete": {
    request: AdminBannerGeneratorDeleteRequest;
    response: AdminBannerGeneratorResponse;
  };
  "/admin/banner/save": {
    request: AdminBannerSaveRequest;
    response: AdminBannerMutateResponse;
  };
  "/admin/banner/create": {
    request: AdminBannerCreateRequest;
    response: AdminBannerMutateResponse;
  };
  "/admin/banner/style/bulk": {
    request: AdminBannerBulkStyleRequest;
    response: AdminBannerBulkStyleResponse;
  };
  "/admin/banner/style/add": {
    request: AdminBannerStyleAddRequest;
    response: AdminBannerStylesResponse;
  };
  "/admin/banner/style/delete": {
    request: AdminBannerStyleDeleteRequest;
    response: AdminBannerStylesResponse;
  };
  "/admin/banner/enhance": {
    request: AdminBannerEnhanceRequest;
    response: AdminBannerEnhanceResponse;
  };
  "/admin/banner/inpaint": {
    request: AdminBannerInpaintRequest;
    response: AdminBannerInpaintResponse;
  };
  "/admin/banner/category/add": {
    request: AdminBannerCategoryAddRequest;
    response: AdminBannerCategoryAddResponse;
  };
  "/admin/banner/hide": {
    request: AdminBannerHideRequest;
    response: AdminBannerMutateResponse;
  };
  "/admin/banner/delete": {
    request: AdminBannerDeleteRequest;
    response: AdminBannerDeleteResponse;
  };
  "/admin/banner/suggestions": {
    request: AdminBannerSuggestionsRequest;
    response: AdminBannerSuggestionsResponse;
  };
  "/admin/banner/suggestion/add": {
    request: AdminBannerSuggestionAddRequest;
    response: AdminBannerMutateResponse;
  };
  "/admin/banner/freeimage/search": {
    request: FreeImageSearchRequest;
    response: FreeImageSearchResponse;
  };
  "/admin/banner/freeimage/fetch": {
    request: FreeImageFetchRequest;
    response: FreeImageFetchResponse;
  };
  "/media/categorySets": {
    request: Record<string, never>;
    response: CategorySetsResponse;
  };
  "/admin/categorySets/list": {
    request: Record<string, never>;
    response: AdminCategorySetsResponse;
  };
  "/admin/categorySets/coverage": {
    request: Record<string, never>;
    response: AdminCategoryCoverageResponse;
  };
  "/admin/categorySets/save": {
    request: AdminCategorySetSaveRequest;
    response: AdminCategorySetsResponse;
  };
  "/admin/categorySets/delete": {
    request: AdminCategorySetDeleteRequest;
    response: AdminCategorySetsResponse;
  };
  "/admin/categorySets/reset": {
    request: Record<string, never>;
    response: AdminCategorySetsResponse;
  };
  "/admin/categorySets/uploadIcon": {
    request: AdminCategorySetUploadIconRequest;
    response: AdminCategorySetUploadIconResponse;
  };
  "/admin/aiconfig/get": {
    request: Record<string, never>;
    response: AdminAiConfigResponse;
  };
  "/admin/aiconfig/save": {
    request: AdminAiConfigSaveRequest;
    response: AdminAiConfigResponse;
  };
  "/admin/aiconfig/reset": {
    request: Record<string, never>;
    response: AdminAiConfigResponse;
  };
  "/admin/dashboard/stats": {
    request: Record<string, never>;
    response: AdminDashboardStatsResponse;
  };
  "/userfile/upload": { request: FileUploadRequest; response: FileRefInfo };
  "/userfile/uploadChunkedInit": {
    request: Omit<FileUploadRequest, 'fileData' | 'previews'> & {
      fileSize: number;
      chunkSize: number;
      chunkCount: number;
    };
    response: FileRefInfo;
  };
  "/userfile/uploadPreview": {
    // Thumbnails ride separately from the file: the binary and chunked upload routes carry
    // metadata in a header, where a base64 JPEG does not fit. `iv` is the preview's own
    // AES-GCM iv — it is never the file's, which already covers the file's own bytes.
    request: { fileId: string; previewId?: string; data: string; iv?: string };
    response: { fileId: string; previewId: string };
  };
  "/userfile/getCiphertextChunkRange": {
    request: { fileId: string; startChunk: number; chunkCount: number };
    // Binary octet-stream (framed chunks). Use RemoteRequester.remoteRequestRaw().
    response: any;
  };
  /** Server side of `/ai/image/credits`. Calls no model. */
  "/usertask/imageCredits": {
    request: Record<string, never>;
    response: AiImageCredits;
  };
  "/usertask/generateImage": {
    request: GenerateImageRequest;
    response: GenerateImageResponse;
  };
  "/usertask/request": { request: UserTaskRequest; response: any[] };
  "/usertask/stream": {
    request: UserTaskStreamRequest;
    response: StreamCompleteEvent;
  };

  // Wikipedia Deep Dive (background feature)
  "/wikiDeepDive/start": {
    request: {
      draftId: string;
      sessionId: string;
      titleOrUrl: string;
      numPosts?: number;
      guidance?: string;
      contentMode?: 'generated' | 'excerpt_only';
      pageStrategy?: 'single_page' | 'distinct_pages';
      focus?: string;
      approvedPageTitles?: string[];
      plannerModel?: string;
    };
    response: { success: boolean; message?: string };
  };
  "/wikiDeepDive/propose": {
    request: {
      draftId: string;
      sessionId: string;
      titleOrUrl: string;
      numPosts?: number;
      guidance?: string;
      contentMode?: 'generated' | 'excerpt_only';
      pageStrategy?: 'single_page' | 'distinct_pages';
      focus?: string;
      notes?: string;
      plannerModel?: string;
    };
    response: { proposal: { pages: Array<{ title: string; reason?: string }> } };
  };
  "/wikiDeepDive/getDraft": {
    request: { draftId: string };
    response: { draft: any | null };
  };
  "/wikiDeepDive/cancel": {
    request: { draftId: string };
    response: { success: true };
  };
  "/wikiDeepDive/clearDraft": {
    request: { draftId: string };
    response: { success: true };
  };
}

export type RouteRequest<K extends keyof ApiRouteMap> = ApiRouteMap[K] extends {
  request: infer R;
}
  ? R
  : never;

export type RouteResponse<
  K extends keyof ApiRouteMap
> = ApiRouteMap[K] extends { response: infer R } ? R : never;

/**
 * ParameterizedRouteMap - Routes with dynamic path parameters
 *
 * These routes require path parameters to be substituted at runtime.
 * Use helper functions to build the final URL with parameters.
 *
 * Example:
 *   buildRoute('/content/:refType/:refId/:filename', { refType: 'item', refId: '123', filename: 'doc.pdf' })
 *   => '/content/item/123/doc.pdf'
 */
export interface ParameterizedRouteMap {
  "/content/:refType/:refId/:filename": {
    params: { refType: string; refId: string; filename: string };
    request: {};
    response: { data: Buffer | string; contentType: string; filename: string };
  };
  "/image/get/:filename": {
    params: { filename: string };
    request: {};
    response: { data: Buffer | string; contentType: string };
  };
  "/userfile/get/:id": {
    params: { id: string };
    request: {};
    response: { data: Buffer | string; contentType: string; filename?: string };
  };
}

/**
 * Helper type to extract path parameters from a parameterized route
 */
export type RouteParams<
  T extends keyof ParameterizedRouteMap
> = ParameterizedRouteMap[T]["params"];

/**
 * Helper function to build a parameterized route URL
 */
export function buildParameterizedRoute<K extends keyof ParameterizedRouteMap>(
  route: K,
  params: RouteParams<K>
): string {
  let url = route as string;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, encodeURIComponent(String(value)));
  }
  return url;
}

/**
 * Routes where authentication is optional (auth not required, but token used if available).
 * All other routes require authentication by default.
 *
 * These routes will:
 * - Proceed without auth token if user is not logged in
 * - Include auth token if user IS logged in (for personalized responses)
 *
 * Server uses `authenticateOptionalJWT` for these routes.
 */
export const authOptionalRoutes: Array<keyof ApiRouteMap> = [
  // Root/health check
  "/",

  // Auth routes (user is logging in, registering, or recovering access)
  "/auth/signin",
  "/auth/signinlocal",
  "/auth/register",
  "/auth/tokenLogin",
  "/auth/providerLogin/fail",
  "/auth/recoverAccountAccess",
  "/auth/resetPassword",
  "/auth/resetPasswordRequest",
  "/auth/recoverPassword",
  "/auth/startEmailVerification",
  "/auth/completeEmailVerification",
  "/auth/genUniqueUsername",
  "/auth/providerLogin/create",
  "/auth/providerLogin/status",
  "/auth/providerLogin/verify",
  "/auth/providerLogin/confirmSession",
  "/auth/provider/apple",
  "/auth/passkey/challenge",
  "/auth/passkey/login",
  // Admin signin (separate auth flow)
  "/admin/signin",

  // Invite checking (before user has account)
  "/invite/checkCode",
  "/invite/getInfo",

  // Published/public content (viewable without login)
  "/published/get",
  "/published/listChildren",
  "/published/view",
  "/published/countView",
  "/published/filteredSearch",
  "/published/categoryCoverage",
  "/published/listRecent",
  "/published/listForMap",
  "/published/matchForURL",
  "/published/collectionsByUser",
  "/published/reviewsByUser",
  "/published/getGalleryGroupAndItems",
  "/published/listGroupIdsForGallery",
  "/published/listWithIds",
  "/published/listWithChild",
  "/published/collectionItemFeed",
  // A finished curation review is read wherever the item page is
  "/curationReview/listForItem",

  // Thinking Puzzles catalog — the app is `requiresLogin: false`, so guest play reads it too
  "/thinkingPuzzles/catalog",

  // Public user profiles
  "/user/public/get",

  // Reviews (can view without auth)
  "/review/listForItem",

  // Realm recovery on a home box: an empty box has nobody to authenticate as, and after a restore
  // nobody has a credential yet. Gated on the `lite` profile and on the recovery phrase instead.
  "/realm/restore/list",
  "/realm/restore/preflight",
  "/realm/restore/run",
  "/realm/claim/list",
  "/realm/claim/withPassword",

  // System routes
  "/system/status",
  "/system/version",
  "/system/contactRequest",

  // Plugin list (public)
  "/plugin/list",

  // Plans list (viewable before signup)
  "/plans/list",

  // Store config (needed for payment setup)
  "/store/config",

  // Server settings (needed for client config)
  "/serverSettings/get",

  // Finding and testing a personal server -- all of it happens before anyone signs in
  "/serverSettings/discover",
  "/serverSettings/checkUrl",

  // Public file access
  "/pubfile/get",

  // Resource categories (public browsing)
  "/data/categories",
];

/**
 * Helper to check if a route requires authentication
 */
export function isAuthOptionalRoute(path: string): boolean {
  return authOptionalRoutes.includes(path as keyof ApiRouteMap);
}
