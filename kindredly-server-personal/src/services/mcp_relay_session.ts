/**
 * One Kindredly answers an AI app at a time (HAT-814).
 *
 * Which one is the adult's choice (HAT-847, `McpRelayRouting`): the Kindredly where they tapped
 * Agree, or the Kindredly they used last, and whether an AI app asks for Agree first at all. In
 * every case the Kindredly answering holds the session, so it shows the bar with Disconnect.
 *
 * An AI app's connection has at most one session: the Kindredly (one device's stream, by its
 * clientId) where the adult tapped Agree. Only that Kindredly is sent the AI app's calls, and it
 * shows a bar saying so, with Disconnect. With no session, every Kindredly the adult has open shows
 * the ask; Agree on one makes it the session. The session ends on Disconnect, when the adult agrees
 * on another Kindredly, or after 30 minutes without a call, and the next call asks again.
 *
 * A Kindredly is named by its stream's id, `<userId>-<clientId>` (`sync.route.ts`), the same id the
 * relay sends frames to. Kept: the connection's session (that id, until when) and whether it is being asked or was
 * declined, each with its own expiry. About a call, only the tool's name while it waits for Agree, so
 * the ask says what it is for (HAT-1071, founder 2026-11-09); never its arguments or its result. Devices are told only that something
 * changed (`mcpRelaySession`, the connection id) and read the rest from `/mcpRelay/session/state`.
 */
import type {KeyValueStore} from '@/base/kv_store';
import type {McpRelayChannelRow} from '@/db/mcp_relay_channel.repo';
import type SSEManager from '@/services/sse.manager';
import type {McpRelaySessionView} from 'tset-sharedlib/api';

export const MCP_RELAY_SESSION_EVENT = 'mcpRelaySession';
/** A session nobody has called through for this long ends, like an idle remote desktop. */
export const SESSION_IDLE_SEC = 30 * 60;
/** How long the ask stays up, and how long a Deny keeps the AI app from asking again. */
const ASK_TTL_SEC = 2 * 60;
const DENIED_TTL_SEC = 60;
/** How long a call waits for Agree. The AI app's own deadline is longer (see `DEADLINE_MS`). */
export const ASK_WAIT_MS = 45_000;
const POLL_MS = 500;

const sessionKey = (connectionId: string) => `mcpRelay:session:${connectionId}`;
const askKey = (connectionId: string) => `mcpRelay:ask:${connectionId}`;
/** The tool the call waiting for Agree is for, for as long as the ask is up. */
const askToolKey = (connectionId: string) => `mcpRelay:askTool:${connectionId}`;
/** Set by Disconnect: the next call asks for Agree even with asking turned off. Not durable. */
const askNextKey = (connectionId: string) => `mcpRelay:askNext:${connectionId}`;
const ASK_NEXT_TTL_SEC = 30 * 24 * 3600;

type Session = {clientId: string; until: number};
type ViewRow = Pick<McpRelayChannelRow, '_id' | 'clientName' | 'clientInfo' | 'oauthClientId' | 'sealed' | 'createdAt'>;

/** Which AI app a connection is, and how and when it was made (HAT-1071). */
function who(c: ViewRow): Pick<McpRelaySessionView, 'connectionId' | 'clientName' | 'app' | 'madeBy' | 'createdAt'> {
  return {
    connectionId: c._id,
    clientName: c.clientName,
    ...(c.clientInfo ? {app: c.clientInfo} : {}),
    madeBy: c.sealed ? 'paired' : c.oauthClientId ? 'signIn' : 'token',
    createdAt: new Date(c.createdAt).toISOString(),
  };
}
export type AskAnswer = 'agreed' | 'denied' | 'waiting';

