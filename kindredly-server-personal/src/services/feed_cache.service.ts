import {createHash, randomBytes} from 'crypto';
import {getKeyValueStore} from '@/base/runtime.factory';
import {logger} from '@/utils/logger';

/**
 * A shared, cross-user cache for proxied RSS/Atom bodies.
 *
 * The feed proxy exists because the webapp cannot fetch a feed itself — feed
 * hosts send no CORS headers — so every webapp user's refresh became a separate
 * live GET to the origin from our single egress IP. Nothing deduplicated them:
 * 500 people subscribed to one popular feed was 500 requests a day at that
 * origin, which is exactly how a datacenter IP earns a reputation flag. (See
 * `upstream_block.ts`, which exists to detect the resulting bot challenges.)
 *
 * So: one entry per feed URL, shared by everyone, with single-flight around the
 * miss so a thundering herd collapses to one upstream request.
 *
 * **Nothing here may throw.** It sits in front of a working request path; a
 * Redis fault must cost efficiency and nothing else. Every method returns a
 * null/false "no cache available" result instead, and the caller falls back to
 * the uncached path.
 */

/** Serve straight from cache below this age — no upstream request at all. */
export const FEED_FRESH_TTL_MS = 15 * 60 * 1000;

/**
 * How long an entry survives in Redis. Deliberately much longer than freshness:
 * past `FEED_FRESH_TTL_MS` the body is still useful as an `If-None-Match`
 * validator and as a stale fallback when the origin is down or blocking us.
 */
export const FEED_REDIS_TTL_SECONDS = 24 * 60 * 60;

/** Bodies above this are streamed through uncached rather than held in Redis. */
export const FEED_MAX_CACHEABLE_BYTES = 5 * 1024 * 1024;

/** How long one holder may keep the single-flight lock before it self-expires. */
const LOCK_TTL_MS = 20_000;

/** How long a waiter blocks for the holder's result before fetching itself. */
const LOCK_WAIT_TIMEOUT_MS = 5_000;
const LOCK_POLL_INTERVAL_MS = 100;

const KEY_PREFIX = 'kindredly:feed:v1:';
const LOCK_PREFIX = 'kindredly:feed:lock:v1:';

export type FeedCacheEntry = {
  body: string;
  contentType: string;
  etag?: string;
  lastModified?: string;
  /** Epoch ms of the last time upstream confirmed this body (200 or 304). */
  fetchedAt: number;
};

/**
 * Normalize a feed URL into a stable cache key.
 *
 * Deliberately NOT `urlToKey` from tset-sharedlib: that lowercases the *entire*
 * URL, which corrupts case-sensitive query values — YouTube's
 * `?channel_id=UCxxxx` most obviously, where two distinct channels could collide.
 * Only scheme and host are case-insensitive per RFC 3986; path and query are
 * kept byte-for-byte.
 */
export function normalizeFeedUrl(url: string): string | null {
  try {
    const parsed = new URL(String(url || '').trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.host = parsed.host.toLowerCase();
    return parsed.toString();
  } catch {
    return null;
  }
}

export function feedCacheKey(url: string): string | null {
  const normalized = normalizeFeedUrl(url);
  if (!normalized) return null;
  return KEY_PREFIX + createHash('sha256').update(normalized).digest('hex');
}

export function isFeedEntryFresh(entry: FeedCacheEntry, now: number = Date.now()): boolean {
  return now - entry.fetchedAt < FEED_FRESH_TTL_MS;
}

/** The stored entry for a feed URL, or null if absent, unusable, or Redis is down. */
export async function getFeedCacheEntry(url: string): Promise<FeedCacheEntry | null> {
  const key = feedCacheKey(url);
  if (!key) return null;

  try {
    const raw = await getKeyValueStore().get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as FeedCacheEntry;
    if (typeof parsed?.body !== 'string' || typeof parsed?.fetchedAt !== 'number') return null;
    return parsed;
  } catch (error) {
    logger.error('getFeedCacheEntry failed', error);
    return null;
  }
}

export async function setFeedCacheEntry(url: string, entry: FeedCacheEntry): Promise<void> {
  const key = feedCacheKey(url);
  if (!key) return;
  if (Buffer.byteLength(entry.body, 'utf8') > FEED_MAX_CACHEABLE_BYTES) return;

  try {
    await getKeyValueStore().set(key, JSON.stringify(entry), 'EX', FEED_REDIS_TTL_SECONDS);
  } catch (error) {
    logger.error('setFeedCacheEntry failed', error);
  }
}

/**
 * Try to become the one request that goes upstream for this URL.
 *
 * Returns a token on success (pass it to {@link releaseFeedLock}), or null if
 * someone else holds it — or if Redis is unavailable, in which case every caller
 * proceeds independently, which is exactly today's behaviour.
 */
export async function acquireFeedLock(url: string): Promise<string | null> {
  const key = feedCacheKey(url);
  if (!key) return null;

  const token = randomBytes(12).toString('hex');
  try {
    const acquired = await getKeyValueStore().acquireLock(LOCK_PREFIX + key, token, LOCK_TTL_MS);
    return acquired ? token : null;
  } catch (error) {
    logger.error('acquireFeedLock failed', error);
    return null;
  }
}

/**
 * Release only if we still hold it. A compare-and-delete, because a holder that
 * overran `LOCK_TTL_MS` would otherwise delete its successor's lock.
 */
export async function releaseFeedLock(url: string, token: string): Promise<void> {
  const key = feedCacheKey(url);
  if (!key) return;

  try {
    await getKeyValueStore().releaseLock(LOCK_PREFIX + key, token);
  } catch (error) {
    logger.error('releaseFeedLock failed', error);
  }
}

/**
 * Wait for whoever holds the lock to publish a fresh entry.
 *
 * Gives up after {@link LOCK_WAIT_TIMEOUT_MS} and returns null so the caller
 * fetches for itself. A user must never be stuck behind someone else's slow
 * request — the cache is an optimization, never a dependency.
 */
export async function waitForFeedCacheEntry(
  url: string,
  timeoutMs: number = LOCK_WAIT_TIMEOUT_MS,
): Promise<FeedCacheEntry | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_INTERVAL_MS));
    const entry = await getFeedCacheEntry(url);
    if (entry && isFeedEntryFresh(entry)) return entry;
  }

  return null;
}
