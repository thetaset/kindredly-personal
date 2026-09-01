import {config} from '@/config';

import {startRecurringJobs} from '@/base/recurring_jobs';
import SystemRoute from '@/routes/system.route';
import {logger, stream} from '@/utils/logger';
import {Routes} from '@interfaces/routes.interface';
import errorMiddleware from '@middlewares/error.middleware';
import {serveWebapp} from '@/base/webapp_static';
import {requestShapeObserverMiddleware} from '@middlewares/request_shape_observer.middleware';
import {authorizationObserverMiddleware} from '@middlewares/authorization_observer.middleware';
import AuthRoute from '@routes/auth.route';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import knex from './db/knex_config';
import {loginSpeedLimiter, rateLimitMiddleware, rateLimitMiddlewareAuth} from './middlewares/ratelimiting.middleware';
import AccessRequestRoute from './routes/access_request.route';
import {cloudOnlyRoutes} from './routes/cloud_only_routes';
import CommentRoute from './routes/comment.route';
import ContentBundleRoute from './routes/content_bundle.route';
import SetupCatalogRoute from './routes/setup_catalog.route';
import HealthCheckRouter, {HealthCheckPaths} from './routes/healthcheck_router';
import ItemRoute from './routes/item.route';
import PostRoute from './routes/post.route';
import SubscriptionRoute from './routes/subscription.route';
import SyncRoute from './routes/sync.route';
import ThinkingPuzzlesRoute from './routes/thinking_puzzles.route';
import UserActivityRoute from './routes/user_activity.route';
import UserEncryptionRoute from './routes/user_encryption.route';
import UserFeedRoute from './routes/user_feed.route';
import FileDataRoute from './routes/user_filedata.route';
import UserNotificationsRoute from './routes/user_notifications.route';
import UserPrefsRoute from './routes/user_prefs.route';
import RefStateRoute from './routes/ref_state.route';
import DeviceGuardRoute from './routes/device_guard.route';
import StandaloneAppRoute from './routes/standalone_app.route';
import PluginService from './services/plugin.service';
import {asPath} from './utils/crypto_util';
import AccountRoute from './routes/account.route';
import UserRoute from './routes/user.route';
import UserShowcaseRoute from './routes/user_showcase.route';
import ExternalDataRoute from './routes/external_data.route';
import ArticleTrustRoute from './routes/article_trust.route';
import FamilyPolicyRuleRoute from './routes/family_policy_rule.route';
import AuditLogRoute from './routes/audit_log.route';
import UserIntegrationsGmailRoute from './routes/user_integrations_gmail.route';
import {container} from '@/inversify.config';
import PasskeyRoute from './routes/passkey.route';
import EmbeddingCacheRoute from './routes/embedding_cache.route';
import {authenticateJWTHelper, type TRequest} from '@/utils/auth_utils';

