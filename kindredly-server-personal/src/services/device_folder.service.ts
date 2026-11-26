/**
 * Device folders (HAT-1321, docs/proposals/device-folders.md): the records, and the relay that
 * carries a member's sealed frames to the Companion that hosts the folder and back.
 *
 * The server is a switchboard. It knows a folder exists, its display name, its owner, who may open
 * it and which computer serves it. A frame is sealed by the member's app with a key derived from the
 * folder key, which the server never holds (`tset-electron/src/deviceFolder/folderFrames.ts`), so it
 * cannot read a search, a file name, or the connection details two devices swap to connect directly.
 *
 * Who may do what:
 *   - Sharing a folder needs a guardian's approval typed at the host computer (CMP-70's ten-minute
 *     approval), for that device and the person its token was minted for, and a Plus family.
 *   - Stopping needs only the host's own token: stopping can only reduce what is shared.
 *   - Sending a frame needs a role on the folder: its owner, a named member, or anyone in the family
 *     when the whole family may open it. A child is never Manage.
 *
 * How a frame travels between server processes (the shape of `mcp_relay.service.ts`):
 *   - the frame goes out on `deviceFolders:frames`; the process holding the host's stream writes it
 *     and says so on the waiting process's own channel. No note within a second means the host is
 *     not there, and the member is told the computer is offline.
 *   - the host POSTs its answer to any process, which forwards it to the waiting process's channel.
 *
 * NOTHING ABOUT A FRAME IS LOGGED: `folderLog` takes an event name and a folder id, nothing else.
 */
import {randomBytes} from 'crypto';
import {v4 as uuidv4} from 'uuid';
import {UserType} from 'tset-sharedlib/shared.types';
import type {
  DeviceFolderHostView,
  DeviceFolderPerson,
  DeviceFolderRole,
  DeviceFolderSharing,
  DeviceFolderSealedFrame,
  DeviceFolderView,
} from 'tset-sharedlib/api';
import {DeviceFolderRepo, type DeviceFolderMemberRow, type DeviceFolderRow} from '@/db/device_folder.repo';
import {UserRepo} from '@/db/user.repo';
import {KeyEntryRepo} from '@/db/key_entry.repo';
import {getEventBus, getKeyValueStore} from '@/base/runtime.factory';
import type {EventBus} from '@/base/event_bus';
import type {KeyValueStore} from '@/base/kv_store';
import SSEManager from '@/services/sse.manager';
import {verifyCompanionApproval} from '@/utils/auth_utils';

export const DEVICE_FOLDER_FRAME_EVENT = 'deviceFolderFrame';
const FRAMES_CHANNEL = 'deviceFolders:frames';
const MAX_FOLDERS_PER_HOST = 10;
const MAX_NAME_CHARS = 80;
const MAX_MEMBERS = 50;
/** A folder key sealed to one RSA-2048 public key is about 350 base64 characters, with its envelope. */
const MAX_WRAPPED_KEY_CHARS = 4096;
export const FRAME_MAX_CHARS = 256 * 1024;
const DELIVERY_WAIT_MS = 1_000;
const ANSWER_WAIT_MS = 30_000;
/** The host's stream refreshes its presence well inside this. */
const PRESENCE_TTL_SEC = 90;
export const PRESENCE_REFRESH_MS = 30_000;

type FamilyUser = {
  _id: string;
  type?: string | null;
  accountId?: string | null;
  deleted?: boolean | null;
  displayedName?: string | null;
  username?: string | null;
};

export type DeviceFolderRefusal = {
  ok: false;
  reason:
    | 'not_plus'
    | 'no_approval'
    | 'bad_request'
    | 'too_many'
    | 'not_found'
    | 'not_allowed'
    | 'offline'
    | 'timeout'
    | 'too_large'
    | 'host_refused'
    | 'stale_frame';
};

type Pending = {
  hostDeviceId: string;
  delivered: () => void;
  /** The host's sealed answer, or why it has none (`HostRefusal`). */
  resolve: (frame: DeviceFolderSealedFrame | HostRefusal) => void;
};

