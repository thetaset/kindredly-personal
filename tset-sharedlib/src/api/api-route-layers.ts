/**
 * API Route Layer Metadata
 * 
 * Defines which layers each route should be implemented in.
 * This is used by the route verification script to identify missing implementations.
 * 
 * Layers:
 * - 'server': Route has a backend handler in tset-server/src/routes/
 * - 'bgrouter': Route has an explicit client handler in tset-client/src/bg/routes/
 * - 'ui': Route is called from UI via typedSendReq (informational, not validated)
 * 
 * IMPORTANT: Most routes do NOT need explicit BGRouter handlers!
 * Routes without handlers automatically fall through to dataRequest -> typedRemoteRequest.
 * Only add routes to `requiresBGRouterHandler` if they need:
 * - Local caching/persistence (IndexedDB)
 * - Offline queue support
 * - Data transformation (encrypt/decrypt)
 * - Special routing logic
 */

import type { ApiRouteMap } from './api-route-map';

export type RouteLayer = 'server' | 'bgrouter' | 'ui';

/**
 * Routes that ONLY go to the server (no BGRouter involvement at all).
 * These are typically called via typedRemoteRequest directly from services,
 * bypassing the UI -> BGRouter flow entirely.
 */
export const serverOnlyRoutes: Array<keyof ApiRouteMap> = [
  // Admin routes - server only, called from admin UI directly
  '/admin/account/changeSysOptions',
  '/admin/account/changeType',
  '/admin/account/info',
  '/admin/contentBundles/get',
  '/admin/contentLoader/dryRun',
  '/admin/contentLoader/execute',
  '/admin/contentLoader/uploadAsset',
  '/admin/published/package/export',
  '/admin/published/package/import',
  '/admin/published/enrich',
  '/admin/published/applyEnrichmentPatches',
  '/admin/published/importBatches',
  '/admin/published/approveBatch',
  '/admin/contentBundles/reset',
  '/admin/contentBundles/update',
  '/admin/contactrequest/list',
  '/admin/dataRetention/run',
  '/admin/getGalleryDBs',
  '/admin/item/list',
  '/admin/published/changeBlockedStatus',
  '/admin/published/changeType',
  '/admin/published/changeProcessingState',
  '/admin/published/process',
  '/admin/published/info',
  '/admin/published/replaceImage',
  '/admin/published/itemsSchemaUpdate',
  '/admin/published/list',
  '/admin/signin',
  '/admin/sse/clearAllData',
  '/admin/sse/clearHeartbeats',
  '/admin/sse/connectionStatus',
  '/admin/sse/testEvent',
  '/admin/sse/testHeartbeat',
  '/admin/updateGallerys',
  '/admin/user/changeBlockedStatus',
  '/admin/user/changeCuratorStatus',
  '/admin/user/changeLockStatus',
  '/admin/user/info',
  '/admin/user/list',

  // Auth routes that bypass BGRouter (handled by auth service directly)
  '/auth/signin',
  '/auth/signinlocal',
  '/auth/register',
  '/auth/tokenLogin',
  '/auth/switchUser',
  '/auth/signout',
  '/auth/provider/apple',

  // SSE/streaming endpoint
  '/sync/events',

  // Store/payment routes
  '/store/config',
  '/store/createSubscription',
  '/store/webhooks',

  // System routes
  '/system/contactRequest',
  '/system/status',
  '/system/version',
];

/**
 * Routes that are CLIENT-ONLY (no server handler, handled entirely in BGRouter).
 * These routes operate on local state, browser APIs, or native features.
 */
export const clientOnlyRoutes: Array<keyof ApiRouteMap> = [
  '/client/hometab',
  '/client/widget/status',
  '/nativeClientCheck',
  '/nativeDesktopStatus',
  '/nativeDesktopLockdown',
  '/nativeDesktopAuthorizeChallenge',
  '/nativeMessage',
  '/test/client/dbtest',
  '/test/client/debugInfo',
  '/test/client/run',
  '/localstore/lookupMetaTemp',
  '/localstore/reset',
  '/localstore/saveMetaTemp',
  '/activityMonitor/startFrameEventTrackingForCurrentTab',
  '/activityMonitor/update',
  '/collection/showcase/repairFriendEncryption',
  '/collection/healChildEncryptionKeys',
];

/**
 * Routes that REQUIRE explicit BGRouter handlers.
 * Only routes that need caching, offline support, or transformation belong here.
 * Most routes should NOT be in this list - they use the dataRequest fallback.
 */
export const requiresBGRouterHandler: Array<keyof ApiRouteMap> = [
  // Routes with local caching via DataAccessRegistry
  '/account/info',
  '/account/users',
  '/user/current',
  '/user/prefs/get',
  '/user/options/get',
  
  // Routes with encryption/decryption
  '/encryption/status',
  '/encryption/encrypt',
  '/encryption/decrypt',
  
  // Routes with complex local state management
  '/item/query',
  '/item/infoById',
  '/item/save',
  '/item/update',
  '/collection/items',
  
  // Sync-related routes
  '/sync/update',
  '/sync/getStatus',
  
  // Search with local index
  '/search/main',

  // Client-upload publishing orchestration (UI -> BG)
  '/published/publishCollectionClientUpload',
];

/**
 * Routes that are intentionally DEPRECATED or UNUSED.
 * These should be removed in future cleanup.
 */
export const deprecatedRoutes: Array<keyof ApiRouteMap> = [
  '/', // Root health check only
  '/content/imageClassifyLegacy',
];

/**
 * Get the expected layers for a route.
 * Default: server only (BGRouter handler optional via fallback)
 */
export function getRouteLayers(route: keyof ApiRouteMap): RouteLayer[] {
  if (serverOnlyRoutes.includes(route)) {
    return ['server'];
  }
  if (clientOnlyRoutes.includes(route)) {
    return ['bgrouter'];
  }
  if (deprecatedRoutes.includes(route)) {
    return []; // Should not be implemented anywhere
  }
  // Default: needs server, BGRouter is optional (handled by fallback)
  return ['server'];
}

/**
 * Check if a route is expected to have a server implementation.
 */
export function expectsServerHandler(route: keyof ApiRouteMap): boolean {
  return !clientOnlyRoutes.includes(route) && !deprecatedRoutes.includes(route);
}

/**
 * Check if a route REQUIRES an explicit BGRouter handler.
 * Most routes don't - they use the dataRequest fallback.
 */
export function requiresExplicitBGRouterHandler(route: keyof ApiRouteMap): boolean {
  return clientOnlyRoutes.includes(route) || requiresBGRouterHandler.includes(route);
}
