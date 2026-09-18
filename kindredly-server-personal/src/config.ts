import dotenv from 'dotenv';

import {DynObj} from '@/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import crypto from 'crypto';
import {debug} from 'console';

const environment = process.env.NODE_ENV || 'production';
console.log('Node JS Version', process.version);
console.log('Environment: ', environment);
console.log('Project Current Directory: ', __dirname);

function getEnvPath() {
  const envFilepath =
    environment == 'production'
      ? path.resolve(__dirname, '.env')
      : path.resolve(__dirname, `../.env.${environment || 'development'}`);

  return envFilepath;
}

/**
 * One rate-limiting bucket, with every field overridable from the environment.
 *
 * Named `RATE_LIMIT_<BUCKET>_POINTS` / `_DURATION_SEC` / `_BLOCK_SEC`. The point of the env
 * overrides is incident response: the limits used to be literals, so the only way to change
 * one was a code edit and a rolling deploy — the worst possible moment to need both.
 *
 * A non-numeric override throws rather than silently falling back. A typo that quietly
 * restored the old, too-tight default is exactly the failure this is meant to prevent.
 */
function rateLimitBucket(bucket: string, defaultPoints: number, defaultDurationSec = 60, defaultBlockSec = 10) {
  const num = (suffix: string, fallback: number): number => {
    const raw = process.env[`RATE_LIMIT_${bucket}_${suffix}`];
    if (raw == null || raw === '') return fallback;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`[config] Invalid RATE_LIMIT_${bucket}_${suffix} value '${raw}' — must be a positive integer`);
    }
    return parsed;
  };

  return {
    points: num('POINTS', defaultPoints),
    duration: num('DURATION_SEC', defaultDurationSec),
    blockDuration: num('BLOCK_SEC', defaultBlockSec),
  };
}

const envFilepath = getEnvPath();
console.log('ENV file path: ', envFilepath);
if (fs.existsSync(envFilepath)) {
  console.log(' ENV File Found, loading');
  dotenv.config({path: envFilepath});
} else {
  console.log(`env file not found at ${envFilepath}`);
  dotenv.config();
}

let dbconfig: DynObj = {
  client: 'postgresql',
  connection: {
    host: String(process.env.DB_HOSTNAME || 'localhost'),
    database: String(process.env.DB_DBNAME || 'thetaset'),
    user: String(process.env.DB_AUTH_USER || 'postgres'),
    password: String(process.env.DB_AUTH_PASS || 'test'),

    port: Number(process.env.DB_PORT || 5432),
  },
  pool: {
    min: environment === 'test' ? 0 : 2,
    max: environment === 'test' ? 2 : 10,
  },
  migrations: {
    tableName: 'knex_migrations',
  },
};

const storageType = process.env.USER_STORAGE_TYPE || 's3';
const live = process.env.IS_LIVE === 'true';
const serverHostname = process.env.SERVER_HOSTNAME || 'https://kindredly.ai';
const privateServer = process.env.PRIVATE_SERVER === 'true' || process.env.PERSONAL_SERVER === 'true';

if (!process.env.PASSWORD_STORAGE_ENCRYPTION_KEY) {
  console.error('PASSWORD_STORAGE_ENCRYPTION_KEY is missing from ENV');
}

const MAJOR_VERSION = '3.0';
const MINOR_VERSION = '0';
const SERVER_VERSION = MAJOR_VERSION + '.' + MINOR_VERSION;

const API_VERSION = 'v' + MAJOR_VERSION;

let APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;

if (!!APPLE_PRIVATE_KEY) {
  APPLE_PRIVATE_KEY = APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
}

const API_SERVER_HOSTNAME = process.env.API_SERVER_HOSTNAME || 'https://api3.thetaset.com';

const API_PATH = API_SERVER_HOSTNAME + '/' + API_VERSION;

const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI || API_PATH + '/auth/provider/apple';
let devMode = environment == 'development';

