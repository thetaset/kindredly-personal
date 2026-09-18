import {RequestContext} from '@/base/request_context';
import {getKeyValueStore} from '@/base/runtime.factory';
import {ClientInfoRepo} from '@/db/client_info.repo';
import {AuditLogService} from '@/services/audit_log.service';
import SSEManager from '@/services/sse.manager';
import User from 'tset-sharedlib/schemas/public/User';
import type {
  GetLiveViewFramesRequest,
  GetLiveViewFramesResponse,
  PushLiveViewFrameRequest,
  PushLiveViewFrameResponse,
  StartLiveViewRequest,
  StartLiveViewResponse,
  StopLiveViewRequest,
  StopLiveViewResponse,
} from 'tset-sharedlib/api';
import type {
  LiveViewDeviceView,
  LiveViewFrameKind,
  LiveViewFrameView,
  LiveViewSessionView,
  ManagedSessionStatus,
} from 'tset-sharedlib/shared.types';
import {v4 as uuidv4} from 'uuid';

/**
 * Live View — a guardian watching their child's screen.
 *
 * Three properties define this service and should survive any future edit:
 *
 * 1. **No frame is durable.** Sessions and frames live in Redis under short
 *    TTLs. There is no table, no history, and no way to look at yesterday's
 *    frames. The one thing that does persist is an audit row per watch session
 *    (`live_view.start`) — a record that watching happened, never a record of
 *    what was on the screen.
 * 2. **The server never sees a frame.** `encryptedFrame` is ciphertext written
 *    by the child with its own user key. This service moves an opaque string.
 * 3. **Capture stops on its own.** A child keeps capturing only while
 *    `pushFrame` keeps answering `keepGoing: true`. If the guardian closes the
 *    page, crashes, or loses the network, the watched-key TTL lapses and the
 *    next push tells the child to stop. No stop event has to be delivered.
 */
class LiveViewService {
  /** Renewed by every guardian poll. Sized so ~2 missed polls end the session. */
  private static readonly SESSION_TTL_SECONDS = 30;
  /** A frame older than this is not shown; the tile reports the device as idle. */
  private static readonly FRAME_TTL_SECONDS = 20;
  private static readonly MIN_CADENCE_MS = 2000;
  private static readonly MAX_CADENCE_MS = 30000;
  private static readonly DEFAULT_CADENCE_MS = 5000;
  /** Roughly a 640px JPEG at quality 40, base64-encoded, with headroom. */
  private static readonly MAX_ENCRYPTED_FRAME_BYTES = 250 * 1024;
  private static readonly MAX_WATCHED_CHILDREN = 10;
  private static readonly STALE_SESSION_MS = 10 * 60 * 1000;
  /**
   * Devices not seen in this long are not offered at all. Without it, every
   * browser the child ever signed into becomes a permanent "Offline" tile and
   * the "nothing is online" empty state can never be reached. Matches the
   * spirit of ClientInfoService.listManagedSessions, which pages by last-active.
   */
  private static readonly DEVICE_RECENCY_MS = 30 * 24 * 60 * 60 * 1000;
  /** How often a silent child may be re-told to start. Throttles the nudge. */
  private static readonly NUDGE_INTERVAL_MS = 10000;

  constructor(
    private clientInfoRepo = new ClientInfoRepo(),
    private sseManager = SSEManager.getInstance(),
    private redis = getKeyValueStore(),
    private auditLog = AuditLogService.instance,
  ) {}

  private sessionKey(sessionId: string): string {
    return `live_view_session:${sessionId}`;
  }

  /**
   * The child-side authority for "am I being watched". Deliberately keyed by
   * child rather than by session so that `pushFrame` needs no session id from
   * the child — a child never learns which guardian or session is watching,
   * only that watching is happening.
   */
  private watchedKey(childUserId: string): string {
    return `live_view_watched:${childUserId}`;
  }

  private frameKey(childUserId: string, clientId: string): string {
    return `live_view_frame:${childUserId}:${clientId}`;
  }

