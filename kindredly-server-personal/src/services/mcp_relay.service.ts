/**
 * Connected AI apps — the relay (HAT-616, docs/proposals/connected-ai-apps.md).
 *
 * An outside AI app (Claude, ChatGPT) calls Kindredly's MCP endpoint; this service passes each call
 * to one of the connected adult's open devices and hands back the device's answer. The server never
 * answers a call itself: only a device holds the library and its keys, and the device runs the call
 * through the same gate Kinbot uses (`callMcpTool` → `AIToolGate`), so a relayed call adds no
 * authority of its own.
 *
 * Five conditions, all required, checked on every call (`gate` plus a device being reachable):
 *   1. Kindredly granted this family (`sysOptions.connectedAiApps`, staff-set only)
 *   2. Family AI is On
 *   3. The family's Connected AI apps switch is On (`options.mcpRelayEnabled`)
 *   4. An adult made the connection
 *   5. One of that adult's devices is open, takes relay calls, and is signed in as them: a device
 *      switched to someone else replies `notHere`
 *
 * One Kindredly answers an AI app at a time (HAT-814, `mcp_relay_session.ts`): the one where the
 * adult tapped Agree. With no session the ask goes up on every Kindredly they have open; a tool list
 * does not wait for it (the protocol lists the read-only tools meanwhile), a call waits up to 45 s.
 *
 * How a call travels between server processes:
 *   - the frame goes out on `mcpRelay:frames`; the process holding the device's stream writes it and
 *     says so on the waiting process's own channel. No answer within a second means that device is
 *     gone, and the next one is tried.
 *   - the device POSTs its reply to any process, which forwards it to the waiting process's own
 *     channel only (`mcpRelay:reply:<taskId>`), so a result is parsed by at most two processes.
 *
 * NOTHING ABOUT A CALL IS LOGGED. This file writes logs only through `relayLog`, which takes an event
 * name and a connection id and nothing else; `mcp_relay.logging.test.ts` fails on any other
 * console or logger call here. Never log a frame, a tool name, arguments or a result.
 */
import {createHash, randomBytes} from 'crypto';
import {v4 as uuidv4} from 'uuid';
import {McpRelayChannelRepo, McpRelayChannelRow, type McpRelayClientInfo} from '@/db/mcp_relay_channel.repo';
import {AccountRepo} from '@/db/account.repo';
import {UserRepo} from '@/db/user.repo';
import {UserPrefRepo} from '@/db/user_pref.repo';
import {getEventBus, getKeyValueStore} from '@/base/runtime.factory';
import type {EventBus} from '@/base/event_bus';
import type {KeyValueStore} from '@/base/kv_store';
import SSEManager from '@/services/sse.manager';
import {ASK_WAIT_MS, McpRelaySessions} from '@/services/mcp_relay_session';
import {UserType} from 'tset-sharedlib/shared.types';
import {
  MCP_RELAY_ROUTING_PREF_KEY,
  mcpRelayAgreedUntilPrefKey,
  readMcpRelayAgreedUntil,
  readMcpRelayRouting,
} from 'tset-sharedlib/api';
import type {
  McpRelayConnectionView,
  McpRelayFrame,
  McpRelayPairingRedeemed,
  McpRelayReplyRequest,
  McpRelayRouting,
  McpRelaySealedEnvelope,
  McpRelaySealedFrame,
  McpRelaySessionView,
  McpRelayStatus,
} from 'tset-sharedlib/api';

export const MCP_RELAY_TOKEN_PREFIX = 'kmr_';
export const MCP_RELAY_FRAME_EVENT = 'mcpRelayFrame';

const FRAMES_CHANNEL = 'mcpRelay:frames';
const MAX_CONNECTIONS_PER_ACCOUNT = 5;
const MAX_IN_FLIGHT_PER_CONNECTION = 4;
const MAX_CALLS_PER_MINUTE = 60;
const DOWN_FRAME_MAX_CHARS = 32 * 1024;
export const UP_FRAME_MAX_CHARS = 256 * 1024;
/** The AI app's own deadline is shorter (and claude.ai allows 240 s), so ours never fires first. */
const DEADLINE_MS = 65_000;
/** How long a process holding the device's stream has to say it wrote the frame. */
const DELIVERY_WAIT_MS = 1_000;
const ANSWERER_TTL_SEC = 7 * 24 * 3600;
/** A person copies the pairing code between two programs, so it lasts ten minutes, once. */
const PAIRING_TTL_SEC = 10 * 60;
const PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]{80,100}$/;

export type McpRelayRefusal =
  | 'not_granted'
  | 'ai_off'
  | 'switch_off'
  | 'not_adult'
  | 'not_connected'
  | 'other_person'
  | 'busy'
  | 'too_large'
  | 'timeout'
  | 'awaiting_agree'
  | 'declined'
  | 'undeliverable';

