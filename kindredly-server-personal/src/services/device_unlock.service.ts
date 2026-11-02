/**
 * Opening your data on a new device by approving it from one already signed in (UNL-14,
 * docs/proposals/passphrase-and-device-approval.md).
 *
 * The new device, signed in but with its data locked, makes a one-time key pair and asks here with
 * the public half. Every other device of that person is told. One whose data is open shows four
 * words worked out from the request and the public key; the person checks the new device shows the
 * same four, and Approve sends the person's key encrypted to that public key. The new device takes
 * it, once, with the pickup token only it was given.
 *
 * The words are what make a swapped public key show: this server could hand the approving device a
 * key of its own, but not one whose words match. So the server holds a public key, a device name, a
 * status and, once approved, a key it cannot open, for ten minutes, and never logs any of them.
 *
 * A request is the person's own: only their sessions ask, answer and take it, and the session that
 * asked can't answer it.
 */
import {createHash, randomBytes, timingSafeEqual} from 'crypto';
import {v4 as uuidv4} from 'uuid';
import {getKeyValueStore} from '@/base/runtime.factory';
import type {KeyValueStore} from '@/base/kv_store';
import {UserRepo} from '@/db/user.repo';
import SSEManager from '@/services/sse.manager';
import NotificationService from '@/services/notification.service';
import {container} from '@/inversify.config';
import {NotificationType} from '@/typing/enum_strings';
import type {DeviceUnlockRequestView, DeviceUnlockStatus} from 'tset-sharedlib/api';

/** How long a request, and an approval not yet taken, lasts. */
export const DEVICE_UNLOCK_TTL_SEC = 10 * 60;
/** Someone pressing "Try again" a few times is fine; a script filling every screen is not. */
const MAX_PENDING_PER_USER = 3;
/** A raw P-256 public key (65 bytes), base64url without padding. */
const PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]{87}$/;
const WRAPPED_KEY_MAX_CHARS = 4096;
const LABEL_MAX_CHARS = 80;

export const DEVICE_UNLOCK_REQUEST_EVENT = 'deviceUnlockRequest';
export const DEVICE_UNLOCK_DECIDED_EVENT = 'deviceUnlockDecided';

type PushSender = {
  sendPushNotificationToAllUserDevices: (userId: string, n: {title: string; body: string}, data: any) => Promise<any>;
};

type Row = {
  _id: string;
  accountId: string;
  userId: string;
  publicKey: string;
  deviceLabel: string;
  /** The session that asked, when the token names one: it can't approve itself. */
  askingSessionId: string | null;
  pickupHash: string;
  status: 'pending' | 'approved' | 'denied';
  createdAtMs: number;
};

const rowKey = (id: string) => `devUnlock:row:${id}`;
const userKey = (userId: string) => `devUnlock:user:${userId}`;
/** Held apart from the row so that taking it is one delete: of two takes, one wins. */
const approvedKey = (id: string) => `devUnlock:approved:${id}`;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/** A device name as the person will read it: one line, no control characters, not too long. */
function cleanLabel(label: unknown): string {
  if (typeof label !== 'string') return '';
  return label
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LABEL_MAX_CHARS);
}

export default class DeviceUnlockService {
  private static _instance: DeviceUnlockService | null = null;
  static get instance(): DeviceUnlockService {
    if (!this._instance) this._instance = new DeviceUnlockService();
    return this._instance;
  }

  constructor(
    private readonly kv: KeyValueStore = getKeyValueStore(),
    private readonly users = new UserRepo(),
    private readonly sse: Pick<SSEManager, 'broadcastToUser'> = SSEManager.getInstance(),
    private readonly now: () => number = Date.now,
    private readonly push: () => PushSender = () => container.resolve(NotificationService),
  ) {}

  /**
   * "Is this you?" on the person's phones, so it can be answered with the app closed. Names the
   * device, which is what they check; opening it shows the prompt (DeviceApprovalPrompt.vue).
   */
  private async sendPush(userId: string, deviceLabel: string): Promise<void> {
    try {
      await this.push().sendPushNotificationToAllUserDevices(
        userId,
        {title: 'Is this you?', body: `${deviceLabel || 'A new device'} is asking to open your Kindredly data.`},
        {type: 'NAVIGATE_PATH', path: '/', kind: NotificationType.DEVICE_UNLOCK_REQUEST},
      );
    } catch {
      // A push that could not go out still leaves the request on every open Kindredly.
    }
  }

  private secondsLeft(row: Row): number {
    return Math.max(1, Math.ceil((row.createdAtMs + DEVICE_UNLOCK_TTL_SEC * 1000 - this.now()) / 1000));
  }

