import {config} from '@/config';
import {getKeyValueStore} from '@/base/runtime.factory';
import {logger} from '@/utils/logger';

/**
 * Runtime kill switch for ALL rate limiting.
 *
 * Why this exists rather than just the env var: `RATE_LIMITING_ENABLED` is read once at
 * boot, so turning limiting off meant a config change and a redeploy. That is the wrong
 * tool during an incident — the moment you most need limits off is the moment you can
 * least afford to wait for a rolling deploy.
 *
 * How it works:
 *   - The env var remains the boot default.
 *   - A Redis key can override it at runtime, fleet-wide, within `POLL_INTERVAL_MS`.
 *   - The hot path reads a cached boolean, never Redis, so a request pays nothing.
 *
 * Failure behaviour is deliberately "keep doing what we were doing": if Redis cannot be
 * read, the last known value stands, falling back to the env default at boot. A Redis
 * outage must never silently switch limiting on for someone who had turned it off, nor
 * off for someone relying on it.
 */

const REDIS_KEY = 'kindredly:ratelimit:disabled';
const POLL_INTERVAL_MS = 5_000;

/** Boot default from the environment. */
function envDefaultEnabled(): boolean {
  return config.rateLimitingEnabled !== false;
}

let cachedEnabled = envDefaultEnabled();
let overrideActive = false;
let poller: NodeJS.Timeout | null = null;
let lastError: string | null = null;

async function readOverride(): Promise<void> {
  try {
    const raw = await getKeyValueStore().get(REDIS_KEY);
    lastError = null;
    if (raw == null) {
      // No override set — the env default governs.
      overrideActive = false;
      cachedEnabled = envDefaultEnabled();
      return;
    }
    overrideActive = true;
    cachedEnabled = raw !== '1';
  } catch (error: any) {
    // Keep the last known value. See the note above on failure behaviour.
    lastError = error?.message || String(error);
  }
}

function ensurePoller() {
  if (poller || process.env.NODE_ENV === 'test') return;
  // Nothing on an appliance can write the override key: the KV store is
  // in-process, and `setRateLimitingDisabled`'s only caller is the admin route,
  // which self-hosted builds withhold. Polling it every 5s forever would be
  // 17,280 reads a day of a local Map that never changes. The env default still
  // governs, and a same-process `setRateLimitingDisabled` still takes effect
  // because it sets `cachedEnabled` directly.
  if (config.profile === 'lite') return;
  void readOverride();
  poller = setInterval(() => void readOverride(), POLL_INTERVAL_MS);
  if (typeof poller.unref === 'function') poller.unref();
}

/**
 * Is rate limiting currently on? Synchronous and allocation-free — safe to call on every
 * request.
 */
export function isRateLimitingEnabled(): boolean {
  ensurePoller();
  // config.rateLimitingEnabled is still honoured directly so that tests (and anything that
  // mutates it at runtime) keep working without going near Redis.
  if (!overrideActive) return envDefaultEnabled();
  return cachedEnabled;
}

/**
 * Turn rate limiting off (or back on) across every process, without a redeploy.
 *
 * Passing `null` clears the override and returns control to the environment variable.
 */
export async function setRateLimitingDisabled(disabled: boolean | null): Promise<void> {
  const client = getKeyValueStore();
  if (disabled == null) {
    await client.del(REDIS_KEY);
    overrideActive = false;
    cachedEnabled = envDefaultEnabled();
    logger.warn('[ratelimit] runtime override CLEARED — reverting to RATE_LIMITING_ENABLED');
    return;
  }

  await client.set(REDIS_KEY, disabled ? '1' : '0');
  overrideActive = true;
  cachedEnabled = !disabled;
  logger.warn(`[ratelimit] runtime override set: limiting is now ${disabled ? 'OFF' : 'ON'} fleet-wide`);
}

/** Current switch state, for the admin UI and ops dashboard. */
export function getRateLimitSwitchState() {
  ensurePoller();
  return {
    enabled: isRateLimitingEnabled(),
    source: overrideActive ? ('runtime_override' as const) : ('environment' as const),
    envDefaultEnabled: envDefaultEnabled(),
    /** Non-null when the last Redis read failed; the reported value is then stale. */
    lastError,
    pollIntervalMs: POLL_INTERVAL_MS,
  };
}

/** Test seam — resets module state between suites. */
export function __resetRateLimitSwitchForTests() {
  if (poller) clearInterval(poller);
  poller = null;
  overrideActive = false;
  cachedEnabled = envDefaultEnabled();
  lastError = null;
}
