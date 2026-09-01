import crypto from 'crypto';
import {v4 as uuidv4} from 'uuid';
import {config} from '@/config';
import {logger} from '@/utils/logger';
import {SecurityEventRepo, type SecurityEventRow, type SecuritySeverity} from '@/db/security_event.repo';

/**
 * Stable event keys. Add here first — the ops dashboard and the digest job group on these
 * strings, so an ad-hoc key written at a call site would silently never be reported.
 */
export const SECURITY_EVENT_TYPES = {
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_ADMIN_LOGIN_FAILED: 'auth.admin_login_failed',
  AUTH_JWT_REJECTED: 'auth.jwt_rejected',
  AUTH_SESSION_REVOKED_USE: 'auth.session_revoked_use',
  RATELIMIT_EXCEEDED: 'ratelimit.exceeded',
  RATELIMIT_SSE_EXCEEDED: 'ratelimit.sse_exceeded',
  PROXY_SSRF_BLOCKED: 'proxy.ssrf_blocked',
  PROXY_UPSTREAM_BLOCKED: 'proxy.upstream_blocked',
  PROXY_VOLUME_HIGH: 'proxy.volume_high',
  AI_BUDGET_EXCEEDED: 'ai.budget_exceeded',
  AI_RATE_LIMITED: 'ai.rate_limited',
  REQUEST_OVERSIZE_BODY: 'request.oversize_body',
  AUTHZ_UNCHECKED_ACCESS: 'authz.unchecked_access',
  MODERATION_GATE_FAILED: 'moderation.gate_failed',
  CONFIG_AI_BUDGET_CHANGED: 'config.ai_budget_changed',
  CONFIG_RATE_LIMIT_CHANGED: 'config.rate_limit_changed',
} as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[keyof typeof SECURITY_EVENT_TYPES];

export type SecurityEventInput = {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  /** Raw IP. Hashed immediately; never stored or logged as-is. */
  ip?: string;
  actorUserId?: string | null;
  actorAccountId?: string | null;
  clientId?: string | null;
  route?: string | null;
  detail?: Record<string, unknown>;
};

/**
 * Prefix on every security log line, so CloudWatch can find them with the plain filter
 * pattern `SECEVENT`.
 *
 * A marker rather than a JSON filter because winston emits
 * `<timestamp> warn: {json}` — the line is not valid JSON end to end, so CloudWatch's
 * `{ $.kind = "security" }` syntax never matches it. Substring-matching the embedded
 * `"kind":"security"` would work but needs quote escaping through several layers of
 * shell and CLI argument handling, which is exactly the kind of thing that breaks
 * silently and leaves the ops dashboard showing a confident, empty result.
 */
export const SECURITY_LOG_MARKER = 'SECEVENT';

/** Coalescing window. One row per (type, ip, route) per window. */
const FLUSH_INTERVAL_MS = 60_000;

/**
 * Cap on distinct buffered keys. A wide attack (many source IPs) must not turn the buffer
 * into an unbounded allocation — that would convert a security event into an OOM, which is
 * a worse outcome than losing visibility into the tail.
 */
const MAX_BUFFER_KEYS = 1000;

/** Longest string permitted in `detail` or `route`. */
const MAX_STRING_LEN = 64;

/**
 * Derived from the JWT secret rather than a new required env var — one less secret to
 * provision, and it rotates with the thing it is derived from. The label domain-separates
 * it so it can never collide with a token signature.
 *
 * Consequence of rotation: hashes computed before and after a JWT secret change will not
 * compare equal, so correlation resets at rotation. That is acceptable for a 90-day ledger.
 */
function ipHmacKey(): Buffer {
  return crypto
    .createHash('sha256')
    .update(`security-event-ip:${config.jwtAccessTokenSecret || ''}`)
    .digest();
}

/** HMAC of an IP, truncated to 128 bits. Only comparable to other rows in this table. */
export function hashIp(ip: string | undefined | null): string | null {
  const text = String(ip || '').trim();
  if (!text || text === 'UNKNOWNIP') return null;
  return crypto.createHmac('sha256', ipHmacKey()).update(text).digest('hex').slice(0, 32);
}

/**
 * Coarse subnet for triage: /24 for IPv4, /48 for IPv6.
 *
 * Express reports IPv4 clients as IPv4-mapped IPv6 (`::ffff:1.2.3.4`) whenever the socket
 * is dual-stack, so that form is unwrapped first — otherwise every IPv4 address on the
 * internet would collapse into a single `::ffff:0:0/48` bucket and the grouping would be
 * useless.
 */
export function ipPrefixOf(ip: string | undefined | null): string | null {
  let text = String(ip || '').trim();
  if (!text || text === 'UNKNOWNIP') return null;

  const mapped = text.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) text = mapped[1];

  if (/^\d+\.\d+\.\d+\.\d+$/.test(text)) {
    const [a, b, c] = text.split('.');
    return `${a}.${b}.${c}.0/24`;
  }

  if (text.includes(':')) {
    const hextets = text.split(':').filter(Boolean).slice(0, 3);
    if (!hextets.length) return null;
    return `${hextets.join(':')}::/48`;
  }

  return null;
}

/**
 * Strip a route down to a storable path: no query string (it carries tokens and user
 * input), no trailing junk, bounded length.
 */
export function normalizeRoute(route: string | undefined | null): string | null {
  const text = String(route || '').trim();
  if (!text) return null;
  const path = text.split('?')[0].split('#')[0];
  if (!path) return null;
  return path.slice(0, 128);
}