/**
 * Why the host sent no sealed answer: it would not open the frame (`host_refused`), the two clocks
 * disagree (`stale_frame`), or its answer was too large to carry (`too_large`). Named, so the page
 * can say which (HAT-1373); none of them says anything about the frame's contents.
 */
type HostRefusal = {refused: 'host_refused' | 'stale_frame' | 'too_large'};

type BusMessage =
  | {type: 'delivered'; frameId: string}
  | {
      type: 'answer';
      frameId: string;
      hostDeviceId: string;
      frame: DeviceFolderSealedFrame | null;
      refused?: HostRefusal['refused'];
    };

function folderLog(event: string, folderId?: string): void {
  console.info(`[deviceFolders] ${event}${folderId ? ` ${folderId}` : ''}`);
}

const replyChannel = (taskId: string) => `deviceFolders:reply:${taskId}`;
const presenceKey = (deviceId: string) => `deviceFolders:host:${deviceId}`;
/** Which of the host's streams set the online mark, so an old stream's close cannot clear a new one's. */
const streamKey = (deviceId: string) => `deviceFolders:hostStream:${deviceId}`;
export const hostStreamClientId = (userId: string, deviceId: string) => `${userId}-cmp_${deviceId}-folders`;

function isRole(value: unknown): value is DeviceFolderRole {
  return value === 'manage' || value === 'add' || value === 'view';
}

function isSealedFrame(value: unknown): value is DeviceFolderSealedFrame {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.folderId === 'string' &&
    typeof f.userId === 'string' &&
    typeof f.iv === 'string' &&
    typeof f.ct === 'string' &&
    f.iv.length <= 64
  );
}

/**
 * Whether the server holds a person's sealed copy, and which key it is a copy of (`keyId`, which the
 * host writes beside the sealed key in the JSON), so the host can seal its current key again.
 */
function keyOf(row: {wrappedKey?: string} | undefined): {hasKey: boolean; keyId: string | null} {
  if (!row) return {hasKey: false, keyId: null};
  try {
    const keyId = (JSON.parse(String(row.wrappedKey)) as {keyId?: unknown}).keyId;
    return {hasKey: true, keyId: typeof keyId === 'string' ? keyId.slice(0, 64) : null};
  } catch {
    return {hasKey: true, keyId: null};
  }
}

/** A whole-family role from a request: null for none, undefined for something that is not one. */
function parseWholeFamilyRole(value: unknown): 'view' | 'add' | null | undefined {
  if (value == null) return null;
  return value === 'view' || value === 'add' ? value : undefined;
}

/**
 * A person's role on a folder, or null. The owner manages; a named member has their row's role;
 * anyone else in the family has the whole-family role when there is one. A child never manages.
 */
export function roleFor(
  folder: Pick<DeviceFolderRow, 'accountId' | 'ownerUserId' | 'wholeFamilyRole'>,
  member: Pick<DeviceFolderMemberRow, 'role'> | undefined,
  user: FamilyUser | null | undefined,
): DeviceFolderRole | null {
  if (!user || user.deleted || String(user.accountId) !== String(folder.accountId)) return null;
  let role: DeviceFolderRole | null = null;
  if (user._id === folder.ownerUserId) role = 'manage';
  else if (member) role = member.role;
  else if (folder.wholeFamilyRole) role = folder.wholeFamilyRole;
  if (role === 'manage' && user.type !== UserType.admin) role = 'add';
  return role;
}

const keyEntries = new KeyEntryRepo();

/** The users' own public keys, as the JWK strings their clients wrote. A user with none is left out. */
async function defaultPublicKeys(userIds: string[]): Promise<Map<string, string>> {
  const rows = userIds.length ? await keyEntries.listPublicKeysForUsers(userIds) : [];
  const out = new Map<string, string>();
  for (const row of rows as Array<{selectId?: string; keyData?: any; deletedAt?: unknown}>) {
    const data = row.keyData?.format === 'jwk' ? row.keyData?.data : null;
    if (row.selectId && typeof data === 'string' && !row.deletedAt) out.set(row.selectId, data);
  }
  return out;
}

