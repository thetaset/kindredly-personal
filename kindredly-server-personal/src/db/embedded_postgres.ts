import fs from 'fs';
import path from 'path';
import {config} from '@/config';
import {logger} from '@/utils/logger';

/**
 * Postgres running inside this process, for the appliance.
 *
 * **Why not SQLite or PGlite.** Both were evaluated and rejected on measurement,
 * not taste - see the datastore decision in `docs/trackers/lite-profile-tracker.md`.
 * SQLite fails silently on timestamps; PGlite is flawless but costs 470-780 MB of
 * WASM heap. Real Postgres holding our schema is ~20 MB, so the cheapest option is
 * also the only one with no compatibility surface at all.
 *
 * **Nothing downstream knows this exists.** The cluster listens on
 * `config.db.connection.port`, which is where `db/knex_config.ts` was already
 * pointing, so every repo, the migration CLI and the test harness are unchanged.
 * The only requirement is ordering: the cluster must be up before the first
 * query, which is why `server.ts` awaits `startEmbeddedPostgres()` before it
 * constructs `App`.
 *
 * **It migrates itself.** A box has no `dbmigration` container to run the schema
 * for it, so the cluster is not "ready" until `migrate.latest()` has run - see
 * `runBootMigrations` below. Cloud is untouched and keeps its separate migration
 * service.
 *
 * **Node 22.12 is a hard floor.** `embedded-postgres` is ESM-only and swc compiles
 * our `await import()` down to `require()` (the build emits commonjs), and
 * `require()` of an ESM package throws `ERR_REQUIRE_ESM` below 22.12. Measured:
 * 21.6.2 fails, 22.11 fails, 22.12 passes. `Dockerfile:2` carries the floor and
 * the reason; do not lower it.
 */

/** The live cluster, or null. Module state so a second start is a no-op. */
let instance: any = null;
let starting: Promise<void> | null = null;

export const usesEmbeddedPostgres = (): boolean => config.embeddedDb.enabled;

/** A data directory Postgres has already initialised has a PG_VERSION in it. */
const isInitialised = (dataDir: string): boolean => fs.existsSync(path.join(dataDir, 'PG_VERSION'));

/**
 * Appliance sizing, kept identical to `docker-compose-personal.yml` so the two
 * ways of running a box cannot drift into different performance.
 *
 * `max_connections=40` is a floor, not a preference: `config.db.pool.max` is 10
 * per process and Postgres runs ~6 background workers of its own. Do not lower
 * it without lowering the pool first.
 */
const APPLIANCE_FLAGS = [
  '-c',
  'shared_buffers=32MB',
  '-c',
  'max_connections=40',
  '-c',
  'work_mem=2MB',
  '-c',
  'maintenance_work_mem=16MB',
  '-c',
  'effective_cache_size=256MB',
];

/**
 * Start the cluster, creating it on first run. Safe to call twice; concurrent
 * callers share one start rather than racing two initdbs at the same directory.
 */
export async function startEmbeddedPostgres(): Promise<void> {
  if (!usesEmbeddedPostgres()) return;
  if (instance) return;
  if (starting) return starting;

  starting = (async () => {
    const {dataDir} = config.embeddedDb;
    if (!path.isAbsolute(dataDir)) {
      throw new Error(`[embedded-db] KND_DB_DATA_DIR must be absolute, got "${dataDir}"`);
    }

    const connection = (config.db.connection || {}) as Record<string, any>;

    // The cluster binds to loopback - it is this process. If DB_HOSTNAME still
    // points at a Docker service (the box's compose sets `postgres`), knex fails
    // later with `getaddrinfo ENOTFOUND postgres`, which reads like a network
    // problem and is not one. Say it here, at boot, in the operator's terms.
    const host = String(connection.host || 'localhost');
    if (!['localhost', '127.0.0.1', '::1', ''].includes(host)) {
      throw new Error(
        `[embedded-db] KND_EMBEDDED_DB=true runs Postgres inside this process, so DB_HOSTNAME must ` +
          `be localhost - got "${host}". Either unset DB_HOSTNAME or turn the embedded database off.`,
      );
    }
    // Required lazily: importing it eagerly would pull ~144MB of Postgres
    // binaries into every process, including cloud, which never runs this.
    const mod: any = await import('embedded-postgres'); // personal-optional: optionalDependency, guarded by KND_EMBEDDED_DB
    const EmbeddedPostgres = mod.default ?? mod;

    const pg = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: String(connection.user || 'postgres'),
      password: String(connection.password ?? ''),
      port: Number(connection.port || 5432),
      persistent: true,
      postgresFlags: APPLIANCE_FLAGS,
    });

    const fresh = !isInitialised(dataDir);
    if (fresh) {
      logger.info(`[embedded-db] initialising a new cluster at ${dataDir}`);
      await pg.initialise();
    }
    await pg.start();

    // createDatabase throws if it already exists, which is the normal case on
    // every boot after the first.
    const dbName = String(connection.database || 'postgres');
    try {
      await pg.createDatabase(dbName);
      logger.info(`[embedded-db] created database "${dbName}"`);
    } catch {
      /* already there */
    }

    // Latched before migrating, so a failure below can still shut the cluster
    // down rather than orphaning a postmaster.
    instance = pg;
    logger.info(`[embedded-db] Postgres started on port ${connection.port} (${fresh ? 'new' : 'existing'} cluster)`);

    try {
      // Before anything is allowed to query it. A fresh cluster has an empty
      // database, and an existing one may predate an app update.
      await runBootMigrations();
    } catch (error) {
      // Do not leave a started-but-unmigrated cluster latched. `instance` is
      // what makes a second start a no-op, so keeping it here would turn a
      // retry into a silent success against a schema that never landed.
      await stopEmbeddedPostgres();
      throw error;
    }
    logger.info('[embedded-db] Postgres ready');
  })();

  try {
    await starting;
  } finally {
    starting = null;
  }
}

