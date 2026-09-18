// Export UnifiedApiRouteMap - the single source of truth for ALL API routes
export type { ApiRouteMap as UnifiedApiRouteMap, ParameterizedRouteMap, RouteParams } from './api-route-map';
export { buildParameterizedRoute } from './api-route-map';

// Export response types
/**
 * API Type Exports
 */

export * from './api-route-map';
export * from './api-types';

// Route layer metadata helpers
export * from './api-route-layers';

// The generated route docs (`api-route-docs.generated.ts`, a 120KB table of request/response
// shapes) are deliberately NOT re-exported here. Almost every client module imports a type from
// this barrel, so a runtime re-export put the table on the static import graph of every bundle
// entry; a chunking rule that groups modules by import edge then shipped it at boot on mobile even
// though only the AI agent's tool listing reads it. Import it from its own module instead.
