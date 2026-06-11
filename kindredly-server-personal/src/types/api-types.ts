import {Request, Response, NextFunction, RequestHandler} from 'express';
import {ApiRouteMap} from 'tset-sharedlib/api/api-route-map';

/**
 * Helper types to extract request/response types from UnifiedApiRouteMap
 *
 * Usage:
 * ```typescript
 * // Infer types from the path in a single location
 * const handler = typedHandler(async (req: ApiReq<'/auth/switchUser'>, res) => {
 *   const { userId } = req.body; // ✅ Fully typed!
 * });
 * this.router.post('/auth/switchUser', authenticateJWT, errorHelper(handler));
 * ```
 */

/** Extract request body type for a given API path */
export type ApiRequest<Path extends keyof ApiRouteMap> = ApiRouteMap[Path]['request'];

/** Extract response type for a given API path */
export type ApiResponse<Path extends keyof ApiRouteMap> = ApiRouteMap[Path]['response'];

/**
 * Typed Express Request that infers request/response types from UnifiedApiRouteMap
 * Shorthand for use in inline handler definitions
 * @template Path - The API route path (e.g., '/auth/switchUser')
 */
export type ApiReq<Path extends keyof ApiRouteMap> = Request<{}, ApiResponse<Path>, ApiRequest<Path>>;

/**
 * Helper to create typed handlers - just for better type inference in some editors
 */
export function typedHandler<T extends RequestHandler>(handler: T): T {
  return handler;
}