export class McpRelaySessions {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly sse: Pick<SSEManager, 'broadcastToUser'>,
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async session(connectionId: string): Promise<Session | null> {
    const raw = await this.kv.get(sessionKey(connectionId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Session;
      return typeof parsed?.clientId === 'string' && parsed.until > this.now() ? parsed : null;
    } catch {
      return null;
    }
  }

  /** A call went through: the session lasts another 30 minutes from now. */
  async keepAlive(connectionId: string, clientId: string): Promise<void> {
    const until = this.now() + SESSION_IDLE_SEC * 1000;
    await this.kv.setex(sessionKey(connectionId), SESSION_IDLE_SEC, JSON.stringify({clientId, until}));
  }

  /**
   * The Kindredly that answered a call holds the session from now: the one used last, when the adult
   * chose that. Every Kindredly is told when the session starts or moves, so the bar follows it.
   */
  async place(userId: string, connectionId: string, clientId: string): Promise<void> {
    const before = await this.session(connectionId);
    await this.keepAlive(connectionId, clientId);
    if (before?.clientId !== clientId) await this.tell(userId, connectionId);
  }

  /** Disconnect was the adult's last word on this connection, so its next call asks. */
  async askNext(connectionId: string): Promise<boolean> {
    return (await this.kv.get(askNextKey(connectionId))) === '1';
  }

  /**
   * Puts the ask up on every Kindredly the adult has open, unless it is up or was just declined.
   * `tool`: what the call is for, kept as long as the ask; the first call's, while it is up.
   * True when this call put it up, so the ask names this call's tool.
   */
  async ask(userId: string, connectionId: string, tool?: string): Promise<boolean> {
    const placed = await this.kv.setIfAbsent(askKey(connectionId), 'asking', ASK_TTL_SEC);
    if (!placed) return false;
    if (tool) await this.kv.setex(askToolKey(connectionId), ASK_TTL_SEC, tool);
    else await this.kv.del(askToolKey(connectionId));
    await this.tell(userId, connectionId);
    return true;
  }

  /** Waits for Agree or Deny on any Kindredly, until `deadline`. */
  async waitForAnswer(connectionId: string, deadline: number): Promise<AskAnswer> {
    for (;;) {
      if (await this.session(connectionId)) return 'agreed';
      if ((await this.kv.get(askKey(connectionId))) === 'denied') return 'denied';
      if (this.now() + POLL_MS > deadline) return 'waiting';
      await this.sleep(POLL_MS);
    }
  }

  /** Agree on this Kindredly. The caller checked that the connection is this adult's. */
  async agree(userId: string, connectionId: string, clientId: string): Promise<void> {
    await this.keepAlive(connectionId, clientId);
    await this.kv.del(askKey(connectionId), askToolKey(connectionId), askNextKey(connectionId));
    await this.tell(userId, connectionId);
  }

  async deny(userId: string, connectionId: string): Promise<void> {
    await this.kv.setex(askKey(connectionId), DENIED_TTL_SEC, 'denied');
    await this.kv.del(askToolKey(connectionId));
    await this.tell(userId, connectionId);
  }

  /**
   * Disconnect: the next call asks again, even with asking turned off. `askNext` false ends the
   * session without that, for a Kindredly that went away or a connection that was removed.
   */
  async end(userId: string, connectionId: string, askNext = true): Promise<void> {
    await this.kv.del(sessionKey(connectionId), askKey(connectionId), askToolKey(connectionId));
    if (askNext) await this.kv.setex(askNextKey(connectionId), ASK_NEXT_TTL_SEC, '1');
    else await this.kv.del(askNextKey(connectionId));
    await this.tell(userId, connectionId);
  }

  /**
   * For the bar on the Kindredly whose stream is `streamClientId`: each of these connections whose
   * session is here, or which is asking. A session on another Kindredly is not shown here.
   */
  async views(connections: ViewRow[], streamClientId: string): Promise<McpRelaySessionView[]> {
    const views: McpRelaySessionView[] = [];
    for (const c of connections) {
      const session = await this.session(c._id);
      if (session) {
        if (session.clientId !== streamClientId) continue;
        views.push({...who(c), state: 'here', until: new Date(session.until).toISOString()});
      } else if ((await this.kv.get(askKey(c._id))) === 'asking') {
        const tool = await this.kv.get(askToolKey(c._id));
        views.push({...who(c), state: 'asking', until: null, ...(tool ? {wantsTool: tool} : {})});
      }
    }
    return views;
  }

  private async tell(userId: string, connectionId: string): Promise<void> {
    await this.sse.broadcastToUser(userId, MCP_RELAY_SESSION_EVENT, {connectionId}).catch(() => undefined);
  }
}
