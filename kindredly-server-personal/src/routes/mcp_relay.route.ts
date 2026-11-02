import express, {NextFunction, Request, Response, Router} from 'express';
import {Routes} from '@interfaces/routes.interface';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {ApiReq} from '@/types/api-types';
import McpRelayService, {McpRelayError} from '@/services/mcp_relay.service';
import {handleRelayMcpMessage, relayCallFor} from '@/services/mcp_relay_protocol';
import McpRelayOauthService, {OauthError} from '@/services/mcp_relay_oauth.service';
import McpPermissionService from '@/services/mcp_permission.service';
import McpUploadService, {fileFromMultipart, McpUploadError, MCP_UPLOAD_MAX_BYTES} from '@/services/mcp_upload.service';
import {config} from '@/config';

/**
 * Connected AI apps (HAT-616, docs/proposals/connected-ai-apps.md).
 *
 * - `/mcpRelay/mcp`: the AI app's MCP endpoint. Takes a connection token (`kmr_…`) or an OAuth
 *   access token (`kmra_…`), never a JWT.
 * - `/mcpRelay/oauth/*` and the `.well-known` documents: OAuth sign-in for AI apps that need it
 *   (Claude on the web, ChatGPT). `McpRelayWellKnownRoute` serves the same documents at the host's
 *   root, where RFC 8414 discovery looks.
 * - `/mcpRelay/reply`: an adult's device hands back one call's result.
 * - the rest: the settings page — the family switch and the list of connected AI apps.
 *
 * The frame routes parse their own bodies (512 KB) and never log a parse error's text, which quotes
 * the body. Nothing about a call is logged anywhere in this path.
 */
const relayJson = express.json({limit: '512kb'});

/** Parses the body; a bad body is a 400 with no detail, never an error that reaches a log. */
function parseRelayBody(req: Request, res: Response, next: NextFunction) {
  relayJson(req, res, (err?: unknown) => {
    if (err) return res.status(400).json({jsonrpc: '2.0', id: null, error: {code: -32700, message: 'Parse error.'}});
    next();
  });
}

/** The API's public address with its version path, as the AI app reached it. */
export function publicApiBase(req: Request): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();
  const proto = forwardedProto || req.protocol || 'https';
  const host = forwardedHost || req.get('host') || 'localhost';
  return `${proto}://${host}/${config.apiVersion}`;
}

/** Where `/oauth/authorize` sends the person: the consent page in the signed-in app. */
function consentPageUrl(requestId: string): string {
  const base = process.env.MCP_RELAY_CONSENT_URL || `${config.serverHostname}/kindredapp/#/connect/ai-app`;
  return `${base}?request=${encodeURIComponent(requestId)}`;
}

function sendOauthError(res: Response, e: unknown) {
  res.set('Cache-Control', 'no-store');
  if (e instanceof OauthError) return res.status(e.status).json({error: e.code, error_description: e.description});
  return res.status(500).json({error: 'server_error'});
}