/** What the AI app reads when a call cannot go through. Written for a model: say what to do next. */
export const MCP_RELAY_REFUSAL_TEXT: Record<McpRelayRefusal, string> = {
  not_granted: 'Connected AI apps is not available for this Kindredly family. Do not retry.',
  ai_off:
    "This family's AI setting is not On, so an AI app cannot use Kindredly. An adult can change it in Kindredly's settings. Do not retry.",
  switch_off:
    "Connected AI apps is turned off for this family. An adult can turn it on in Kindredly's settings. Do not retry.",
  not_adult: 'This connection does not belong to an adult in the family, so it cannot be used. Do not retry.',
  not_connected: "Kindredly is not open on any of this person's devices. Ask them to open Kindredly, then try again.",
  other_person:
    "Kindredly is open on this person's devices, but signed in as someone else. Ask them to switch back to themselves in Kindredly, then try again.",
  busy: 'Too many requests in a short time. Wait a minute, then try again.',
  too_large: 'This request is too large. Send a shorter one.',
  timeout: 'Kindredly did not answer in time. Ask the person to check that Kindredly is open, then try again.',
  awaiting_agree:
    'Kindredly is asking the person to tap Agree on the Kindredly they want you to use. Ask them to, then try again.',
  declined: 'The person tapped Deny in Kindredly. Do not retry unless they ask you to.',
  undeliverable: 'Kindredly could not run this request. Do not retry it unchanged.',
};

/** What a person reads when they cannot connect an AI app (settings page, sign-in page). */
const PERSON_REFUSAL_TEXT: Partial<Record<McpRelayRefusal, string>> = {
  not_granted: 'Connected AI apps is not available for your family.',
  ai_off: "Your family's AI setting isn't On.",
  switch_off: 'Connected AI apps is turned off for your family.',
  not_adult: 'Only an adult in the family can connect an AI app.',
};

export function personRefusalText(reason: McpRelayRefusal): string {
  return PERSON_REFUSAL_TEXT[reason] || MCP_RELAY_REFUSAL_TEXT[reason].replace(' Do not retry.', '');
}

export class McpRelayError extends Error {
  constructor(readonly reason: McpRelayRefusal) {
    super(MCP_RELAY_REFUSAL_TEXT[reason]);
  }
}

/** The only way this file logs: an event name and, at most, a connection id. */
function relayLog(event: string, connectionId?: string): void {
  console.info(`[mcpRelay] ${event}${connectionId ? ` ${connectionId}` : ''}`);
}

/** `clientInfo` from an `initialize` request: name, version and title, each trimmed to 100. */
export function cleanClientInfo(raw: unknown): McpRelayClientInfo | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const info: McpRelayClientInfo = {};
  for (const key of ['name', 'version', 'title'] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) info[key] = value.trim().slice(0, 100);
  }
  return Object.keys(info).length ? info : null;
}

function sameClientInfo(a: McpRelayClientInfo, b: McpRelayClientInfo | null | undefined): boolean {
  return !!b && a.name === b.name && a.version === b.version && a.title === b.title;
}

export function hashRelayToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const today = () => new Date().toISOString().slice(0, 10);
const replyChannel = (taskId: string) => `mcpRelay:reply:${taskId}`;
const answerersKey = (userId: string) => `mcpRelay:answerers:${userId}`;
const answererAtKey = (clientId: string) => `mcpRelay:answererAt:${clientId}`;
const pairingKey = (connectionId: string) => `mcpRelay:pairing:${connectionId}`;
const redeemKey = (redeemToken: string) => `mcpRelay:redeem:${hashRelayToken(redeemToken)}`;
/** When the adult last brought this Kindredly to the front: what "used last" means (HAT-847). */
const answererUsedKey = (clientId: string) => `mcpRelay:answererUsed:${clientId}`;

/** What travels to a device: a plaintext call (URL connection) or a sealed one. */
type OutgoingFrame = Omit<McpRelayFrame, 'frameId' | 'replyTo'> | Omit<McpRelaySealedFrame, 'frameId' | 'replyTo'>;

type Pending = {
  userId: string;
  connectionId: string;
  delivered: boolean;
  onDelivered: () => void;
  resolve: (value: unknown) => void;
  reject: (error: McpRelayError) => void;
};

/** `trySession`: the Kindredly with the session did not take the frame. */
const NOT_DELIVERED = Symbol('notDelivered');

type BusMessage =
  | {type: 'delivered'; frameId: string}
  | {type: 'reply'; frameId: string; userId: string; status: McpRelayReplyRequest['status']; result?: unknown};

function toView(row: McpRelayChannelRow, viewerId: string): McpRelayConnectionView {
  const day = row.lastUsedAt ? new Date(row.lastUsedAt).toISOString().slice(0, 10) : null;
  return {
    _id: row._id,
    userId: row.userId,
    clientName: row.clientName,
    sealed: row.sealed === true,
    createdAt: new Date(row.createdAt).toISOString(),
    lastUsedAt: day,
    mine: row.userId === viewerId,
    ...(row.clientInfo?.version ? {appVersion: row.clientInfo.version} : {}),
  };
}

export default class McpRelayService {
  private static _instance: McpRelayService | null = null;
  static get instance(): McpRelayService {
    if (!this._instance) this._instance = new McpRelayService();
    return this._instance;
  }

  private readonly taskId = `${process.env.HOSTNAME || 'local'}-${process.pid}-${randomBytes(4).toString('hex')}`;
  private readonly pending = new Map<string, Pending>();
  private readonly inFlight = new Map<string, number>();
  private readonly touchedDay = new Map<string, string>();
  /** Streams this process holds that were registered as answerers, to drop when they close. */
  private readonly localAnswerers = new Map<string, string>();
  private wired = false;