function skipLogging(req) {
  if (req.url.includes('/image/get')) {
    return true;
  }

  return false;
}
const TEST_MODE = process.env.NODE_ENV === 'test';

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;

  constructor(routes: Routes[] = []) {
    this.app = express();
    this.env = config.env;
    this.port = config.port;

    if (config.firebaseConfig && !TEST_MODE) {
      // Lazy: firebase-admin is push notification delivery, which a self-hosted
      // server has no account for. Requiring it here keeps it out of the
      // published package.json instead of out of the published app.ts.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {cert, initializeApp} = require('firebase-admin/app'); // personal-optional: guarded
      initializeApp({
        credential: cert(JSON.parse(config.firebaseConfig)),
      });
    }

    this.initializeDB();
    this.initializeMiddlewares();

    this.initializeErrorHandling();

    if (config.env != 'production' && routes.length > 0) {
      console.log('Running limited routes');
      this.initializeRoutes(routes);
    } else {
      const mainRoutes = [
        new AccessRequestRoute(),
        new AccountRoute(),
        new AuthRoute(),
        new AuditLogRoute(),
        new CommentRoute(),
        new ContentBundleRoute(),
        new DeviceGuardRoute(),
        new SetupCatalogRoute(),
        new EmbeddingCacheRoute(),
        new ExternalDataRoute(),
        new ArticleTrustRoute(),
        new FamilyPolicyRuleRoute(),
        new FileDataRoute(),
        new ItemRoute(),
        new PasskeyRoute(),
        new PostRoute(),
        new RefStateRoute(),
        new StandaloneAppRoute(),
        new SubscriptionRoute(),
        new SyncRoute(),
        container.resolve(SystemRoute),
        new ThinkingPuzzlesRoute(),
        new UserActivityRoute(),
        new UserEncryptionRoute(),
        new UserFeedRoute(),
        new UserIntegrationsGmailRoute(),
        new UserNotificationsRoute(),
        new UserPrefsRoute(),
        new UserRoute(),
        new UserShowcaseRoute(),
      ];

      this.initializeRoutes([...mainRoutes, ...cloudOnlyRoutes()]);
    }

    if (!TEST_MODE) this.loadData();
  }

  async loadData() {
    const pluginService = new PluginService();
    await pluginService.initialize();
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });

    // `lite` has no task-server process, so the repeatables have nowhere else to
    // be scheduled. A no-op under `cloud`, where scheduling them here as well
    // would run every job twice. Here rather than in the constructor because
    // this is the one point that means "this process is serving" - integration
    // tests build the app through getServer() and never reach it.
    startRecurringJobs();
  }

  public getServer() {
    return this.app;
  }

  private async initializeDB() {
    if (TEST_MODE) {
      return;
    }
    try {
      const response = await knex.raw('SELECT 1');
      if (response) console.log('Successfully connected to Postgres Server');
      return;
    } catch (e) {
      console.log('Failed to connect to Postgres Server', e);
      if (config.abortOnDbLaunchFailure) {
        console.error('Stopping process due to launch failure');
        console.error(e);
        throw e;
      }
      // console.error(e);
      // throw e
    }
  }

  private async initializeMiddlewares() {
    this.app.use(morgan(config.logFormat, {stream, skip: skipLogging}));

    // The discovery probe, answered openly.
    //
    // A client looking for a personal server on the local network pings /healthcheckping before it
    // knows which server it is talking to, so the request arrives from an origin the allowlist
    // below has never heard of and gets no Access-Control-Allow-Origin. The scan can reach the box
    // and still be unable to read the reply, which looks identical to the box not existing.
    //
    // Widening it here is safe and narrow: this route is unauthenticated, takes no input, has no
    // side effects and returns only the version block. Nothing else moves.
    //
    // Access-Control-Allow-Private-Network is Chrome's Private Network Access preflight. A page on
    // a public origin may not touch a private address without it -- which is exactly what scanning
    // a LAN from the hosted webapp is.
    //
    // On a GET the cors() middleware below still runs and appends Allow-Credentials, so an
    // unrecognised origin sees `Allow-Origin: *` next to `Allow-Credentials: true`. That reads
    // alarming and is not: a browser only rejects the wildcard when the request itself was sent
    // with credentials, and the probe pins `credentials: 'omit'` (see core/serverDiscovery.ts).
    // A credentialed request from an unrecognised origin is still refused, which is correct.
    this.app.use((req, res, next) => {
      if (!req.path.endsWith(HealthCheckPaths.PING)) return next();

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', req.header('access-control-request-headers') || '*');
      if (req.header('access-control-request-private-network')) {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
      }

      // Answered here rather than falling through, because the method guard further down rejects
      // anything that is not GET or POST with a 405.
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      return next();
    });

    if (config.origin === '*' && !config.credentials) {
      console.log('Cors with origin(s):', config.origin);
      this.app.use(cors({origin: config.origin, credentials: config.credentials}));
    } else {
      const origins = config.origins;
      console.log('Usering cors with orgin', origins, ' credentials: ', config.credentials);

      this.app.use(
        cors({
          origin: origins,
          credentials: config.credentials,
        }),
      );
    }

    //configure cors to allow from subdomains
    this.app.use((req, res, next) => {
      if (!['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({message: 'Method not allowed'});
      }
      next();
    });

    this.app.use(hpp());

    // Previously only crossOriginResourcePolicy was applied, so noSniff, frameguard,
    // HSTS and referrer policy were all absent. The defaults are enabled here with four
    // deliberate deviations — each one breaks something if taken at its default value.
    this.app.use(
      helmet({
        // This process serves JSON plus binary assets (/modeldata, /downloads); it never
        // serves HTML. The SPA is served by nginx/CloudFront, which is where a CSP has to
        // live to mean anything. A CSP here would protect no document.
        contentSecurityPolicy: false,

        // Kept from the previous configuration and load-bearing: images, user files and
        // model artifacts are fetched cross-origin by the webapp, extension and native
        // shells. helmet's `same-origin` default would break all of them.
        crossOriginResourcePolicy: {policy: 'cross-origin'},

        // COEP would require every cross-origin subresource to opt in via CORP/CORS.
        // Nothing in the fleet does, so the default would break asset loading.
        crossOriginEmbedderPolicy: false,

        // helmet defaults to `same-origin`, which severs window.opener for OAuth flows.
        // allow-popups keeps the isolation benefit without breaking provider sign-in.
        crossOriginOpenerPolicy: {policy: 'same-origin-allow-popups'},

        // includeSubDomains is off on purpose: it would force HTTPS on every subdomain of
        // the apex, including any that are not TLS-terminated yet. Scope it to this host.
        hsts: {maxAge: 15552000, includeSubDomains: false, preload: false},
      }),
    );
    // Configure compression to skip SSE streams and flagged requests
    this.app.use(
      compression({
        filter: (req, res) => {
          // Skip compression if explicitly flagged (for SSE streams)
          if ((req as any).skipCompression) {
            return false;
          }
          // Don't compress SSE streams
          if (res.getHeader('Content-Type') === 'text/event-stream') {
            return false;
          }
          // Use default filter for everything else
          return compression.filter(req, res);
        },
      }),
    );
    // Body parsing: keep the default limit small. A 70mb JSON body parses into
    // hundreds of MB of live heap and has OOM-crashed prod (2026-07-05). Routes
    // that legitimately carry large payloads (base64 file uploads, admin dataset
    // import) are skipped here and declare their own route-level parsers.
    const bigBodyPaths = new Set([
      asPath('/userfile/upload'),
      asPath('/user/activity/push'),
      asPath('/item/attachment/add'),
      asPath('/item/save'),
      asPath('/item/update'),
      asPath('/post/create'),
      asPath('/user/publicProfileImage/upload'),
      asPath('/ref_state/user/upsert'),
      asPath('/ref_state/account/upsert'),
      asPath('/admin/published/attachment/add'),
      asPath('/admin/classificationEval/datasets/import'),
    ]);
    // Wrap a middleware so it is skipped for requests matching a predicate.
    const skipWhen = (predicate, mw) => (req, res, next) => (predicate(req) ? next() : mw(req, res, next));
    const skipBigBody = (mw) => skipWhen((req) => bigBodyPaths.has(req.path), mw);
    this.app.use(skipBigBody(express.json({limit: '10mb'})));
    this.app.use(skipBigBody(express.urlencoded({limit: '10mb', extended: true})));
    this.app.use(cookieParser(config.cookieSecret));

    // Observe-only: compares each request body against the shape ApiRouteMap declares and logs the
    // disagreements. Rejects nothing — see the middleware for why enforcement has to wait.
    this.app.use(requestShapeObserverMiddleware);

    // Observe-only: reports requests that acted on a caller-named user without running any
    // authorization check. Also rejects nothing; it only attaches a res 'finish' listener.
    this.app.use(authorizationObserverMiddleware);

    if (config.rateLimitingEnabled) {
      // req.ip must reflect the real client (not our proxy container) or all
      // users share a single rate-limit bucket.
      this.app.set('trust proxy', config.trustProxyHops);
      this.app.use(rateLimitMiddleware);
      // Paths under /auth that are not credential attempts, and must not be metered as
      // though they were. The strict signin bucket exists to slow password guessing; a
      // client that polls or reconnects on a schedule trips it purely by existing.
      //
      //   /sseTicket             requires a valid JWT already and is called on every SSE
      //                          reconnect, so a few devices behind one NAT IP would
      //                          exhaust the bucket and lock real signins out.
      //
      //   /providerLogin/status  the SSO handshake poller. ProviderSigninButton polls it
      //                          every couple of seconds, for up to 15 minutes, while the
      //                          user is away on accounts.google.com. At that rate it
      //                          crossed the auth ramp's start (a tenth of 60/min) about
      //                          twelve seconds in, and from there each poll paid ~37ms
      //                          more than the last on top of loginSpeedLimiter's flat
      //                          +1s -- so the sign-in got slower the longer the user
      //                          took at Google, and a retry made it worse. The flow was
      //                          throttling itself. The sessionToken is 32 random bytes,
      //                          so guessing it is the defence that matters here, not
      //                          volume.
      //
      // Both stay covered by the global per-IP limiter mounted above.
      const isUnmeteredAuthPath = (req) => req.path === '/sseTicket' || req.path === '/providerLogin/status';
      const skipUnmetered = (mw) => skipWhen(isUnmeteredAuthPath, mw);
      this.app.use(asPath('/auth'), skipUnmetered(loginSpeedLimiter), skipUnmetered(rateLimitMiddlewareAuth));
      this.app.use(asPath('/admin/signin'), loginSpeedLimiter, rateLimitMiddlewareAuth);
      console.log(`[config] rate limiting enabled (trust proxy hops=${config.trustProxyHops})`);
    } else {
      console.log('[config] rate limiting disabled');
    }

    // Temporary deploy-verification diagnostic: set LOG_CLIENT_IP=true to log
    // what req.ip resolves to (should be the real client, not the ALB) for the
    // first 50 non-healthcheck requests. Skips ALB health checks because those
    // arrive without X-Forwarded-For and would always show internal IPs.
    if (process.env.LOG_CLIENT_IP === 'true') {
      let ipCheckLogged = 0;
      this.app.use((req, res, next) => {
        if (ipCheckLogged < 50 && !req.path.includes('healthcheckping')) {
          ipCheckLogged++;
          console.log(
            `[ipcheck ${ipCheckLogged}/50] path=${req.path} req.ip=${req.ip} xff=${req.headers['x-forwarded-for'] || '-'}`,
          );
        }
        next();
      });
    }
    this.app.disable('x-powered-by');
  }

  private initializeRoutes(routes: Routes[]) {
    // Large static model assets (e.g., local-only AI models) served from disk.
    // This makes it possible for clients to download-on-demand from our origin,
    // and cache locally (no third-party CDN required).
    const modelDataDir = path.resolve(__dirname, '../data/modeldata');
    const downloadArtifactsDir = path.resolve(__dirname, '../data/downloads');

    // Optional monorepo dev fallback: serve modeldata straight from the client repo
    // when server-side `data/modeldata` doesn't contain the needed files.
    // This is intentionally opt-in to avoid surprises in prod.
    const fallbackEnabled = process.env.MODELDATA_FALLBACK_FROM_CLIENT_PUBLIC === 'true';
    const clientPublicModelDataDir = path.resolve(__dirname, '../../tset-client/public/modeldata');

    const modelDataDirs = [modelDataDir, ...(fallbackEnabled ? [clientPublicModelDataDir] : [])];

    const modelStorageType = String(config.modelStorage?.type || 'fs');
    const modelStorageBucket = String(config.modelStorage?.bucket || '').trim();
    const modelStoragePrefix = String(config.modelStorage?.path || 'modeldata').replace(/\/+$/, '');
    const modelStorageRequireAuth = !!config.modelStorage?.requireAuth;

    if (modelStorageType === 's3') {
      // Lazy: model storage defaults to 'fs' and a box never sets it to 's3',
      // so aws-sdk stays out of the published dependency set.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AWS = require('aws-sdk'); // personal-optional: guarded
      AWS.config.update({region: config.awsRegion});
      const s3Client = new AWS.S3();

      const normalizeModeldataKey = (reqPath: string): string | null => {
        const apiPrefix = `/${config.apiVersion}/modeldata/`;
        const rootPrefix = `/modeldata/`;
        let keyPath = reqPath;

        if (keyPath.startsWith(apiPrefix)) keyPath = keyPath.slice(apiPrefix.length);
        else if (keyPath.startsWith(rootPrefix)) keyPath = keyPath.slice(rootPrefix.length);
        else return null;

        keyPath = keyPath.replace(/^\/+/, '');
        if (!keyPath || keyPath.includes('..')) return null;
        return decodeURIComponent(keyPath);
      };

      const s3Handler = async (req: express.Request, res: express.Response) => {
        if (modelStorageRequireAuth) {
          try {
            await authenticateJWTHelper(req as TRequest);
          } catch (e) {
            return res.status(401).json({success: false, message: 'Auth required'});
          }
        }

        if (!modelStorageBucket) {
          return res.status(500).json({success: false, message: 'Model storage bucket not configured'});
        }

        const keyPath = normalizeModeldataKey(req.path);
        if (!keyPath) return res.status(400).json({success: false, message: 'Invalid modeldata path'});

        const key = `${modelStoragePrefix}/${keyPath}`;

        const s3Req = s3Client.getObject({
          Bucket: modelStorageBucket,
          Key: key,
        });

        s3Req.on('httpHeaders', (statusCode, headers) => {
          if (statusCode >= 300) return;
          if (headers['content-type']) res.setHeader('Content-Type', headers['content-type']);
          if (headers['content-length']) res.setHeader('Content-Length', headers['content-length']);
          if (headers['etag']) res.setHeader('ETag', headers['etag']);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        });

        const stream = s3Req.createReadStream();
        stream.on('error', (err) => {
          logger.error('[modeldata] S3 stream error', {key, error: err?.message || String(err)});
          res.status(404).json({success: false, message: 'Model file not found'});
        });

        return stream.pipe(res);
      };

      this.app.get('/modeldata/*', s3Handler);
      this.app.get('/' + config.apiVersion + '/modeldata/*', s3Handler);
    }

    for (const dir of modelDataDirs) {
      if (!fs.existsSync(dir)) {
        logger.warn(`[modeldata] directory missing: ${dir}`);
        continue;
      }

      logger.info(`[modeldata] serving from: ${dir}`);
      const staticMiddleware = express.static(dir, {
        fallthrough: true,
        index: false,
        setHeaders: (res) => {
          // Model assets are versioned by folder name; allow long-lived caching.
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      });
      this.app.use('/modeldata', staticMiddleware);
      this.app.use('/' + config.apiVersion + '/modeldata', staticMiddleware);
    }

    if (fs.existsSync(downloadArtifactsDir)) {
      logger.info(`[downloads] serving from: ${downloadArtifactsDir}`);
      const downloadStaticMiddleware = express.static(downloadArtifactsDir, {
        fallthrough: true,
        index: false,
        setHeaders: (res) => {
          // "latest" artifacts can be replaced in-place; keep caching short.
          res.setHeader('Cache-Control', 'public, max-age=300');
        },
      });

      this.app.use('/downloads', downloadStaticMiddleware);
      this.app.use('/' + config.apiVersion + '/downloads', downloadStaticMiddleware);
    } else {
      logger.warn(`[downloads] directory missing: ${downloadArtifactsDir}`);
    }

    this.app.use('/', new HealthCheckRouter().router);
    routes.forEach((route) => {
      this.app.use('/' + config.apiVersion, route.router);
    });

    // Last, deliberately: its SPA fallback answers whatever the API did not, so
    // mounting it any earlier would swallow real routes.
    serveWebapp(this.app);
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
