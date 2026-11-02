/**
 * A file an AI app sends to Kindredly by link (HAT-964; docs/guides/mcp-integration.md).
 *
 * A tool call carries only what the model writes, so a file the AI app already has (one the person
 * attached, or one its own code made) cannot travel in a call without being typed out. Instead the
 * device answering the AI app asks for an upload link (`create`): a one-time address the AI app's
 * code sends the file's bytes to. What the file is for (its name, the item or collection) is
 * encrypted on that device with the adult's own key, so this server holds only that ciphertext.
 *
 * Two ways in through the one link:
 * - The AI app's code sends the bytes (`receive`). This server holds them, unencrypted, until one of
 *   the adult's open Kindredlys takes them (`claim`), encrypts and files them, and says so (`finish`);
 *   the bytes are deleted then, and in any case after an hour. The sender waits a little for that,
 *   so it can say whether the file is in the library yet.
 * - The person opens the link in a browser. It goes to a page in the signed-in Kindredly, which
 *   reads the file from their own device and saves it encrypted; the bytes never come here.
 *
 * A link takes one file. Only the adult who made it can open, claim or finish it. Nothing about an
 * upload is logged.
 */
import {createHash, randomBytes} from 'crypto';
import {v4 as uuidv4} from 'uuid';
import {getKeyValueStore} from '@/base/runtime.factory';
import type {KeyValueStore} from '@/base/kv_store';
import {UserRepo} from '@/db/user.repo';
import SSEManager from '@/services/sse.manager';
import {UserType} from 'tset-sharedlib/shared.types';
import type {McpUploadClaim, McpUploadStatus, McpUploadView} from 'tset-sharedlib/api';

/** How long a link, and a file sent to it that no Kindredly has taken yet, lasts. */
export const MCP_UPLOAD_TTL_SEC = 60 * 60;
/** The same cap as addFile's: the device files the bytes as one base64 attachment. */
export const MCP_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
/** A Kindredly that took a file and then went away: another may take it after this. */
const CLAIM_SEC = 120;
/** A looping AI app cannot fill the server with files. */
const MAX_OPEN_PER_USER = 5;
const BLOB_MAX_CHARS = 16 * 1024;

export const MCP_UPLOAD_RECEIVED_EVENT = 'mcpUploadReceived';

type Row = {
  _id: string;
  accountId: string;
  userId: string;
  tokenHash: string;
  blob: string;
  status: Exclude<McpUploadStatus, 'expired'>;
  filename?: string;
  fileType?: string;
  size?: number;
  createdAtMs: number;
};

const rowKey = (id: string) => `mcpUpload:row:${id}`;
const dataKey = (id: string) => `mcpUpload:data:${id}`;
const tokenKey = (tokenHash: string) => `mcpUpload:token:${tokenHash}`;
const claimKey = (id: string) => `mcpUpload:claim:${id}`;
const userKey = (userId: string) => `mcpUpload:user:${userId}`;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export class McpUploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A filename as the sender gave it, without a path or anything that is not printable. */
export function cleanFilename(value: unknown): string | undefined {
  const raw = typeof value === 'string' ? value : '';
  const base = raw.split(/[\\/]/).pop() || '';
  // eslint-disable-next-line no-control-regex
  const clean = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 200);
  return clean || undefined;
}

/**
 * The type the sender gave, unless it says nothing about the file: `curl --data-binary` labels any
 * body a form, and some senders say only "bytes". The device then goes by the filename.
 */
function fileTypeOf(value: unknown): string | undefined {
  const type = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[\w.+-]+\/[\w.+-]+$/.test(type)) return undefined;
  if (type === 'application/x-www-form-urlencoded' || type === 'application/octet-stream') return undefined;
  return type;
}

export default class McpUploadService {
  private static _instance: McpUploadService | null = null;
  static get instance(): McpUploadService {
    if (!this._instance) this._instance = new McpUploadService();
    return this._instance;
  }

  constructor(
    private readonly kv: KeyValueStore = getKeyValueStore(),
    private readonly users = new UserRepo(),
    private readonly sse: Pick<SSEManager, 'broadcastToUser'> = SSEManager.getInstance(),
    private readonly now: () => number = Date.now,
  ) {}

  /** The seconds a link has left, at least one so a write never makes a key that never expires. */
  private secondsLeft(row: Row): number {
    return Math.max(1, Math.ceil((row.createdAtMs + MCP_UPLOAD_TTL_SEC * 1000 - this.now()) / 1000));
  }