  constructor(
    private readonly repo = new McpRelayChannelRepo(),
    private readonly accounts = new AccountRepo(),
    private readonly users = new UserRepo(),
    private readonly kv: KeyValueStore = getKeyValueStore(),
    private readonly bus: EventBus = getEventBus(),
    private readonly sse: SSEManager = SSEManager.getInstance(),
    private readonly userPrefs: Pick<UserPrefRepo, 'getUserPref'> = new UserPrefRepo(),
  ) {}

  /** Subscribes this process to the relay's two channels. Called once, when the routes start. */
  async start(): Promise<void> {
    if (this.wired) return;
    this.wired = true;
    this.sse.onConnectionRemoved((clientId) => this.dropLocalAnswerer(clientId));
    await this.bus.subscribe(FRAMES_CHANNEL, (message) => this.onFrameMessage(message));
    await this.bus.subscribe(replyChannel(this.taskId), (message) => this.onReplyMessage(message));
  }

  // ── The five conditions ────────────────────────────────────────────────────────────────────

  /** Conditions 1–4, in order. The first that fails is returned, so the refusal can name it. */
  async gate(accountId: string, userId: string): Promise<McpRelayRefusal | null> {
    const account: any = await this.accounts.findById(accountId);
    if (account?.sysOptions?.connectedAiApps !== true) return 'not_granted';
    if (account?.options?.aiSetting !== 'on') return 'ai_off';
    if (account?.options?.mcpRelayEnabled !== true) return 'switch_off';
    const user: any = await this.users.findById(userId);
    if (!user || user.deleted || user.accountId !== accountId || user.type !== UserType.admin) return 'not_adult';
    return null;
  }

  async status(accountId: string, userId: string): Promise<McpRelayStatus> {
    const account: any = await this.accounts.findById(accountId);
    const user: any = await this.users.findById(userId);
    const available = account?.sysOptions?.connectedAiApps === true;
    return {
      available,
      familyAiOn: account?.options?.aiSetting === 'on',
      enabled: available && account?.options?.mcpRelayEnabled === true,
      canConnect: available && !!user && user.type === UserType.admin,
    };
  }

  /** The family switch. Only an adult; turning it on also needs conditions 1 and 2. */
  async setEnabled(accountId: string, userId: string, enabled: boolean): Promise<McpRelayStatus> {
    const account: any = await this.accounts.findById(accountId);
    const user: any = await this.users.findById(userId);
    if (!account || !user || user.accountId !== accountId || user.type !== UserType.admin) {
      throw new Error('Only an adult in the family can change this.');
    }
    if (enabled === true) {
      if (account.sysOptions?.connectedAiApps !== true)
        throw new Error('Connected AI apps is not available for this family.');
      if (account.options?.aiSetting !== 'on') throw new Error('Turn Family AI on first.');
    }
    const options = {...(account.options || {}), mcpRelayEnabled: enabled === true};
    await this.accounts.updateWithId(accountId, {options} as any);
    relayLog(enabled === true ? 'switch on' : 'switch off');
    return this.status(accountId, userId);
  }

  // ── Connections ────────────────────────────────────────────────────────────────────────────

  /**
   * Removes connections nobody finished: a pairing code the AI app's program never used or the
   * device never completed, or an AI app sign-in whose code was never exchanged. Ten minutes is the
   * pairing code's life, and an OAuth code lives one. Without this each abandoned try kept one of the
   * family's five places for good.
   */
  private async pruneUnfinished(accountId: string): Promise<McpRelayChannelRow[]> {
    const cutoff = Date.now() - PAIRING_TTL_SEC * 1000;
    const kept: McpRelayChannelRow[] = [];
    for (const row of await this.repo.listByAccount(accountId)) {
      const unfinished = (row.sealed && !row.wrappedKey) || (!!row.oauthClientId && !row.refreshHash);
      if (unfinished && new Date(row.createdAt).getTime() < cutoff) {
        await this.repo.deleteWithId(row._id);
        relayLog('unfinished connection removed', row._id);
      } else {
        kept.push(row);
      }
    }
    return kept;
  }

  async listConnections(accountId: string, userId: string): Promise<McpRelayConnectionView[]> {
    if ((await this.status(accountId, userId)).available !== true) return [];
    return (await this.pruneUnfinished(accountId)).map((row) => toView(row, userId));
  }

  /** Which Kindredly answers this adult's AI apps: their own saved choice, default ask first. */
  private async routing(userId: string): Promise<McpRelayRouting> {
    try {
      return readMcpRelayRouting(await this.userPrefs.getUserPref(userId, MCP_RELAY_ROUTING_PREF_KEY));
    } catch {
      // Unread is the default, which asks: never connect without asking because a read failed.
      return readMcpRelayRouting(null);
    }
  }

