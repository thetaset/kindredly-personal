import type {NextFunction, Request, Response} from 'express';
import {getKeyValueStore} from '@/base/runtime.factory';
import {logger} from '@/utils/logger';
import {recordSecurityEvent, SECURITY_EVENT_TYPES} from '@/services/security_event.service';

/**
 * Counts how many outbound fetches each user makes us perform.
 *
 * The routes this guards all make us fetch something on the caller's behalf — a page's
 * metadata, an image, a podcast feed. That makes our servers a usable proxy, and the rate
 * limiter alone does not distinguish "a person browsing" from "someone using us to fetch a
 * few hundred thousand URLs": the limiter keys on IP, and per-IP limits are generous enough
 * to allow sustained scripted use from one account.
 *
 * **Observe-only.** Nothing is rejected here, ever. The threshold below is a guess — no
 * calibration data exists yet — and rejecting on a guessed number would break real families
 * before it stopped anybody. It records one event when a user crosses the line so the shape
 * of normal becomes visible, and the decision to enforce comes later, from real numbers.
 */

/** Fixed counting window. */
export const OUTBOUND_WINDOW_SECONDS = 3600;

/**
 * Fetches per user per hour before it is worth a look.
 *
 * A page of thumbnails is easily 50–100 proxied images, and a browsing session can chain
 * several of those, so this sits well above an active hour of ordinary use. Uncalibrated —
 * revise it once a few weeks of events show what a heavy real user actually does.
 */
export const OUTBOUND_HIGH_THRESHOLD = 500;

const KEY_PREFIX = 'kindredly:proxy:count:';

/**
 * Increment a user's counter and report the moment they cross the threshold.
 *
 * Reporting on **exact equality** is what keeps this to one event per user per window: the
 * counter passes the threshold value once, so no separate "already alerted" key is needed
 * and two processes cannot both fire on the same crossing.
 *
 * Never throws. This sits in front of a working request path, so a Redis problem must cost
 * observability and nothing else.
 */
export async function countOutboundFetch(input: {
  userId?: string | null;
  accountId?: string | null;
  ip?: string;
  route?: string;
}): Promise<void> {
  const userId = input.userId;
  if (!userId) return; // Unauthenticated callers are the rate limiter's problem, not this one.

  try {
    const bucket = Math.floor(Date.now() / (OUTBOUND_WINDOW_SECONDS * 1000));
    const key = `${KEY_PREFIX}${userId}:${bucket}`;
    const client = getKeyValueStore();

    const count = await client.incr(key);
    if (count === 1) {
      // Only on creation, so a long-running window is not repeatedly extended.
      await client.expire(key, OUTBOUND_WINDOW_SECONDS);
    }

    if (count === OUTBOUND_HIGH_THRESHOLD) {
      recordSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.PROXY_VOLUME_HIGH,
        severity: 'warn',
        ip: input.ip,
        route: input.route,
        actorUserId: userId,
        actorAccountId: input.accountId || null,
        detail: {threshold: OUTBOUND_HIGH_THRESHOLD, windowSeconds: OUTBOUND_WINDOW_SECONDS},
      });
    }
  } catch (error) {
    logger.error('countOutboundFetch failed', error);
  }
}

/**
 * Express middleware form. Deliberately does not await — the count must never add latency
 * to, or be able to fail, the request it is counting.
 */
export function outboundFetchCounter(req: Request, _res: Response, next: NextFunction): void {
  const authInfo = (req as any)?.authInfo;
  void countOutboundFetch({
    userId: authInfo?.userId,
    accountId: authInfo?.accountId,
    ip: req.ip,
    route: req.path,
  });
  next();
}
