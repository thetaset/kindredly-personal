# API Route Coverage Report

Generated: 2026-02-12

## Summary

| Metric | Count |
|--------|-------|
| Routes in ApiRouteMap | 488 |
| Routes in Server | 304 |
| Routes in BGRouter (explicit) | 279 |
| Routes called from UI | 379 |
| Server-only routes | 36 |
| Client-only routes | 14 |
| Require BGRouter handler | 17 |
| Deprecated routes | 2 |

## Issues Found

| Issue Type | Count |
|------------|-------|
| Missing server implementation | 182 |
| Missing required BGRouter handler | 2 |
| Untyped server handlers | 8 |
| Untyped BGRouter handlers | 0 |
| Unused routes (no UI calls) | 114 |
| Undefined routes (in code but not map) | 22 |

### Missing Server Implementations

Routes that should have server handlers but don't:

- `/localAtRest/getSettings`
- `/localAtRest/setSettings`
- `/localAtRest/lock`
- `/localAtRest/initKeyset`
- `/localAtRest/getKeyAccess`
- `/localAtRest/sampleEncryptDecrypt`
- `/localAtRest/migrateAiSessionKv`
- `/localAtRest/userKv/get`
- `/localAtRest/userKv/set`
- `/localAtRest/userKv/clear`
- `/task/list`
- `/task/upsert`
- `/task/archive`
- `/task/complete`
- `/task/skip`
- `/task/snooze`
- `/task/uncomplete`
- `/task/status/list`
- `/task_items/upsert`
- `/task_items/listAssigned`
- `/task_items/assignees`
- `/task_completion/upsert`
- `/task_completion/listForTask`
- `/account/content/getTermDict`
- `/ref_state/session/upsert`
- `/ref_state/session/list`
- `/ref_state/session/delete`
- `/artifact/upsert`
- `/artifact/get`
- `/artifact/list`
- `/artifact/delete`
- `/artifact/syncPending`
- `/activity/clearHistory`
- `/activity/getCurrentUsageSummary`
- `/activity/getPipelineSettings`
- `/activity/getUsageSince`
- `/activity/getSessionsSince`
- `/activity/list`
- `/activity/removeLogEntry`
- `/activity/syncUsageLog`
- `/ai/itemSuggestGenerator`
- `/ai/itemUpdateGenerator`
- `/ai/sendActionResult`
- `/ai/approval/respond`
- `/ai/changeset/respond`
- `/ai/changeset/undo`
- `/ai/updateSession`
- `/ai/userRequest`
- `/auth/client/info`
- `/auth/completeEncryptionSetup`
- ... and 132 more

### Missing Required BGRouter Handlers

Routes that REQUIRE explicit BGRouter handlers but don't have them:

- `/sync/getStatus`
- `/sync/update`

### Untyped Handlers

These handlers don't use ApiReq<K> or RouteRequest<K>:

- Server: `/` in `tset-server/src/routes/system.route.ts`
- Server: `/auth/register` in `tset-server/src/routes/auth.route.ts`
- Server: `/auth/signin` in `tset-server/src/routes/auth.route.ts`
- Server: `/store/webhooks` in `tset-server/src/routes/_internal/product_subscription.route.ts`
- Server: `/sync/events` in `tset-server/src/routes/sync.route.ts`
- Server: `/userdata/proxy` in `tset-server/src/routes/external_data.route.ts`
- Server: `/userfile/uploadChunkedInit` in `tset-server/src/routes/user_filedata.route.ts`
- Server: `/userfile/getCiphertextChunkRange` in `tset-server/src/routes/user_filedata.route.ts`

### Unused Routes

Routes defined in ApiRouteMap but never called from UI:

<details>
<summary>Click to expand (114 routes)</summary>

