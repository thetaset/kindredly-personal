import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {randomBytes} from 'crypto';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import SSEManager from '@/services/sse.manager';
import {AccountRepo} from '@/db/account.repo';
import {getSharedPlanPolicy} from 'tset-sharedlib/plan-policy';
import DeviceFolderService, {
  DEVICE_FOLDER_FRAME_EVENT,
  PRESENCE_REFRESH_MS,
  hostStreamClientId,
} from '@/services/device_folder.service';
import DeviceFolderRelayService from '@/services/device_folder_relay.service';

const EVENTS_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  // Disable proxy buffering (nginx/personal-server) so the stream flushes.
  'X-Accel-Buffering': 'no',
} as const;

const accounts = new AccountRepo();

/** Device folders are Plus only while Experimental (`readiness.deviceFolders`). */
export async function isDeviceFoldersAccount(accountId: string): Promise<boolean> {
  const account = await accounts.findById(accountId);
  return getSharedPlanPolicy(account?.accountType).readiness.deviceFolders === true;
}

/**
 * Device folders (HAT-1321, docs/proposals/device-folders.md).
 *
 * Two callers. The host Companion, with its device token: share, stop, list what it serves, hold
 * the stream of frames, and answer one. A member's app, with their own sign-in: list what they may
 * open, and send one sealed frame. Every route that carries a frame carries it sealed; nothing here
 * reads or logs one.
 */
