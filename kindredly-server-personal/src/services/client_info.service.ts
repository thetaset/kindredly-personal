import {RequestContext} from '@/base/request_context';
import {getRedisClient} from '@/base/redis_client';
import {ClientInfoRepo} from '@/db/client_info.repo';
import SSEManager from '@/services/sse.manager';
import User from 'tset-sharedlib/schemas/public/User';
import type {
  ManagedClientSessionView,
  ManagedRemoteActionCommandView,
  ManagedSessionStatus,
} from 'tset-sharedlib/shared.types';
import {sanitizeString} from '@/utils/text_utils';
import {Request} from 'express';
import {v4 as uuidv4} from 'uuid';

class ClientInfoService {
  private static readonly MANAGED_SESSION_STALE_MS = 10 * 60 * 1000;
  private static readonly REMOTE_ACTION_STATUS_TTL_SECONDS = 5 * 60;

  private normalizeManagedConnectionClientId(clientId: string | null | undefined, targetUserId: string): string {
    const value = String(clientId || '').trim();
    const prefix = `${targetUserId}-`;
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
  }

  constructor(
    private clientInfoRepo = new ClientInfoRepo(),
    private sseManager = SSEManager.getInstance(),
    private redis = getRedisClient(),
  ) {}

  private isPaidAccountType(accountType: string | null | undefined): boolean {
    return accountType === 'plus' || accountType === 'superplus';
  }

  private getRemoteActionSettings(targetUser: User | null | undefined) {
    return (
      (targetUser?.options as Record<string, any> | null | undefined)?.accessControlSettings?.remoteActionSettings ||
      null
    );
  }

  private async verifyManagedRemoteActionAccess(
    ctx: RequestContext,
    targetUserId: string,
    options: {requireOpenUrl?: boolean; requireScreenshot?: boolean} = {},
  ) {
    await ctx.verifyAdminOverUser(targetUserId);

    const [targetUser, account] = await Promise.all([ctx.getUserById(targetUserId), ctx.getAccount()]);

    if (!targetUser || targetUser.deleted) {
      throw new Error('Target user not found');
    }
    if (targetUser.type !== 'restricted') {
      throw new Error('Remote actions are only available for restricted users');
    }
    if (!this.isPaidAccountType(account?.accountType || null)) {
      throw new Error('Remote child actions require Plus');
    }

    const featureEnabled = account?.sysOptions?.extendedFeatures?.['extendedFeatures.remoteChildActions'] === true;
    if (!featureEnabled) {
      throw new Error('Remote child actions are disabled for this account');
    }

    const remoteActionSettings = this.getRemoteActionSettings(targetUser);
    if (!remoteActionSettings?.enabled) {
      throw new Error('Remote actions are disabled for this child');
    }

    if (options.requireOpenUrl && remoteActionSettings?.allowOpenUrl !== true) {
      throw new Error('Open URL is disabled for this child');
    }

    if (options.requireScreenshot && remoteActionSettings?.allowScreenshot !== true) {
      throw new Error('Screenshots are disabled for this child');
    }

    return {
      targetUser,
      remoteActionSettings,
      account,
    };
  }

  private remoteActionStatusKey(actionId: string): string {
    return `remote_action_status:${actionId}`;
  }

  private async saveRemoteActionStatus(action: ManagedRemoteActionCommandView): Promise<void> {
    await this.redis.setex(
      this.remoteActionStatusKey(action.actionId),
      ClientInfoService.REMOTE_ACTION_STATUS_TTL_SECONDS,
      JSON.stringify(action),
    );
  }