  private async readRow(id: unknown): Promise<Row | null> {
    if (typeof id !== 'string' || !id.startsWith('dur_') || id.length > 80) return null;
    const raw = await this.kv.get(rowKey(id));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Row;
    } catch {
      return null;
    }
  }

  private async writeRow(row: Row): Promise<void> {
    await this.kv.setex(rowKey(row._id), this.secondsLeft(row), JSON.stringify(row));
  }

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

  /** The new device asks, for its own signed-in person. The pickup token is returned only here. */
  async create(
    accountId: string,
    userId: string,
    sessionId: string | null | undefined,
    publicKey: unknown,
    deviceLabel: unknown,
  ): Promise<{_id: string; pickupToken: string; expiresAt: string}> {
    const user: any = await this.users.findById(userId);
    if (!user || user.deleted || user.accountId !== accountId) throw new Error('Not signed in.');
    if (typeof publicKey !== 'string' || !PUBLIC_KEY_PATTERN.test(publicKey)) throw new Error('Not a request.');
    let pending = (await this.rows(userId)).filter((r) => r.status === 'pending');
    // The same device asking again (a reload, or Try again) replaces its earlier request, so other
    // devices never show the words of a screen that is gone.
    const replaced = sessionId ? pending.filter((r) => r.askingSessionId === sessionId) : [];
    for (const old of replaced) {
      await this.kv.del(rowKey(old._id), approvedKey(old._id));
      await this.kv.srem(userKey(userId), old._id);
      await this.sse.broadcastToUser(userId, DEVICE_UNLOCK_DECIDED_EVENT, {requestId: old._id, approved: false});
    }
    pending = pending.filter((r) => !replaced.includes(r));
    if (pending.length >= MAX_PENDING_PER_USER) {
      throw new Error('Too many requests are waiting. Approve or close one first.');
    }
    const pickupToken = randomBytes(32).toString('base64url');
    const row: Row = {
      _id: `dur_${uuidv4()}`,
      accountId,
      userId,
      publicKey,
      deviceLabel: cleanLabel(deviceLabel),
      askingSessionId: sessionId || null,
      pickupHash: sha256(pickupToken),
      status: 'pending',
      createdAtMs: this.now(),
    };
    await this.writeRow(row);
    await this.kv.sadd(userKey(userId), row._id);
    await this.kv.expire(userKey(userId), DEVICE_UNLOCK_TTL_SEC);
    await this.sse.broadcastToUser(userId, DEVICE_UNLOCK_REQUEST_EVENT, {requestId: row._id});
    void this.sendPush(userId, row.deviceLabel);
    return {
      _id: row._id,
      pickupToken,
      expiresAt: new Date(row.createdAtMs + DEVICE_UNLOCK_TTL_SEC * 1000).toISOString(),
    };
  }

  /** What waits for this person, oldest first; never the asking session's own. */
  async list(userId: string, sessionId: string | null | undefined): Promise<DeviceUnlockRequestView[]> {
    return (await this.rows(userId))
      .filter((r) => r.status === 'pending' && !(sessionId && r.askingSessionId === sessionId))
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .map((r) => ({
        _id: r._id,
        publicKey: r.publicKey,
        deviceLabel: r.deviceLabel,
        createdAt: new Date(r.createdAtMs).toISOString(),
      }));
  }

  /** Approve, from another of the person's devices, with their key encrypted to the request's public key. */
  async approve(
    userId: string,
    sessionId: string | null | undefined,
    requestId: unknown,
    wrappedKey: unknown,
  ): Promise<boolean> {
    if (typeof wrappedKey !== 'string' || !wrappedKey || wrappedKey.length > WRAPPED_KEY_MAX_CHARS) return false;
    const row = await this.readRow(requestId);
    if (!row || row.userId !== userId || row.status !== 'pending') return false;
    if (sessionId && row.askingSessionId === sessionId) return false;
    row.status = 'approved';
    await this.writeRow(row);
    await this.kv.setex(approvedKey(row._id), this.secondsLeft(row), wrappedKey);
    await this.sse.broadcastToUser(userId, DEVICE_UNLOCK_DECIDED_EVENT, {requestId: row._id, approved: true});
    return true;
  }

  /** "They don't match" or "Not me", from another of the person's devices. */
  async deny(userId: string, requestId: unknown): Promise<boolean> {
    const row = await this.readRow(requestId);
    if (!row || row.userId !== userId || row.status !== 'pending') return false;
    row.status = 'denied';
    await this.writeRow(row);
    await this.sse.broadcastToUser(userId, DEVICE_UNLOCK_DECIDED_EVENT, {requestId: row._id, approved: false});
    return true;
  }

  /**
   * The asking device checks, with its pickup token. An approval is handed over once; a request that
   * isn't this device's, or is gone, reads as expired.
   */
  async take(
    userId: string,
    requestId: unknown,
    pickupToken: unknown,
  ): Promise<{status: DeviceUnlockStatus; wrappedKey?: string}> {
    const row = await this.readRow(requestId);
    if (
      !row ||
      row.userId !== userId ||
      typeof pickupToken !== 'string' ||
      !sameHash(sha256(pickupToken), row.pickupHash)
    ) {
      return {status: 'expired'};
    }
    if (row.status !== 'approved') return {status: row.status};
    const key = approvedKey(row._id);
    const wrappedKey = await this.kv.get(key);
    if (!wrappedKey || (await this.kv.del(key)) !== 1) return {status: 'expired'};
    await this.kv.del(rowKey(row._id));
    await this.kv.srem(userKey(userId), row._id);
    return {status: 'approved', wrappedKey};
  }

  /** The asking device gives up (Cancel, or the screen closed); other devices drop the prompt. */
  async cancel(userId: string, requestId: unknown, pickupToken: unknown): Promise<boolean> {
    const row = await this.readRow(requestId);
    if (
      !row ||
      row.userId !== userId ||
      typeof pickupToken !== 'string' ||
      !sameHash(sha256(pickupToken), row.pickupHash)
    ) {
      return false;
    }
    await this.kv.del(rowKey(row._id), approvedKey(row._id));
    await this.kv.srem(userKey(userId), row._id);
    await this.sse.broadcastToUser(userId, DEVICE_UNLOCK_DECIDED_EVENT, {requestId: row._id, approved: false});
    return true;
  }
}