const config = {
  env: environment,
  version: {
    serverVersion: SERVER_VERSION,
    // The commit this image was built from, baked in by the Dockerfile's
    // BUILD_SHA arg. ADDITIVE on purpose: serverVersion and supportedVersions
    // both have legacy comparison semantics (see the comments below), so
    // provenance gets its own field rather than riding on one that changes
    // client behaviour. Null for local builds, which have no commit.
    buildSha: process.env.BUILD_SHA || null,
    versionMessage: null,
    // Must keep containing '3.0.0'. Deployed clients compare this against config.clientVersion,
    // which is derived from the API path and is '3.0.0' for every build ever shipped — change
    // this value and every installed client decides it is unsupported. See supportedAppVersions.
    supportedVersions: ['3.0.0'],
    // Real per-build gating against config.appVersion (e.g. '3.0.246'). Empty means no
    // constraint, which matches today's effective behavior. Only builds new enough to read this
    // field are affected, so it can be populated once the fleet has aged.
    supportedAppVersions: [] as string[],
    // Additive server capabilities. A client that does not know a key ignores it; removing a key
    // is the rollback for that feature. imageRenditions: user-file reads accept a logical
    // previewId in `variants`, and the response says which bytes came back (PERF-3).
    capabilities: {
      imageRenditions: {version: 1, variants: ['list', 'card'] as string[]},
    },
  },
  requireInviteCode: process.env.REQUIRE_INVITE_CODE === 'true',
  classificationEvalAllowedUserIds: (process.env.CLASSIFICATION_EVAL_ALLOWED_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  devMode: devMode,
  enableEmailMessaging:
    process.env.ENABLE_EMAIL_MESSAGING != null ? process.env.ENABLE_EMAIL_MESSAGING === 'true' : environment !== 'test',
  firebaseConfig: process.env.FIREBASE_CONFIG,
  awsRegion: process.env.AWS_REGION || 'us-west-2',

  /**
   * SMTP is how a self-hosted box sends mail; the cloud uses SES. Which one a
   * process actually uses is decided in `base/email_transport.ts`, not here.
   *
   * Environment variables are the FLOOR, deliberately. A box owner who has
   * locked themselves out of the UI - or whose box cannot mail them a reset
   * link precisely because mail is misconfigured - can always fix it from the
   * shell. Server-side settings layer on top of these, never under them.
   */
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    // Implicit TLS on connect, i.e. port 465. Port 587 leaves this false and
    // upgrades with STARTTLS instead.
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || '',
  },
  port: process.env.PORT || 3000,
  serverHostname: serverHostname,
  apiPath: API_PATH,
  db: dbconfig,
  /**
   * Run Postgres inside this process instead of connecting to one.
   *
   * The appliance case: no Docker, no database service, no install step - the
   * server starts and owns its own cluster on `db.connection.port`, so nothing
   * downstream knows the difference and `db` stays a plain knex config.
   *
   * **Explicitly opt-in rather than implied by `profile === 'lite'`.** `lite`
   * means one process with in-memory KV and queue; it does not have to mean the
   * database moves too. Someone running `lite` on a NAS that already has
   * Postgres must not get a second one spawned underneath them.
   *
   * `dataDir` must be ABSOLUTE. The migration CLI chdirs to `knex/` while the
   * server runs from `tset-server/`, so a relative path silently yields two
   * different databases.
   */
  /**
   * Where a built webapp bundle lives, for a box that serves the app as well as
   * the API. Empty means "work it out" - see `base/webapp_static.ts`, which only
   * looks at all under the `lite` profile. Cloud serves its bundle from a CDN.
   */
  webappDir: process.env.KND_WEBAPP_DIR || '',
  /**
   * The box's own identity (BOX-1/3): where its authority lives, whether it serves HTTPS and
   * announces `kindredly.local`. Every field is ignored under `cloud`; the modules gate on the
   * profile themselves (`base/box_tls.ts`, `base/box_announce.ts`). `hostname` is a preferred
   * name without `.local`; the box still falls back to the standard names on a collision.
   */
  box: {
    dataDir: process.env.KND_DATA_DIR || path.join(os.homedir(), 'ThetaSetData'),
    tls: process.env.KND_BOX_TLS !== 'off',
    mdns: process.env.KND_BOX_MDNS !== 'off',
    hostname:
      (process.env.KND_BOX_HOSTNAME || '')
        .trim()
        .toLowerCase()
        .replace(/\.local$/, '') || null,
    /**
     * Remote access (BOX-16). `tunnel` off means this box is reachable on the home network only —
     * a real tier, not an absence. `relayUrl` is whichever relay the family chooses; the default is
     * Kindredly's, and a community can run its own (docs/proposals/home-server-remote-access-webrtc.md).
     * The tunnel client itself waits on the binding design's review (BOX-15); until it lands these
     * settings are read, logged at start, and do nothing else.
     */
    tunnel: process.env.KND_BOX_TUNNEL === 'on',
    relayUrl: (process.env.KND_RELAY_URL || 'https://relay.box.kindredly.ai').trim().replace(/\/+$/, ''),
  },

  embeddedDb: {
    enabled: process.env.KND_EMBEDDED_DB === 'true',
    dataDir: process.env.KND_DB_DATA_DIR || path.join(os.homedir(), 'ThetaSetData', 'pgdata'),
  },
  abortOnDbLaunchFailure: process.env.ABORT_ON_DB_LAUNCH_FAILURE === 'true',
  apiVersion: API_VERSION,
  syncSubscriptions: !devMode,
  // Observe-only request validation: check bodies against the generated ApiRouteMap schemas and
  // log what disagrees, rejecting nothing. Set OBSERVE_REQUEST_SHAPES=false to turn the
  // observation off entirely.
  observeRequestShapes: process.env.OBSERVE_REQUEST_SHAPES !== 'false',
  // Observe-only authorization reporting: log requests that acted on a caller-named user without
  // running any authorization check. Set OBSERVE_AUTHORIZATION_CHECKS=false to turn it off.
  observeAuthorizationChecks: process.env.OBSERVE_AUTHORIZATION_CHECKS !== 'false',
  live: live,
  jwtAccessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET || 'Blah89sd987uasjnf43298',
  // Verify-only fallback signing keys (comma-separated). User tokens never expire,
  // so rotating JWT_ACCESS_TOKEN_SECRET would otherwise invalidate every outstanding
  // token at once. Keep the OLD secret here during/after a rotation: tokens signed
  // with it still verify, while new tokens are signed with the primary above. Old
  // secrets can be removed once clients have re-minted (tokenLogin re-issues on the
  // primary). Signing ALWAYS uses the primary jwtAccessTokenSecret.
  jwtAccessTokenSecretsPrevious: (process.env.JWT_ACCESS_TOKEN_SECRETS_PREVIOUS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  passwordStorageEncryptionKey: process.env.PASSWORD_STORAGE_ENCRYPTION_KEY || '0987654321098765432100',
  passwordSalt: process.env.PASSWORD_SALT || 'TESTSALT',
  // Passkey/WebAuthn configuration
  passkeyRpId: process.env.PASSKEY_RP_ID, // Defaults to hostname if not set
  passkeyRpName: process.env.PASSKEY_RP_NAME || 'Kindredly',
  // Whether a passkey stored WITHOUT a public key may still sign in.
  //
  // Assertion signatures are always verified now — that is what closed the takeover where any
  // signature was accepted. This flag only governs the credentials that have nothing to verify
  // against: ones registered on a browser without `getPublicKey()` (pre-Safari 16.4, pre-Firefox
  // 119), which stored an empty key.
  //
  // Defaults to ALLOW so that shipping the fix cannot lock anyone out of an account we have not
  // counted yet. Run the "Passkeys that cannot be verified" check in the admin console
  // (/manage/diagnostics); once it reports zero, set PASSKEY_ALLOW_UNVERIFIABLE=false to close the
  // last path that accepts an unverified assertion.
  passkeyAllowUnverifiableCredentials: process.env.PASSKEY_ALLOW_UNVERIFIABLE !== 'false',
  nodeEnv: environment,
  /**
   * Which runtime profile this process is. `cloud` is production and every
   * existing deployment: real Redis, real BullMQ, a separate task-server.
   * `lite` is the family appliance - one process, in-memory KV/eventbus/queue,
   * no Redis container at all.
   *
   * Resolved here, once, so nothing downstream reads the env var directly and
   * the two backends can never disagree about which one is live. Anything but
   * an exact `lite` is `cloud`: an unrecognised value must not silently put a
   * production server onto an in-memory store.
   */
  profile: (process.env.KND_PROFILE === 'lite' ? 'lite' : 'cloud') as 'cloud' | 'lite',
  /**
   * Where realm backup bundles go. `target` selects the adapter
   * (`base/backup_target.ts`); unset means backups are off, which is a box's
   * normal first-boot state and not an error.
   *
   * `path` is only read by the `fs` adapter and is deliberately not defaulted to
   * somewhere under the home directory: a backup written to the same disk as the
   * database is not a backup, and a silent default would hide that. A USB stick,
   * an external drive and a NAS mount are all just this path.
   */
  backup: {
    target: process.env.KND_BACKUP_TARGET || '',
    path: process.env.KND_BACKUP_PATH || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || 'com.thetaset.auth',
    teamId: process.env.APPLE_TEAM_ID || 'Q4S47XU664',
    keyId: process.env.APPLE_KEY_ID || 'H2ZSDCKBN8',
    privateKey: APPLE_PRIVATE_KEY,
    redirectURI: APPLE_REDIRECT_URI,
  },
  inviteAccountExpMin: 60 * 48, // 7 days
  aiConfig: {
    type: process.env.AI_CONFIG_TYPE || 'openai',
    secretKey: process.env.AI_CONFIG_SECRET_KEY || 'sk-1234',
    // Hosted AI limits are per plan, in Admin AI Tools (ai_config.store.ts DEFAULT_LIMITS). The
    // AI_MONTHLY_TOKEN_LIMIT env var they replaced is no longer read.
  },
  // Content-safety gate for the published library. When the gate is enabled,
  // content that trips moderation at or above `threshold` is NOT published —
  // it is quarantined (kept non-public, routed to the needs_review queue) for
  // an admin to release. Everything is env-overridable so the gate can ship
  // dark (set *_ENABLED=false) and be tuned without code changes.
  moderation: {
    publishGate: {
      enabled: process.env.MODERATION_PUBLISH_GATE_ENABLED !== 'false', // default ON
      // Block at this severity and above. Crude rules put gun/weapon/marijuana
      // at MEDIUM, so the default HIGH only quarantines HIGH + CRITICAL.
      threshold: (process.env.MODERATION_PUBLISH_GATE_THRESHOLD || 'high') as 'medium' | 'high' | 'critical',
      enforceUserPaths: process.env.MODERATION_GATE_USER_PATHS !== 'false', // default ON
      enforceAdminPaths: process.env.MODERATION_GATE_ADMIN_PATHS !== 'false', // default ON
    },
    // When true, the async AI "family-friendly" rubric quarantines an already
    // live item if it disapproves at/above the gate threshold.
    aiEnforce: process.env.MODERATION_AI_ENFORCE !== 'false', // default ON
  },
  // Optional local image generator (e.g. Draw Things / Automatic1111). When
  // provider='local', banner generation calls a local Automatic1111-compatible
  // /sdapi/v1/txt2img endpoint instead of OpenAI. Default keeps OpenAI, so this
  // is entirely opt-in and never a hard dependency.
  imageGen: {
    provider: process.env.IMAGE_GEN_PROVIDER || 'openai', // 'openai' | 'local'
    localUrl: process.env.IMAGE_GEN_LOCAL_URL || 'http://localhost:7860',
    // SDXL-friendly landscape source; the admin browser crops to a 2:1 banner.
    width: Number(process.env.IMAGE_GEN_WIDTH) || 1344,
    height: Number(process.env.IMAGE_GEN_HEIGHT) || 768,
    steps: Number(process.env.IMAGE_GEN_STEPS) || 28,
    cfgScale: Number(process.env.IMAGE_GEN_CFG) || 7,
  },
  podcastIndex: {
    key: process.env.PODCAST_INDEX_KEY || '',
    secret: process.env.PODCAST_INDEX_SECRET || '',
  },
  // Free stock-image providers for the admin Banner Library importer. Openverse
  // and Wikimedia Commons need no key (keyless, rate-limited); Pexels needs a
  // free API key. Each provider is hidden in the UI when not configured.
  freeImage: {
    pexelsApiKey: process.env.PEXELS_API_KEY || '',
    openverseToken: process.env.OPENVERSE_API_TOKEN || '',
  },

  imageStorage: {
    type: storageType,
    bucket: process.env.IMAGE_STORAGE_BUCKET || 'thetasetappdata',
    path:
      storageType == 'fs'
        ? path.join(os.homedir(), 'ThetaSetData', 'images')
        : process.env.IMAGE_STORAGE_PATH || 'public/images_testing',
  },

  pubStorage: {
    type: storageType,
    bucket: process.env.IMAGE_STORAGE_BUCKET || 'thetasetappdata',
    path:
      storageType == 'fs'
        ? path.join(os.homedir(), 'ThetaSetData', 'pubfiles')
        : process.env.IMAGE_STORAGE_PATH || 'public/pubfiles_testing',
  },

  userStorage: {
    type: storageType,
    bucket: process.env.USER_STORAGE_BUCKET || 'thetasetappdata',
    path:
      storageType == 'fs'
        ? path.join(os.homedir(), 'ThetaSetData', 'userData')
        : process.env.USER_STORAGE_PATH || 'userData',
  },

  modelStorage: {
    type: process.env.MODEL_STORAGE_TYPE || 'fs', // fs | s3
    bucket: process.env.MODEL_STORAGE_BUCKET || process.env.IMAGE_STORAGE_BUCKET || 'thetasetappdata',
    path: process.env.MODEL_STORAGE_PATH || 'modeldata',
    requireAuth: process.env.MODEL_STORAGE_REQUIRE_AUTH === 'true',
  },

  stripe: {
    secret: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSigningSecret: process.env.STRIPE_WEBHOOK_SIGNING_SECRET || '',
  },

  /**
   * Where "ADMIN NOTICE" mail goes. On a self-hosted box this deliberately has
   * NO default, because the fallback is OUR inbox: a box that inherited it would
   * mail us every time somebody else's family created a user. That is the whole
   * phone-home risk, and an empty address is what makes it structural rather
   * than a flag somebody has to remember to leave off.
   *
   * A box owner who wants these notices sets ADMIN_EMAIL to their own address.
   */
  adminEmail: process.env.ADMIN_EMAIL || (privateServer ? '' : 'thetaset1@gmail.com'),
  adminWatchNotifications: process.env.ADMIN_WATCH_NOTIFICATIONS === 'true',
  adminConsoleEnabled: devMode || process.env.ADMIN_CONSOLE_ENABLED === 'true',
  adminConsoleUser: 'admin',
  adminConsolePassword: process.env.ADMIN_CONSOLE_PASSWORD || 'admin17',
  notificationSourceEmailString:
    process.env.NOTIFICATION_SOURCE_EMAIL_STRING || "'Kindredly <accounts-noreply@thetaset.com>'",
  // Global signup gate ("invite code to join Kindredly") - opt-in.
  // This is NOT the same thing as account invitation codes (joining an existing family account).
  inviteCodes: (process.env.SIGNUP_INVITE_CODES || process.env.INVITE_CODES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  googleServiceApiKey: process.env.GOOGLE_SERVICE_API_KEY || '',

  maxFileSize: 200 * 1024 * 1024, // 200MB
  // envConfig: dotenv.config().parsed,
  cookieSecret: process.env.COOKIE_SECRET || 'jaklsdfjalsdf',
  origin: process.env.ORIGIN || 'kindredly.ai',
  logDir: process.env.LOG_DIR
    ? process.env.LOG_DIR
    : path.join(os.homedir(), process.env.LOG_DIR || 'thetaset_server_logs'),
  logFormat: process.env.LOG_FORMAT,
  logToFiles: process.env.LOG_TO_FILES === 'true',
  credentials: true, //process.env.CREDENTIALS === 'true',
  googleClientId: process.env.GOOGLE_CLIENT_ID || 'XXX-google-clientId',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || 'XXX-google-clientSecret',
  googleGmailClientId: process.env.GOOGLE_GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || 'XXX-google-clientId',
  googleGmailClientSecret:
    process.env.GOOGLE_GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || 'XXX-google-clientSecret',
  rateLimitingEnabled: process.env.RATE_LIMITING_ENABLED ? process.env.RATE_LIMITING_ENABLED === 'true' : !devMode,
  // Session revocation enforcement: 'off' | 'log' (check + log, never reject)
  // | 'enforce' (reject revoked sessions). Deploy in 'log', then move to
  // 'enforce' once the registry has adopted active sessions.
  // Fail loud on typos — 'enforced'/'true' silently degrading to log-only
  // would leave an operator believing enforcement is on.
  sessionEnforcement: (() => {
    const value = process.env.SESSION_ENFORCEMENT || 'log';
    if (!['off', 'log', 'enforce'].includes(value)) {
      throw new Error(`[config] Invalid SESSION_ENFORCEMENT value '${value}' — must be off | log | enforce`);
    }
    return value;
  })(),
  // Number of proxy hops to trust for X-Forwarded-For (rate limiting keys on req.ip).
  // Trusting too many hops lets clients spoof their IP and evade limits.
  trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS || '1', 10),
  rateLimiting: {
    // Every bucket is env-tunable so an incident can be handled from the task definition
    // rather than a code change and a rolling deploy. The defaults below are 10x what they
    // were: the previous numbers rejected ordinary use. `special` in particular sat at
    // 30/min while holding /data/contentInfo, which fires once per page visit — a household
    // with a few tabs open blew through it in seconds and then ate a 30s lockout.
    //
    // `blockDuration` is short on purpose. The old 30s meant a momentary burst kept failing
    // for half a minute after the client had already gone quiet, which reads as an outage
    // rather than as backpressure.
    default: rateLimitBucket('DEFAULT', 3000),
    special: rateLimitBucket('SPECIAL', 300),
    // Auth is 4x its old value, not 10x, and that is deliberate.
    //
    // `points` used to be "attempts before we refuse you". Nothing is refused any more, so it
    // now means "attempts before we start slowing you down" — and a bigger number is no
    // longer strictly safer, it is strictly *weaker*. Multiplying it by ten handed a password
    // guesser a large block of instant attempts every minute before any pushback began.
    //
    // 60 is still four times the old ceiling, so legitimate /auth traffic (signin, switchUser,
    // permissionOverride, checkPassword) has more headroom than it ever had, while the ramp —
    // which starts at a tenth of this for auth, see RAMP_START_FRACTION — bites early enough
    // to matter.
    auth: rateLimitBucket('AUTH', 60),
    media: rateLimitBucket('MEDIA', 20000),
    loginSpeed: {
      windowMs: 60 * 1000 * 2,
      delayAfter: 10,
      delayMs: 1000,
    },
    // Per-USER (not per-IP) limit on AI chat requests. Each agent step is one
    // request, so a full 8-step run consumes ~9 points.
    ai: {
      points: parseInt(process.env.AI_RATE_LIMIT_POINTS || '600', 10),
      duration: parseInt(process.env.AI_RATE_LIMIT_DURATION_SEC || '300', 10),
      blockDuration: 60,
    },
  },

  sse: {
    // Keep-alive ping interval. Must stay comfortably under the 60s ALB/nginx
    // idle timeout so idle SSE connections are never dropped (which would make
    // clients reconnect).
    heartbeatIntervalMs: parseInt(process.env.SSE_HEARTBEAT_INTERVAL_MS || '20000', 10),
    // Per-clientId connect throttle: reject if a single client opens more than
    // `maxConnectsPerWindow` connections within `windowSec`. A healthy client
    // reconnects ~1/min; a storm is ~100+/min, so this only trips on abuse.
    maxConnectsPerWindow: parseInt(process.env.SSE_MAX_CONNECTS_PER_WINDOW || '20', 10),
    connectWindowSec: parseInt(process.env.SSE_CONNECT_WINDOW_SEC || '30', 10),
  },

  visitCountThresholdSec: 15 * 60,
  privateServer,
  origins: [
    'https://kindredly.ai',
    /\.thetaset\.com$/,
    'https://thetaset.com',
    /moz-extension:\/\//,
    /safari-web-extension:\/\//,
    // The ID the `key` in tset-client/src/manifest_chrome.json derives to (sha256 → a-p), and the one
    // tset-electron's deviceLockdown pins. The line below it predates the pinned key; kept in case an
    // older build still runs. base/webapp_static.ts builds a box's frame-ancestors from this list.
    'chrome-extension://kekfgmohihmjcmalpkpmpaeiehcmkgbj',
    'chrome-extension://egngcfemcdnimdmgjimkninagffejjco',
    'capacitor://localhost', // IOS

    // DEVELOPMENT ORIGINS - TODO: remove if in production
    'http://localhost',
    'https://localhost',
    'http://localhost:3031',
  ],
};

console.log(`****Server Config Loaded for ${serverHostname}****`);

if (devMode) {
  console.log('Config', config);

  // Safe-to-log fingerprint for diagnosing env/secret mismatches across ECS tasks
  try {
    const jwtFp = crypto
      .createHash('sha256')
      .update(String(config.jwtAccessTokenSecret || ''))
      .digest('hex')
      .slice(0, 10);
    console.log(`[config] JWT_ACCESS_TOKEN_SECRET fp=${jwtFp}`);
  } catch (e) {
    console.warn('[config] Failed to compute JWT secret fingerprint');
  }
}

// Secrets that must come from the environment in production. The fallback
// values in this file exist for development/test only — booting production on
// them would mean forgeable tokens and weakly-protected stored data.
export function findMissingProductionSecrets(
  env: Record<string, string | undefined>,
  adminConsoleEnabled: boolean,
): string[] {
  // COOKIE_SECRET intentionally not required: auth is via Bearer header only.
  // The session cookie was inert (SameSite=None without Secure; signed-write
  // vs unsigned-read) and the dead cookie auth code has been removed.
  const required = ['JWT_ACCESS_TOKEN_SECRET', 'PASSWORD_STORAGE_ENCRYPTION_KEY', 'PASSWORD_SALT'];
  if (adminConsoleEnabled) {
    required.push('ADMIN_CONSOLE_PASSWORD');
  }
  return required.filter((name) => !env[name]);
}

if (environment === 'production') {
  const missing = findMissingProductionSecrets(process.env, config.adminConsoleEnabled);
  if (missing.length > 0) {
    const message = `[config] Missing required secret env vars in production: ${missing.join(', ')}`;
    if (process.env.ALLOW_INSECURE_SECRETS === 'true') {
      console.error(`${message} — booting anyway with insecure fallbacks (ALLOW_INSECURE_SECRETS=true)`);
    } else {
      throw new Error(
        `${message}. Set them, or set ALLOW_INSECURE_SECRETS=true to temporarily boot with insecure fallbacks.`,
      );
    }
  }

  if (!privateServer) {
    const integrationVars = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SIGNING_SECRET', 'GOOGLE_SERVICE_API_KEY'];
    const missingIntegrations = integrationVars.filter((name) => !process.env[name]);
    if (missingIntegrations.length > 0) {
      console.warn(
        `[config] Integration env vars not set (features depending on them will fail): ${missingIntegrations.join(', ')}`,
      );
    }
  }
}

export {config};
