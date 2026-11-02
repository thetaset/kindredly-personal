/**
 * A connected AI app asking an adult's permission (HAT-690; docs/guides/mcp-integration.md).
 *
 * When an AI app asks for something Kinbot would ask the adult to confirm (reading a child's
 * activity, a bigger time change, a filtering mode, blocking), the device answering the call creates
 * a request here. What is being asked is encrypted on that device with the adult's own key, so this
 * server holds only that ciphertext, a hash of the call and a status, for ten minutes. Every device
 * of that adult is told (its stream, and a push to their phones that names nothing), shows the
 * request, and any of them can Agree or Deny.
 *
 * The call that asked takes the approval, once: while it is still waiting, or when the AI app calls
 * again with the same arguments (`take`). Only the adult the request was made for can answer it.
 *
 * Nothing about a request is logged.
 */
import {v4 as uuidv4} from 'uuid';
import {getKeyValueStore} from '@/base/runtime.factory';
import type {KeyValueStore} from '@/base/kv_store';
import {UserRepo} from '@/db/user.repo';
import {UserPrefKeys, UserPrefRepo} from '@/db/user_pref.repo';
import {container} from '@/inversify.config';
import SSEManager from '@/services/sse.manager';
import NotificationService from '@/services/notification.service';
import {NotificationMethod, NotificationType} from '@/typing/enum_strings';
import {UserType} from 'tset-sharedlib/shared.types';
import type {McpPermissionRequestView, McpPermissionStatus} from 'tset-sharedlib/api';

/** How long a request, and an approval nobody has taken yet, lasts. */
export const MCP_PERMISSION_TTL_SEC = 10 * 60;
/** A looping AI app cannot fill an adult's screen with requests. */
const MAX_PENDING_PER_USER = 10;
const BLOB_MAX_CHARS = 16 * 1024;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export const MCP_PERMISSION_REQUEST_EVENT = 'mcpPermissionRequest';
export const MCP_PERMISSION_DECIDED_EVENT = 'mcpPermissionDecided';

type Row = {
  _id: string;
  accountId: string;
  userId: string;
  blob: string;
  argsHash: string;
  status: Exclude<McpPermissionStatus, 'expired'>;
  createdAtMs: number;
};

const rowKey = (id: string) => `mcpPerm:row:${id}`;
const userKey = (userId: string) => `mcpPerm:user:${userId}`;
const approvedKey = (userId: string, argsHash: string) => `mcpPerm:approved:${userId}:${argsHash}`;

/** The seconds a request has left, at least one so a write never makes a key that never expires. */
function secondsLeft(row: Row, nowMs: number): number {
  return Math.max(1, Math.ceil((row.createdAtMs + MCP_PERMISSION_TTL_SEC * 1000 - nowMs) / 1000));
}

/** The push names nothing: what is asked is encrypted, and a lock screen is not the place for it. */
type PushSender = {
  canSend: (settings: Record<string, any>, method: string, type: string) => Promise<boolean>;
  sendPushNotificationToAllUserDevices: (userId: string, n: {title: string; body: string}, data: any) => Promise<any>;
};

export default class McpPermissionService {
  private static _instance: McpPermissionService | null = null;
  static get instance(): McpPermissionService {
    if (!this._instance) this._instance = new McpPermissionService();
    return this._instance;
  }

  constructor(
    private readonly kv: KeyValueStore = getKeyValueStore(),
    private readonly users = new UserRepo(),
    private readonly sse: Pick<SSEManager, 'broadcastToUser'> = SSEManager.getInstance(),
    private readonly push: () => PushSender = () => container.resolve(NotificationService),
    private readonly userPrefs = new UserPrefRepo(),
    private readonly now: () => number = Date.now,
  ) {}

