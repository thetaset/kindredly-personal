import type {
  AccountInfoResponse,
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
  AIUserRequest,
  AIUserResponse,
  AttachmentAddResponse,
  AccessEvaluateRequest,
  AccessEvaluateResponse,
  AdminContentBundleCatalogResponse,
  AdminContentLoaderDryRunRequest,
  AdminContentLoaderDryRunResponse,
  AdminContentLoaderExecuteRequest,
  AdminContentLoaderExecuteResponse,
  AdminContentLoaderUploadAssetRequest,
  AdminContentLoaderUploadAssetResponse,
  AdminPublishedPackageExportRequest,
  AdminPublishedPackageExportResponse,
  AdminPublishedChangeTypeRequest,
  AdminPublishedChangeTypeResponse,
  AdminPublishedDeleteRequest,
  AdminPublishedDeleteResponse,
  AdminPublishedInfoResponse,
  AdminPublishedReplaceImageRequest,
  AdminPublishedReplaceImageResponse,
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
  LibraryAutoApprovalEvaluateRequest,
  LibraryAutoApprovalEvaluateResponse,
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
  SendManagedClientDebugToastRequest,
  SendManagedClientDebugToastResponse,
  ContentLookupRequest,
  ContentLookupResponse,
  CreatePostRequest,
  CreatePostResponse,
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
  UpdateItemRequest,
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
  EmbeddingCacheClearRequest,
  EmbeddingCacheClearResponse,
  EmbeddingCacheGetRequest,
  EmbeddingCacheGetResponse,
  EmbeddingCachePutRequest,
  EmbeddingCachePutResponse,
  EmbeddingCacheStatsRequest,
  EmbeddingCacheStatsResponse,
} from "./api-types";