export default class DeviceFolderService {
  private readonly taskId = `${process.env.HOSTNAME || 'local'}-${process.pid}-${randomBytes(4).toString('hex')}`;
  private readonly pending = new Map<string, Pending>();
  private wired = false;

  constructor(
    /** Whether the family is on Plus. Device folders are a Plus feature while Experimental. */
    private readonly isPlusAccount: (accountId: string) => Promise<boolean>,
    private readonly repo = new DeviceFolderRepo(),
    private readonly users: Pick<UserRepo, 'findById' | 'listByAccountId'> = new UserRepo(),
    private readonly kv: KeyValueStore = getKeyValueStore(),
    private readonly bus: EventBus = getEventBus(),
    private readonly sse: SSEManager = SSEManager.getInstance(),
    /** Each person's public key (a JWK string), for the host to seal the folder key to. */
    private readonly publicKeys: (userIds: string[]) => Promise<Map<string, string>> = defaultPublicKeys,
  ) {}

  async start(): Promise<void> {
    if (this.wired) return;
    this.wired = true;
    await this.bus.subscribe(FRAMES_CHANNEL, (message) => this.onFrameMessage(message));
    await this.bus.subscribe(replyChannel(this.taskId), (message) => this.onReplyMessage(message));
  }

  // ── Records ────────────────────────────────────────────────────────────────────────────────

  /** Share a folder from the host computer, with a guardian's approval typed there. */
  async create(input: {
    tokenUserId: string | null;
    tokenDeviceId: string | null;
    /** The computer's name from the Companion's request, shown to members as where the folder lives. */
    hostName?: string | null;
    approval: string;
    name: unknown;
    wholeFamilyRole: unknown;
    uploadsAllowed: unknown;
    members: unknown;
  }): Promise<{ok: true; folderId: string} | DeviceFolderRefusal> {
    const approved = await this.approvingAdmin(input.tokenUserId, input.tokenDeviceId, input.approval);
    if (!approved || !input.tokenDeviceId) return {ok: false, reason: 'no_approval'};
    const {admin, accountId} = approved;
    if (!(await this.isPlusAccount(accountId))) return {ok: false, reason: 'not_plus'};

    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > MAX_NAME_CHARS) return {ok: false, reason: 'bad_request'};
    const wholeFamilyRole = parseWholeFamilyRole(input.wholeFamilyRole);
    if (wholeFamilyRole === undefined) return {ok: false, reason: 'bad_request'};

    const folderId = `df_${uuidv4()}`;
    const members = await this.parseMembers(input.members, accountId, admin._id, folderId);
    if (!members) return {ok: false, reason: 'bad_request'};