  private clampCadence(cadenceMs: number | null | undefined): number {
    const value = Number(cadenceMs);
    if (!Number.isFinite(value) || value <= 0) {
      return LiveViewService.DEFAULT_CADENCE_MS;
    }
    return Math.min(LiveViewService.MAX_CADENCE_MS, Math.max(LiveViewService.MIN_CADENCE_MS, Math.round(value)));
  }

  /**
   * Which client types can produce a frame. A plain webapp session cannot — a
   * browser tab has no API to screenshot itself — so those clients are left out
   * of the device list entirely rather than shown as tiles that could never
   * fill. `supportsLiveView` on the view is therefore always true; it is kept on
   * the type so a future partially-capable platform has somewhere to say so.
   */
  private supportsLiveView(appType: string | null | undefined): boolean {
    return appType === 'extension' || appType === 'ios' || appType === 'android' || appType === 'electron';
  }

  private normalizeConnectionClientId(clientId: string | null | undefined, userId: string): string {
    const value = String(clientId || '').trim();
    const prefix = `${userId}-`;
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
  }

  private isPaidAccountType(accountType: string | null | undefined): boolean {
    return accountType === 'plus' || accountType === 'superplus';
  }

  private getLiveViewSettings(targetUser: User | null | undefined) {
    return (
      (targetUser?.options as Record<string, any> | null | undefined)?.accessControlSettings?.liveViewSettings || null
    );
  }

  /**
   * Three independent gates, all required: the guardian manages this child, the
   * child is a restricted user and the account is paid, and this specific child
   * has been opted in. Mirrors `ClientInfoService.verifyManagedRemoteActionAccess`.
   *
   * There was a fourth — an account-wide `extendedFeatures.liveView` flag — until Live View
   * became a per-child setting only. Watching is a consent conversation with one child, and an
   * account-wide switch above it meant the child's own switch was never the whole answer.
   */
  private async verifyLiveViewAccess(ctx: RequestContext, targetUserId: string) {
    await ctx.verifyAdminOverUser(targetUserId);

    const [targetUser, account] = await Promise.all([ctx.getUserById(targetUserId), ctx.getAccount()]);

    if (!targetUser || targetUser.deleted) {
      throw new Error('Child not found');
    }
    if (targetUser.type !== 'restricted') {
      throw new Error('Live View is only available for child accounts');
    }
    if (!this.isPaidAccountType(account?.accountType || null)) {
      throw new Error('Live View requires Plus');
    }

    const liveViewSettings = this.getLiveViewSettings(targetUser);
    if (!liveViewSettings?.enabled) {
      throw new Error('Live View is turned off for this child');
    }

    return {targetUser, liveViewSettings, account};
  }

  private resolveSessionStatus(input: {
    connectedAt?: Date | string | null;
    lastSeen?: Date | string | null;
  }): ManagedSessionStatus {
    if (input.connectedAt) return 'online-unverified';

    const lastSeenMs = input.lastSeen ? new Date(input.lastSeen).getTime() : 0;
    if (lastSeenMs > 0 && Date.now() - lastSeenMs <= LiveViewService.STALE_SESSION_MS) {
      return 'stale';
    }

    return 'offline';
  }