- `/localAtRest/userKv/get` (Server: ❌, BG: ✅)
- `/localAtRest/userKv/set` (Server: ❌, BG: ✅)
- `/localAtRest/userKv/clear` (Server: ❌, BG: ✅)
- `/task_items/listAssigned` (Server: ❌, BG: ✅)
- `/task_completion/upsert` (Server: ❌, BG: ✅)
- `/account/content/getTermDict` (Server: ❌, BG: ❌)
- `/ref_state/user/upsert` (Server: ✅, BG: ✅)
- `/ref_state/user/list` (Server: ✅, BG: ✅)
- `/ref_state/user/delete` (Server: ✅, BG: ✅)
- `/ref_state/account/upsert` (Server: ✅, BG: ✅)
- `/ref_state/account/list` (Server: ✅, BG: ✅)
- `/ref_state/account/delete` (Server: ✅, BG: ✅)
- `/artifact/list` (Server: ❌, BG: ✅)
- `/artifact/delete` (Server: ❌, BG: ✅)
- `/artifact/syncPending` (Server: ❌, BG: ✅)
- `/activity/getPipelineSettings` (Server: ❌, BG: ✅)
- `/admin/account/changeSysOptions` (Server: ✅, BG: ❌)
- `/admin/account/changeType` (Server: ✅, BG: ❌)
- `/admin/account/info` (Server: ✅, BG: ❌)
- `/admin/contactrequest/list` (Server: ✅, BG: ❌)
- `/admin/cache/list` (Server: ✅, BG: ❌)
- `/admin/cache/info` (Server: ✅, BG: ❌)
- `/admin/cache/stats` (Server: ✅, BG: ❌)
- `/admin/cache/update` (Server: ✅, BG: ❌)
- `/admin/cache/delete` (Server: ✅, BG: ❌)
- `/admin/cache/deleteExpired` (Server: ✅, BG: ❌)
- `/admin/getGalleryDBs` (Server: ✅, BG: ❌)
- `/admin/item/list` (Server: ✅, BG: ❌)
- `/admin/published/changeBlockedStatus` (Server: ✅, BG: ❌)
- `/admin/published/info` (Server: ✅, BG: ❌)
- `/admin/published/itemsSchemaUpdate` (Server: ✅, BG: ❌)
- `/admin/published/list` (Server: ✅, BG: ❌)
- `/admin/signin` (Server: ✅, BG: ❌)
- `/admin/sse/clearAllData` (Server: ✅, BG: ❌)
- `/admin/sse/clearHeartbeats` (Server: ✅, BG: ❌)
- `/admin/sse/connectionStatus` (Server: ✅, BG: ❌)
- `/admin/sse/testEvent` (Server: ✅, BG: ❌)
- `/admin/sse/testHeartbeat` (Server: ✅, BG: ❌)
- `/admin/updateGallerys` (Server: ✅, BG: ❌)
- `/admin/user/changeBlockedStatus` (Server: ✅, BG: ❌)
- `/admin/user/changeCuratorStatus` (Server: ✅, BG: ❌)
- `/admin/user/changeLockStatus` (Server: ✅, BG: ❌)
- `/admin/user/info` (Server: ✅, BG: ❌)
- `/admin/user/list` (Server: ✅, BG: ❌)
- `/ai/sendMessageStream` (Server: ✅, BG: ❌)
- `/ai/userRequest` (Server: ❌, BG: ✅)
- `/auth/client/info` (Server: ❌, BG: ✅)
- `/auth/setStoredRecoveryKey` (Server: ❌, BG: ❌)
- `/auth/provider/apple` (Server: ✅, BG: ❌)
- `/client/hometab` (Server: ❌, BG: ✅)
- `/content/getTermDict` (Server: ❌, BG: ✅)
- `/content/performDeepClassification` (Server: ❌, BG: ✅)
- `/content/performDeepMetaCheck` (Server: ❌, BG: ✅)
- `/content/savePipelineResults` (Server: ❌, BG: ✅)
- `/content/updateStatus` (Server: ❌, BG: ✅)
- `/data/classifyContentType` (Server: ✅, BG: ❌)
- `/data/metaWithBanner` (Server: ❌, BG: ✅)
- `/data/text` (Server: ❌, BG: ✅)
- `/libraryHealth/getRecommendations` (Server: ❌, BG: ✅)
- `/libraryHealth/applyRecommendation` (Server: ❌, BG: ✅)
- `/libraryHealth/getSmartCollections` (Server: ❌, BG: ✅)
- `/embedding/configure` (Server: ❌, BG: ✅)
- `/embedding/getStats` (Server: ❌, BG: ✅)
- `/embeddingCache/get` (Server: ✅, BG: ❌)
- `/embeddingCache/put` (Server: ✅, BG: ❌)
- `/embeddingCache/stats` (Server: ✅, BG: ❌)
- `/embeddingCache/clear` (Server: ✅, BG: ❌)
- `/encryption/createAccountBackupKey` (Server: ❌, BG: ✅)
- `/encryption/listKeys` (Server: ❌, BG: ✅)
- `/following/add` (Server: ✅, BG: ❌)
- `/following/listByUserId` (Server: ✅, BG: ❌)
- `/following/remove` (Server: ✅, BG: ❌)
- `/item/createPageSnapshot` (Server: ❌, BG: ✅)
- `/item/matchForPublished` (Server: ✅, BG: ❌)
- `/item/setUserPermission` (Server: ✅, BG: ❌)
- `/localstore/lookupMetaTemp` (Server: ❌, BG: ✅)
- `/localstore/reset` (Server: ❌, BG: ✅)
- `/nativeClientCheck` (Server: ❌, BG: ✅)
- `/post/list` (Server: ✅, BG: ❌)
- `/pubfile/get` (Server: ✅, BG: ❌)
- `/published/listRecent` (Server: ✅, BG: ❌)
- `/search/embedded` (Server: ❌, BG: ✅)
- `/sentry/checkIfPermittedByPageContent` (Server: ❌, BG: ✅)
- `/sentry/processRequestsForBlocking` (Server: ❌, BG: ✅)
- `/sentry/processRequestsForInjection` (Server: ❌, BG: ✅)
- `/sentry/tempDisableBlocking` (Server: ❌, BG: ✅)
- `/store/webhooks` (Server: ✅, BG: ❌)
- `/subscription/remove` (Server: ✅, BG: ❌)
- `/sync/clearAll` (Server: ❌, BG: ❌)
- `/sync/clearOld` (Server: ❌, BG: ❌)
- `/sync/events` (Server: ✅, BG: ❌)
- `/sync/getAllOperations` (Server: ❌, BG: ❌)
- `/sync/getPending` (Server: ❌, BG: ❌)
- `/sync/retryOperation` (Server: ❌, BG: ❌)
- `/sync/update` (Server: ✅, BG: ❌)
- `/test/client/dbtest` (Server: ❌, BG: ✅)
- `/user/activity/list` (Server: ✅, BG: ❌)
- `/user/activity/logList` (Server: ✅, BG: ❌)
- `/user/activity/push` (Server: ✅, BG: ❌)
- `/user/activity/pushEntries` (Server: ❌, BG: ❌)
- `/user/debug` (Server: ✅, BG: ❌)
- `/user/integrations/gmail/oauth/status` (Server: ✅, BG: ✅)
- `/user/integrations/gmail/oauth/disconnect` (Server: ✅, BG: ✅)
- `/user/integrations/gmail/oauth/accessToken` (Server: ✅, BG: ✅)
- `/user/image/upload` (Server: ❌, BG: ❌)
- `/user/notification/count` (Server: ✅, BG: ❌)
- `/user/notification/markAllAsRead` (Server: ❌, BG: ❌)
- `/user/prefs/get` (Server: ✅, BG: ✅)
- `/user/prefs/update` (Server: ✅, BG: ✅)
- `/userdata/proxy` (Server: ✅, BG: ❌)
- `/userdata/proxyr` (Server: ✅, BG: ❌)
- `/userfile/uploadChunkedInit` (Server: ✅, BG: ❌)
- `/userfile/getCiphertextChunkRange` (Server: ✅, BG: ❌)
- `/usertask/stream` (Server: ✅, BG: ❌)

</details>

### Undefined Routes

Routes used in code but not defined in ApiRouteMap:

- `/admin/published/autopubtest` in server: tset-server/src/routes/_internal/admin.route.ts
- `/published/file/get` in server: tset-server/src/routes/_internal/published_filedata.route.ts
- `/contact/invite/checkCode` in server: tset-server/src/routes/account.route.ts
- `/api/ai/sendMessage` in server: tset-server/src/routes/client/ai.route.ts
- `/auth/passkey/challenge/auth` in server: tset-server/src/routes/passkey.route.ts
- `/content/:refType/:refId/:filename` in server: tset-server/src/routes/user_filedata.route.ts
- `/image/get/:filename` in server: tset-server/src/routes/user_filedata.route.ts
- `/userfile/get/:id` in server: tset-server/src/routes/user_filedata.route.ts
- `/userfile/getCiphertext/:id` in server: tset-server/src/routes/user_filedata.route.ts
- `/userfile/getWithMeta/:id` in server: tset-server/src/routes/user_filedata.route.ts
- `/userfile/uploadChunk` in server: tset-server/src/routes/user_filedata.route.ts
- `/userfile/uploadBinary` in server: tset-server/src/routes/user_filedata.route.ts
- `/content/classificationLab` in bgrouter: tset-client/src/bg/routes/content.bgroute.ts
- `/content/classifyLibraryMetadata` in bgrouter: tset-client/src/bg/routes/content.bgroute.ts
- `/collections/suggestions` in ui: tset-client/src/components/common/TISuggestions.vue
- `/image/upload` in ui: tset-client/src/components/published/EditPublished.vue
- `/item/organize` in ui: tset-client/src/composables/useItemCollections.ts
- `/item/updateInCollectionDetails` in ui: tset-client/src/composables/useItemCollections.ts
- `/sentry/grantTempAccess` in ui: tset-client/src/composables/useSentryPermission.ts
- `/content/classificationLab` in ui: tset-client/src/views/landing_and_info/ExperimentLab.vue
- `/logCollectionVisit` in ui: tset-client/src/views/library/Collection.vue

