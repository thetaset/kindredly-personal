/**
 * OAuth sign-in for Connected AI apps (HAT-616, MCP-20; docs/proposals/connected-ai-apps.md).
 *
 * Claude on the web, Claude Desktop's connectors and ChatGPT add a remote MCP server by URL and sign
 * in with OAuth 2.1; they cannot send a fixed bearer token. This is the smallest authorization server
 * that lets them, for this one resource:
 *
 *   - discovery: protected-resource metadata (RFC 9728) and authorization-server metadata (RFC 8414)
 *   - clients: a Client ID Metadata Document (the client id is an https URL we fetch) or Dynamic
 *     Client Registration (`/oauth/register`)
 *   - `/oauth/authorize` sends the person to a consent page in the app, signed in as usual, which
 *     names the AI app and says "Not end-to-end encrypted". Allow creates the connection.
 *   - `/oauth/token`: authorization code + PKCE (S256 only) → a one-hour access token and a refresh
 *     token that rotates on every use. A replayed old refresh token ends the connection.
 *
 * Tokens are random strings stored only as SHA-256 hashes: access tokens in Redis for an hour,
 * refresh tokens on the connection's row. Removing the connection ends both.
 *
 * Nothing here logs a token, a code or anything an AI app sends.
 */
import {createHash, randomBytes} from 'crypto';
import axios from 'axios';
import {v4 as uuidv4} from 'uuid';
import {McpRelayChannelRepo, McpRelayChannelRow} from '@/db/mcp_relay_channel.repo';
import {getKeyValueStore} from '@/base/runtime.factory';
import type {KeyValueStore} from '@/base/kv_store';
import McpRelayService, {personRefusalText} from '@/services/mcp_relay.service';
import {safeFetchConfig} from '@/utils/safe_fetch';

export const MCP_RELAY_SCOPE = 'kindredly.read';
export const ACCESS_TOKEN_PREFIX = 'kmra_';
const REFRESH_TOKEN_PREFIX = 'kmrr_';
const AUTH_REQUEST_TTL_SEC = 10 * 60;
const CODE_TTL_SEC = 60;
export const ACCESS_TOKEN_TTL_SEC = 60 * 60;
const CLIENT_METADATA_TTL_SEC = 60 * 60;
const CLIENT_METADATA_MAX_BYTES = 10_000;
const MAX_REDIRECT_URIS = 5;
const MAX_REGISTRATIONS_PER_HOUR = 20;

/** An OAuth error, as the token and registration endpoints return it (RFC 6749 §5.2). */
export class OauthError extends Error {
  constructor(
    readonly code: string,
    readonly description: string,
    readonly status = 400,
  ) {
    super(description);
  }
}

type OauthClient = {clientId: string; clientName: string; redirectUris: string[]};
type AuthRequest = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
};
type CodeGrant = {channelId: string; clientId: string; redirectUri: string; codeChallenge: string};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const sha256b64url = (value: string) => createHash('sha256').update(value).digest('base64url');
const randomToken = (prefix: string) => `${prefix}${randomBytes(32).toString('base64url')}`;

/** https anywhere, or http on this computer (an AI app running locally, like Claude Code). */
function isAllowedRedirect(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > 2000) return false;
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === 'https:') return true;
    return (
      u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]')
    );
  } catch {
    return false;
  }
}