/** A plain page for an authorization request that must not be sent back to the AI app. */
function authorizeErrorPage(res: Response, message: string) {
  const text = message.replace(/[<>&"]/g, '');
  res
    .status(400)
    .type('html')
    .send(
      `<!doctype html><meta charset="utf-8"><title>Kindredly</title>` +
        `<p style="font-family:system-ui;margin:2rem">${text} Start again from the AI app.</p>`,
    );
}

/** An upload link's body: the file's bytes, or a form holding it (HAT-964). Room for a form's headers. */
const uploadRaw = express.raw({type: () => true, limit: MCP_UPLOAD_MAX_BYTES + 1024 * 1024});

function parseUploadBody(req: Request, res: Response, next: NextFunction) {
  uploadRaw(req, res, (err?: any) => {
    if (!err) return next();
    const tooBig = err?.status === 413 || err?.type === 'entity.too.large';
    res.status(tooBig ? 413 : 400).json({
      status: 'failed',
      message: tooBig
        ? 'The file is over 20 MB, too large to add. Add it in the Kindredly app instead.'
        : 'The file could not be read. Send the file itself as the body.',
    });
  });
}

/** Where opening an upload link in a browser goes: a page in the signed-in app to pick the file. */
function uploadPageUrl(token: string): string {
  const base = process.env.MCP_RELAY_UPLOAD_PAGE_URL || `${config.serverHostname}/kindredapp/#/connect/upload`;
  return `${base}?token=${encodeURIComponent(token)}`;
}

/** How long the sender waits for a Kindredly to file what it sent, so it can say it is in. */
const UPLOAD_WAIT_MS = 20_000;
const UPLOAD_CHECK_MS = 1_000;

let oauthService: McpRelayOauthService | null = null;
/** Made on first use, so importing this file opens no store. */
const oauth = () => (oauthService ||= new McpRelayOauthService());

class McpRelayRoute implements Routes {
  public router = Router();
  private relay = McpRelayService.instance;
  private permission = McpPermissionService.instance;
  private uploads = McpUploadService.instance;
  private get oauth() {
    return oauth();
  }

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.relay.start().catch(() => console.error('[mcpRelay] could not subscribe'));
    this.initializeRoutes();
  }

  /**
   * Lets the request through only with the token of an existing connection of the right kind: a URL
   * connection on `/mcpRelay/mcp`, an end-to-end encrypted one on `/mcpRelay/call`. A sealed
   * connection's token never reaches the plaintext endpoint, and the reverse.
   */
  private connectionAuth = (sealed: boolean) => async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const raw = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    try {
      const found = (await this.relay.verifyToken(raw)) || (sealed ? null : await this.oauth.verifyAccessToken(raw));
      const channel = found && found.sealed === sealed ? found : null;
      if (!channel) {
        // Tells an OAuth client where to start signing in (RFC 9728).
        res.set(
          'WWW-Authenticate',
          `Bearer resource_metadata="${publicApiBase(req)}/mcpRelay/.well-known/oauth-protected-resource"`,
        );
        return res.status(401).json({
          jsonrpc: '2.0',
          id: null,
          error: {code: -32001, message: 'Connection token missing, wrong or removed.'},
        });
      }
      (req as any).relayChannel = channel;
      next();
    } catch {
      return res.status(500).json({jsonrpc: '2.0', id: null, error: {code: -32603, message: 'Internal error.'}});
    }
  };

  private initializeRoutes() {
    // ---- The AI app's MCP endpoint (stateless Streamable HTTP, POST only) ----
    this.router.post('/mcpRelay/mcp', parseRelayBody, this.connectionAuth(false), async (req, res) => {
      try {
        const channel = (req as any).relayChannel;
        const call = relayCallFor(channel, this.relay);
        const onClientInfo = (info: unknown) => this.relay.recordClientInfo(channel, info);
        const body = req.body;
        if (Array.isArray(body)) {
          const responses = [];
          for (const msg of body) {
            const r = await handleRelayMcpMessage(msg, call, onClientInfo);
            if (r) responses.push(r);
          }
          if (responses.length === 0) return res.status(202).end();
          return res.json(responses);
        }
        const response = await handleRelayMcpMessage(body, call, onClientInfo);
        if (!response) return res.status(202).end();
        return res.json(response);
      } catch {
        return res.status(500).json({jsonrpc: '2.0', id: null, error: {code: -32603, message: 'Internal error.'}});
      }
    });
    this.router.get('/mcpRelay/mcp', this.connectionAuth(false), (_req, res) => {
      res.status(405).json({
        jsonrpc: '2.0',
        id: null,
        error: {code: -32000, message: 'Method Not Allowed: this MCP endpoint is stateless (POST only).'},
      });
    });

    // ---- End-to-end encrypted connections (MCP-16) ----
    this.router.post('/mcpRelay/call', parseRelayBody, this.connectionAuth(true), async (req, res) => {
      try {
        const envelope = await this.relay.callSealed((req as any).relayChannel, req.body?.envelope);
        res.json({envelope});
      } catch (e) {
        res.json({error: e instanceof McpRelayError ? e.message : 'Kindredly could not run this request.'});
      }
    });
    this.router.post(
      '/mcpRelay/pairing/start',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/pairing/start'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.relay.startPairing(ctx.accountId, ctx.getCurrentUserId(), req.body?.extPub);
        res.json({success: true, results});
      }),
    );
    // No sign-in: the program has only the pairing code, which is the credential.
    this.router.post(
      '/mcpRelay/pairing/redeem',
      errorHelper(async (req: ApiReq<'/mcpRelay/pairing/redeem'>, res) => {
        const results = await this.relay.redeemPairing(req.body?.redeemToken, req.body?.shimPub, req.body?.clientName);
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/mcpRelay/pairing/status',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/pairing/status'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.relay.pairingStatus(ctx.accountId, ctx.getCurrentUserId(), req.body?.connectionId);
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/mcpRelay/pairing/finish',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/pairing/finish'>, res) => {
        const ctx = RequestContext.instance(req);
        const finished = await this.relay.finishPairing(
          ctx.accountId,
          ctx.getCurrentUserId(),
          req.body?.connectionId,
          req.body?.wrappedKey,
        );
        res.json({success: true, results: {finished}});
      }),
    );
    this.router.post(
      '/mcpRelay/connections/key',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/connections/key'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.relay.connectionKey(ctx.accountId, ctx.getCurrentUserId(), req.body?.connectionId);
        res.json({success: true, results});
      }),
    );

    // ---- One Kindredly answers an AI app at a time (HAT-814) ----
    // The Kindredly is the one making the request: its stream is `<userId>-<clientId>`, as in sync.route.
    const streamOf = (ctx: RequestContext) => `${ctx.getCurrentUserId()}-${ctx.getClientId()}`;
    this.router.post(
      '/mcpRelay/session/state',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/session/state'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.relay.sessionState(
          ctx.accountId,
          ctx.getCurrentUserId(),
          streamOf(ctx),
          req.body?.front === true,
        );
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/mcpRelay/session/agree',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/session/agree'>, res) => {
        const ctx = RequestContext.instance(req);
        const agreed = await this.relay.agreeSession(
          ctx.accountId,
          ctx.getCurrentUserId(),
          req.body?.connectionId,
          streamOf(ctx),
        );
        res.json({success: true, results: {agreed}});
      }),
    );
    this.router.post(
      '/mcpRelay/session/deny',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/session/deny'>, res) => {
        const ctx = RequestContext.instance(req);
        const denied = await this.relay.denySession(ctx.accountId, ctx.getCurrentUserId(), req.body?.connectionId);
        res.json({success: true, results: {denied}});
      }),
    );
    this.router.post(
      '/mcpRelay/session/end',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/session/end'>, res) => {
        const ctx = RequestContext.instance(req);
        const ended = await this.relay.endSession(ctx.accountId, ctx.getCurrentUserId(), req.body?.connectionId);
        res.json({success: true, results: {ended}});
      }),
    );

    // ---- OAuth sign-in (MCP-20) ----
    this.router.get('/mcpRelay/.well-known/oauth-protected-resource', (req, res) => {
      res.json(this.oauth.protectedResourceMetadata(publicApiBase(req)));
    });
    const serverMetadata = (req: Request, res: Response) => {
      res.json(this.oauth.authorizationServerMetadata(publicApiBase(req)));
    };
    this.router.get('/mcpRelay/.well-known/oauth-authorization-server', serverMetadata);
    this.router.get('/mcpRelay/.well-known/openid-configuration', serverMetadata);
    this.router.post('/mcpRelay/oauth/register', async (req, res) => {
      try {
        res.set('Cache-Control', 'no-store');
        res.status(201).json(await this.oauth.register(req.body, req.ip));
      } catch (e) {
        sendOauthError(res, e);
      }
    });
    this.router.get('/mcpRelay/oauth/authorize', async (req, res) => {
      try {
        const requestId = await this.oauth.startAuthorization(req.query);
        res.redirect(302, consentPageUrl(requestId));
      } catch (e) {
        authorizeErrorPage(res, e instanceof OauthError ? e.description : 'This sign-in request could not be read.');
      }
    });
    this.router.post('/mcpRelay/oauth/token', async (req, res) => {
      try {
        res.set('Cache-Control', 'no-store');
        res.json(await this.oauth.token(req.body));
      } catch (e) {
        sendOauthError(res, e);
      }
    });
    // The consent page, signed in as usual.
    this.router.post(
      '/mcpRelay/oauth/request',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/oauth/request'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.oauth.describeRequest(req.body?.requestId, ctx.accountId, ctx.getCurrentUserId());
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/mcpRelay/oauth/decide',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/oauth/decide'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.oauth.decide(
          req.body?.requestId,
          ctx.accountId,
          ctx.getCurrentUserId(),
          req.body?.allow === true,
        );
        res.json({success: true, results});
      }),
    );

    // ---- The answering device ----
    this.router.post('/mcpRelay/reply', parseRelayBody, authenticateJWT, async (req, res) => {
      try {
        const ctx = RequestContext.instance(req);
        const accepted = await this.relay.acceptReply(ctx.getCurrentUserId(), (req as ApiReq<'/mcpRelay/reply'>).body);
        res.json({success: true, results: {accepted}});
      } catch {
        res.json({success: false, message: 'Reply not accepted.'});
      }
    });

    // ---- An AI app asking an adult's permission (HAT-690) ----
    this.router.post(
      '/mcpPermission/create',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpPermission/create'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.permission.create(
          ctx.accountId,
          ctx.getCurrentUserId(),
          req.body?.blob,
          req.body?.argsHash,
        );
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/mcpPermission/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpPermission/list'>, res) => {
        const ctx = RequestContext.instance(req);
        res.json({success: true, results: await this.permission.list(ctx.getCurrentUserId())});
      }),
    );
    this.router.post(
      '/mcpPermission/decide',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpPermission/decide'>, res) => {
        const ctx = RequestContext.instance(req);
        const decided = await this.permission.decide(
          ctx.getCurrentUserId(),
          req.body?.requestId,
          req.body?.approved === true,
        );
        res.json({success: true, results: {decided}});
      }),
    );
    this.router.post(
      '/mcpPermission/status',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpPermission/status'>, res) => {
        const ctx = RequestContext.instance(req);
        const status = await this.permission.status(ctx.getCurrentUserId(), req.body?.requestId);
        res.json({success: true, results: {status}});
      }),
    );
    this.router.post(
      '/mcpPermission/take',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpPermission/take'>, res) => {
        const ctx = RequestContext.instance(req);
        const approved = await this.permission.take(ctx.getCurrentUserId(), req.body?.argsHash);
        res.json({success: true, results: {approved}});
      }),
    );

    // ---- A file an AI app sends by link (HAT-964) ----
    this.router.post(
      '/mcpUpload/create',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpUpload/create'>, res) => {
        const ctx = RequestContext.instance(req);
        try {
          const made = await this.uploads.create(ctx.accountId, ctx.getCurrentUserId(), req.body?.blob);
          const url = `${publicApiBase(req)}/mcpRelay/upload?t=${encodeURIComponent(made.token)}`;
          res.json({success: true, results: {_id: made._id, url, expiresAt: made.expiresAt}});
        } catch (e) {
          if (!(e instanceof McpUploadError)) throw e;
          res.json({success: false, message: e.message});
        }
      }),
    );
    this.router.post(
      '/mcpUpload/open',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpUpload/open'>, res) => {
        const ctx = RequestContext.instance(req);
        res.json({success: true, results: await this.uploads.open(ctx.getCurrentUserId(), req.body?.token)});
      }),
    );
    this.router.post(
      '/mcpUpload/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpUpload/list'>, res) => {
        const ctx = RequestContext.instance(req);
        res.json({success: true, results: await this.uploads.listReceived(ctx.getCurrentUserId())});
      }),
    );
    this.router.post(
      '/mcpUpload/claim',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpUpload/claim'>, res) => {
        const ctx = RequestContext.instance(req);
        res.json({success: true, results: await this.uploads.claim(ctx.getCurrentUserId(), req.body?.uploadId)});
      }),
    );
    this.router.post(
      '/mcpUpload/finish',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpUpload/finish'>, res) => {
        const ctx = RequestContext.instance(req);
        const finished = await this.uploads.finish(
          ctx.getCurrentUserId(),
          req.body?.uploadId,
          req.body?.added === true,
        );
        res.json({success: true, results: {finished}});
      }),
    );
    // The link itself. No JWT: the token in it is the credential, and it takes one file.
    this.router.get('/mcpRelay/upload', (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.redirect(302, uploadPageUrl(String(req.query.t || '')));
    });
    const receiveUpload = async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      const token = String(req.query.t || '');
      const contentType = String(req.headers['content-type'] || '');
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const form = /^multipart\/form-data/i.test(contentType) ? fileFromMultipart(body, contentType) : null;
      const sent = form || {
        bytes: body,
        filename: typeof req.query.filename === 'string' ? req.query.filename : undefined,
        fileType: contentType.split(';')[0].trim() || undefined,
      };
      try {
        await this.uploads.receive(token, sent.bytes, {filename: sent.filename, fileType: sent.fileType});
      } catch (e) {
        if (e instanceof McpUploadError) return res.status(e.status).json({status: 'failed', message: e.message});
        return res.status(500).json({status: 'failed', message: 'The file could not be received. Try again.'});
      }
      const deadline = Date.now() + UPLOAD_WAIT_MS;
      let status = await this.uploads.statusForToken(token);
      while (status === 'received' && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, UPLOAD_CHECK_MS));
        status = await this.uploads.statusForToken(token);
      }
      if (status === 'done') return res.json({status, message: 'Added to the Kindredly library.'});
      if (status === 'failed') {
        return res.json({
          status,
          message: "Kindredly couldn't add the file. Ask the person to add it in the Kindredly app.",
        });
      }
      return res.status(202).json({
        status: 'received',
        message: 'Received. Kindredly adds it to the library as soon as it is open on one of their devices.',
      });
    };
    // POST only: the server takes no PUT anywhere (app.ts).
    this.router.post('/mcpRelay/upload', parseUploadBody, receiveUpload);

    // ---- The settings page ----
    this.router.post(
      '/mcpRelay/status',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/status'>, res) => {
        const ctx = RequestContext.instance(req);
        res.json({success: true, results: await this.relay.status(ctx.accountId, ctx.getCurrentUserId())});
      }),
    );
    this.router.post(
      '/mcpRelay/setEnabled',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/setEnabled'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.relay.setEnabled(ctx.accountId, ctx.getCurrentUserId(), req.body?.enabled === true);
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/mcpRelay/connections/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/connections/list'>, res) => {
        const ctx = RequestContext.instance(req);
        res.json({success: true, results: await this.relay.listConnections(ctx.accountId, ctx.getCurrentUserId())});
      }),
    );
    this.router.post(
      '/mcpRelay/connections/create',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/connections/create'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.relay.createUrlConnection(
          ctx.accountId,
          ctx.getCurrentUserId(),
          req.body?.clientName,
        );
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/mcpRelay/connections/remove',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/mcpRelay/connections/remove'>, res) => {
        const ctx = RequestContext.instance(req);
        const removed = await this.relay.removeConnection(
          ctx.accountId,
          ctx.getCurrentUserId(),
          req.body?.connectionId,
        );
        res.json({success: true, results: {removed}});
      }),
    );
  }
}

/**
 * The OAuth discovery documents at the host's root, where RFC 8414 and RFC 9728 path insertion look
 * (`/.well-known/oauth-authorization-server/v3.0/mcpRelay`). Mounted at `/`, outside the API version.
 */
export class McpRelayWellKnownRoute {
  public router = Router();

  constructor() {
    const v = config.apiVersion;
    const resource = (req: Request, res: Response) => res.json(oauth().protectedResourceMetadata(publicApiBase(req)));
    const server = (req: Request, res: Response) => res.json(oauth().authorizationServerMetadata(publicApiBase(req)));
    this.router.get(`/.well-known/oauth-protected-resource/${v}/mcpRelay/mcp`, resource);
    this.router.get(`/.well-known/oauth-authorization-server/${v}/mcpRelay`, server);
    this.router.get(`/.well-known/openid-configuration/${v}/mcpRelay`, server);
  }
}

export default McpRelayRoute;