import type { AccountType } from "../types/user.types";

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
        completionStatus?: import('../types/task.types').TaskCompletionStatus;
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

  // Rewards
  "/reward/state/get": {
    request: { userId?: string | null };
    response: {
      rewardSettings: import('../types/reward.types').RewardSettings;
      dailyState: import('../types/reward.types').DailyRewardStates;
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
    request: { task: import('../types/task.types').TaskDefinition };
    response: { task: import('../types/task.types').TaskDefinition };
  };
  "/task_items/listAssigned": {
    request: { userId: string; includeArchived?: boolean };
    response: { tasks: Array<import('../types/task.types').TaskDefinition> };
  };
  "/task_items/assignees": {
    request: { taskId: string };
    response: { assignees: Array<{ _id: string; label: string }> };
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
  "/access_request/add": {
    request: { key: string; type?: string; details?: any; message?: string };
    response: void;
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
  "/account/content/getTermDict": {
    request: { key: string };
    response: { terms: string[] };
  };
  "/account/delete": { request: { confirmation: string }; response: void };
  "/account/export": {
    request: { options: any };
    response: { data: string; format: string };
  };
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
  "/account/import": {
    request: { importData: any };
    response: { imported: number; failed: number; errors?: string[] };
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
    request: import('./api-types').ArtifactUpsertRequest;
    response: import('./api-types').ArtifactUpsertResponse;
  };
  "/artifact/get": {
    request: import('./api-types').ArtifactGetRequest;
    response: import('./api-types').ArtifactGetResponse;
  };
  "/artifact/list": {
    request: import('./api-types').ArtifactListRequest;
    response: import('./api-types').ArtifactListResponse;
  };
  "/artifact/delete": {
    request: import('./api-types').ArtifactDeleteRequest;
    response: import('./api-types').ArtifactDeleteResponse;
  };
  "/artifact/syncPending": {
    request: import('./api-types').ArtifactSyncPendingRequest;
    response: import('./api-types').ArtifactSyncPendingResponse;
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
    request: import('./api-types').GetUsageInsightsReportRequest;
    response: import('./api-types').GetUsageInsightsReportResponse;
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
    request: { userId?: string; createdAt: number; collapseMode?: import('./api-types').UsageLogCollapseMode };
    response: any[];
  };
  "/activity/getGroupedEntriesSince": {
    request: import('./api-types').GetGroupedEntriesSinceRequest;
    response: import('./api-types').GetGroupedEntriesSinceResponse;
  };
  "/activity/getSessionsSince": {
    request: import('./api-types').GetUsageSessionsSinceRequest;
    response: import('./api-types').GetUsageSessionsSinceResponse;
  };
  "/activity/getSessionSummarySnapshot": {
    request: import('./api-types').GetSessionSummarySnapshotRequest;
    response: import('./api-types').GetSessionSummarySnapshotResponse;
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
    request: import('./api-types').ReportClassificationIssueRequest;
    response: import('./api-types').ReportClassificationIssueResponse;
  };
  "/activity/getClassificationEvalProgramStatus": {
    request: import('./api-types').GetClassificationEvalProgramStatusRequest;
    response: import('./api-types').GetClassificationEvalProgramStatusResponse;
  };
  "/activity/uploadClassificationDatasetSamples": {
    request: import('./api-types').UploadClassificationDatasetSamplesRequest;
    response: import('./api-types').UploadClassificationDatasetSamplesResponse;
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
  "/admin/account/changeSysOptions": {
    request: { accountId: string; optionName: string; optionValue: any };
    response: void;
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
  "/admin/contactrequest/list": {
    request: { pageInfo?: any };
    response: Array<{
      id: string;
      email: string;
      message: string;
      createdAt: number;
    }>;
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
      filterBy?: { userId?: string; datasetId?: string; search?: string } | null;
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
      }>;
      count: number | null;
    };
  };
  "/admin/classificationEval/datasets/delete": {
    request: { datasetId: string };
    response: { deletedCount: number };
  };
  "/admin/classificationEval/datasets/runGroundTruth": {
    request: { datasetId: string; maxSamples?: number; model?: string };
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
  "/admin/getGalleryDBs": {
    request: { dbId?: string };
    response: Array<{ id: string; name: string; itemCount: number }>;
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
  "/admin/published/process": {
    request: AdminPublishedProcessRequest;
    response: AdminPublishedProcessResponse;
  };
  "/admin/published/info": {
    request: { itemId: string };
    response: AdminPublishedInfoResponse;
  };
  "/admin/published/replaceImage": {
    request: AdminPublishedReplaceImageRequest;
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
  "/ai/sessionList": { request: {}; response: AISessionResponse[] };
  "/ai/setCurrentSessionId": { request: { id: string }; response: void };
  "/ai/updateSession": { request: { session: any }; response: { success: boolean } };
  "/ai/textRequest": { request: AITextRequest; response: AITextResponse };
  "/ai/userRequest": { request: AIUserRequest; response: AIUserResponse };
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
  "/collection/shareWithFriend": {
    request: { collectionId: string; friendUserId: string; permission: PermissionType };
    response: { success: boolean };
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
  "/content/imageClassify": { request: { images: any }; response: Array<any> };
  "/content/imageClassifyCache/clear": {
    request: {};
    response: { clearedEntries: number };
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
      eduValue: import('../shared.types').EduValue;
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
        eduValue: import('../shared.types').EduValue;
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
  /** @deprecated Use /data/contentInfo with options.includeMetadata instead. Kept for backward compatibility. */
  "/data/meta": { request: { url: string }; response: ItemMeta };
  /** @deprecated Use /data/contentInfo with options.includeResourceInfo instead. Kept for backward compatibility. */
  "/data/resourceInfo": {
    request: { url: string };
    response: ResourceFetchInfoResponse;
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
  "/encryption/recoverUsingKey": {
    request: { secretKey: string; userId?: string };
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
  "/item/readLaterFeed": {
    request: ReadLaterFeedRequest;
    response: ItemInfoView[];
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
    request: { publishId: string; targetUserId?: string };
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
  "/nativeClientCheck": { request: {}; response: { success: boolean } };
  "/nativeMessage": {
    request: { type: string; data?: any };
    response: { success: boolean; message: string };
  };
  "/nativeDesktopStatus": {
    request: {};
    response: { success: boolean; data?: any; error?: string };
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
  "/pubfile/get": {
    request: { fileId?: string; pubId?: string; filename?: string };
    response: { data: Buffer | string; contentType: string; filename?: string };
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
  "/content/bundle/recommend": {
    request: RecommendContentBundlesRequest;
    response: RecommendContentBundlesResponse;
  };
  "/published/flag": {
    request: { itemId: string; details?: Record<string, any> };
    response: void;
  };
  "/published/get": {
    request: { itemId: string };
    response: PublishedInfoView;
  };
  "/published/getGalleryGroupAndItems": {
    request: { groupId: string; dbId?: string };
    response: { group: { id: string; name: string }; items: any[] };
  };
  "/published/info/update": {
    request: { itemId: string; data: any };
    response: void;
  };
  "/published/item/importFromPublished": {
    request: ImportFromPublishedRequest;
    response: string;
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
  "/published/publishCollection": {
    request: {
      itemId: string;
      tempAuthToken?: TokenData;
      actionApprovalRequestId?: string;
    };
    response: void;
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
    response: { publishId: string };
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
    response: { publishId: string };
  };
  "/published/publishItem": {
    request: { itemId: string; itemData: any };
    response: void;
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
    request: { itemId: string; approved: boolean; comment?: string };
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
  "/search/terms": {
    request: { type: string; userId?: string };
    response: Array<{ key: string; text: string; count: number }>;
  };
  "/access/evaluate": {
    request: AccessEvaluateRequest;
    response: AccessEvaluateResponse;
  };
  "/user/libraryAutoApproval/evaluate": {
    request: LibraryAutoApprovalEvaluateRequest;
    response: LibraryAutoApprovalEvaluateResponse;
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
  "/serverSettings/get": { request: any; response: any };
  "/serverSettings/refresh": { request: {}; response: void };
  "/serverSettings/update": { request: any; response: any };
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
  "/sync/retryFailed": { request: {}; response: void };
  "/sync/retryOperation": { request: { operationId: string }; response: void };
  "/sync/trigger": { request: {}; response: void };
  "/sync/update": {
    request: { lastUpdate?: number; userId?: string };
    response: ItemChangeLogUpdate;
  };
  "/system/contactRequest": {
    request: { contactType?: string; userInfo?: any; message: string };
    response: void;
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
    response: import('./api-types').UserActivityLogListResponse;
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
    response: import('./api-types').SaveUserActivityLogResponse;
  };
  "/user/activity/invalidateMonitors": {
    request: import('./api-types').InvalidateActivityMonitorsRequest;
    response: import('./api-types').InvalidateActivityMonitorsResponse;
  };
  "/user/activity/reportClassificationIssue": {
    request: import('./api-types').ReportClassificationIssueRequest;
    response: import('./api-types').ReportClassificationIssueResponse;
  };
  "/user/activity/getClassificationEvalProgramStatus": {
    request: import('./api-types').GetClassificationEvalProgramStatusRequest;
    response: import('./api-types').GetClassificationEvalProgramStatusResponse;
  };
  "/user/activity/uploadClassificationDatasetSamples": {
    request: import('./api-types').UploadClassificationDatasetSamplesRequest;
    response: import('./api-types').UploadClassificationDatasetSamplesResponse;
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
  "/user/settings/copy": {
    request: CopyUserSettingsRequest;
    response: CopyUserSettingsResponse;
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
    response: { data: any; userFile?: UserFile } | null;
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
  "/userfile/upload": { request: FileUploadRequest; response: FileRefInfo };
  "/userfile/uploadChunkedInit": {
    request: Omit<FileUploadRequest, 'fileData' | 'previews'> & {
      fileSize: number;
      chunkSize: number;
      chunkCount: number;
    };
    response: FileRefInfo;
  };
  "/userfile/getCiphertextChunkRange": {
    request: { fileId: string; startChunk: number; chunkCount: number };
    // Binary octet-stream (framed chunks). Use RemoteRequester.remoteRequestRaw().
    response: any;
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
  "/published/listRecent",
  "/published/matchForURL",
  "/published/collectionsByUser",
  "/published/reviewsByUser",
  "/published/getGalleryGroupAndItems",
  "/published/listGroupIdsForGallery",
  "/published/listWithIds",
  "/published/listWithChild",
  "/published/collectionItemFeed",

  // Public user profiles
  "/user/public/get",

  // Reviews (can view without auth)
  "/review/listForItem",

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