/**
 * Stop the cluster. Idempotent.
 *
 * Worth calling on shutdown rather than leaving to process exit: the data
 * directory is a real Postgres cluster, and a clean stop is the difference
 * between starting next time and starting next time after crash recovery.
 */
export async function stopEmbeddedPostgres(): Promise<void> {
  if (!instance) return;
  const pg = instance;
  instance = null;
  try {
    await pg.stop();
    logger.info('[embedded-db] Postgres stopped');
  } catch (error) {
    logger.error('[embedded-db] failed to stop Postgres cleanly', error);
  }
}

/**
 * Where the migrations live, which differs between the two ways this runs.
 *
 * Both candidates are anchored on `__dirname` rather than `process.cwd()`, so
 * they cannot be confused by where the process was launched from:
 *
 * | running                | `__dirname`      | migrations          |
 * |------------------------|------------------|---------------------|
 * | `node dist/server.js`  | `dist/db`        | `dist/migrations`   |
 * | ts-node (dev)          | `src/db`         | `knex/migrations`   |
 *
 * The compiled location is checked first: in dev, `src/migrations` does not
 * exist, so the two layouts cannot pick each other's directory.
 *
 * **`dist/migrations`, not `dist/knex/migrations`.** Two migrations import the
 * shared library by relative path (`../../../tset-sharedlib/dist/...`), which
 * only resolves from a directory exactly two levels below `tset-server/` - as
 * `knex/migrations` is. Nesting the build output one level deeper broke both of
 * them with `Cannot find module`, and only in production. Keep the depth equal.
 */
export function resolveMigrationsDir(): string {
  const candidates = [
    path.join(__dirname, '..', 'migrations'), // dist/db -> dist/migrations
    path.join(__dirname, '..', '..', 'knex', 'migrations'), // src/db -> knex/migrations
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error(`[embedded-db] no migrations directory found. Looked in:\n  ${candidates.join('\n  ')}`);
}

/**
 * Bring the schema up to date, then hand the database over.
 *
 * **Only under the embedded database.** Cloud runs migrations from a separate
 * `dbmigration` service precisely because several app tasks boot at once, and
 * having each of them race `migrate.latest()` is how you get a half-applied
 * schema. A box is one process, so the race does not exist there.
 *
 * A failure here is fatal on purpose: `server.ts` stops the cluster and exits
 * rather than serving traffic against a schema that is half of what the code
 * expects.
 */
export async function runBootMigrations(): Promise<void> {
  const directory = resolveMigrationsDir();
  const files = fs.readdirSync(directory);
  const compiled = __filename.endsWith('.js');

  // `.sql` sits in that directory too (an unused leftover), so the extension is
  // stated rather than left to knex's default list.
  const loadExtensions = compiled ? ['.js'] : ['.ts'];
  if (!files.some((f) => f.endsWith(loadExtensions[0]))) {
    throw new Error(
      `[embedded-db] ${directory} has no ${loadExtensions[0]} migrations. ` +
        (compiled
          ? 'Run `npm run build` - the build compiles knex/migrations into dist.'
          : 'Expected TypeScript sources here.'),
    );
  }

  // Relative require, never '@/db/knex_config': swc does not rewrite the '@/'
  // alias inside a function body, so an aliased lazy require resolves at compile
  // time in dev and throws MODULE_NOT_FOUND from dist. Same rule as
  // base/task_dispatch.ts.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const knexInstance = require('./knex_config').default;

  const [, applied]: [number, string[]] = await knexInstance.migrate.latest({directory, loadExtensions});
  if (applied.length === 0) {
    logger.info('[embedded-db] schema already up to date');
  } else {
    logger.info(`[embedded-db] applied ${applied.length} migration(s), latest: ${applied[applied.length - 1]}`);
  }
}