  private async getRemoteActionStatus(actionId: string): Promise<ManagedRemoteActionCommandView | null> {
    const raw = await this.redis.get(this.remoteActionStatusKey(actionId));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as ManagedRemoteActionCommandView;
    } catch {
      return null;
    }
  }

  private async getManagedTargetMaps(targetUserId: string) {
    const [clients, liveConnections] = await Promise.all([
      this.clientInfoRepo.listByUserId(targetUserId),
      this.sseManager.getConnectionDetailsForUser(targetUserId),
    ]);

    const clientById = new Map(clients.map((client) => [String(client.clientId || ''), client]));
    const liveConnectionByClientId = new Map(
      liveConnections.map((connection) => [
        this.normalizeManagedConnectionClientId(connection.clientId, targetUserId),
        connection,
      ]),
    );

    return {
      clients,
      clientById,
      liveConnections,
      liveConnectionByClientId,
    };
  }

  private createRemoteActionView(input: {
    actionId: string;
    targetUserId: string;
    requestedByUserId: string;
    clientId: string;
    kind: 'openUrl' | 'forceSyncSettings' | 'syncActivity' | 'getScreenshot';
    status?: 'sent' | 'completed' | 'failed' | 'expired';
    createdAt?: string;
    updatedAt?: string;
    completedAt?: string | null;
    errorMessage?: string | null;
    screenshotDataUrl?: string | null;
  }): ManagedRemoteActionCommandView {
    const nowIso = new Date().toISOString();
    return {
      actionId: input.actionId,
      targetUserId: input.targetUserId,
      requestedByUserId: input.requestedByUserId,
      clientId: input.clientId,
      kind: input.kind,
      status: input.status || 'sent',
      createdAt: input.createdAt || nowIso,
      updatedAt: input.updatedAt || nowIso,
      completedAt: input.completedAt || null,
      errorMessage: input.errorMessage || null,
      screenshotDataUrl: input.screenshotDataUrl || null,
    };
  }

  private async resolveLiveRemoteCapableClientOrThrow(targetUserId: string, clientId: string) {
    const resolvedClientId = String(clientId || '').trim();
    if (!resolvedClientId) {
      throw new Error('Client is required');
    }

    const {clientById, liveConnectionByClientId} = await this.getManagedTargetMaps(targetUserId);
    const client = clientById.get(resolvedClientId);

    if (!client) {
      throw new Error('Unknown client');
    }
    if (!this.supportsRemoteCommands(client.appType || null)) {
      throw new Error('Target client does not support remote actions');
    }

    const liveConnection = liveConnectionByClientId.get(resolvedClientId);
    if (!liveConnection) {
      throw new Error('Target client is offline');
    }

    return {
      client,
      liveConnection,
      clientId: resolvedClientId,
    };
  }

  private supportsRemoteCommands(appType: string | null | undefined): boolean {
    return appType === 'extension' || appType === 'ios' || appType === 'android';
  }

  private resolveManagedSessionStatus(input: {
    connectedAt?: Date | string | null;
    lastSeen?: Date | string | null;
    lastHeartbeatAt?: string | null;
    lastVerifiedAt?: string | null;
  }): ManagedSessionStatus {
    if (input.lastVerifiedAt) return 'verified-live';
    if (input.connectedAt) return 'online-unverified';

    const lastSeenMs = input.lastSeen ? new Date(input.lastSeen).getTime() : 0;
    if (lastSeenMs > 0 && Date.now() - lastSeenMs <= ClientInfoService.MANAGED_SESSION_STALE_MS) {
      return 'stale';
    }

    return 'offline';
  }

  async _loginUpdate(user: User, clientInfoData: any, req: Request) {
    if (!user) {
      throw new Error('Invalid user');
    }

    const ipAddress = req?.ip || 'UNKNOWNIP';
    const clientId = clientInfoData?.clientId || 'CLID_' + ipAddress;

    const _id = this.clientInfoRepo.createId(user._id, clientId);

    const currentClientInfo = await this.clientInfoRepo.findById(_id);
    const currentTime = new Date();

    const clientInfoUpdates = {
      ...clientInfoData,
      lastIp: ipAddress,
      lastSeen: currentTime,
      lastLogin: currentTime,
      updatedAt: currentTime,
      createdAt: currentTime,
      clientId: clientId,
      userId: user._id,
      _id,
    };

    if (currentClientInfo) {
      await this.clientInfoRepo.updateWithId(_id, {
        ...currentClientInfo,
        ...clientInfoUpdates,
      });
    } else {
      await this.clientInfoRepo.create({
        ...clientInfoUpdates,
      });
    }

    return {clientId};
  }

  // ROUTE-METHOD
  async updateDeviceToken(ctx: RequestContext, deviceToken: string) {
    const currentUserId = ctx.currentUserId;
    const clientId = sanitizeString(ctx.clientId);

    if (!currentUserId) {
      throw new Error('Invalid user');
    } else if (!clientId) {
      throw new Error('Invalid client id');
    } else if (!deviceToken) {
      throw new Error('Invalid device token');
    }

    const _id = this.clientInfoRepo.createId(currentUserId, clientId);
    await this.clientInfoRepo.updateWithId(_id, {
      deviceToken: deviceToken,
      updatedAt: new Date(),
    });
  }

  // ROUTE-METHOD
  async listClients(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const lst = await this.clientInfoRepo.listByUserId(targetUserId);
    return lst;
  }

  async listManagedSessions(ctx: RequestContext, targetUserId: string): Promise<ManagedClientSessionView[]> {
    await ctx.verifySelfOrAdmin(targetUserId);

    const [clients, liveConnections] = await Promise.all([
      this.clientInfoRepo.listByUserId(targetUserId),
      this.sseManager.getConnectionDetailsForUser(targetUserId),
    ]);

    const liveByClientId = new Map(
      liveConnections.map((entry) => [this.normalizeManagedConnectionClientId(entry.clientId, targetUserId), entry]),
    );

    return clients
      .filter((client) => this.supportsRemoteCommands(client.appType || null))
      .map((client) => {
        const liveConnection = liveByClientId.get(String(client.clientId || ''));
        const lastSeen = client.lastSeen ? new Date(client.lastSeen).toISOString() : null;
        const lastLogin = client.lastLogin ? new Date(client.lastLogin).toISOString() : null;
        const lastHeartbeatAt = liveConnection?.lastHeartbeat || null;
        const lastVerifiedAt = null;
        const status = this.resolveManagedSessionStatus({
          connectedAt: liveConnection?.connectedAt || null,
          lastSeen,
          lastHeartbeatAt,
          lastVerifiedAt,
        });

        return {
          clientId: client.clientId || '',
          clientVersion: client.clientVersion || '',
          appId: client.appId || '',
          appVersion: client.appVersion || '',
          appType: client.appType || '',
          deviceName: client.deviceName || null,
          deviceType: client.deviceType || null,
          lastSeen,
          lastLogin,
          lastHeartbeatAt,
          lastVerifiedAt,
          status,
          supportsRemoteCommands: true,
          remoteCommandReady: status === 'online-unverified' || status === 'verified-live',
        } satisfies ManagedClientSessionView;
      });
  }

  async sendEncryptedDebugToast(
    ctx: RequestContext,
    input: {
      userId?: string;
      clientIds?: string[];
      encryptedPayload: string;
    },
  ): Promise<{
    targetUserId: string;
    deliveredClientIds: string[];
    skippedTargets: Array<{
      clientId: string;
      reason: 'offline' | 'unsupported' | 'unknown-client';
    }>;
  }> {
    const targetUserId = String(input?.userId || ctx.currentUserId || '').trim();
    if (!targetUserId) {
      throw new Error('Target user is required');
    }

    const encryptedPayload = String(input?.encryptedPayload || '').trim();
    if (!encryptedPayload) {
      throw new Error('Encrypted payload is required');
    }

    await ctx.verifySelfOrAdmin(targetUserId);

    const [clients, liveConnections] = await Promise.all([
      this.clientInfoRepo.listByUserId(targetUserId),
      this.sseManager.getConnectionDetailsForUser(targetUserId),
    ]);

    const clientById = new Map(clients.map((client) => [String(client.clientId || ''), client]));
    const liveConnectionByClientId = new Map(
      liveConnections.map((connection) => [
        this.normalizeManagedConnectionClientId(connection.clientId, targetUserId),
        connection,
      ]),
    );
    const requestedClientIds = Array.from(
      new Set(
        (Array.isArray(input?.clientIds) ? input.clientIds : [])
          .map((clientId) => String(clientId || '').trim())
          .filter(Boolean),
      ),
    );

    const targetClientIds =
      requestedClientIds.length > 0
        ? requestedClientIds
        : liveConnections.map((connection) => String(connection.clientId || '').trim()).filter(Boolean);

    const deliveredClientIds: string[] = [];
    const skippedTargets: Array<{
      clientId: string;
      reason: 'offline' | 'unsupported' | 'unknown-client';
    }> = [];

    for (const clientId of targetClientIds) {
      const client = clientById.get(clientId);

      if (!client) {
        skippedTargets.push({clientId, reason: 'unknown-client'});
        continue;
      }

      if (!this.supportsRemoteCommands(client.appType || null)) {
        skippedTargets.push({clientId, reason: 'unsupported'});
        continue;
      }

      const liveConnection = liveConnectionByClientId.get(clientId);
      if (!liveConnection) {
        skippedTargets.push({clientId, reason: 'offline'});
        continue;
      }

      await this.sseManager.broadcastToClient(String(liveConnection.clientId || ''), 'remoteDebugToast', {
        encryptedPayload,
        sentAt: new Date().toISOString(),
      });
      deliveredClientIds.push(clientId);
    }

    return {
      targetUserId,
      deliveredClientIds,
      skippedTargets,
    };
  }

  async queueManagedRemoteAction(
    ctx: RequestContext,
    input: {
      userId?: string;
      clientId: string;
      kind: 'openUrl' | 'forceSyncSettings' | 'syncActivity' | 'getScreenshot';
      encryptedPayload: string;
    },
  ): Promise<{
    action: ManagedRemoteActionCommandView;
    deliveredClientIds: string[];
    skippedTargets: Array<{
      clientId: string;
      reason: 'offline' | 'unsupported' | 'unknown-client';
    }>;
  }> {
    const targetUserId = String(input?.userId || '').trim();
    if (!targetUserId) {
      throw new Error('Target user is required');
    }

    const encryptedPayload = String(input?.encryptedPayload || '').trim();
    if (!encryptedPayload) {
      throw new Error('Encrypted payload is required');
    }

    if (
      input?.kind !== 'openUrl' &&
      input?.kind !== 'forceSyncSettings' &&
      input?.kind !== 'syncActivity' &&
      input?.kind !== 'getScreenshot'
    ) {
      throw new Error('Unsupported remote action');
    }

    await this.verifyManagedRemoteActionAccess(ctx, targetUserId, {
      requireOpenUrl: input.kind === 'openUrl',
      requireScreenshot: input.kind === 'getScreenshot',
    });
    const {liveConnection, clientId} = await this.resolveLiveRemoteCapableClientOrThrow(targetUserId, input.clientId);

    const action = this.createRemoteActionView({
      actionId: 'rac_' + uuidv4(),
      targetUserId,
      requestedByUserId: ctx.currentUserId,
      clientId,
      kind: input.kind,
    });

    await this.saveRemoteActionStatus(action);

    await this.sseManager.broadcastToClient(String(liveConnection.clientId || ''), 'remoteActionExecute', {
      actionId: action.actionId,
      kind: action.kind,
      encryptedPayload,
      sentAt: action.createdAt,
    });

    return {
      action,
      deliveredClientIds: [clientId],
      skippedTargets: [],
    };
  }

  async getManagedRemoteActionStatus(
    ctx: RequestContext,
    input: {actionId: string},
  ): Promise<{action: ManagedRemoteActionCommandView | null}> {
    const actionId = String(input?.actionId || '').trim();
    if (!actionId) {
      throw new Error('Action is required');
    }

    const action = await this.getRemoteActionStatus(actionId);
    if (!action) {
      return {action: null};
    }

    if (ctx.currentUserId !== action.requestedByUserId) {
      await ctx.verifyAdminOverUser(action.targetUserId);
    }

    return {
      action,
    };
  }

  async ackManagedRemoteAction(
    ctx: RequestContext,
    input: {
      actionId: string;
      status: 'completed' | 'failed';
      errorMessage?: string;
      screenshotDataUrl?: string;
    },
  ): Promise<{action: ManagedRemoteActionCommandView}> {
    const currentUser = await ctx.getCurrentUser();
    if (!currentUser || currentUser.type === 'admin') {
      throw new Error('Remote action ack is only available for restricted users');
    }

    const actionId = String(input?.actionId || '').trim();
    if (!actionId) {
      throw new Error('Action is required');
    }
    if (input?.status !== 'completed' && input?.status !== 'failed') {
      throw new Error('Invalid remote action status');
    }

    const action = await this.getRemoteActionStatus(actionId);
    if (!action || action.targetUserId !== currentUser._id) {
      throw new Error('Remote action not found');
    }

    const requestClientId = sanitizeString(ctx.clientId);
    if (requestClientId && action.clientId !== requestClientId) {
      throw new Error('Client auth error');
    }

    const nowIso = new Date().toISOString();
    const updatedAction = this.createRemoteActionView({
      ...action,
      actionId: action.actionId,
      targetUserId: action.targetUserId,
      requestedByUserId: action.requestedByUserId,
      clientId: action.clientId,
      kind: action.kind,
      status: input.status,
      createdAt: action.createdAt,
      updatedAt: nowIso,
      completedAt: nowIso,
      errorMessage: input.status === 'failed' ? String(input?.errorMessage || 'Remote action failed') : null,
      screenshotDataUrl: input.status === 'completed' ? String(input?.screenshotDataUrl || '') || null : null,
    });

    await this.saveRemoteActionStatus(updatedAction);

    return {
      action: updatedAction,
    };
  }

  async listDeviceTokens(targetUserId: string) {
    const lst = await this.clientInfoRepo.listByUserId(targetUserId);
    const tokens = lst.map((v) => v.deviceToken).filter((v) => !!v);

    return [...new Set(tokens)];
  }

  async listDeviceTokensUsedSinceXDaysAgo(targetUserId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const lst = await this.clientInfoRepo.listByUserId(targetUserId);
    const tokens = lst
      .filter((v) => !!v?.deviceToken)
      .filter((v) => v.lastSeen > since)
      .map((v) => v.deviceToken);

    return [...new Set(tokens)];
  }

  async listDeviceTokensForUsers(targetUserIds: string[]) {
    const lst = await this.clientInfoRepo.findWhereIn('userId', targetUserIds);
    const tokens = lst.map((v) => v.deviceToken).filter((v) => !!v);

    return [...new Set(tokens)];
  }

  async listDeviceTokensForUsersUsedSinceXDaysAgo(targetUserIds: string[], days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const lst = await this.clientInfoRepo.findWhereIn('userId', targetUserIds);
    const tokens = lst
      .filter((v) => !!v?.deviceToken)
      .filter((v) => v.lastSeen > since)
      .map((v) => v.deviceToken);

    return [...new Set(tokens)];
  }
}

export default ClientInfoService;