  private async readRow(id: string): Promise<Row | null> {
    if (typeof id !== 'string' || !id.startsWith('mup_') || id.length > 80) return null;
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

  private async rowForToken(token: unknown): Promise<Row | null> {
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
    const id = await this.kv.get(tokenKey(hashToken(token)));
    return id ? this.readRow(id) : null;
  }

  private async ownRow(userId: string, id: string): Promise<Row | null> {
    const row = await this.readRow(id);
    return row && row.userId === userId ? row : null;
  }

  /** This adult's links still on the server; ids whose link expired are dropped from the set. */
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

  private view(row: Row): McpUploadView {
    return {
      _id: row._id,
      blob: row.blob,
      status: row.status,
      ...(row.filename ? {filename: row.filename} : {}),
      ...(row.fileType ? {fileType: row.fileType} : {}),
      ...(typeof row.size === 'number' ? {size: row.size} : {}),
      expiresAt: new Date(row.createdAtMs + MCP_UPLOAD_TTL_SEC * 1000).toISOString(),
    };
  }

  /** The answering device asks for a link, for its own signed-in adult. The token is shown once. */
  async create(
    accountId: string,
    userId: string,
    blob: string,
  ): Promise<{_id: string; token: string; expiresAt: string}> {
    const user: any = await this.users.findById(userId);
    if (!user || user.deleted || user.accountId !== accountId || user.type !== UserType.admin) {
      throw new McpUploadError(403, 'Only an adult in the family can add files this way.');
    }
    if (typeof blob !== 'string' || !blob || blob.length > BLOB_MAX_CHARS)
      throw new McpUploadError(400, 'Not an upload.');
    const open = (await this.rows(userId)).filter((r) => r.status === 'waiting' || r.status === 'received');
    if (open.length >= MAX_OPEN_PER_USER) {
      throw new McpUploadError(429, 'Too many files are waiting to be added. Open Kindredly, or wait an hour.');
    }
    const token = `kup_${randomBytes(32).toString('base64url')}`;
    const row: Row = {
      _id: `mup_${uuidv4()}`,
      accountId,
      userId,
      tokenHash: hashToken(token),
      blob,
      status: 'waiting',
      createdAtMs: this.now(),
    };
    await this.writeRow(row);
    await this.kv.setex(tokenKey(row.tokenHash), MCP_UPLOAD_TTL_SEC, row._id);
    await this.kv.sadd(userKey(userId), row._id);
    await this.kv.expire(userKey(userId), MCP_UPLOAD_TTL_SEC);
    return {_id: row._id, token, expiresAt: this.view(row).expiresAt};
  }

  /**
   * The AI app's code sends the file. Held until a Kindredly of the adult takes it; every one they
   * have open is told. A link takes one file.
   */
  async receive(token: unknown, bytes: Buffer, meta: {filename?: string; fileType?: string}): Promise<{_id: string}> {
    const row = await this.rowForToken(token);
    if (!row) throw new McpUploadError(404, 'This upload link is wrong or has expired. Ask Kindredly for a new one.');
    if (row.status !== 'waiting')
      throw new McpUploadError(409, 'This upload link was already used. Ask Kindredly for a new one.');
    if (!bytes?.length) throw new McpUploadError(400, 'No file was sent. Send the file itself as the body.');
    if (bytes.length > MCP_UPLOAD_MAX_BYTES) {
      throw new McpUploadError(413, 'The file is over 20 MB, too large to add. Add it in the Kindredly app instead.');
    }
    await this.kv.setex(dataKey(row._id), this.secondsLeft(row), bytes.toString('base64'));
    row.status = 'received';
    row.filename = cleanFilename(meta.filename);
    row.fileType = fileTypeOf(meta.fileType);
    row.size = bytes.length;
    await this.writeRow(row);
    await this.sse.broadcastToUser(row.userId, MCP_UPLOAD_RECEIVED_EVENT, {uploadId: row._id});
    return {_id: row._id};
  }

  /** How the upload behind a link is going, for the sender waiting on it. */
  async statusForToken(token: unknown): Promise<McpUploadStatus> {
    return (await this.rowForToken(token))?.status ?? 'expired';
  }

  /** The page the person opened the link on. Only the adult who made the link sees it. */
  async open(userId: string, token: unknown): Promise<McpUploadView | null> {
    const row = await this.rowForToken(token);
    return row && row.userId === userId ? this.view(row) : null;
  }

  /** Files sent and not yet taken, for a Kindredly that was closed when they arrived. */
  async listReceived(userId: string): Promise<McpUploadView[]> {
    return (await this.rows(userId))
      .filter((r) => r.status === 'received')
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .map((r) => this.view(r));
  }

  /**
   * One Kindredly takes a sent file to file it. Of two racing, only the first gets the bytes; one
   * that took it and went away without finishing lets another take it after `CLAIM_SEC`.
   */
  async claim(userId: string, id: string): Promise<McpUploadClaim | null> {
    const row = await this.ownRow(userId, id);
    if (!row || row.status !== 'received') return null;
    if ((await this.kv.incr(claimKey(id))) !== 1) return null;
    await this.kv.expire(claimKey(id), CLAIM_SEC);
    const data = await this.kv.get(dataKey(id));
    if (!data) return null;
    return {...this.view(row), data};
  }

  /**
   * The file is in the library, or could not be added. The bytes are deleted either way; the link
   * stays a while only so the sender can read how it went.
   */
  async finish(userId: string, id: string, added: boolean): Promise<boolean> {
    const row = await this.ownRow(userId, id);
    if (!row || row.status === 'done' || row.status === 'failed') return false;
    row.status = added ? 'done' : 'failed';
    await this.writeRow(row);
    await this.kv.del(dataKey(id), claimKey(id));
    return true;
  }
}

/**
 * The first file in a `multipart/form-data` body (`curl -F file=@page.html`), for a sender that posts
 * a form instead of the bytes. Null when there is no file part.
 */
export function fileFromMultipart(
  body: Buffer,
  contentType: string,
): {bytes: Buffer; filename?: string; fileType?: string} | null {
  const m = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType || '');
  if (!m || !Buffer.isBuffer(body)) return null;
  const boundary = Buffer.from(`--${m[1] || m[2]}`);
  const nextBoundary = Buffer.concat([Buffer.from('\r\n'), boundary]);
  let pos = body.indexOf(boundary);
  while (pos !== -1) {
    const headStart = pos + boundary.length + 2;
    const headEnd = body.indexOf('\r\n\r\n', headStart);
    if (headEnd === -1) return null;
    const next = body.indexOf(nextBoundary, headEnd + 4);
    if (next === -1) return null;
    const head = body.subarray(headStart, headEnd).toString('utf8');
    const filename = /filename="([^"]*)"/i.exec(head);
    if (filename) {
      const type = /content-type:\s*([^\r\n;]+)/i.exec(head);
      return {bytes: body.subarray(headEnd + 4, next), filename: filename[1], fileType: type?.[1].trim()};
    }
    pos = next + 2;
  }
  return null;
}
