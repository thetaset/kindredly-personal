import {UserSessionRepo} from '@/db/user_session.repo';
import {getKeyValueStore} from '@/base/runtime.factory';
import {config} from '@/config';
import crypto from 'crypto';

const CACHE_PREFIX = 'usess:';
const CACHE_TTL_SEC = 60; // revocation takes effect within this window
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // lastSeenAt write throttle

const SSE_TICKET_PREFIX = 'sset:';
const SSE_TICKET_TTL_SEC = 60;

// The session check sits on the hot path of every authenticated request, and
// ioredis has no command timeout — a black-holed redis would otherwise leave
// the check's promise pending forever (fail-open never fires on a hang).
const REDIS_CHECK_TIMEOUT_MS = 250;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`redis op timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export type SessionEnforcementMode = 'off' | 'log' | 'enforce';

/**
 * Server-side registry for the sessionId claim already present in every JWT.
 *
 * Sessions never expire on their own — users stay signed in indefinitely.
 * A session only ends when explicitly revoked (signout, password change,
 * admin/parent action). Tokens issued before this table existed are lazily
 * adopted on first authenticated request, so legacy clients keep working
 * and become revocable.
 *
 * The check is designed to fail OPEN: an outage in Redis or the DB must
 * degrade to "allow" rather than 401-ing the whole user base.
 */
export class SessionService {
  private static _staticInstance: SessionService | null = null;
  static get instance(): SessionService {
    if (!this._staticInstance) this._staticInstance = new SessionService();
    return this._staticInstance;
  }

  constructor(private sessionRepo: UserSessionRepo = new UserSessionRepo()) {}

  get mode(): SessionEnforcementMode {
    return config.sessionEnforcement as SessionEnforcementMode;
  }

  /**
   * Single chokepoint for "is this signature-valid authInfo still allowed?".
   * Applies the enforcement mode: returns {ok:false} in 'enforce' mode for a
   * revoked session; 'log' mode logs and allows. EVERY path that accepts or
   * exchanges a token must call this (header/cookie middleware, tokenLogin,
   * SSE tickets) — do not reimplement per route.
   *
   * **Device-agent tokens are the exception, and enforce in every mode.** A parent
   * pressing "Remove device" has to actually disconnect it, and under the default
   * `log` mode revocation is recorded and then ignored — the button would lie. This
   * is also the credential that most needs real revocation: `_createCompanionToken`
   * mints it with `expAtSec: null`, it never rotates, and it lives on a child's
   * machine.
   *
   * Scoped rather than flipping SESSION_ENFORCEMENT globally, deliberately. Every
   * signout and password change since the registry shipped has written a `revokedAt`
   * that has never had a consequence, so the size of the still-in-use-but-revoked
   * population is unknowable from here — and `checkSession` fails OPEN, meaning a
   * global flip's failure mode is safe while its success mode is the risk. That is
   * the worst possible shape for a rollout nobody can rehearse, and it is not
   * something to discover while shipping one button. This branch is a strict subset
   * of `enforce`, so it becomes a no-op the day the global flip does happen.
   *
   * Costs one cached lookup per device-agent request even under `off` — where `off`
   * otherwise means "touch neither redis nor the DB". Negligible against a heartbeat
   * that idles at ten minutes, but an operator who set `off` to shed load should know.
   */
  async verifyAuthInfoSession(
    authInfo: {sessionId?: string; userId?: string; accountId?: string; scope?: string} | undefined,
    info: {appType?: string; clientId?: string; context?: string} = {},
  ): Promise<{ok: boolean; reason?: string}> {
    const mode = this.mode;
    if (!authInfo?.sessionId || !authInfo?.userId) return {ok: true};
    const deviceAgent = authInfo.scope === 'device-agent';
    if (mode === 'off' && !deviceAgent) return {ok: true};
    const check = await this.checkSession(authInfo.sessionId, authInfo.userId, {
      accountId: authInfo.accountId,
      appType: info.appType,
      clientId: info.clientId,
    });
    if (!check.ok) {
      if (mode === 'enforce' || deviceAgent) {
        console.warn('SessionRevoked:', authInfo.sessionId, info.context || '');
        return {ok: false, reason: check.reason};
      }
      console.warn('[session] log-only: would reject revoked session', authInfo.sessionId, info.context || '');
    }
    return {ok: true};
  }

  /**
   * Verifies the session behind a signature-valid token is not revoked,
   * lazily adopting unknown sessions and throttling lastSeenAt updates.
   * Returns {ok:false} only for sessions explicitly marked revoked.
   */
  async checkSession(
    sessionId: string,
    userId: string,
    info: {accountId?: string; appType?: string; clientId?: string} = {},
  ): Promise<{ok: boolean; reason?: string}> {
    try {
      const redis = getKeyValueStore();
      const cacheKey = CACHE_PREFIX + sessionId;

      const cached = await withTimeout(redis.get(cacheKey), REDIS_CHECK_TIMEOUT_MS);
      if (cached === 'ok') return {ok: true};
      if (cached === 'revoked') return {ok: false, reason: 'revoked'};

      const session = await this.sessionRepo.findById(sessionId);

      if (!session) {
        // Lazy adoption: token predates the session registry (or first use).
        await this.sessionRepo.create({
          _id: sessionId,
          userId,
          accountId: info.accountId || null,
          appType: info.appType || null,
          clientId: info.clientId || null,
        });
        await redis.set(cacheKey, 'ok', 'EX', CACHE_TTL_SEC);
        return {ok: true};
      }

      if (session.revokedAt) {
        await redis.set(cacheKey, 'revoked', 'EX', CACHE_TTL_SEC);
        return {ok: false, reason: session.revokedReason || 'revoked'};
      }

      const lastSeen = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : 0;
      if (Date.now() - lastSeen > TOUCH_INTERVAL_MS) {
        this.sessionRepo.touch(sessionId).catch((e) => console.error('[session] touch failed', e));
      }
      await redis.set(cacheKey, 'ok', 'EX', CACHE_TTL_SEC);
      return {ok: true};
    } catch (e) {
      // Fail open: infrastructure trouble must not sign everyone out.
      console.error('[session] check failed (allowing request)', e);
      return {ok: true};
    }
  }

  async revokeSession(sessionId: string, reason: string) {
    await this.sessionRepo.revoke(sessionId, reason);
    await this.invalidateCache([sessionId]);
  }

  /**
   * Cuts one device off: revokes every live session recorded against its client id.
   *
   * Not `revokeAllForUser` — that would sign the child out on every device they own in
   * order to remove one of them. The client id is the key because both Companion
   * platforms send `tsclientid: cmp_<deviceId>` and the registry records it on the row.
   */
  async revokeForClient(userId: string, clientId: string, reason: string): Promise<number> {
    const revoked = await this.sessionRepo.revokeByClientId(userId, clientId, reason);
    const ids = (revoked || []).map((row: any) => (typeof row === 'string' ? row : row._id)).filter(Boolean);
    await this.invalidateCache(ids);
    return ids.length;
  }

  /** Revokes all of a user's sessions, optionally sparing the current one. */
  async revokeAllForUser(userId: string, reason: string, exceptSessionId?: string) {
    const revoked = await this.sessionRepo.revokeAllForUser(userId, reason, exceptSessionId);
    const ids = (revoked || []).map((row: any) => (typeof row === 'string' ? row : row._id));
    await this.invalidateCache(ids);
    return ids.length;
  }

  /**
   * One-time short-lived ticket so EventSource connections don't put
   * long-lived JWTs in URLs (which get logged by proxies and morgan).
   */
  async createSseTicket(authInfo: {userId: string; accountId?: string; sessionId?: string}): Promise<string> {
    const ticket = crypto.randomBytes(24).toString('base64url');
    await getKeyValueStore().set(
      SSE_TICKET_PREFIX + ticket,
      JSON.stringify({userId: authInfo.userId, accountId: authInfo.accountId, sessionId: authInfo.sessionId}),
      'EX',
      SSE_TICKET_TTL_SEC,
    );
    return ticket;
  }

  async consumeSseTicket(ticket: unknown): Promise<{userId: string; accountId?: string; sessionId?: string} | null> {
    if (typeof ticket !== 'string' || !ticket) return null;
    try {
      const redis = getKeyValueStore();
      const key = SSE_TICKET_PREFIX + ticket;
      const value = await redis.get(key);
      if (!value) return null;
      // DEL's return value makes single-use atomic: under concurrent
      // consumption of the same ticket, only one caller sees deleted === 1.
      const deleted = await redis.del(key);
      if (deleted !== 1) return null;
      return JSON.parse(value);
    } catch (e) {
      console.error('[session] sse ticket consume failed', e);
      return null;
    }
  }

  private async invalidateCache(sessionIds: string[]) {
    if (!sessionIds.length) return;
    try {
      const redis = getKeyValueStore();
      const pipeline = redis.pipeline();
      for (const id of sessionIds) {
        pipeline.set(CACHE_PREFIX + id, 'revoked', 'EX', CACHE_TTL_SEC);
      }
      await pipeline.exec();
    } catch (e) {
      // Cache entries expire within CACHE_TTL_SEC anyway.
      console.error('[session] cache invalidation failed', e);
    }
  }
}