/**
 * Enforce "counts, codes and IDs only" mechanically rather than by convention.
 *
 * Numbers and booleans always pass. Strings pass only when the key names an identifier or
 * a known-safe enum-ish field, and are truncated regardless. Everything else — objects,
 * arrays, URLs, message bodies — is dropped, so a careless call site cannot leak content
 * into the ledger.
 */
export function sanitizeDetail(detail: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!detail) return out;

  const stringKeyAllowed = (key: string) =>
    /Id$/.test(key) ||
    [
      'reason',
      'code',
      'errorType',
      'method',
      'bucket',
      'provider',
      'model',
      'plan',
      'severity',
      'loginType',
      'feature',
      'field',
    ].includes(key);

  for (const [key, value] of Object.entries(detail)) {
    if (value == null) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === 'boolean') {
      out[key] = value;
    } else if (typeof value === 'string' && stringKeyAllowed(key)) {
      out[key] = value.slice(0, MAX_STRING_LEN);
    }
    // Anything else is intentionally dropped.
  }

  return out;
}

type BufferEntry = {
  row: Omit<SecurityEventRow, '_id' | 'createdAt' | 'detail'>;
  detail: Record<string, unknown>;
  count: number;
  firstAt: Date;
};

export type SecurityEventRepoLike = Pick<SecurityEventRepo, 'insertMany'>;

export class SecurityEventService {
  private static _staticInstance: SecurityEventService | null = null;

  static get instance(): SecurityEventService {
    if (!this._staticInstance) this._staticInstance = new SecurityEventService();
    return this._staticInstance;
  }

  private buffer = new Map<string, BufferEntry>();
  private timer: NodeJS.Timeout | null = null;
  private droppedSinceFlush = 0;

  constructor(
    private repo: SecurityEventRepoLike | null = null,
    private flushIntervalMs: number = FLUSH_INTERVAL_MS,
  ) {}

  private getRepo(): SecurityEventRepoLike {
    if (!this.repo) this.repo = new SecurityEventRepo();
    return this.repo;
  }

  /**
   * Buffer one security event.
   *
   * Never throws and never awaits the database — this sits on request-rejection paths, so
   * a ledger failure must not turn a clean 429 into a 500. Critical events bypass the
   * coalescing delay and flush immediately.
   */
  record(input: SecurityEventInput): void {
    try {
      const severity: SecuritySeverity = input.severity || 'info';
      const ipHash = hashIp(input.ip);
      const ipPrefix = ipPrefixOf(input.ip);
      const route = normalizeRoute(input.route);
      const key = `${input.eventType}|${ipHash || '-'}|${route || '-'}|${input.actorAccountId || '-'}`;

      const existing = this.buffer.get(key);
      if (existing) {
        existing.count += 1;
        Object.assign(existing.detail, sanitizeDetail(input.detail));
      } else if (this.buffer.size >= MAX_BUFFER_KEYS) {
        // Buffer is saturated. Count the loss so the flushed batch can report it rather
        // than silently under-representing the event.
        this.droppedSinceFlush += 1;
        return;
      } else {
        this.buffer.set(key, {
          row: {
            eventType: input.eventType,
            severity,
            actorUserId: input.actorUserId || null,
            actorAccountId: input.actorAccountId || null,
            clientId: input.clientId || null,
            ipHash,
            ipPrefix,
            route,
          },
          detail: sanitizeDetail(input.detail),
          count: 1,
          firstAt: new Date(),
        });
      }

      if (severity === 'critical') {
        void this.flush();
        return;
      }

      this.ensureTimer();
    } catch (error) {
      // Deliberately swallowed: see the doc comment above.
      console.error('SecurityEventService.record failed', error);
    }
  }

  private ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.flush(), this.flushIntervalMs);
    // Do not hold the event loop open — a pending flush must never delay shutdown.
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  /**
   * Write the buffered events: one DB row and one structured log line per coalesced entry.
   *
   * The log line is what the ops dashboard reads out of CloudWatch, which is why it is
   * emitted here rather than in `record` — emitting per occurrence would restore exactly
   * the log volume the coalescing exists to avoid.
   */
  async flush(): Promise<void> {
    if (!this.buffer.size) return;

    const entries = Array.from(this.buffer.values());
    const dropped = this.droppedSinceFlush;
    this.buffer.clear();
    this.droppedSinceFlush = 0;

    const now = new Date();
    const rows: SecurityEventRow[] = entries.map((e) => ({
      _id: `sec_${uuidv4()}`,
      ...e.row,
      detail: {...e.detail, count: e.count, windowStartedAt: e.firstAt.toISOString()},
      createdAt: now,
    }));

    for (const row of rows) {
      logger.warn(
        `${SECURITY_LOG_MARKER} ` +
          JSON.stringify({
            kind: 'security',
            eventType: row.eventType,
            severity: row.severity,
            ipPrefix: row.ipPrefix,
            route: row.route,
            accountId: row.actorAccountId,
            userId: row.actorUserId,
            detail: row.detail,
          }),
      );
    }

    if (dropped > 0) {
      logger.warn(
        `${SECURITY_LOG_MARKER} ` +
          JSON.stringify({
            kind: 'security',
            eventType: 'ledger.buffer_saturated',
            severity: 'warn',
            detail: {dropped, bufferLimit: MAX_BUFFER_KEYS},
          }),
      );
    }

    try {
      await this.getRepo().insertMany(rows);
    } catch (error) {
      // The log lines above already went out, so the events are not lost even when the
      // database write fails.
      console.error('SecurityEventService.flush failed to persist', error);
    }
  }
}

/** Convenience wrapper so call sites stay one short line. */
export function recordSecurityEvent(input: SecurityEventInput): void {
  SecurityEventService.instance.record(input);
}