class DeviceFolderRoute implements Routes {
  public router = Router();
  private folders = new DeviceFolderService(isDeviceFoldersAccount);
  private relay = new DeviceFolderRelayService();
  private sse = SSEManager.getInstance();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.folders.start().catch(() => console.error('[deviceFolders] could not subscribe'));
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // ---- The host Companion (device token) ----
    this.router.post(
      '/companion/deviceFolders/share',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/deviceFolders/share'>, res) => {
        const ctx = RequestContext.instance(req);
        const body = req.body || ({} as any);
        const result = await this.folders.create({
          tokenUserId: ctx.getSessionUserId(),
          tokenDeviceId: ctx.getTokenDeviceId(),
          hostName: ctx.deviceName,
          approval: typeof body.approval === 'string' ? body.approval : '',
          name: body.name,
          wholeFamilyRole: body.wholeFamilyRole,
          uploadsAllowed: body.uploadsAllowed,
          members: body.members,
        });
        res.json({success: true, results: 'reason' in result ? {refused: result.reason} : {folderId: result.folderId}});
      }),
    );

    this.router.post(
      '/companion/deviceFolders/family',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/deviceFolders/family'>, res) => {
        const ctx = RequestContext.instance(req);
        const body = req.body || ({} as any);
        const result = await this.folders.family({
          tokenUserId: ctx.getSessionUserId(),
          tokenDeviceId: ctx.getTokenDeviceId(),
          approval: typeof body.approval === 'string' ? body.approval : '',
          folderId: body.folderId,
        });
        res.json({
          success: true,
          results: 'reason' in result ? {refused: result.reason} : {people: result.people, current: result.current},
        });
      }),
    );

    this.router.post(
      '/companion/deviceFolders/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/deviceFolders/update'>, res) => {
        const ctx = RequestContext.instance(req);
        const body = req.body || ({} as any);
        const result = await this.folders.update({
          tokenUserId: ctx.getSessionUserId(),
          tokenDeviceId: ctx.getTokenDeviceId(),
          approval: typeof body.approval === 'string' ? body.approval : '',
          folderId: body.folderId,
          wholeFamilyRole: body.wholeFamilyRole,
          uploadsAllowed: body.uploadsAllowed,
          members: body.members,
        });
        res.json({success: true, results: 'reason' in result ? {refused: result.reason} : {newKey: result.newKey}});
      }),
    );

    this.router.post(
      '/companion/deviceFolders/stop',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/deviceFolders/stop'>, res) => {
        const ctx = RequestContext.instance(req);
        const stopped = await this.folders.stop(ctx.getTokenDeviceId(), req.body?.folderId);
        res.json({success: true, results: {stopped}});
      }),
    );

    this.router.post(
      '/companion/deviceFolders/mine',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/deviceFolders/mine'>, res) => {
        const ctx = RequestContext.instance(req);
        const folders = await this.folders.hostFolders(ctx.getSessionUserId(), ctx.getTokenDeviceId());
        res.json({success: true, results: {folders}});
      }),
    );

    this.router.post(
      '/companion/deviceFolders/keys',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/deviceFolders/keys'>, res) => {
        const ctx = RequestContext.instance(req);
        const result = await this.folders.deliverKeys(ctx.getSessionUserId(), ctx.getTokenDeviceId(), req.body);
        res.json({success: true, results: 'reason' in result ? {refused: result.reason} : {stored: result.stored}});
      }),
    );

    this.router.post(
      '/companion/deviceFolders/answer',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/companion/deviceFolders/answer'>, res) => {
        const ctx = RequestContext.instance(req);
        const accepted = await this.folders.acceptAnswer(ctx.getTokenDeviceId(), req.body);
        res.json({success: true, results: {accepted}});
      }),
    );

    /**
     * The host's stream: only `deviceFolderFrame`, each a sealed frame the server cannot read. While
     * it is open the host counts as online; it says so again every 30 s, and the mark lapses 90 s
     * after the stream is gone even if this process dies without cleaning up.
     */
    this.router.get(
      '/companion/deviceFolders/events',
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);
        const userId = ctx.getSessionUserId();
        const deviceId = ctx.getTokenDeviceId();
        if (!userId || !deviceId) {
          return res.json({success: false, message: 'Only a linked device can hold this stream.', status: 403});
        }
        const clientId = hostStreamClientId(userId, deviceId);
        const streamId = randomBytes(8).toString('hex');
        res.writeHead(200, EVENTS_HEADERS);
        res.flushHeaders();
        res.write('retry: 15000\n\n');

        let refresh: NodeJS.Timeout | undefined;
        const stop = () => {
          clearInterval(refresh);
          this.folders.markHostOffline(deviceId, streamId).catch(() => {});
        };
        try {
          const alive = await this.sse.registerConnection(clientId, userId, req, res, {
            events: [DEVICE_FOLDER_FRAME_EVENT],
          });
          if (!alive) return;
          await this.folders.markHostOnline(deviceId, userId, streamId);
          refresh = setInterval(() => {
            if (!this.sse.hasLocalConnection(clientId)) return stop();
            this.folders.markHostOnline(deviceId, userId, streamId).catch(() => {});
          }, PRESENCE_REFRESH_MS);
          req.on('close', stop);
          res.write(': connected\n\n');
          res.flush?.();
        } catch {
          stop();
          await this.sse.removeConnection(clientId, res).catch(() => {});
          try {
            res.end();
          } catch {
            // Already closed.
          }
        }
      }),
    );

    // ---- A member's app (their own sign-in) ----
    this.router.post(
      '/deviceFolder/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceFolder/list'>, res) => {
        const ctx = RequestContext.instance(req);
        const user = await ctx.getCurrentUser();
        const folders = user?.accountId ? await this.folders.listForUser(user._id, String(user.accountId)) : [];
        res.json({success: true, results: {folders}});
      }),
    );

    this.router.post(
      '/deviceFolder/iceServers',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceFolder/iceServers'>, res) => {
        const ctx = RequestContext.instance(req);
        const user = await ctx.getCurrentUser();
        if (!user?.accountId) return res.json({success: true, results: {refused: 'not_allowed'}});
        const allowed = await this.folders.mayOpen(user._id, String(user.accountId), req.body?.folderId);
        if ('reason' in allowed) return res.json({success: true, results: {refused: allowed.reason}});
        res.json({success: true, results: await this.relay.iceServersFor(user._id)});
      }),
    );

    this.router.post(
      '/deviceFolder/frame',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceFolder/frame'>, res) => {
        const ctx = RequestContext.instance(req);
        const user = await ctx.getCurrentUser();
        if (!user?.accountId) return res.json({success: true, results: {refused: 'not_allowed'}});
        const result = await this.folders.send(user._id, String(user.accountId), req.body);
        res.json({success: true, results: 'reason' in result ? {refused: result.reason} : {frame: result.frame}});
      }),
    );
  }
}

export default DeviceFolderRoute;