  /** The adult agreed to this AI app connecting without asking, and that time has not ended (HAT-880). */
  private async agreedToConnect(channel: McpRelayChannelRow): Promise<boolean> {
    try {
      const saved = await this.userPrefs.getUserPref(
        channel.userId,
        mcpRelayAgreedUntilPrefKey(channel._id, 'connect'),
      );
      return readMcpRelayAgreedUntil(saved) !== null;
    } catch {
      // A read that failed asks, as the default does.
      return false;
    }
  }

  /** A URL connection for an AI app that takes a bearer token. The token is returned once. */
  async createUrlConnection(
    accountId: string,
    userId: string,
    clientName: string,
  ): Promise<{connection: McpRelayConnectionView; token: string}> {
    const refusal = await this.gate(accountId, userId);
    if (refusal) throw new Error(personRefusalText(refusal));
    const name = typeof clientName === 'string' ? clientName.trim().slice(0, 100) : '';
    if (!name) throw new Error('Give the AI app a name.');
    if ((await this.pruneUnfinished(accountId)).length >= MAX_CONNECTIONS_PER_ACCOUNT) {
      throw new Error(`A family can connect up to ${MAX_CONNECTIONS_PER_ACCOUNT} AI apps. Remove one first.`);
    }
    const token = `${MCP_RELAY_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    const row = await this.repo.insert({
      _id: `mrc_${uuidv4()}`,
      accountId,
      userId,
      clientName: name,
      sealed: false,
      keyHash: hashRelayToken(token),
      wrappedKey: null,
    });
    relayLog('connection created', row._id);
    return {connection: toView(row, userId), token};
  }

  /** A connection made by OAuth sign-in. The caller has already checked the five conditions. */
  async createOauthConnection(
    accountId: string,
    userId: string,
    clientName: string,
    oauthClientId: string,
  ): Promise<McpRelayChannelRow> {
    if ((await this.pruneUnfinished(accountId)).length >= MAX_CONNECTIONS_PER_ACCOUNT) {
      throw new Error(`A family can connect up to ${MAX_CONNECTIONS_PER_ACCOUNT} AI apps. Remove one first.`);
    }
    const row = await this.repo.insert({
      _id: `mrc_${uuidv4()}`,
      accountId,
      userId,
      clientName: String(clientName || 'AI app').slice(0, 100),
      sealed: false,
      keyHash: null,
      wrappedKey: null,
      oauthClientId,
    });
    relayLog('connection created', row._id);
    return row;
  }

  /** Any adult in the family may remove any of the family's connections. */
  async removeConnection(accountId: string, userId: string, connectionId: string): Promise<boolean> {
    const user: any = await this.users.findById(userId);
    const row = await this.repo.findById(String(connectionId || ''));
    if (!row || row.accountId !== accountId) return false;
    if (!user || user.accountId !== accountId || user.type !== UserType.admin) {
      throw new Error('Only an adult in the family can remove an AI app.');
    }
    const removed = (await this.repo.deleteWithId(row._id)) === 1;
    if (removed) {
      relayLog('connection removed', row._id);
      await this.sessions.end(row.userId, row._id, false);
    }
    return removed;
  }

  /** The connection a bearer token belongs to, or null. Says nothing about the five conditions. */
  async verifyToken(raw: string | null | undefined): Promise<McpRelayChannelRow | null> {
    if (typeof raw !== 'string' || !raw.startsWith(MCP_RELAY_TOKEN_PREFIX) || raw.length > 200) return null;
    return (await this.repo.findByKeyHash(hashRelayToken(raw))) || null;
  }

  // ── End-to-end encrypted connections: pairing ──────────────────────────────────────────────

  /**
   * A device starts pairing with its public key. Returns the first half of the pairing code; the
   * device adds the pair secret, which never reaches the server.
   */
  async startPairing(
    accountId: string,
    userId: string,
    extPub: string,
  ): Promise<{connectionId: string; redeemToken: string}> {
    const refusal = await this.gate(accountId, userId);
    if (refusal) throw new Error(personRefusalText(refusal));
    if (typeof extPub !== 'string' || !PUBLIC_KEY_PATTERN.test(extPub)) throw new Error('Not a public key.');
    if ((await this.pruneUnfinished(accountId)).length >= MAX_CONNECTIONS_PER_ACCOUNT) {
      throw new Error(`A family can connect up to ${MAX_CONNECTIONS_PER_ACCOUNT} AI apps. Remove one first.`);
    }
    const row = await this.repo.insert({
      _id: `mrc_${uuidv4()}`,
      accountId,
      userId,
      clientName: 'AI app',
      sealed: true,
      keyHash: null,
      wrappedKey: null,
    });
    const redeemToken = randomBytes(18).toString('base64url');
    await this.kv.setex(pairingKey(row._id), PAIRING_TTL_SEC, JSON.stringify({extPub, shimPub: null}));
    await this.kv.setex(redeemKey(redeemToken), PAIRING_TTL_SEC, row._id);
    relayLog('pairing started', row._id);
    return {connectionId: row._id, redeemToken};
  }

  /**
   * The program redeems the first half of the code with its public key. No sign-in: the code is the
   * credential, and only the request that deletes it goes on.
   */
  async redeemPairing(redeemToken: string, shimPub: string, clientName?: string): Promise<McpRelayPairingRedeemed> {
    const fail = () => new Error('This pairing code is wrong, used or expired. Make a new one in Kindredly.');
    if (typeof redeemToken !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(redeemToken)) throw fail();
    if (typeof shimPub !== 'string' || !PUBLIC_KEY_PATTERN.test(shimPub)) throw new Error('Not a public key.');
    const key = redeemKey(redeemToken);
    const connectionId = await this.kv.get(key);
    if (!connectionId || (await this.kv.del(key)) !== 1) throw fail();
    const row = await this.repo.findById(connectionId);
    const state = await this.kv.get(pairingKey(connectionId));
    if (!row || !row.sealed || !state) throw fail();
    const refusal = await this.gate(row.accountId, row.userId);
    if (refusal) throw new Error(MCP_RELAY_REFUSAL_TEXT[refusal]);
    const token = `${MCP_RELAY_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    const name = typeof clientName === 'string' && clientName.trim() ? clientName.trim().slice(0, 100) : 'AI app';
    if (!(await this.repo.setKeyHashOnce(row._id, hashRelayToken(token), name))) throw fail();
    const {extPub} = JSON.parse(state);
    await this.kv.setex(pairingKey(row._id), PAIRING_TTL_SEC, JSON.stringify({extPub, shimPub}));
    relayLog('pairing redeemed', row._id);
    return {connectionId: row._id, token, extPub};
  }

  private async ownSealedRow(accountId: string, userId: string, connectionId: string) {
    const row = await this.repo.findById(String(connectionId || ''));
    if (!row || !row.sealed || row.accountId !== accountId || row.userId !== userId) {
      throw new Error('No such end-to-end encrypted connection.');
    }
    return row;
  }

  /** The pairing device waits for the program's public key. */
  async pairingStatus(accountId: string, userId: string, connectionId: string): Promise<{shimPub: string | null}> {
    const row = await this.ownSealedRow(accountId, userId, connectionId);
    const state = await this.kv.get(pairingKey(row._id));
    return {shimPub: state ? JSON.parse(state).shimPub || null : null};
  }

  /** The device stores the channel key, encrypted with the adult's own secret key. */
  async finishPairing(accountId: string, userId: string, connectionId: string, wrappedKey: string): Promise<boolean> {
    const row = await this.ownSealedRow(accountId, userId, connectionId);
    if (typeof wrappedKey !== 'string' || !wrappedKey || wrappedKey.length > 8000) throw new Error('Not a key.');
    if (!row.keyHash) throw new Error('The AI app has not used the pairing code yet.');
    await this.repo.setWrappedKey(row._id, wrappedKey);
    await this.kv.del(pairingKey(row._id));
    relayLog('pairing finished', row._id);
    return true;
  }

  /** The encrypted channel key, for any of the adult's devices to open a sealed call with. */
  async connectionKey(accountId: string, userId: string, connectionId: string): Promise<{wrappedKey: string | null}> {
    const row = await this.ownSealedRow(accountId, userId, connectionId);
    return {wrappedKey: row.wrappedKey || null};
  }

  // ── Answering devices ──────────────────────────────────────────────────────────────────────

  /**
   * A device opened its stream saying it takes relay calls (`relay=1`). Registered only in a
   * granted family and for an adult; the switch and Family AI are checked at call time, so turning
   * them on later works without the device reconnecting.
   */
  async onStreamOpened(accountId: string, userId: string, clientId: string): Promise<void> {
    const account: any = await this.accounts.findById(accountId);
    if (account?.sysOptions?.connectedAiApps !== true) return;
    const user: any = await this.users.findById(userId);
    if (!user || user.type !== UserType.admin) return;
    await this.kv.sadd(answerersKey(userId), clientId);
    await this.kv.expire(answerersKey(userId), ANSWERER_TTL_SEC);
    // Who registered it: a device keeps its clientId when it reconnects, possibly to another
    // process, and only the process holding the newest stream may take the entry away again.
    await this.kv.setex(answererAtKey(clientId), ANSWERER_TTL_SEC, `${Date.now()}|${this.taskId}`);
    this.localAnswerers.set(clientId, userId);
  }

  /**
   * A stream this process held closed. Forgets the device only if this process still owns its
   * registration: a late close of an old socket must not remove the entry a newer stream, on another
   * process, just made for the same device.
   */
  private dropLocalAnswerer(clientId: string): void {
    const userId = this.localAnswerers.get(clientId);
    if (!userId) return;
    this.localAnswerers.delete(clientId);
    this.kv
      .get(answererAtKey(clientId))
      .then((registered) => {
        if (!registered || registered.endsWith(`|${this.taskId}`)) return this.forgetAnswerer(userId, clientId);
      })
      .catch(() => relayLog('answerer cleanup failed'));
  }

  private async forgetAnswerer(userId: string, clientId: string): Promise<void> {
    await this.kv.srem(answerersKey(userId), clientId);
    await this.kv.del(answererAtKey(clientId), answererUsedKey(clientId));
  }

  /**
   * The adult's answering devices, used last first: when the adult last brought each to the front,
   * or, for one never brought forward, when it connected. A reconnect alone does not move a device up.
   */
  private async answerers(userId: string): Promise<string[]> {
    const ids = await this.kv.smembers(answerersKey(userId));
    if (ids.length === 0) return [];
    const [at, used] = await Promise.all([
      this.kv.mget(ids.map(answererAtKey)),
      this.kv.mget(ids.map(answererUsedKey)),
    ]);
    return ids
      .map((id, i) => ({id, at: Number(used[i]) || Number(String(at[i] || '0').split('|')[0]) || 0}))
      .sort((a, b) => b.at - a.at)
      .map((a) => a.id);
  }

  // ── One call ───────────────────────────────────────────────────────────────────────────────

  /**
   * Passes one call to the adult's newest open device and returns what it answered. Throws
   * `McpRelayError` with the reason when any condition fails or no device answers.
   */
  async call(
    channel: McpRelayChannelRow,
    op: McpRelayFrame['op'],
    name?: string,
    args?: Record<string, unknown>,
  ): Promise<unknown> {
    const refusal = await this.gate(channel.accountId, channel.userId);
    if (refusal) throw new McpRelayError(refusal);
    if (channel.sealed) throw new McpRelayError('undeliverable');
    const frame: OutgoingFrame = {
      connectionId: channel._id,
      userId: channel.userId,
      sealed: false,
      op,
      ...(op === 'callTool' ? {name: String(name || ''), arguments: args || {}} : {}),
      clientName: channel.clientName,
      ...(channel.clientInfo?.version ? {clientVersion: channel.clientInfo.version} : {}),
    };
    return this.relayFrame(channel, frame);
  }

  /**
   * Keeps what the AI app says it is when it starts a session (AIM-1): `initialize`'s `clientInfo`.
   * Written only when it changed. The log line says that it changed, never what it says.
   */
  async recordClientInfo(channel: McpRelayChannelRow, raw: unknown): Promise<void> {
    const info = cleanClientInfo(raw);
    if (!info) return;
    if (sameClientInfo(info, channel.clientInfo)) return;
    const event = channel.clientInfo ? 'client info changed' : 'client info recorded';
    await this.repo.setClientInfo(channel._id, info);
    channel.clientInfo = info;
    relayLog(event, channel._id);
  }

  /**
   * An end-to-end encrypted call: the envelope goes to the device as it came, and the device's sealed
   * reply comes back as it came. This server cannot open either, so it cannot tell a tool list from a
   * tool call; the program owns those deadlines.
   */
  async callSealed(channel: McpRelayChannelRow, envelope: McpRelaySealedEnvelope): Promise<unknown> {
    const refusal = await this.gate(channel.accountId, channel.userId);
    if (refusal) throw new McpRelayError(refusal);
    if (!channel.sealed || !channel.wrappedKey) throw new McpRelayError('undeliverable');
    const valid =
      envelope?.format === 'mcprelay-v1' &&
      envelope?.alg === 'AES-GCM' &&
      typeof envelope.rid === 'string' &&
      typeof envelope.iv === 'string' &&
      typeof envelope.data === 'string';
    if (!valid) throw new McpRelayError('undeliverable');
    const frame: OutgoingFrame = {
      connectionId: channel._id,
      userId: channel.userId,
      sealed: true,
      op: 'sealed',
      envelope: {format: envelope.format, alg: envelope.alg, rid: envelope.rid, iv: envelope.iv, data: envelope.data},
    };
    return this.relayFrame(channel, frame);
  }

  /** One Kindredly answers each connection: the one where the adult tapped Agree (HAT-814). */
  get sessions(): McpRelaySessions {
    return (this._sessions ||= new McpRelaySessions(this.kv, this.sse));
  }
  private _sessions: McpRelaySessions | null = null;

  /** Caps, then the Kindredly with the session, asking the adult for one first if there is none. */
  private async relayFrame(channel: McpRelayChannelRow, frame: OutgoingFrame): Promise<unknown> {
    const minute = Math.floor(Date.now() / 60_000);
    const rateKey = `mcpRelay:rate:${channel._id}:${minute}`;
    const count = await this.kv.incr(rateKey);
    if (count === 1) await this.kv.expire(rateKey, 120);
    if (count > MAX_CALLS_PER_MINUTE) throw new McpRelayError('busy');
    if ((this.inFlight.get(channel._id) || 0) >= MAX_IN_FLIGHT_PER_CONNECTION) throw new McpRelayError('busy');
    if (JSON.stringify(frame).length > DOWN_FRAME_MAX_CHARS) throw new McpRelayError('too_large');

    this.touchLastUsed(channel._id);
    this.inFlight.set(channel._id, (this.inFlight.get(channel._id) || 0) + 1);
    try {
      const deadline = Date.now() + DEADLINE_MS;
      const routing = await this.routing(channel.userId);
      // Agreed for a set time (HAT-880): this AI app connects as if asking were off, until it ends.
      const askFirst = routing.askFirst && !(await this.agreedToConnect(channel));
      // With asking off there is no Kindredly agreed on, so the one used last answers.
      const followRecent = !askFirst || routing.device === 'recent';
      let session = await this.sessions.session(channel._id);
      if (session && !followRecent) {
        const attempt = await this.trySession(channel, session.clientId, frame, deadline);
        if (attempt !== NOT_DELIVERED) return attempt;
        // The Kindredly with the session is gone: the session ends, and the adult is asked again.
        await this.forgetAnswerer(channel.userId, session.clientId);
        await this.sessions.end(channel.userId, channel._id, false);
        session = null;
      }
      // Agreed already, or asking is off and Disconnect was not the adult's last word: the
      // Kindredly used last answers (HAT-847).
      if (session || (!askFirst && !(await this.sessions.askNext(channel._id)))) {
        return await this.tryRecent(channel, frame, deadline);
      }

      const open = (await this.answerers(channel.userId)).length > 0;
      if (!open && frame.op === 'listTools') throw new McpRelayError('not_connected');
      // Asked even with none open: a Kindredly opened while the call waits shows the ask.
      await this.sessions.ask(channel.userId, channel._id);
      if (frame.op === 'listTools') throw new McpRelayError('awaiting_agree');
      const answer = await this.sessions.waitForAnswer(channel._id, Math.min(deadline, Date.now() + ASK_WAIT_MS));
      if (answer === 'denied') throw new McpRelayError('declined');
      session = await this.sessions.session(channel._id);
      if (!session) {
        const openNow = (await this.answerers(channel.userId)).length > 0;
        throw new McpRelayError(openNow ? 'awaiting_agree' : 'not_connected');
      }
      if (followRecent) return await this.tryRecent(channel, frame, deadline);
      const attempt = await this.trySession(channel, session.clientId, frame, deadline);
      if (attempt !== NOT_DELIVERED) return attempt;
      throw new McpRelayError('not_connected');
    } finally {
      const left = (this.inFlight.get(channel._id) || 1) - 1;
      if (left > 0) this.inFlight.set(channel._id, left);
      else this.inFlight.delete(channel._id);
    }
  }

  /**
   * The frame to the Kindredly with the session. Its result, or NOT_DELIVERED when that Kindredly
   * is gone. Signed in as someone else, it keeps the session: they may switch back.
   */
  private async trySession(
    channel: McpRelayChannelRow,
    clientId: string,
    frame: OutgoingFrame,
    deadline: number,
  ): Promise<unknown> {
    const attempt = await this.tryDevice(channel, clientId, frame, deadline);
    if (attempt.otherPerson) throw new McpRelayError('other_person');
    if (!attempt.delivered) return NOT_DELIVERED;
    await this.sessions.keepAlive(channel._id, clientId);
    return attempt.result;
  }

  /**
   * The frame to the Kindredly used last that takes it, which then holds the session (HAT-847). One
   * that is gone is forgotten and the next tried; one signed in as someone else is skipped.
   */
  private async tryRecent(channel: McpRelayChannelRow, frame: OutgoingFrame, deadline: number): Promise<unknown> {
    let otherPerson = false;
    for (const clientId of await this.answerers(channel.userId)) {
      if (Date.now() >= deadline) break;
      const attempt = await this.tryDevice(channel, clientId, frame, deadline);
      if (attempt.delivered) {
        await this.sessions.place(channel.userId, channel._id, clientId);
        return attempt.result;
      }
      if (attempt.otherPerson) otherPerson = true;
      else await this.forgetAnswerer(channel.userId, clientId);
    }
    throw new McpRelayError(otherPerson ? 'other_person' : 'not_connected');
  }

  /** Agree on the Kindredly making the request (HAT-814). False when it cannot answer AI apps. */
  async agreeSession(
    accountId: string,
    userId: string,
    connectionId: string,
    streamClientId: string,
  ): Promise<boolean> {
    const row = await this.ownRow(accountId, userId, connectionId);
    if (!row) return false;
    if (!(await this.answerers(userId)).includes(streamClientId)) return false;
    await this.markUsed(streamClientId);
    await this.sessions.agree(userId, row._id, streamClientId);
    relayLog('session agreed', row._id);
    return true;
  }

  async denySession(accountId: string, userId: string, connectionId: string): Promise<boolean> {
    const row = await this.ownRow(accountId, userId, connectionId);
    if (!row) return false;
    await this.sessions.deny(userId, row._id);
    return true;
  }

  /** Disconnect, from the Kindredly with the session or any other of the adult's. */
  async endSession(accountId: string, userId: string, connectionId: string): Promise<boolean> {
    const row = await this.ownRow(accountId, userId, connectionId);
    if (!row) return false;
    await this.sessions.end(userId, row._id);
    relayLog('session ended', row._id);
    return true;
  }

  /**
   * The adult's connections answering on this Kindredly, or asking for Agree. `front`: the adult
   * just opened Kindredly here or brought it to the front, so it is now the one used last.
   */
  async sessionState(
    accountId: string,
    userId: string,
    streamClientId: string,
    front = false,
  ): Promise<McpRelaySessionView[]> {
    if ((await this.gate(accountId, userId)) !== null) return [];
    // Agree works only on a Kindredly the relay can send calls to, so only one of those is asked.
    if (!(await this.answerers(userId)).includes(streamClientId)) return [];
    if (front) await this.markUsed(streamClientId);
    const mine = (await this.repo.listByAccount(accountId)).filter((r) => r.userId === userId);
    return this.sessions.views(mine, streamClientId);
  }

  private async markUsed(clientId: string): Promise<void> {
    await this.kv.setex(answererUsedKey(clientId), ANSWERER_TTL_SEC, String(Date.now()));
  }

  /** The connection, only when it is this adult's own. */
  private async ownRow(accountId: string, userId: string, connectionId: string): Promise<McpRelayChannelRow | null> {
    const row = await this.repo.findById(String(connectionId || ''));
    return row && row.accountId === accountId && row.userId === userId ? row : null;
  }

  private async tryDevice(
    channel: McpRelayChannelRow,
    clientId: string,
    frame: OutgoingFrame,
    deadline: number,
  ): Promise<{delivered: boolean; result?: unknown; otherPerson?: boolean}> {
    const frameId = uuidv4();
    let markDelivered: () => void = () => {};
    const delivered = new Promise<void>((resolve) => (markDelivered = resolve));
    const answered = new Promise<unknown>((resolve, reject) => {
      // Tracked before publishing: a reply must never be able to arrive before its waiter.
      this.pending.set(frameId, {
        userId: channel.userId,
        connectionId: channel._id,
        delivered: false,
        onDelivered: markDelivered,
        resolve,
        reject,
      });
    });
    answered.catch(() => {});

    let timer: NodeJS.Timeout | undefined;
    try {
      await this.bus.publish(
        FRAMES_CHANNEL,
        JSON.stringify({clientId, replyTo: this.taskId, frame: {...frame, frameId, replyTo: this.taskId}}),
      );
      const wasDelivered = await Promise.race([
        delivered.then(() => true),
        new Promise<boolean>((resolve) => (timer = setTimeout(() => resolve(false), DELIVERY_WAIT_MS))),
      ]);
      clearTimeout(timer);
      if (!wasDelivered) return {delivered: false};

      const left = Math.max(0, deadline - Date.now());
      try {
        const result = await Promise.race([
          answered,
          new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new McpRelayError('timeout')), left))),
        ]);
        return {delivered: true, result};
      } catch (error) {
        if (error instanceof McpRelayError && error.reason === 'other_person')
          return {delivered: false, otherPerson: true};
        throw error;
      }
    } finally {
      clearTimeout(timer);
      this.pending.delete(frameId);
    }
  }

  /** Every process: write the frame if this one holds the device's stream, and say so. */
  private onFrameMessage(message: string): void {
    let parsed: {clientId: string; replyTo: string; frame: McpRelayFrame};
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    if (!parsed?.clientId || !this.sse.hasLocalConnection(parsed.clientId)) return;
    if (!this.sse.sendToLocal(parsed.clientId, MCP_RELAY_FRAME_EVENT, parsed.frame)) return;
    const note: BusMessage = {type: 'delivered', frameId: parsed.frame.frameId};
    this.bus.publish(replyChannel(parsed.replyTo), JSON.stringify(note)).catch(() => relayLog('delivery note failed'));
  }

  /** This process's own channel: deliveries and replies for calls waiting here. */
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
      waiting.delivered = true;
      waiting.onDelivered();
      return;
    }
    if (parsed.type !== 'reply') return;
    // A device signed in as someone else ran nothing and replies with that person's sign-in, so the
    // reply is not held to the adult's. It carries no result; it only moves the call on to the
    // adult's next device, and only a device that was sent the frame knows its id.
    if (parsed.status === 'notHere') {
      waiting.onDelivered();
      this.pending.delete(parsed.frameId);
      waiting.reject(new McpRelayError('other_person'));
      return;
    }
    if (parsed.userId !== waiting.userId) return;
    // A reply also proves delivery, in case the delivery note was lost.
    waiting.onDelivered();
    this.pending.delete(parsed.frameId);
    if (parsed.status === 'ok') waiting.resolve(parsed.result);
    else waiting.reject(new McpRelayError('undeliverable'));
  }

  /**
   * The device's reply, from whichever process the request reached. Forwarded to the waiting
   * process's channel only, even when that is this one: one code path for one process or eight.
   */
  async acceptReply(userId: string, body: McpRelayReplyRequest): Promise<boolean> {
    const frameId = typeof body?.frameId === 'string' ? body.frameId : '';
    const replyTo = typeof body?.replyTo === 'string' ? body.replyTo : '';
    const status = body?.status === 'ok' || body?.status === 'notHere' ? body.status : 'undeliverable';
    if (!frameId || !replyTo || replyTo.length > 200) return false;
    const message: BusMessage = {
      type: 'reply',
      frameId,
      userId,
      status,
      ...(status === 'ok' ? {result: body.result} : {}),
    };
    const encoded = JSON.stringify(message);
    if (encoded.length > UP_FRAME_MAX_CHARS) {
      const refused: BusMessage = {type: 'reply', frameId, userId, status: 'undeliverable'};
      await this.bus.publish(replyChannel(replyTo), JSON.stringify(refused));
      return false;
    }
    await this.bus.publish(replyChannel(replyTo), encoded);
    return true;
  }

  /** At most one write a day per connection per process. */
  private touchLastUsed(connectionId: string): void {
    const day = today();
    if (this.touchedDay.get(connectionId) === day) return;
    this.touchedDay.set(connectionId, day);
    this.repo.touchLastUsed(connectionId, day).catch(() => relayLog('lastUsedAt write failed', connectionId));
  }
}