  private async readSession(sessionId: string): Promise<{
    sessionId: string;
    guardianUserId: string;
    watchedUserIds: string[];
    cadenceMs: number;
    /** The one device being captured. Absent means the guardian is only looking at the list. */
    clientId?: string;
    /** Which child owns that device. Only their watched key is written. */
    clientUserId?: string;
    lastNudgeAtMs?: Record<string, number>;
  } | null> {
    const raw = await this.redis.get(this.sessionKey(sessionId));
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private toSessionView(
    session: {sessionId: string; watchedUserIds: string[]; cadenceMs: number},
    ttlSeconds: number,
  ): LiveViewSessionView {
    return {
      sessionId: session.sessionId,
      watchedUserIds: session.watchedUserIds,
      cadenceMs: session.cadenceMs,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  }

  /**
   * Marks the children as watched and writes the session. Renewing is the same
   * write — an idempotent refresh of every TTL — which is why the guardian's
   * poll can renew without a separate route.
   */
  private async persistSession(session: {
    sessionId: string;
    guardianUserId: string;
    watchedUserIds: string[];
    cadenceMs: number;
    clientId?: string;
    clientUserId?: string;
    lastNudgeAtMs?: Record<string, number>;
  }): Promise<void> {
    const payload = JSON.stringify(session);

    // No chosen device means nothing is being watched: the session exists so the guardian can
    // see the device list, and the watched key — the child-side authority for "am I being
    // captured" — is deliberately not written. Without a watched key `pushFrame` answers
    // `keepGoing: false`, so any device that was capturing stops on its next push.
    // Exactly one child is marked watched: the one who owns the chosen device. Every other child
    // in the session has their key cleared, so their devices stop on their next push.
    await Promise.all([
      this.redis.setex(this.sessionKey(session.sessionId), LiveViewService.SESSION_TTL_SECONDS, payload),
      ...session.watchedUserIds.map((childUserId) =>
        session.clientId && childUserId === session.clientUserId
          ? this.redis.setex(
              this.watchedKey(childUserId),
              LiveViewService.SESSION_TTL_SECONDS,
              JSON.stringify({
                sessionId: session.sessionId,
                cadenceMs: session.cadenceMs,
                clientId: session.clientId,
              }),
            )
          : this.redis.del(this.watchedKey(childUserId)),
      ),
    ]);
  }

  private async listDevicesForChild(childUserId: string, options: {clientId?: string} = {}) {
    const [clients, liveConnections] = await Promise.all([
      this.clientInfoRepo.listByUserId(childUserId, {
        activeSince: new Date(Date.now() - LiveViewService.DEVICE_RECENCY_MS),
      }),
      this.sseManager.getConnectionDetailsForUser(childUserId),
    ]);

    const liveByClientId = new Map(
      liveConnections.map((connection) => [
        this.normalizeConnectionClientId(connection.clientId, childUserId),
        connection,
      ]),
    );

    const wanted = String(options.clientId || '').trim();

    return clients
      .filter((client) => this.supportsLiveView(client.appType || null))
      .filter((client) => !wanted || String(client.clientId || '') === wanted)
      .map((client) => {
        const clientId = String(client.clientId || '');
        const liveConnection = liveByClientId.get(clientId);

        return {
          client,
          clientId,
          status: this.resolveSessionStatus({
            connectedAt: liveConnection?.connectedAt || null,
            lastSeen: client.lastSeen || null,
          }),
        };
      });
  }

  private async readFrame(childUserId: string, clientId: string): Promise<LiveViewFrameView | null> {
    const raw = await this.redis.get(this.frameKey(childUserId, clientId));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as LiveViewFrameView;
    } catch {
      return null;
    }
  }

  private async buildDeviceViews(
    childUserIds: string[],
    options: {clientId?: string; includeFrames: boolean},
  ): Promise<LiveViewDeviceView[]> {
    const perChild = await Promise.all(
      childUserIds.map(async (childUserId) => {
        const devices = await this.listDevicesForChild(childUserId, {clientId: options.clientId});

        return await Promise.all(
          devices.map(async ({client, clientId, status}) => {
            const frame = options.includeFrames ? await this.readFrame(childUserId, clientId) : null;

            return {
              userId: childUserId,
              clientId,
              clientVersion: client.clientVersion || '',
              appId: client.appId || '',
              appVersion: client.appVersion || '',
              appType: client.appType || '',
              deviceName: client.deviceName || null,
              deviceType: client.deviceType || null,
              lastSeen: client.lastSeen ? new Date(client.lastSeen).toISOString() : null,
              status,
              supportsLiveView: true,
              frame,
            } satisfies LiveViewDeviceView;
          }),
        );
      }),
    );

    return perChild.flat();
  }

  async startWatchSession(ctx: RequestContext, input: StartLiveViewRequest): Promise<StartLiveViewResponse> {
    const requestedIds = Array.isArray(input?.userIds) ? input.userIds : [];
    const childUserIds = [...new Set(requestedIds.map((value) => String(value || '').trim()).filter(Boolean))];

    if (!childUserIds.length) {
      throw new Error('At least one child is required');
    }
    if (childUserIds.length > LiveViewService.MAX_WATCHED_CHILDREN) {
      throw new Error('Too many children in one Live View session');
    }

    // Every child is verified before anything is written, so a single denied
    // child fails the whole request rather than starting a partial session.
    for (const childUserId of childUserIds) {
      await this.verifyLiveViewAccess(ctx, childUserId);
    }

    const cadenceMs = this.clampCadence(input?.cadenceMs);
    const clientId = String(input?.clientId || '').trim() || undefined;

    // A device id from the guardian names a screen on someone else's machine, so it is checked
    // against that child's own devices rather than trusted. An unknown id would otherwise write
    // a watched key no device can satisfy, and the guardian would wait on a tile forever.
    let clientUserId: string | undefined;
    if (clientId) {
      const devices = await this.buildDeviceViews(childUserIds, {clientId, includeFrames: false});
      if (!devices.length) {
        throw new Error("That device is not one of this child's");
      }
      clientUserId = devices[0].userId;
    }

    const session = {
      sessionId: 'lvs_' + uuidv4(),
      guardianUserId: String(ctx.currentUserId || ''),
      watchedUserIds: childUserIds,
      cadenceMs,
      clientId,
      clientUserId,
    };

    // Written BEFORE anything starts capturing, and deliberately allowed to
    // fail the request.
    //
    // Every other audit call in this codebase is best-effort (try/catch, log,
    // carry on) because it records something that already happened to content.
    // This one is different: it is the durable record that a person's screen
    // was watched. If we cannot write that record, we do not do the watching.
    // The child's on-screen notice is the live guarantee; this is the one that
    // survives the session, and an unaccountable session is worse than none.
    //
    // Only when a device was picked: listing a child's devices captures nothing and shows the
    // guardian nothing of theirs, so a row saying their screen was watched would be false.
    if (clientId && clientUserId) {
      await this.recordWatchStart(ctx, [clientUserId]);
    }

    await this.persistSession(session);

    // Told to the ONE chosen device, not to everything the child owns. Broadcasting to the user
    // woke every phone, tablet and browser they were signed into, and each one captured,
    // encrypted and uploaded a screen the guardian was not looking at.
    if (clientId && clientUserId) {
      await this.sseManager.broadcastToClient(`${clientUserId}-${clientId}`, 'liveViewStart', {
        cadenceMs,
        startedAt: new Date().toISOString(),
      });
    }

    return {
      session: this.toSessionView(session, LiveViewService.SESSION_TTL_SECONDS),
      devices: await this.buildDeviceViews(childUserIds, {includeFrames: false}),
    };
  }

  /**
   * One row per watch session, per child.
   *
   * Start only — no matching stop row. A session usually ends by its Redis TTL
   * lapsing, with no request to hang a stop record on, so a stop row would be
   * present sometimes and missing others. A log with silent gaps is worse than
   * one that plainly records starts, so duration is deliberately not claimed.
   */
  private async recordWatchStart(ctx: RequestContext, childUserIds: string[]): Promise<void> {
    await this.auditLog.logMany(
      ctx,
      childUserIds.map((childUserId) => ({
        action: 'live_view.start',
        entityType: 'user',
        entityId: childUserId,
        // targetUserId is not redundant with entityId: AuditLogRepo.listForUser
        // matches on relatedIds->>'targetUserId', so without it the child would
        // never see the record of their own screen being watched.
        relatedIds: {targetUserId: childUserId},
      })),
    );
  }

  /**
   * The guardian's poll. Renews the session as a side effect, which is what
   * keeps the children capturing — there is no separate keepalive route.
   */
  async getLatestFrames(ctx: RequestContext, input: GetLiveViewFramesRequest): Promise<GetLiveViewFramesResponse> {
    const sessionId = String(input?.sessionId || '').trim();
    if (!sessionId) {
      throw new Error('Session is required');
    }

    const session = await this.readSession(sessionId);
    if (!session) {
      throw new Error('Live View session has ended');
    }
    if (session.guardianUserId !== String(ctx.currentUserId || '')) {
      throw new Error('Live View session belongs to another guardian');
    }

    // Re-verified on every poll, not just at start: a guardian who loses
    // permission, or a child who is switched off mid-session, must stop being
    // watched within one poll rather than lasting out the session.
    //
    // A child that now fails is dropped from the session rather than throwing,
    // because one revoked child must not end watching for their siblings. Their
    // watched key is cleared so their device stops on its next push. Only when
    // nothing is left to watch does the session itself end.
    const stillAllowed: string[] = [];
    const revoked: string[] = [];

    for (const childUserId of session.watchedUserIds) {
      try {
        await this.verifyLiveViewAccess(ctx, childUserId);
        stillAllowed.push(childUserId);
      } catch {
        revoked.push(childUserId);
      }
    }

    if (revoked.length) {
      await Promise.all(revoked.map((childUserId) => this.redis.del(this.watchedKey(childUserId))));
    }

    if (!stillAllowed.length) {
      await this.redis.del(this.sessionKey(sessionId));
      throw new Error('Live View is no longer available for these children');
    }

    const cadenceMs = input?.cadenceMs ? this.clampCadence(input.cadenceMs) : session.cadenceMs;
    const renewed = {...session, watchedUserIds: stillAllowed, cadenceMs};

    const devices = await this.buildDeviceViews(stillAllowed, {
      clientId: input?.clientId,
      includeFrames: true,
    });

    // Nudge before persisting, so the updated throttle timestamps are part of
    // the same write. Persisting first and stamping after would drop them every
    // time and re-nudge on every poll. Renewing later is safe: the watched key
    // written by the previous poll (30s TTL) outlives the 3s poll interval.
    renewed.lastNudgeAtMs = await this.nudgeSilentChildren(stillAllowed, devices, renewed);

    await this.persistSession(renewed);

    return {
      session: this.toSessionView(renewed, LiveViewService.SESSION_TTL_SECONDS),
      devices,
    };
  }

  /**
   * Re-tells a child to start capturing when it has gone quiet.
   *
   * `liveViewStart` is broadcast once at session start, so anything that stops a
   * child's loop would otherwise be permanent — the guardian would sit looking
   * at a frozen last frame with no error. Three ordinary things cause it:
   *
   *  - two guardians watch the same child and one stops, deleting the shared
   *    watched key, which tells the *other* guardian's child to stop too;
   *  - the MV3 service worker is evicted and the interval dies with it;
   *  - the child's device slept.
   *
   * A frame TTL (20s) is comfortably longer than the slowest cadence, so "no
   * frame at all" is a reliable signal that nothing is capturing. The nudge is
   * throttled per child so a genuinely offline device is not spammed.
   */
  private async nudgeSilentChildren(
    childUserIds: string[],
    devices: LiveViewDeviceView[],
    session: {
      cadenceMs: number;
      clientId?: string;
      clientUserId?: string;
      lastNudgeAtMs?: Record<string, number>;
    },
  ): Promise<Record<string, number>> {
    const now = Date.now();
    const lastNudgeAtMs: Record<string, number> = {...(session.lastNudgeAtMs || {})};

    // Nothing is capturing when no device was picked, so silence is the correct state and
    // there is nobody to nudge.
    if (!session.clientId || !session.clientUserId) return lastNudgeAtMs;

    await Promise.all(
      childUserIds.map(async (childUserId) => {
        if (childUserId !== session.clientUserId) return;

        const childDevices = devices.filter(
          (device) => device.userId === childUserId && device.clientId === session.clientId,
        );

        // Nothing online to nudge, or already sending frames.
        const hasOnlineDevice = childDevices.some(
          (device) => device.status === 'online-unverified' || device.status === 'verified-live',
        );
        if (!hasOnlineDevice) return;
        if (childDevices.some((device) => device.frame)) return;

        if (now - (lastNudgeAtMs[childUserId] || 0) < LiveViewService.NUDGE_INTERVAL_MS) return;

        lastNudgeAtMs[childUserId] = now;
        await this.sseManager
          .broadcastToClient(`${session.clientUserId}-${session.clientId}`, 'liveViewStart', {
            cadenceMs: session.cadenceMs,
            startedAt: new Date(now).toISOString(),
          })
          .catch(() => undefined);
      }),
    );

    return lastNudgeAtMs;
  }

  async stopWatchSession(ctx: RequestContext, input: StopLiveViewRequest): Promise<StopLiveViewResponse> {
    const sessionId = String(input?.sessionId || '').trim();
    if (!sessionId) {
      throw new Error('Session is required');
    }

    const session = await this.readSession(sessionId);
    if (!session) {
      return {stopped: true};
    }
    if (session.guardianUserId !== String(ctx.currentUserId || '')) {
      throw new Error('Live View session belongs to another guardian');
    }

    await Promise.all([
      this.redis.del(this.sessionKey(sessionId)),
      ...session.watchedUserIds.map((childUserId) => this.redis.del(this.watchedKey(childUserId))),
    ]);

    // Best-effort courtesy so the child's indicator clears promptly. Capture
    // would stop on the next push anyway.
    await Promise.all(
      session.watchedUserIds.map((childUserId) =>
        this.sseManager.broadcastToUser(childUserId, 'liveViewStop', {}).catch(() => undefined),
      ),
    );

    return {stopped: true};
  }

  /**
   * Called by the child. `ctx.currentUserId` is the child's own id and is the
   * only identity trusted here — a body-supplied user id would let one child
   * write frames into another child's tile.
   */
  async pushFrame(ctx: RequestContext, input: PushLiveViewFrameRequest): Promise<PushLiveViewFrameResponse> {
    const childUserId = String(ctx.currentUserId || '').trim();
    if (!childUserId) {
      throw new Error('Not signed in');
    }

    const watchedRaw = await this.redis.get(this.watchedKey(childUserId));
    if (!watchedRaw) {
      // Not being watched. The frame is dropped rather than stored, and the
      // child is told to stop.
      return {keepGoing: false, cadenceMs: LiveViewService.DEFAULT_CADENCE_MS};
    }

    let cadenceMs = LiveViewService.DEFAULT_CADENCE_MS;
    let watchedClientId: string | undefined;
    try {
      const watched = JSON.parse(watchedRaw);
      cadenceMs = this.clampCadence(watched?.cadenceMs);
      watchedClientId = watched?.clientId ? String(watched.clientId) : undefined;
    } catch {
      /* fall back to the default cadence */
    }

    const clientId = String(ctx.getClientId() || '').trim();
    if (!clientId) {
      throw new Error('Client is required');
    }

    // A guardian watches one screen at a time. Any other device of this child that is still
    // looping — one that missed a stop, or was watched a moment ago — is told to stop here
    // rather than having its frame stored. Second line of defence: the start event now goes to
    // the chosen device alone, so no other device should be capturing in the first place.
    if (watchedClientId && watchedClientId !== clientId) {
      return {keepGoing: false, cadenceMs: LiveViewService.DEFAULT_CADENCE_MS};
    }

    const encryptedFrame = String(input?.encryptedFrame || '');
    if (!encryptedFrame) {
      throw new Error('Frame is required');
    }
    if (Buffer.byteLength(encryptedFrame, 'utf8') > LiveViewService.MAX_ENCRYPTED_FRAME_BYTES) {
      throw new Error('Frame is too large');
    }

    const kind: LiveViewFrameKind =
      input?.kind === 'no-visible-page' || input?.kind === 'permission-needed' ? input.kind : 'screen';

    const frame: LiveViewFrameView = {
      clientId,
      frameId: String(input?.frameId || '').trim() || 'lvf_' + uuidv4(),
      capturedAt: new Date().toISOString(),
      kind,
      width: Number(input?.width) || 0,
      height: Number(input?.height) || 0,
      encryptedFrame,
    };

    await this.redis.setex(
      this.frameKey(childUserId, clientId),
      LiveViewService.FRAME_TTL_SECONDS,
      JSON.stringify(frame),
    );

    return {keepGoing: true, cadenceMs};
  }
}

export default LiveViewService;
