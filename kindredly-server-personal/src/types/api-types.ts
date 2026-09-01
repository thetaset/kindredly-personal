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
 *
 * NOTE: the second type argument is `Request`'s own `ResBody` slot. It does NOT constrain the
 * `res` object a handler is given — that is a separate `Response` type — so declaring only
 * `req: ApiReq<Path>` leaves every `res.json(...)` completely unchecked. Pair it with
 * `res: ApiRes<Path>` to actually enforce the response half of the contract.
 */
export type ApiReq<Path extends keyof ApiRouteMap> = Request<{}, ApiResponse<Path>, ApiRequest<Path>>;

/**
 * Typed Express Response for a given API path, so `res.json(...)` is checked against the
 * response type declared in the route map.
 *
 * Usage:
 * ```typescript
 * errorHelper(async (req: ApiReq<'/auth/switchUser'>, res: ApiRes<'/auth/switchUser'>) => {
 *   res.json({ ... }); // ✅ checked against ApiRouteMap['/auth/switchUser']['response']
 * })
 * ```
 */
export type ApiRes<Path extends keyof ApiRouteMap> = Response<ApiResponse<Path>>;

/**
 * Helper to create typed handlers - just for better type inference in some editors
 */
export function typedHandler<T extends RequestHandler>(handler: T): T {
  return handler;
}