/** Exact match; on this computer the port may differ (RFC 8252 §7.3). */
export function redirectMatches(registered: string[], requested: string): boolean {
  if (registered.includes(requested)) return true;
  try {
    const want = new URL(requested);
    if (want.protocol !== 'http:') return false;
    return registered.some((r) => {
      try {
        const have = new URL(r);
        return (
          have.protocol === 'http:' &&
          have.hostname === want.hostname &&
          have.pathname === want.pathname &&
          have.search === want.search
        );
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function cleanName(value: unknown, fallbackFrom: string[]): string {
  const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 100) : '';
  if (name) return name;
  try {
    return new URL(fallbackFrom[0]).hostname || 'AI app';
  } catch {
    return 'AI app';
  }
}

async function fetchClientMetadata(url: string): Promise<unknown> {
  const res = await axios.get(
    url,
    safeFetchConfig({
      timeout: 3000,
      maxContentLength: CLIENT_METADATA_MAX_BYTES,
      responseType: 'json',
      headers: {Accept: 'application/json'},
    }),
  );
  return res.data;
}

export default class McpRelayOauthService {
  constructor(
    private readonly repo = new McpRelayChannelRepo(),
    private readonly relay: McpRelayService = McpRelayService.instance,
    private readonly kv: KeyValueStore = getKeyValueStore(),
    private readonly fetchJson: (url: string) => Promise<unknown> = fetchClientMetadata,
  ) {}

  // ── Discovery ──────────────────────────────────────────────────────────────────────────────

  /** `apiBase` is the API's public address with its version path, e.g. `https://api4…/v3.0`. */
  protectedResourceMetadata(apiBase: string) {
    return {
      resource: `${apiBase}/mcpRelay/mcp`,
      authorization_servers: [`${apiBase}/mcpRelay`],
      bearer_methods_supported: ['header'],
      scopes_supported: [MCP_RELAY_SCOPE],
      resource_name: 'Kindredly',
    };
  }

  authorizationServerMetadata(apiBase: string) {
    const issuer = `${apiBase}/mcpRelay`;
    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      scopes_supported: [MCP_RELAY_SCOPE],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      client_id_metadata_document_supported: true,
    };
  }

  // ── Clients ────────────────────────────────────────────────────────────────────────────────

  /**
   * Dynamic Client Registration (RFC 7591), public clients only. No sign-in, so it is capped per
   * address: an AI app registers once, and nobody fills the table.
   */
  async register(body: any, ip = 'unknown') {
    const hour = Math.floor(Date.now() / 3_600_000);
    const capKey = `mcpRelay:register:${sha256(String(ip))}:${hour}`;
    const count = await this.kv.incr(capKey);
    if (count === 1) await this.kv.expire(capKey, 7200);
    if (count > MAX_REGISTRATIONS_PER_HOUR) {
      throw new OauthError(
        'temporarily_unavailable',
        'Too many registrations from this address. Try again later.',
        429,
      );
    }
    const redirectUris = Array.isArray(body?.redirect_uris) ? body.redirect_uris : [];
    if (
      redirectUris.length === 0 ||
      redirectUris.length > MAX_REDIRECT_URIS ||
      !redirectUris.every(isAllowedRedirect)
    ) {
      throw new OauthError('invalid_redirect_uri', 'redirect_uris must be 1 to 5 https or local http addresses.');
    }
    const authMethod = body?.token_endpoint_auth_method;
    if (authMethod !== undefined && authMethod !== 'none') {
      throw new OauthError(
        'invalid_client_metadata',
        'Only public clients are supported (token_endpoint_auth_method "none").',
      );
    }
    const clientId = `kmrc_${uuidv4()}`;
    const clientName = cleanName(body?.client_name, redirectUris);
    await this.repo.insertOauthClient({_id: clientId, clientName, redirectUris});
    return {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }

  /** A registered client, or a Client ID Metadata Document fetched from its https client id. */
  async resolveClient(clientId: unknown): Promise<OauthClient | null> {
    if (typeof clientId !== 'string' || !clientId || clientId.length > 2000) return null;
    if (!clientId.startsWith('https://')) {
      const row = await this.repo.findOauthClient(clientId);
      if (!row) return null;
      const uris = Array.isArray(row.redirectUris) ? row.redirectUris : JSON.parse(String(row.redirectUris || '[]'));
      return {clientId, clientName: row.clientName, redirectUris: uris};
    }
    const cacheKey = `mcpRelay:cimd:${sha256(clientId)}`;
    const cached = await this.kv.get(cacheKey);
    if (cached) return JSON.parse(cached);
    let doc: any;
    try {
      doc = await this.fetchJson(clientId);
    } catch {
      return null;
    }
    const uris = Array.isArray(doc?.redirect_uris)
      ? doc.redirect_uris.filter(isAllowedRedirect).slice(0, MAX_REDIRECT_URIS)
      : [];
    if (doc?.client_id !== clientId || uris.length === 0) return null;
    const client: OauthClient = {clientId, clientName: cleanName(doc?.client_name, uris), redirectUris: uris};
    await this.kv.setex(cacheKey, CLIENT_METADATA_TTL_SEC, JSON.stringify(client));
    return client;
  }

  // ── Authorization ──────────────────────────────────────────────────────────────────────────

  /**
   * Checks an authorization request and keeps it for the consent page. Throws `OauthError` for a
   * request that must not be redirected back (an unknown client or redirect address).
   */
  async startAuthorization(query: any): Promise<string> {
    const client = await this.resolveClient(query?.client_id);
    if (!client) throw new OauthError('invalid_client', 'Unknown AI app.');
    const redirectUri = String(query?.redirect_uri || '');
    if (!redirectUri || !redirectMatches(client.redirectUris, redirectUri)) {
      throw new OauthError('invalid_request', 'This return address is not registered for the AI app.');
    }
    if (query?.response_type !== 'code') throw new OauthError('unsupported_response_type', 'Only "code" is supported.');
    const challenge = String(query?.code_challenge || '');
    if (query?.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) {
      throw new OauthError('invalid_request', 'PKCE with S256 is required.');
    }
    const requestId = randomBytes(18).toString('base64url');
    const request: AuthRequest = {
      clientId: client.clientId,
      clientName: client.clientName,
      redirectUri,
      codeChallenge: challenge,
      state: typeof query?.state === 'string' ? query.state.slice(0, 500) : null,
    };
    await this.kv.setex(`mcpRelay:authreq:${requestId}`, AUTH_REQUEST_TTL_SEC, JSON.stringify(request));
    return requestId;
  }

  private async loadRequest(requestId: unknown): Promise<AuthRequest> {
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{10,64}$/.test(requestId)) {
      throw new Error('This sign-in link has expired. Start again from the AI app.');
    }
    const raw = await this.kv.get(`mcpRelay:authreq:${requestId}`);
    if (!raw) throw new Error('This sign-in link has expired. Start again from the AI app.');
    return JSON.parse(raw);
  }

  /** What the consent page shows, including why the signed-in person cannot allow it, if they cannot. */
  async describeRequest(requestId: unknown, accountId: string, userId: string) {
    const request = await this.loadRequest(requestId);
    const refusal = await this.relay.gate(accountId, userId);
    return {
      clientName: request.clientName,
      redirectHost: new URL(request.redirectUri).host,
      refusal: refusal ? personRefusalText(refusal) : null,
    };
  }

  /** Allow or deny. Returns where to send the browser: back to the AI app, with a code or an error. */
  async decide(requestId: unknown, accountId: string, userId: string, allow: boolean): Promise<{redirectUrl: string}> {
    const request = await this.loadRequest(requestId);
    const back = new URL(request.redirectUri);
    if (request.state !== null) back.searchParams.set('state', request.state);
    if (!allow) {
      await this.kv.del(`mcpRelay:authreq:${requestId}`);
      back.searchParams.set('error', 'access_denied');
      return {redirectUrl: back.toString()};
    }
    const refusal = await this.relay.gate(accountId, userId);
    if (refusal) throw new Error(personRefusalText(refusal));
    // Single use: whoever deletes the request is the one who goes on.
    if ((await this.kv.del(`mcpRelay:authreq:${requestId}`)) !== 1) {
      throw new Error('This sign-in link has already been used. Start again from the AI app.');
    }
    const channel = await this.relay.createOauthConnection(accountId, userId, request.clientName, request.clientId);
    const code = randomBytes(32).toString('base64url');
    const grant: CodeGrant = {
      channelId: channel._id,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
    };
    await this.kv.setex(`mcpRelay:code:${sha256(code)}`, CODE_TTL_SEC, JSON.stringify(grant));
    back.searchParams.set('code', code);
    return {redirectUrl: back.toString()};
  }

  // ── Tokens ─────────────────────────────────────────────────────────────────────────────────

  async token(body: any) {
    if (body?.grant_type === 'authorization_code') return this.exchangeCode(body);
    if (body?.grant_type === 'refresh_token') return this.refresh(body);
    throw new OauthError('unsupported_grant_type', 'Use authorization_code or refresh_token.');
  }

  private async exchangeCode(body: any) {
    const code = typeof body?.code === 'string' ? body.code : '';
    const key = `mcpRelay:code:${sha256(code)}`;
    const raw = code ? await this.kv.get(key) : null;
    // Single use: only the request that deletes the code may use it.
    if (!raw || (await this.kv.del(key)) !== 1)
      throw new OauthError('invalid_grant', 'The code is wrong, used or expired.');
    const grant: CodeGrant = JSON.parse(raw);
    if (body?.client_id !== undefined && body.client_id !== grant.clientId) {
      throw new OauthError('invalid_grant', 'The code was issued to a different AI app.');
    }
    if (body?.redirect_uri !== undefined && body.redirect_uri !== grant.redirectUri) {
      throw new OauthError('invalid_grant', 'The return address does not match.');
    }
    const verifier = typeof body?.code_verifier === 'string' ? body.code_verifier : '';
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || sha256b64url(verifier) !== grant.codeChallenge) {
      throw new OauthError('invalid_grant', 'PKCE verification failed.');
    }
    const channel = await this.repo.findById(grant.channelId);
    if (!channel) throw new OauthError('invalid_grant', 'This connection was removed.');
    const refreshToken = randomToken(REFRESH_TOKEN_PREFIX);
    await this.repo.setRefreshHash(channel._id, sha256(refreshToken));
    return this.issue(channel, refreshToken);
  }

  private async refresh(body: any) {
    const presented = typeof body?.refresh_token === 'string' ? body.refresh_token : '';
    if (!presented.startsWith(REFRESH_TOKEN_PREFIX)) throw new OauthError('invalid_grant', 'Unknown refresh token.');
    const hash = sha256(presented);
    const channel = await this.repo.findByRefreshHash(hash);
    if (!channel) {
      // A token that was already replaced: someone kept a copy. End the connection.
      const replayed = await this.repo.findByPrevRefreshHash(hash);
      if (replayed) await this.repo.deleteWithId(replayed._id);
      throw new OauthError('invalid_grant', 'This refresh token is no longer valid. Sign in again.');
    }
    if (body?.client_id !== undefined && channel.oauthClientId && body.client_id !== channel.oauthClientId) {
      throw new OauthError('invalid_grant', 'The refresh token was issued to a different AI app.');
    }
    const next = randomToken(REFRESH_TOKEN_PREFIX);
    if (!(await this.repo.rotateRefresh(channel._id, hash, sha256(next)))) {
      throw new OauthError('invalid_grant', 'This refresh token is no longer valid. Sign in again.');
    }
    return this.issue(channel, next);
  }

  private async issue(channel: McpRelayChannelRow, refreshToken: string) {
    const accessToken = randomToken(ACCESS_TOKEN_PREFIX);
    await this.kv.setex(`mcpRelay:access:${sha256(accessToken)}`, ACCESS_TOKEN_TTL_SEC, channel._id);
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SEC,
      refresh_token: refreshToken,
      scope: MCP_RELAY_SCOPE,
    };
  }

  /** The connection an access token belongs to, or null when it is wrong, expired or removed. */
  async verifyAccessToken(raw: string | null | undefined): Promise<McpRelayChannelRow | null> {
    if (typeof raw !== 'string' || !raw.startsWith(ACCESS_TOKEN_PREFIX) || raw.length > 200) return null;
    const channelId = await this.kv.get(`mcpRelay:access:${sha256(raw)}`);
    if (!channelId) return null;
    return (await this.repo.findById(channelId)) || null;
  }
}