## Full Route Matrix

Legend: ✅ = typed, ⚠️ = untyped, ❌ = missing (required), ➖ = not needed, 📦 = has handler (optional)

| Route | Server | BGRouter | UI Calls | Status |
|-------|--------|----------|----------|--------|
| `/` | ⚠️ | ➖ | 0 | ⚠️ |
| `/access_request/add` | ✅ | ➖ | 3 | ✅ |
| `/access_request/listForUser` | ✅ | ➖ | 3 | ✅ |
| `/access_request/listall` | ✅ | ➖ | 1 | ✅ |
| `/access_request/process` | ✅ | ➖ | 2 | ✅ |
| `/access_request/remove` | ✅ | ➖ | 1 | ✅ |
| `/account/content/getTermDict` | ❌ | ➖ | 0 | ❌ |
| `/account/delete` | ✅ | 📦 | 2 | ✅ |
| `/account/export` | ✅ | ➖ | 1 | ✅ |
| `/account/extendedFeatures/get` | ✅ | ➖ | 1 | ✅ |
| `/account/extendedFeatures/update` | ✅ | ➖ | 1 | ✅ |
| `/account/getSpaceUsage` | ✅ | ➖ | 2 | ✅ |
| `/account/import` | ✅ | ➖ | 1 | ✅ |
| `/account/info` | ✅ | ✅ | 2 | ✅ |
| `/account/invites/cancel` | ✅ | ➖ | 1 | ✅ |
| `/account/invites/list` | ✅ | ➖ | 1 | ✅ |
| `/account/options/update` | ✅ | 📦 | 1 | ✅ |
| `/account/stats` | ✅ | 📦 | 2 | ✅ |
| `/account/users` | ✅ | ✅ | 2 | ✅ |
| `/activity/clearHistory` | ❌ | 📦 | 2 | ❌ |
| `/activity/getCurrentUsageSummary` | ❌ | 📦 | 1 | ❌ |
| `/activity/getPipelineSettings` | ❌ | 📦 | 0 | ❌ |
| `/activity/getSessionsSince` | ❌ | 📦 | 1 | ❌ |
| `/activity/getUsageSince` | ❌ | 📦 | 3 | ❌ |
| `/activity/list` | ❌ | 📦 | 1 | ❌ |
| `/activity/logNewVisit` | ❌ | 📦 | 1 | ❌ |
| `/activity/logVisit` | ❌ | 📦 | 1 | ❌ |
| `/activity/removeLogEntry` | ❌ | 📦 | 1 | ❌ |
| `/activity/syncUsageLog` | ❌ | 📦 | 3 | ❌ |
| `/activity/updateItemVisitHistory` | ✅ | 📦 | 1 | ✅ |
| `/activityMonitor/startFrameEventTrackingForCurrentTab` | ➖ | ✅ | 1 | ✅ |
| `/activityMonitor/update` | ➖ | ✅ | 1 | ✅ |
| `/admin/account/changeSysOptions` | ✅ | ➖ | 0 | ✅ |
| `/admin/account/changeType` | ✅ | ➖ | 0 | ✅ |
| `/admin/account/info` | ✅ | ➖ | 0 | ✅ |
| `/admin/cache/delete` | ✅ | ➖ | 0 | ✅ |
| `/admin/cache/deleteExpired` | ✅ | ➖ | 0 | ✅ |
| `/admin/cache/info` | ✅ | ➖ | 0 | ✅ |
| `/admin/cache/list` | ✅ | ➖ | 0 | ✅ |
| `/admin/cache/stats` | ✅ | ➖ | 0 | ✅ |
| `/admin/cache/update` | ✅ | ➖ | 0 | ✅ |
| `/admin/contactrequest/list` | ✅ | ➖ | 0 | ✅ |
| `/admin/getGalleryDBs` | ✅ | ➖ | 0 | ✅ |
| `/admin/item/list` | ✅ | ➖ | 0 | ✅ |
| `/admin/published/changeBlockedStatus` | ✅ | ➖ | 0 | ✅ |
| `/admin/published/info` | ✅ | ➖ | 0 | ✅ |
| `/admin/published/itemsSchemaUpdate` | ✅ | ➖ | 0 | ✅ |
| `/admin/published/list` | ✅ | ➖ | 0 | ✅ |
| `/admin/signin` | ✅ | ➖ | 0 | ✅ |
| `/admin/sse/clearAllData` | ✅ | ➖ | 0 | ✅ |
| `/admin/sse/clearHeartbeats` | ✅ | ➖ | 0 | ✅ |
| `/admin/sse/connectionStatus` | ✅ | ➖ | 0 | ✅ |
| `/admin/sse/testEvent` | ✅ | ➖ | 0 | ✅ |
| `/admin/sse/testHeartbeat` | ✅ | ➖ | 0 | ✅ |
| `/admin/updateGallerys` | ✅ | ➖ | 0 | ✅ |
| `/admin/user/changeBlockedStatus` | ✅ | ➖ | 0 | ✅ |
| `/admin/user/changeCuratorStatus` | ✅ | ➖ | 0 | ✅ |
| `/admin/user/changeLockStatus` | ✅ | ➖ | 0 | ✅ |
| `/admin/user/info` | ✅ | ➖ | 0 | ✅ |
| `/admin/user/list` | ✅ | ➖ | 0 | ✅ |
| `/ai/approval/respond` | ❌ | 📦 | 1 | ❌ |
| `/ai/changeset/respond` | ❌ | 📦 | 1 | ❌ |
| `/ai/changeset/undo` | ❌ | 📦 | 1 | ❌ |
| `/ai/deleteSession` | ✅ | 📦 | 1 | ✅ |
| `/ai/getCurrentSessionId` | ✅ | 📦 | 1 | ✅ |
| `/ai/getSessionById` | ✅ | 📦 | 1 | ✅ |
| `/ai/itemSuggestGenerator` | ❌ | 📦 | 2 | ❌ |
| `/ai/itemUpdateGenerator` | ❌ | 📦 | 2 | ❌ |
| `/ai/sendActionResult` | ❌ | 📦 | 1 | ❌ |
| `/ai/sendMessage` | ✅ | 📦 | 1 | ✅ |
| `/ai/sendMessageStream` | ✅ | ➖ | 0 | ✅ |
| `/ai/sessionList` | ✅ | 📦 | 1 | ✅ |
| `/ai/setCurrentSessionId` | ✅ | 📦 | 1 | ✅ |
| `/ai/textRequest` | ✅ | 📦 | 3 | ✅ |
| `/ai/updateSession` | ❌ | 📦 | 1 | ❌ |
| `/ai/usage/getSummary` | ✅ | 📦 | 2 | ✅ |
| `/ai/userRequest` | ❌ | 📦 | 0 | ❌ |
| `/artifact/delete` | ❌ | 📦 | 0 | ❌ |
| `/artifact/get` | ❌ | 📦 | 2 | ❌ |
| `/artifact/list` | ❌ | 📦 | 0 | ❌ |
| `/artifact/syncPending` | ❌ | 📦 | 0 | ❌ |
| `/artifact/upsert` | ❌ | 📦 | 1 | ❌ |
| `/audit_log/list` | ✅ | 📦 | 3 | ✅ |
| `/auth/checkPassword` | ✅ | ➖ | 1 | ✅ |
| `/auth/client/info` | ❌ | 📦 | 0 | ❌ |
| `/auth/completeEmailVerification` | ✅ | ➖ | 1 | ✅ |
| `/auth/completeEncryptionSetup` | ❌ | 📦 | 1 | ❌ |
| `/auth/createUser` | ✅ | 📦 | 2 | ✅ |
| `/auth/forceResetPassword` | ✅ | ➖ | 1 | ✅ |
| `/auth/genUniqueUsername` | ✅ | ➖ | 1 | ✅ |
| `/auth/getRestrictedUser` | ❌ | 📦 | 1 | ❌ |
| `/auth/linkAuthAccount` | ✅ | ➖ | 1 | ✅ |
| `/auth/passkey/authenticate` | ✅ | ➖ | 1 | ✅ |
| `/auth/passkey/challenge` | ✅ | ➖ | 2 | ✅ |
| `/auth/passkey/delete` | ✅ | ➖ | 1 | ✅ |
| `/auth/passkey/list` | ✅ | ➖ | 1 | ✅ |
| `/auth/passkey/login` | ✅ | 📦 | 1 | ✅ |
| `/auth/passkey/register` | ✅ | ➖ | 1 | ✅ |
| `/auth/permissionOverride` | ✅ | 📦 | 2 | ✅ |
| `/auth/provider/apple` | ✅ | ➖ | 0 | ✅ |
| `/auth/providerLogin/confirmSession` | ✅ | ➖ | 1 | ✅ |
| `/auth/providerLogin/create` | ✅ | ➖ | 1 | ✅ |
| `/auth/providerLogin/status` | ✅ | ➖ | 1 | ✅ |
| `/auth/providerLogin/verify` | ✅ | ➖ | 1 | ✅ |
| `/auth/recoverPassword` | ✅ | ➖ | 1 | ✅ |
| `/auth/register` | ⚠️ | 📦 | 1 | ⚠️ |
| `/auth/removeRecoveryKeyFromServer` | ✅ | ➖ | 1 | ✅ |
| `/auth/resetPassword` | ✅ | 📦 | 1 | ✅ |
| `/auth/resetPasswordRequest` | ✅ | ➖ | 1 | ✅ |
| `/auth/saveRecoveryKeyOnServer` | ✅ | ➖ | 1 | ✅ |
| `/auth/setStoredRecoveryKey` | ❌ | ➖ | 0 | ❌ |
| `/auth/signin` | ⚠️ | 📦 | 2 | ⚠️ |
| `/auth/signinlocal` | ❌ | 📦 | 1 | ❌ |
| `/auth/signout` | ❌ | 📦 | 5 | ❌ |
| `/auth/startEmailVerification` | ✅ | ➖ | 1 | ✅ |
| `/auth/switchUser` | ✅ | 📦 | 2 | ✅ |
| `/auth/tokenLogin` | ✅ | 📦 | 3 | ✅ |
| `/auth/updatePIN` | ✅ | 📦 | 2 | ✅ |
| `/auth/updatePassword` | ✅ | 📦 | 1 | ✅ |
| `/auth/verifyPassword` | ❌ | 📦 | 1 | ❌ |
| `/client/hometab` | ➖ | ✅ | 0 | ✅ |
| `/client/widget/status` | ➖ | ✅ | 1 | ✅ |
| `/collection/create` | ✅ | 📦 | 11 | ✅ |
| `/collection/decrypt` | ❌ | 📦 | 3 | ❌ |
| `/collection/encrypt` | ❌ | 📦 | 2 | ❌ |
| `/collection/getItemRelInfo` | ✅ | 📦 | 2 | ✅ |
| `/collection/healChildEncryptionKeys` | ➖ | ✅ | 3 | ✅ |
| `/collection/itemDetails/save` | ✅ | 📦 | 2 | ✅ |
| `/collection/items` | ✅ | ✅ | 12 | ✅ |
| `/collection/listByIds` | ✅ | 📦 | 10 | ✅ |
| `/collection/listByUser` | ✅ | 📦 | 8 | ✅ |
| `/collection/order/update` | ✅ | ➖ | 3 | ✅ |
| `/collection/recent` | ❌ | 📦 | 2 | ❌ |
| `/collection/related` | ❌ | 📦 | 1 | ❌ |
| `/collection/removeFromUserLibrary` | ✅ | ➖ | 1 | ✅ |
| `/collection/shareWithFriend` | ❌ | 📦 | 1 | ❌ |
| `/collection/showcase/create` | ✅ | 📦 | 4 | ✅ |
| `/collection/showcase/get` | ✅ | 📦 | 8 | ✅ |
| `/collection/showcase/repairFriendEncryption` | ➖ | ✅ | 1 | ✅ |
| `/collection/suggest` | ❌ | 📦 | 4 | ❌ |
| `/comment/create` | ✅ | 📦 | 2 | ✅ |
| `/comment/delete` | ✅ | ➖ | 2 | ✅ |
| `/comment/list` | ✅ | ➖ | 3 | ✅ |
| `/content/clearPipelineResults` | ❌ | 📦 | 1 | ❌ |
| `/content/getLoggedBlockingEntry` | ❌ | 📦 | 1 | ❌ |
| `/content/getLoggedInfoForItemId` | ❌ | 📦 | 1 | ❌ |
| `/content/getLoggedInfoForLimitRuleId` | ❌ | 📦 | 1 | ❌ |
| `/content/getLoggedInfoForURL` | ❌ | 📦 | 1 | ❌ |
| `/content/getPipelineResultsForId` | ❌ | 📦 | 1 | ❌ |
| `/content/getTermDict` | ❌ | 📦 | 0 | ❌ |
| `/content/imageClassify` | ❌ | 📦 | 1 | ❌ |
| `/content/imageClassifyLegacy` | ➖ | ➖ | 0 | ✅ |
| `/content/listPipelineResults` | ❌ | 📦 | 1 | ❌ |
| `/content/performDeepClassification` | ❌ | 📦 | 0 | ❌ |
| `/content/performDeepMetaCheck` | ❌ | 📦 | 0 | ❌ |
| `/content/performDocClassification` | ❌ | 📦 | 1 | ❌ |
| `/content/reclassifyFromPipelineResultId` | ❌ | 📦 | 1 | ❌ |
| `/content/savePipelineResults` | ❌ | 📦 | 0 | ❌ |
| `/content/updateStatus` | ❌ | 📦 | 0 | ❌ |
| `/data/categories` | ✅ | ➖ | 3 | ✅ |
| `/data/classifyContentType` | ✅ | ➖ | 0 | ✅ |
| `/data/file` | ❌ | 📦 | 1 | ❌ |
| `/data/meta` | ✅ | 📦 | 6 | ✅ |
| `/data/metaWithBanner` | ❌ | 📦 | 0 | ❌ |
| `/data/raw` | ❌ | 📦 | 1 | ❌ |
| `/data/resourceInfo` | ✅ | 📦 | 1 | ✅ |
| `/data/text` | ❌ | 📦 | 0 | ❌ |
| `/device/updateInfo` | ❌ | 📦 | 1 | ❌ |
| `/embedding/batchEmbeddings` | ❌ | 📦 | 2 | ❌ |
| `/embedding/clearCache` | ❌ | 📦 | 2 | ❌ |
| `/embedding/clusterItems` | ❌ | 📦 | 1 | ❌ |
| `/embedding/configure` | ❌ | 📦 | 0 | ❌ |
| `/embedding/detectDuplicates` | ❌ | 📦 | 1 | ❌ |
| `/embedding/findSimilar` | ❌ | 📦 | 2 | ❌ |
| `/embedding/findSimilarItems` | ❌ | 📦 | 2 | ❌ |
| `/embedding/generateEmbedding` | ❌ | 📦 | 1 | ❌ |
| `/embedding/getStats` | ❌ | 📦 | 0 | ❌ |
| `/embedding/suggestCollections` | ❌ | 📦 | 1 | ❌ |
| `/embedding/suggestTags` | ❌ | 📦 | 1 | ❌ |
| `/embeddingCache/clear` | ✅ | ➖ | 0 | ✅ |
| `/embeddingCache/get` | ✅ | ➖ | 0 | ✅ |
| `/embeddingCache/put` | ✅ | ➖ | 0 | ✅ |
| `/embeddingCache/stats` | ✅ | ➖ | 0 | ✅ |
| `/encryption/allUserStatuses` | ❌ | 📦 | 1 | ❌ |
| `/encryption/clearCachedEncValues` | ❌ | 📦 | 1 | ❌ |
| `/encryption/createAccountBackupKey` | ❌ | 📦 | 0 | ❌ |
| `/encryption/decrypt` | ❌ | ✅ | 1 | ❌ |
| `/encryption/diagnoseEncInfo` | ❌ | 📦 | 1 | ❌ |
| `/encryption/enable` | ❌ | 📦 | 1 | ❌ |
| `/encryption/encrypt` | ❌ | ✅ | 1 | ❌ |
| `/encryption/generateRecoveryKey` | ❌ | 📦 | 1 | ❌ |
| `/encryption/getKeyBackup` | ❌ | 📦 | 1 | ❌ |
| `/encryption/getKeys` | ❌ | 📦 | 1 | ❌ |
| `/encryption/getRecoveryKey` | ❌ | 📦 | 2 | ❌ |
| `/encryption/listKeys` | ❌ | 📦 | 0 | ❌ |
| `/encryption/listKeysWithStatus` | ❌ | 📦 | 2 | ❌ |
| `/encryption/recoverUsingKey` | ❌ | 📦 | 1 | ❌ |
| `/encryption/reencryptUsingExistingEncInfo` | ❌ | 📦 | 1 | ❌ |
| `/encryption/rekeyKeepingWrappingKeys` | ❌ | 📦 | 1 | ❌ |
| `/encryption/removeRecoveryKeyFromServer` | ❌ | 📦 | 1 | ❌ |
| `/encryption/saveRecoveryKeyOnServer` | ❌ | 📦 | 2 | ❌ |
| `/encryption/shareAccountKey` | ❌ | 📦 | 3 | ❌ |
| `/encryption/status` | ❌ | ✅ | 3 | ❌ |
| `/encryption/updateSettings` | ✅ | ➖ | 2 | ✅ |
| `/encryption/wipeAndRekey` | ❌ | 📦 | 1 | ❌ |
| `/encryption/wrapSecretWithPasskey` | ❌ | 📦 | 1 | ❌ |
| `/feed/getByPostId` | ✅ | 📦 | 1 | ✅ |
| `/feed/list` | ✅ | 📦 | 2 | ✅ |
| `/feed/proxy` | ❌ | 📦 | 1 | ❌ |
| `/feed/removeById` | ✅ | 📦 | 2 | ✅ |
| `/feed/removePost` | ✅ | 📦 | 3 | ✅ |
| `/feed/sharedFeedback/list` | ✅ | 📦 | 1 | ✅ |
| `/feed/sharedFeedback/markSeen` | ✅ | 📦 | 3 | ✅ |
| `/feed/updateReadStatus` | ✅ | 📦 | 2 | ✅ |
| `/feed/updateReadStatusForMultipleEntries` | ✅ | 📦 | 2 | ✅ |
| `/following/add` | ✅ | ➖ | 0 | ✅ |
| `/following/listByUserId` | ✅ | ➖ | 0 | ✅ |
| `/following/listWithDetailsByUserId` | ✅ | ➖ | 1 | ✅ |
| `/following/remove` | ✅ | ➖ | 0 | ✅ |
| `/invite/checkCode` | ✅ | ➖ | 1 | ✅ |
| `/invite/create` | ✅ | ➖ | 1 | ✅ |
| `/invite/getInfo` | ✅ | ➖ | 3 | ✅ |
| `/item/addToCollections` | ✅ | 📦 | 9 | ✅ |
| `/item/archiveUpdate` | ✅ | ➖ | 3 | ✅ |
| `/item/attachment/add` | ✅ | 📦 | 4 | ✅ |
| `/item/attachment/remove` | ✅ | ➖ | 2 | ✅ |
| `/item/attachment/rename` | ✅ | ➖ | 1 | ✅ |
| `/item/createPageSnapshot` | ❌ | 📦 | 0 | ❌ |
| `/item/decryptItems` | ❌ | 📦 | 1 | ❌ |
| `/item/delete` | ✅ | 📦 | 5 | ✅ |
| `/item/encryptItems` | ❌ | 📦 | 2 | ❌ |
| `/item/feedback/value/update` | ✅ | 📦 | 4 | ✅ |
| `/item/findByAttribute` | ❌ | 📦 | 1 | ❌ |
| `/item/findWithPublishId` | ✅ | 📦 | 6 | ✅ |
| `/item/infoById` | ✅ | ✅ | 33 | ✅ |
| `/item/listAll` | ❌ | 📦 | 2 | ❌ |
| `/item/listByIds` | ✅ | 📦 | 10 | ✅ |
| `/item/listSharedByUser` | ✅ | ➖ | 1 | ✅ |
| `/item/listSharedWithUser` | ✅ | ➖ | 1 | ✅ |
| `/item/listWithFeedback` | ✅ | 📦 | 2 | ✅ |
| `/item/matchForPublished` | ✅ | ➖ | 0 | ✅ |
| `/item/matchesForPubIds` | ❌ | 📦 | 1 | ❌ |
| `/item/matchesForURLs` | ❌ | 📦 | 1 | ❌ |
| `/item/meta/refreshWithIds` | ❌ | 📦 | 4 | ❌ |
| `/item/parents/bychildid` | ✅ | 📦 | 5 | ✅ |
| `/item/pathtree` | ✅ | 📦 | 3 | ✅ |
| `/item/permissions/list` | ✅ | 📦 | 10 | ✅ |
| `/item/permissions/remove` | ❌ | ➖ | 1 | ❌ |
| `/item/permissions/update` | ❌ | ➖ | 2 | ❌ |
| `/item/permissionsAndReactions/list` | ✅ | 📦 | 1 | ✅ |
| `/item/query` | ✅ | ✅ | 4 | ✅ |
| `/item/quickbar/update` | ✅ | ➖ | 1 | ✅ |
| `/item/rediscover` | ❌ | 📦 | 1 | ❌ |
| `/item/removeFromParent` | ✅ | ➖ | 6 | ✅ |
| `/item/save` | ✅ | ✅ | 15 | ✅ |
| `/item/setUserPermission` | ✅ | ➖ | 0 | ✅ |
| `/item/shareWithFriend` | ❌ | 📦 | 1 | ❌ |
| `/item/shareWithUsers` | ✅ | ➖ | 3 | ✅ |
| `/item/similar/byURL` | ❌ | 📦 | 5 | ❌ |
| `/item/transferOwnership` | ✅ | ➖ | 1 | ✅ |
| `/item/update` | ✅ | ✅ | 22 | ✅ |
| `/item/updateParents` | ✅ | ➖ | 1 | ✅ |
| `/item/updatePermissions` | ✅ | ➖ | 1 | ✅ |
| `/item/userPermissionLookup` | ✅ | 📦 | 2 | ✅ |
| `/items/match` | ❌ | 📦 | 1 | ❌ |
| `/library/archived` | ✅ | ➖ | 1 | ✅ |
| `/library/hidden` | ❌ | ➖ | 1 | ❌ |
| `/library/root` | ✅ | 📦 | 5 | ✅ |
| `/library/uncategorized` | ✅ | ➖ | 1 | ✅ |
| `/libraryHealth/analyze` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/applyRecommendation` | ❌ | 📦 | 0 | ❌ |
| `/libraryHealth/clearCache` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/dismissRecommendation` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/getAnalyzableItems` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/getPreferences` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/getRecommendations` | ❌ | 📦 | 0 | ❌ |
| `/libraryHealth/getSimilarCollections` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/getSmartCollections` | ❌ | 📦 | 0 | ❌ |
| `/libraryHealth/getStats` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/listCollections` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/snoozeRecommendation` | ❌ | 📦 | 1 | ❌ |
| `/libraryHealth/updatePreferences` | ❌ | 📦 | 1 | ❌ |
| `/localAtRest/getKeyAccess` | ❌ | 📦 | 1 | ❌ |
| `/localAtRest/getSettings` | ❌ | 📦 | 1 | ❌ |
| `/localAtRest/initKeyset` | ❌ | 📦 | 1 | ❌ |
| `/localAtRest/lock` | ❌ | 📦 | 1 | ❌ |
| `/localAtRest/migrateAiSessionKv` | ❌ | 📦 | 1 | ❌ |
| `/localAtRest/sampleEncryptDecrypt` | ❌ | 📦 | 1 | ❌ |
| `/localAtRest/setSettings` | ❌ | 📦 | 1 | ❌ |
| `/localAtRest/userKv/clear` | ❌ | 📦 | 0 | ❌ |
| `/localAtRest/userKv/get` | ❌ | 📦 | 0 | ❌ |
| `/localAtRest/userKv/set` | ❌ | 📦 | 0 | ❌ |
| `/localstore/lookupMetaTemp` | ➖ | ✅ | 0 | ✅ |
| `/localstore/reset` | ➖ | ✅ | 0 | ✅ |
| `/localstore/saveMetaTemp` | ➖ | ✅ | 1 | ✅ |
| `/media/banner/recommend` | ✅ | 📦 | 2 | ✅ |
| `/media/banner/search` | ✅ | 📦 | 2 | ✅ |
| `/nativeClientCheck` | ➖ | ✅ | 0 | ✅ |
| `/nativeMessage` | ➖ | ✅ | 2 | ✅ |
| `/plans/list` | ✅ | ➖ | 2 | ✅ |
| `/plugin/list` | ✅ | ➖ | 1 | ✅ |
| `/post/create` | ✅ | 📦 | 1 | ✅ |
| `/post/delete` | ✅ | ➖ | 1 | ✅ |
| `/post/list` | ✅ | ➖ | 0 | ✅ |
| `/post/readReceipt/list` | ✅ | ➖ | 1 | ✅ |
| `/post/readReceipt/mark` | ✅ | ➖ | 1 | ✅ |
| `/post/updateSharedWith` | ✅ | ➖ | 1 | ✅ |
| `/pubfile/get` | ✅ | ➖ | 0 | ✅ |
| `/published/collectionItemFeed` | ✅ | ➖ | 2 | ✅ |
| `/published/collectionsByUser` | ✅ | ➖ | 1 | ✅ |
| `/published/countView` | ✅ | ➖ | 1 | ✅ |
| `/published/filteredSearch` | ✅ | ➖ | 4 | ✅ |
| `/published/flag` | ✅ | ➖ | 2 | ✅ |
| `/published/get` | ✅ | ➖ | 1 | ✅ |
| `/published/getGalleryGroupAndItems` | ✅ | ➖ | 1 | ✅ |
| `/published/info/update` | ✅ | ➖ | 1 | ✅ |
| `/published/item/importFromPublished` | ✅ | 📦 | 3 | ✅ |
| `/published/listChildren` | ✅ | ➖ | 2 | ✅ |
| `/published/listGroupIdsForGallery` | ✅ | ➖ | 1 | ✅ |
| `/published/listRecent` | ✅ | ➖ | 0 | ✅ |
| `/published/listWithChild` | ✅ | ➖ | 2 | ✅ |
| `/published/listWithIds` | ✅ | ➖ | 3 | ✅ |
| `/published/matchForURL` | ✅ | ➖ | 1 | ✅ |
| `/published/publishCollection` | ✅ | ➖ | 1 | ✅ |
| `/published/publishCollectionClient/addChild` | ✅ | ➖ | 1 | ✅ |
| `/published/publishCollectionClient/finalize` | ✅ | ➖ | 1 | ✅ |
| `/published/publishCollectionClient/init` | ✅ | ➖ | 1 | ✅ |
| `/published/publishCollectionClientUpload` | ❌ | ✅ | 1 | ❌ |
| `/published/publishItem` | ✅ | ➖ | 1 | ✅ |
| `/published/reviewsByUser` | ✅ | ➖ | 1 | ✅ |
| `/published/subscribe` | ✅ | 📦 | 2 | ✅ |
| `/published/subscription/update` | ✅ | ➖ | 1 | ✅ |
| `/published/unpublish` | ✅ | ➖ | 1 | ✅ |
| `/published/updateCurationStatus` | ✅ | ➖ | 1 | ✅ |
| `/published/updateEasyId` | ✅ | ➖ | 1 | ✅ |
| `/published/view` | ✅ | ➖ | 8 | ✅ |
| `/reaction/list` | ✅ | ➖ | 1 | ✅ |
| `/reaction/save` | ✅ | ➖ | 1 | ✅ |
| `/ref_state/account/delete` | ✅ | 📦 | 0 | ✅ |
| `/ref_state/account/list` | ✅ | 📦 | 0 | ✅ |
| `/ref_state/account/upsert` | ✅ | 📦 | 0 | ✅ |
| `/ref_state/session/delete` | ❌ | 📦 | 1 | ❌ |
| `/ref_state/session/list` | ❌ | 📦 | 1 | ❌ |
| `/ref_state/session/upsert` | ❌ | 📦 | 1 | ❌ |
| `/ref_state/user/delete` | ✅ | 📦 | 0 | ✅ |
| `/ref_state/user/list` | ✅ | 📦 | 0 | ✅ |
| `/ref_state/user/upsert` | ✅ | 📦 | 0 | ✅ |
| `/review/getForUser` | ✅ | ➖ | 2 | ✅ |
| `/review/listForItem` | ✅ | ➖ | 1 | ✅ |
| `/review/save` | ✅ | ➖ | 1 | ✅ |
| `/search/autocomplete` | ❌ | 📦 | 2 | ❌ |
| `/search/embedded` | ❌ | 📦 | 0 | ❌ |
| `/search/main` | ❌ | ✅ | 6 | ❌ |
| `/search/status` | ❌ | 📦 | 1 | ❌ |
| `/search/terms` | ❌ | 📦 | 2 | ❌ |
| `/sentry/checkIfPermitted` | ❌ | 📦 | 3 | ❌ |
| `/sentry/checkIfPermittedByPageContent` | ❌ | 📦 | 0 | ❌ |
| `/sentry/clearTempDisableBlocking` | ❌ | 📦 | 1 | ❌ |
| `/sentry/getTempDisableBlockingStatus` | ❌ | 📦 | 1 | ❌ |
| `/sentry/giveTempAccess` | ❌ | 📦 | 5 | ❌ |
| `/sentry/processRequestsForBlocking` | ❌ | 📦 | 0 | ❌ |
| `/sentry/processRequestsForInjection` | ❌ | 📦 | 0 | ❌ |
| `/sentry/tempDisableBlocking` | ❌ | 📦 | 0 | ❌ |
| `/serverSettings/get` | ❌ | 📦 | 1 | ❌ |
| `/serverSettings/refresh` | ❌ | 📦 | 1 | ❌ |
| `/serverSettings/update` | ❌ | 📦 | 1 | ❌ |
| `/store/config` | ✅ | ➖ | 3 | ✅ |
| `/store/createSubscription` | ✅ | ➖ | 1 | ✅ |
| `/store/webhooks` | ⚠️ | ➖ | 0 | ⚠️ |
| `/subscription/add` | ✅ | ➖ | 2 | ✅ |
| `/subscription/edit` | ✅ | ➖ | 5 | ✅ |
| `/subscription/listForRef` | ✅ | 📦 | 3 | ✅ |
| `/subscription/listForUser` | ✅ | 📦 | 2 | ✅ |
| `/subscription/remove` | ✅ | ➖ | 0 | ✅ |
| `/subscription/removeById` | ✅ | ➖ | 3 | ✅ |
| `/sync/clearAll` | ❌ | ➖ | 0 | ❌ |
| `/sync/clearOld` | ❌ | ➖ | 0 | ❌ |
| `/sync/events` | ⚠️ | ➖ | 0 | ⚠️ |
| `/sync/getAllOperations` | ❌ | ➖ | 0 | ❌ |
| `/sync/getPending` | ❌ | ➖ | 0 | ❌ |
| `/sync/getStatus` | ❌ | ❌ | 1 | ❌ |
| `/sync/retryFailed` | ❌ | ➖ | 1 | ❌ |
| `/sync/retryOperation` | ❌ | ➖ | 0 | ❌ |
| `/sync/trigger` | ❌ | ➖ | 1 | ❌ |
| `/sync/update` | ✅ | ❌ | 0 | ❌ |
| `/sync/updateClient` | ❌ | 📦 | 2 | ❌ |
| `/system/contactRequest` | ✅ | ➖ | 3 | ✅ |
| `/system/status` | ❌ | 📦 | 3 | ❌ |
| `/system/version` | ❌ | 📦 | 3 | ❌ |
| `/task/archive` | ❌ | 📦 | 2 | ❌ |
| `/task/complete` | ❌ | 📦 | 1 | ❌ |
| `/task/list` | ❌ | 📦 | 1 | ❌ |
| `/task/skip` | ❌ | 📦 | 1 | ❌ |
| `/task/snooze` | ❌ | 📦 | 1 | ❌ |
| `/task/status/list` | ❌ | 📦 | 3 | ❌ |
| `/task/uncomplete` | ❌ | 📦 | 1 | ❌ |
| `/task/upsert` | ❌ | 📦 | 1 | ❌ |
| `/task_completion/listForTask` | ❌ | 📦 | 1 | ❌ |
| `/task_completion/upsert` | ❌ | 📦 | 0 | ❌ |
| `/task_items/assignees` | ❌ | 📦 | 1 | ❌ |
| `/task_items/listAssigned` | ❌ | 📦 | 0 | ❌ |
| `/task_items/upsert` | ❌ | 📦 | 1 | ❌ |
| `/test/client/dbtest` | ➖ | ✅ | 0 | ✅ |
| `/test/client/debugInfo` | ➖ | ✅ | 2 | ✅ |
| `/test/client/run` | ➖ | ✅ | 1 | ✅ |
| `/user/activity/clearUsageLog` | ✅ | ➖ | 1 | ✅ |
| `/user/activity/deleteAll` | ✅ | ➖ | 1 | ✅ |
| `/user/activity/list` | ✅ | ➖ | 0 | ✅ |
| `/user/activity/logList` | ✅ | ➖ | 0 | ✅ |
| `/user/activity/push` | ✅ | ➖ | 0 | ✅ |
| `/user/activity/pushEntries` | ❌ | ➖ | 0 | ❌ |
| `/user/activity/removeEntry` | ✅ | ➖ | 1 | ✅ |
| `/user/client/list` | ✅ | ➖ | 1 | ✅ |
| `/user/client/updateDeviceToken` | ✅ | ➖ | 1 | ✅ |
| `/user/current` | ✅ | ✅ | 3 | ✅ |
| `/user/debug` | ✅ | ➖ | 0 | ✅ |
| `/user/debug/statusCheck` | ✅ | ➖ | 2 | ✅ |
| `/user/delete` | ✅ | 📦 | 3 | ✅ |
| `/user/email/update` | ✅ | ➖ | 1 | ✅ |
| `/user/encryption/createKeyEntryForUser` | ✅ | ➖ | 1 | ✅ |
| `/user/encryption/deleteRecoveryKey` | ✅ | ➖ | 1 | ✅ |
| `/user/encryption/listKeys` | ✅ | ➖ | 1 | ✅ |
| `/user/encryption/removeAllAccountKeys` | ✅ | ➖ | 1 | ✅ |
| `/user/encryption/removeKeys` | ✅ | ➖ | 1 | ✅ |
| `/user/encryption/saveAccountKeys` | ✅ | ➖ | 2 | ✅ |
| `/user/encryption/saveUserKeys` | ✅ | ➖ | 2 | ✅ |
| `/user/friend/list` | ✅ | ➖ | 6 | ✅ |
| `/user/friend/profile` | ✅ | ➖ | 1 | ✅ |
| `/user/friend/request` | ✅ | ➖ | 1 | ✅ |
| `/user/friend/takeAction` | ✅ | ➖ | 1 | ✅ |
| `/user/image/upload` | ❌ | ➖ | 0 | ❌ |
| `/user/info` | ✅ | 📦 | 14 | ✅ |
| `/user/info/update` | ✅ | 📦 | 2 | ✅ |
| `/user/info/updateUsername` | ✅ | 📦 | 2 | ✅ |
| `/user/integrations/gmail/oauth/accessToken` | ✅ | 📦 | 0 | ✅ |
| `/user/integrations/gmail/oauth/disconnect` | ✅ | 📦 | 0 | ✅ |
| `/user/integrations/gmail/oauth/exchangeCode` | ✅ | 📦 | 1 | ✅ |
| `/user/integrations/gmail/oauth/status` | ✅ | 📦 | 0 | ✅ |
| `/user/migrate` | ✅ | ➖ | 1 | ✅ |
| `/user/miscStats` | ✅ | 📦 | 1 | ✅ |
| `/user/mypublicprofile` | ✅ | ➖ | 1 | ✅ |
| `/user/notification/clear` | ✅ | ➖ | 1 | ✅ |
| `/user/notification/count` | ✅ | ➖ | 0 | ✅ |
| `/user/notification/list` | ✅ | ➖ | 2 | ✅ |
| `/user/notification/markAllAsRead` | ❌ | ➖ | 0 | ❌ |
| `/user/notification/markRead` | ✅ | ➖ | 2 | ✅ |
| `/user/notification/markUnread` | ✅ | ➖ | 1 | ✅ |
| `/user/notification/remove` | ✅ | ➖ | 2 | ✅ |
| `/user/options/get` | ❌ | ✅ | 5 | ❌ |
| `/user/options/update` | ✅ | ➖ | 4 | ✅ |
| `/user/plugin/list` | ✅ | 📦 | 1 | ✅ |
| `/user/plugin/update` | ✅ | ➖ | 1 | ✅ |
| `/user/prefs/defaultsByKey` | ✅ | 📦 | 1 | ✅ |
| `/user/prefs/get` | ✅ | ✅ | 0 | ✅ |
| `/user/prefs/getValue` | ✅ | 📦 | 1 | ✅ |
| `/user/prefs/update` | ✅ | 📦 | 0 | ✅ |
| `/user/profile/get` | ✅ | 📦 | 8 | ✅ |
| `/user/profileImage/update` | ✅ | 📦 | 3 | ✅ |
| `/user/public/get` | ✅ | ➖ | 5 | ✅ |
| `/user/public/update` | ✅ | ➖ | 2 | ✅ |
| `/user/publicProfileImage/upload` | ✅ | ➖ | 1 | ✅ |
| `/user/publishing/update` | ✅ | ➖ | 1 | ✅ |
| `/user/sendEmailVerification` | ✅ | ➖ | 1 | ✅ |
| `/user/showcase/get` | ✅ | ➖ | 1 | ✅ |
| `/user/showcase/getByPublicId` | ✅ | ➖ | 1 | ✅ |
| `/user/showcase/getByUserId` | ✅ | ➖ | 1 | ✅ |
| `/user/showcase/update` | ✅ | ➖ | 1 | ✅ |
| `/user/userType/update` | ✅ | 📦 | 1 | ✅ |
| `/userdata/proxy` | ⚠️ | ➖ | 0 | ⚠️ |
| `/userdata/proxyr` | ✅ | ➖ | 0 | ✅ |
| `/userfile/cleanupUnused` | ✅ | 📦 | 1 | ✅ |
| `/userfile/getById` | ✅ | 📦 | 14 | ✅ |
| `/userfile/getCiphertextChunkRange` | ⚠️ | ➖ | 0 | ⚠️ |
| `/userfile/getMetaById` | ✅ | ➖ | 4 | ✅ |
| `/userfile/listByUser` | ✅ | ➖ | 1 | ✅ |
| `/userfile/listFilesByRef` | ✅ | 📦 | 3 | ✅ |
| `/userfile/remove` | ✅ | 📦 | 1 | ✅ |
| `/userfile/updateEncInfo` | ✅ | ➖ | 1 | ✅ |
| `/userfile/upload` | ✅ | 📦 | 2 | ✅ |
| `/userfile/uploadChunkedInit` | ⚠️ | ➖ | 0 | ⚠️ |
| `/usertask/generateImage` | ✅ | ➖ | 1 | ✅ |
| `/usertask/request` | ✅ | ➖ | 3 | ✅ |
| `/usertask/stream` | ✅ | ➖ | 0 | ✅ |
| `/wikiDeepDive/cancel` | ❌ | 📦 | 1 | ❌ |
| `/wikiDeepDive/clearDraft` | ❌ | 📦 | 1 | ❌ |
| `/wikiDeepDive/getDraft` | ❌ | 📦 | 1 | ❌ |
| `/wikiDeepDive/propose` | ❌ | 📦 | 1 | ❌ |
| `/wikiDeepDive/start` | ❌ | 📦 | 1 | ❌ |