    if ((await this.repo.countActiveByHost(input.tokenDeviceId)) >= MAX_FOLDERS_PER_HOST) {
      return {ok: false, reason: 'too_many'};
    }
    await this.repo.create(
      {
        _id: folderId,
        accountId,
        ownerUserId: admin._id,
        hostDeviceId: input.tokenDeviceId,
        name,
        hostName:
          typeof input.hostName === 'string' && input.hostName.trim() ? input.hostName.trim().slice(0, 120) : null,
        wholeFamilyRole,
        uploadsAllowed: input.uploadsAllowed === true,
      },
      members,
    );
    folderLog('shared', folderId);
    return {ok: true, folderId};
  }

  /**
   * The admin who approves a change made at this computer. A computer linked to an admin is that
   * admin's own (founder, 2026-11-24: "If it's linked to an admin, admin should be able to change
   * everything … without the admin pin"): its device token is already theirs, so it needs no
   * approval. Any other computer needs a guardian's PIN typed at it. Null when neither holds.
   */
  private async approvingAdmin(
    tokenUserId: string | null,
    tokenDeviceId: string | null,
    approvalText: string,
  ): Promise<{admin: FamilyUser & {accountId: string}; accountId: string} | null> {
    if (!tokenUserId || !tokenDeviceId) return null;
    const tokenUser = (await this.users.findById(tokenUserId)) as FamilyUser | undefined;
    let admin: FamilyUser | undefined;
    if (tokenUser && !tokenUser.deleted && tokenUser.type === UserType.admin) {
      admin = tokenUser;
    } else {
      const approval = verifyCompanionApproval(approvalText);
      if (!approval || approval.childUserId !== tokenUserId || approval.deviceId !== tokenDeviceId) return null;
      admin = (await this.users.findById(approval.adminUserId)) as FamilyUser | undefined;
    }
    if (
      !admin ||
      admin.deleted ||
      admin.type !== UserType.admin ||
      !tokenUser ||
      tokenUser.deleted ||
      !admin.accountId ||
      String(admin.accountId) !== String(tokenUser.accountId)
    ) {
      return null;
    }
    const accountId = String(admin.accountId);
    return {admin: {...admin, accountId}, accountId};
  }

  /**
   * The named people of a folder from a request, or null when one of them cannot be named: not in
   * the family, named twice, or a child as Manage. The owner is left out, since they manage it anyway.
   */
  private async parseMembers(
    raw: unknown,
    accountId: string,
    ownerUserId: string,
    folderId: string,
  ): Promise<DeviceFolderMemberRow[] | null> {
    if (raw != null && !Array.isArray(raw)) return null;
    const list = (Array.isArray(raw) ? raw : []) as Array<{userId?: unknown; role?: unknown}>;
    if (list.length > MAX_MEMBERS) return null;
    const family = new Map(
      ((await this.users.listByAccountId(accountId)) as FamilyUser[]).filter((u) => !u.deleted).map((u) => [u._id, u]),
    );
    const members: DeviceFolderMemberRow[] = [];
    const seen = new Set<string>();
    for (const m of list) {
      const userId = typeof m?.userId === 'string' ? m.userId : '';
      const user = family.get(userId);
      if (!user || !isRole(m.role) || seen.has(userId)) return null;
      if (m.role === 'manage' && user.type !== UserType.admin) return null;
      seen.add(userId);
      if (userId !== ownerUserId) members.push({folderId, userId, role: m.role});
    }
    return members;
  }

  /**
   * The people a folder at this computer can be shared with, for its people picker: everyone in the
   * family but the folder's owner (with `folderId`) or the approving admin (a new folder).
   */
  async family(input: {
    tokenUserId: string | null;
    tokenDeviceId: string | null;
    approval: string;
    folderId?: unknown;
  }): Promise<{ok: true; people: DeviceFolderPerson[]; current?: DeviceFolderSharing} | DeviceFolderRefusal> {
    const approved = await this.approvingAdmin(input.tokenUserId, input.tokenDeviceId, input.approval);
    if (!approved) return {ok: false, reason: 'no_approval'};
    let ownerUserId = approved.admin._id;
    let current: DeviceFolderSharing | undefined;
    if (input.folderId != null) {
      const folder = typeof input.folderId === 'string' ? await this.repo.findById(input.folderId) : undefined;
      if (
        !folder ||
        folder.stoppedAt ||
        folder.hostDeviceId !== input.tokenDeviceId ||
        folder.accountId !== approved.accountId
      ) {
        return {ok: false, reason: 'not_found'};
      }
      ownerUserId = folder.ownerUserId;
      current = {
        wholeFamilyRole: folder.wholeFamilyRole,
        uploadsAllowed: folder.uploadsAllowed,
        members: (await this.repo.listMembers([folder._id])).map((m) => ({userId: m.userId, role: m.role})),
      };
    }
    const family = ((await this.users.listByAccountId(approved.accountId)) as FamilyUser[]).filter(
      (u) => !u.deleted && u._id !== ownerUserId,
    );
    return {
      ok: true,
      people: family
        .map((u) => ({
          userId: u._id,
          name: String(u.displayedName || u.username || 'Someone'),
          child: u.type !== UserType.admin,
        }))
        .sort((a, b) => Number(a.child) - Number(b.child) || a.name.localeCompare(b.name)),
      ...(current ? {current} : {}),
    };
  }

  /**
   * Changes who may open a folder and whether they may add files, from the folder's own computer
   * with the same approval as sharing it. When anyone loses access, every sealed key is dropped and
   * `newKey` asks the computer for a new folder key, sealed again for the people who remain, so a
   * key copied before cannot open what is served after (docs/proposals/device-folders.md → 2).
   */
  async update(input: {
    tokenUserId: string | null;
    tokenDeviceId: string | null;
    approval: string;
    folderId: unknown;
    wholeFamilyRole: unknown;
    uploadsAllowed: unknown;
    members: unknown;
  }): Promise<{ok: true; newKey: boolean} | DeviceFolderRefusal> {
    const approved = await this.approvingAdmin(input.tokenUserId, input.tokenDeviceId, input.approval);
    if (!approved) return {ok: false, reason: 'no_approval'};
    const folder = typeof input.folderId === 'string' ? await this.repo.findById(input.folderId) : undefined;
    if (
      !folder ||
      folder.stoppedAt ||
      folder.hostDeviceId !== input.tokenDeviceId ||
      folder.accountId !== approved.accountId
    ) {
      return {ok: false, reason: 'not_found'};
    }
    if (!(await this.isPlusAccount(approved.accountId))) return {ok: false, reason: 'not_plus'};
    const wholeFamilyRole = parseWholeFamilyRole(input.wholeFamilyRole);
    if (wholeFamilyRole === undefined) return {ok: false, reason: 'bad_request'};
    const members = await this.parseMembers(input.members, approved.accountId, folder.ownerUserId, folder._id);
    if (!members) return {ok: false, reason: 'bad_request'};

    const family = (await this.users.listByAccountId(approved.accountId)) as FamilyUser[];
    const before = await this.repo.listMembers([folder._id]);
    const next = {...folder, wholeFamilyRole};
    const lost = family.some(
      (u) =>
        roleFor(
          folder,
          before.find((m) => m.userId === u._id),
          u,
        ) &&
        !roleFor(
          next,
          members.find((m) => m.userId === u._id),
          u,
        ),
    );
    await this.repo.update(folder._id, {wholeFamilyRole, uploadsAllowed: input.uploadsAllowed === true}, members);
    if (lost) await this.repo.deleteKeys(folder._id);
    folderLog(lost ? 'people-removed' : 'changed', folder._id);
    return {ok: true, newKey: lost};
  }

  /** The host stops one of its own folders. No approval: stopping only takes away. */
  async stop(tokenDeviceId: string | null, folderId: unknown): Promise<boolean> {
    if (!tokenDeviceId || typeof folderId !== 'string') return false;
    const stopped = await this.repo.stop(folderId, tokenDeviceId);
    if (stopped) folderLog('stopped', folderId);
    return stopped;
  }

  /** What the host serves, with everyone's role, so it can refuse a removed member at once. */
  async hostFolders(tokenUserId: string | null, tokenDeviceId: string | null): Promise<DeviceFolderHostView[]> {
    if (!tokenUserId || !tokenDeviceId) return [];
    const tokenUser = (await this.users.findById(tokenUserId)) as FamilyUser | undefined;
    if (!tokenUser?.accountId || tokenUser.deleted) return [];
    const folders = (await this.repo.listActiveByHost(tokenDeviceId)).filter(
      (f) => String(f.accountId) === String(tokenUser.accountId),
    );
    if (folders.length === 0) return [];
    const ids = folders.map((f) => f._id);
    const [rows, family, keys] = await Promise.all([
      this.repo.listMembers(ids),
      this.users.listByAccountId(String(tokenUser.accountId)) as Promise<FamilyUser[]>,
      this.repo.listKeys(ids),
    ]);
    const publicKeys = await this.publicKeys(family.map((u) => u._id));
    return folders.map((folder) => {
      const members: DeviceFolderHostView['members'] = [];
      for (const user of family) {
        const role = roleFor(
          folder,
          rows.find((r) => r.folderId === folder._id && r.userId === user._id),
          user,
        );
        if (!role) continue;
        members.push({
          userId: user._id,
          // Names the folder a person's uploads land in: `Uploads from <name>/`.
          name: String(user.displayedName || user.username || 'someone'),
          role,
          publicKey: publicKeys.get(user._id) ?? null,
          ...keyOf(keys.find((k) => k.folderId === folder._id && k.userId === user._id)),
        });
      }
      return {
        _id: folder._id,
        name: folder.name,
        uploadsAllowed: folder.uploadsAllowed,
        members,
      };
    });
  }

  /**
   * The host's sealed copies of a folder key, one per person who may open it. Taken only from the
   * folder's own host, and only for people with a role on it; the server stores what it cannot open.
   */
  async deliverKeys(
    tokenUserId: string | null,
    tokenDeviceId: string | null,
    body: unknown,
  ): Promise<{ok: true; stored: number} | DeviceFolderRefusal> {
    const b = (body || {}) as {folderId?: unknown; keys?: unknown};
    if (!tokenUserId || !tokenDeviceId || typeof b.folderId !== 'string' || !Array.isArray(b.keys)) {
      return {ok: false, reason: 'bad_request'};
    }
    if (b.keys.length > MAX_MEMBERS) return {ok: false, reason: 'bad_request'};
    const folder = await this.repo.findById(b.folderId);
    if (!folder || folder.stoppedAt || folder.hostDeviceId !== tokenDeviceId) return {ok: false, reason: 'not_found'};
    const tokenUser = (await this.users.findById(tokenUserId)) as FamilyUser | undefined;
    if (!tokenUser || String(tokenUser.accountId) !== String(folder.accountId)) return {ok: false, reason: 'not_found'};

    const members = await this.repo.listMembers([folder._id]);
    const rows = [];
    for (const k of b.keys as Array<{userId?: unknown; wrappedKey?: unknown}>) {
      if (typeof k?.userId !== 'string' || typeof k.wrappedKey !== 'string') return {ok: false, reason: 'bad_request'};
      if (!k.wrappedKey || k.wrappedKey.length > MAX_WRAPPED_KEY_CHARS) return {ok: false, reason: 'bad_request'};
      const user = (await this.users.findById(k.userId)) as FamilyUser | undefined;
      const role = roleFor(
        folder,
        members.find((m) => m.userId === k.userId),
        user,
      );
      if (!role) return {ok: false, reason: 'not_allowed'};
      rows.push({folderId: folder._id, userId: k.userId, wrappedKey: k.wrappedKey});
    }
    await this.repo.upsertKeys(rows);
    return {ok: true, stored: rows.length};
  }

  /** The folders this person may open, and whether each host is reachable now. */
  async listForUser(userId: string, accountId: string): Promise<DeviceFolderView[]> {
    const user = (await this.users.findById(userId)) as FamilyUser | undefined;
    if (!user || String(user.accountId) !== String(accountId)) return [];
    const folders = await this.repo.listActiveByAccount(accountId);
    if (folders.length === 0) return [];
    const rows = await this.repo.listMembers(folders.map((f) => f._id));
    const open = folders
      .map((folder) => ({
        folder,
        role: roleFor(
          folder,
          rows.find((r) => r.folderId === folder._id && r.userId === userId),
          user,
        ),
      }))
      .filter((x): x is {folder: DeviceFolderRow; role: DeviceFolderRole} => x.role !== null);
    if (open.length === 0) return [];
    const [presence, wrapped] = await Promise.all([
      this.kv.mget(open.map((x) => presenceKey(x.folder.hostDeviceId))),
      Promise.all(open.map((x) => this.repo.findKey(x.folder._id, userId))),
    ]);
    return open.map(({folder, role}, i) => ({
      _id: folder._id,
      name: folder.name,
      hostDeviceId: folder.hostDeviceId,
      hostName: folder.hostName ?? null,
      role,
      uploadsAllowed: folder.uploadsAllowed,
      online: presence[i] !== null,
      wrappedKey: wrapped[i]?.wrappedKey ?? null,
    }));
  }

  // ── The host's stream ───────────────────────────────────────────────────────────────────────

  /** Holds the person the host's token was minted for: its stream's id is built from it. */
  async markHostOnline(deviceId: string, userId: string, streamId?: string): Promise<void> {
    await this.kv.set(presenceKey(deviceId), userId, 'EX', PRESENCE_TTL_SEC);
    if (streamId) await this.kv.set(streamKey(deviceId), streamId, 'EX', PRESENCE_TTL_SEC);
  }

  /**
   * The host's stream closed. Only the stream that set the mark clears it: when the Companion
   * reconnects, the new stream marks it online before the old one's close arrives, and members
   * would otherwise read "offline" until the next refresh (HAT-1373).
   */
  async markHostOffline(deviceId: string, streamId?: string): Promise<void> {
    if (streamId) {
      const current = await this.kv.get(streamKey(deviceId));
      if (current && current !== streamId) return;
    }
    await this.kv.del(presenceKey(deviceId), streamKey(deviceId));
  }

  // ── Frames ─────────────────────────────────────────────────────────────────────────────────

  /** A member's sealed frame to the host, and the host's sealed answer back. */
  /** Whether this person may reach this folder's computer now: a live folder, a role on it, Plus. */
  async mayOpen(
    userId: string,
    accountId: string,
    folderId: unknown,
  ): Promise<{ok: true; folder: DeviceFolderRow} | DeviceFolderRefusal> {
    if (typeof folderId !== 'string' || !folderId) return {ok: false, reason: 'bad_request'};
    const folder = await this.repo.findById(folderId);
    if (!folder || folder.stoppedAt || String(folder.accountId) !== String(accountId)) {
      return {ok: false, reason: 'not_found'};
    }
    const [user, member] = await Promise.all([
      this.users.findById(userId) as Promise<FamilyUser | undefined>,
      this.repo.findMember(folder._id, userId),
    ]);
    if (!roleFor(folder, member, user)) return {ok: false, reason: 'not_allowed'};
    if (!(await this.isPlusAccount(String(folder.accountId)))) return {ok: false, reason: 'not_plus'};
    return {ok: true, folder};
  }

  async send(
    userId: string,
    accountId: string,
    body: unknown,
  ): Promise<{ok: true; frame: DeviceFolderSealedFrame} | DeviceFolderRefusal> {
    if (!isSealedFrame(body) || body.userId !== userId) return {ok: false, reason: 'bad_request'};
    if (body.ct.length > FRAME_MAX_CHARS) return {ok: false, reason: 'too_large'};
    const opened = await this.mayOpen(userId, accountId, body.folderId);
    if ('reason' in opened) return opened;
    const folder = opened.folder;

    // The host's stream is held under the person the Companion's token was minted for, which the
    // folder does not record: the stream announces itself by device, with that person's id.
    const hostUserId = await this.kv.get(presenceKey(folder.hostDeviceId));
    if (!hostUserId) return {ok: false, reason: 'offline'};

    const frameId = uuidv4();
    let markDelivered: () => void = () => {};
    const delivered = new Promise<void>((resolve) => (markDelivered = resolve));
    const answered = new Promise<DeviceFolderSealedFrame | HostRefusal>((resolve) => {
      // Tracked before publishing: an answer must never arrive before its waiter.
      this.pending.set(frameId, {hostDeviceId: folder.hostDeviceId, delivered: markDelivered, resolve});
    });

    let timer: NodeJS.Timeout | undefined;
    try {
      await this.bus.publish(
        FRAMES_CHANNEL,
        JSON.stringify({
          clientId: hostStreamClientId(hostUserId, folder.hostDeviceId),
          replyTo: this.taskId,
          frame: {frameId, replyTo: this.taskId, sealed: body},
        }),
      );
      const wasDelivered = await Promise.race([
        delivered.then(() => true),
        new Promise<boolean>((resolve) => (timer = setTimeout(() => resolve(false), DELIVERY_WAIT_MS))),
      ]);
      clearTimeout(timer);
      if (!wasDelivered) return {ok: false, reason: 'offline'};
      const frame = await Promise.race([
        answered,
        new Promise<'timeout'>((resolve) => (timer = setTimeout(() => resolve('timeout'), ANSWER_WAIT_MS))),
      ]);
      if (frame === 'timeout') return {ok: false, reason: 'timeout'};
      if ('refused' in frame) return {ok: false, reason: frame.refused};
      return {ok: true, frame};
    } finally {
      clearTimeout(timer);
      this.pending.delete(frameId);
    }
  }

  /**
   * The host's answer, from whichever process its POST reached: a sealed frame, or `refused` when the
   * host would not open the frame (a removed member, a stale or replayed one; `stale_frame` is passed
   * on by name, since the person can fix a clock). An answer too large to carry is passed on as
   * `too_large` at once, rather than leaving the member to wait out the deadline. The waiting process
   * checks that it came from the folder's own host before handing it over.
   */
  async acceptAnswer(tokenDeviceId: string | null, body: unknown): Promise<boolean> {
    const b = (body || {}) as {frameId?: unknown; replyTo?: unknown; frame?: unknown; refused?: unknown};
    if (!tokenDeviceId || typeof b.frameId !== 'string' || typeof b.replyTo !== 'string') return false;
    if (b.replyTo.length > 200) return false;
    let frame: DeviceFolderSealedFrame | null = null;
    let refused: HostRefusal['refused'] | undefined;
    if (b.refused === true || typeof b.refused === 'string') {
      refused = b.refused === 'stale_frame' ? 'stale_frame' : 'host_refused';
    } else if (!isSealedFrame(b.frame)) {
      return false;
    } else if (b.frame.ct.length > FRAME_MAX_CHARS) {
      refused = 'too_large';
    } else {
      frame = b.frame;
    }
    const message: BusMessage = {
      type: 'answer',
      frameId: b.frameId,
      hostDeviceId: tokenDeviceId,
      frame,
      ...(refused ? {refused} : {}),
    };
    await this.bus.publish(replyChannel(b.replyTo), JSON.stringify(message));
    return true;
  }

  /** Every process: write the frame if this one holds the host's stream, and say so. */
  private onFrameMessage(message: string): void {
    let parsed: {clientId: string; replyTo: string; frame: {frameId: string}};
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    if (!parsed?.clientId || !this.sse.hasLocalConnection(parsed.clientId)) return;
    if (!this.sse.sendToLocal(parsed.clientId, DEVICE_FOLDER_FRAME_EVENT, parsed.frame)) return;
    const note: BusMessage = {type: 'delivered', frameId: parsed.frame.frameId};
    this.bus.publish(replyChannel(parsed.replyTo), JSON.stringify(note)).catch(() => folderLog('delivery note failed'));
  }

  private onReplyMessage(message: string): void {
    let parsed: BusMessage;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    const waiting = parsed?.frameId ? this.pending.get(parsed.frameId) : undefined;
    if (!waiting) return;
    if (parsed.type === 'delivered') {
      waiting.delivered();
      return;
    }
    if (parsed.type !== 'answer' || parsed.hostDeviceId !== waiting.hostDeviceId) return;
    waiting.delivered();
    this.pending.delete(parsed.frameId);
    waiting.resolve(parsed.frame ?? {refused: parsed.refused ?? 'host_refused'});
  }
}