  private async readRow(id: string): Promise<Row | null> {
    if (typeof id !== 'string' || !id.startsWith('mpr_') || id.length > 80) return null;
    const raw = await this.kv.get(rowKey(id));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Row;
    } catch {
      return null;
    }
  }

  private async writeRow(row: Row): Promise<void> {
    await this.kv.setex(rowKey(row._id), secondsLeft(row, this.now()), JSON.stringify(row));
  }

  /** This adult's requests still on the server; ids whose request expired are dropped from the set. */
  private async rows(userId: string): Promise<Row[]> {
    const ids = await this.kv.smembers(userKey(userId));
    if (ids.length === 0) return [];
    const raws = await this.kv.mget(ids.map(rowKey));
    const rows: Row[] = [];
    const gone: string[] = [];
    raws.forEach((raw, i) => {
      if (!raw) return gone.push(ids[i]);
      try {
        rows.push(JSON.parse(raw) as Row);
      } catch {
        gone.push(ids[i]);
      }
    });
    if (gone.length) await this.kv.srem(userKey(userId), ...gone);
    return rows;
  }

  /** The answering device asks, for its own signed-in adult. */
  async create(accountId: string, userId: string, blob: string, argsHash: string): Promise<{_id: string}> {
    const user: any = await this.users.findById(userId);
    if (!user || user.deleted || user.accountId !== accountId || user.type !== UserType.admin) {
      throw new Error('Only an adult in the family can be asked.');
    }
    if (typeof blob !== 'string' || !blob || blob.length > BLOB_MAX_CHARS) throw new Error('Not a request.');
    if (typeof argsHash !== 'string' || !HASH_PATTERN.test(argsHash)) throw new Error('Not a request.');
    const pending = (await this.rows(userId)).filter((r) => r.status === 'pending');
    if (pending.length >= MAX_PENDING_PER_USER) {
      throw new Error('Too many requests are waiting. Answer them in Kindredly first.');
    }
    const row: Row = {
      _id: `mpr_${uuidv4()}`,
      accountId,
      userId,
      blob,
      argsHash,
      status: 'pending',
      createdAtMs: this.now(),
    };
    await this.writeRow(row);
    await this.kv.sadd(userKey(userId), row._id);
    await this.kv.expire(userKey(userId), MCP_PERMISSION_TTL_SEC);
    await this.sse.broadcastToUser(userId, MCP_PERMISSION_REQUEST_EVENT, {requestId: row._id});
    void this.sendPush(userId);
    return {_id: row._id};
  }

  private async sendPush(userId: string): Promise<void> {
    try {
      const sender = this.push();
      const prefs = await this.userPrefs.getUserPref(userId, UserPrefKeys.notificationSettings);
      if (!(await sender.canSend(prefs, NotificationMethod.push, NotificationType.AI_APP_PERMISSION))) return;
      await sender.sendPushNotificationToAllUserDevices(
        userId,
        {title: 'Kindredly', body: 'An AI app is asking for your permission.'},
        {type: 'NAVIGATE_PATH', path: '/family/accessrequests', kind: NotificationType.AI_APP_PERMISSION},
      );
    } catch {
      // A push that could not go out still leaves the request on every open Kindredly.
    }
  }

  /** What waits for this adult, oldest first. Each device opens `blob` with the adult's key. */
  async list(userId: string): Promise<McpPermissionRequestView[]> {
    return (await this.rows(userId))
      .filter((r) => r.status === 'pending')
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .map((r) => ({_id: r._id, blob: r.blob, createdAt: new Date(r.createdAtMs).toISOString()}));
  }

  /** Agree or Deny, from any of the adult's devices. False when it was answered already or expired. */
  async decide(userId: string, requestId: string, approved: boolean): Promise<boolean> {
    const row = await this.readRow(requestId);
    if (!row || row.userId !== userId || row.status !== 'pending') return false;
    row.status = approved === true ? 'approved' : 'denied';
    await this.writeRow(row);
    if (row.status === 'approved') {
      await this.kv.setex(approvedKey(userId, row.argsHash), secondsLeft(row, this.now()), row._id);
    }
    await this.sse.broadcastToUser(userId, MCP_PERMISSION_DECIDED_EVENT, {
      requestId: row._id,
      approved: row.status === 'approved',
    });
    return true;
  }

  /** The waiting call asks how it went. Someone else's request reads as expired. */
  async status(userId: string, requestId: string): Promise<McpPermissionStatus> {
    const row = await this.readRow(requestId);
    return row && row.userId === userId ? row.status : 'expired';
  }

  /**
   * The asking call takes an approval for exactly this call, once. Deleting the key is what makes it
   * once: of two calls racing for it, only the one whose delete removed it goes ahead.
   */
  async take(userId: string, argsHash: string): Promise<boolean> {
    if (typeof argsHash !== 'string' || !HASH_PATTERN.test(argsHash)) return false;
    const key = approvedKey(userId, argsHash);
    const id = await this.kv.get(key);
    if (!id || (await this.kv.del(key)) !== 1) return false;
    const row = await this.readRow(id);
    if (row && row.userId === userId) {
      row.status = 'used';
      await this.writeRow(row);
    }
    return true;
  }
}
