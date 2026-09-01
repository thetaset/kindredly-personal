import App from '@/app';
import validateEnv from '@utils/validateEnv';
import {startEmbeddedPostgres, stopEmbeddedPostgres, usesEmbeddedPostgres} from '@/db/embedded_postgres';

validateEnv();

/**
 * Boot order matters and is the whole reason this file is no longer three lines.
 *
 * Under `KND_EMBEDDED_DB=true` the database runs inside this process, so it has
 * to be listening before anything queries it - and `new App()` reaches a query
 * on its own (`loadData()` -> `PluginService.initialize()`). So the cluster
 * starts first, then the app is constructed. A no-op in every other profile.
 */
async function main() {
  await startEmbeddedPostgres();

  const app = new App();
  app.listen();
}

/**
 * Stop the embedded cluster on the way down. Only registered when there is one:
 * a cloud process should not gain signal handlers it has no use for.
 */
function installShutdownHandlers() {
  if (!usesEmbeddedPostgres()) return;
  let closing = false;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      closePoolThenCluster().finally(() => process.exit(0));
    });
  }
}

/**
 * Close the connection pool before the cluster. Correct hygiene, and NOT a fix
 * for the noisy shutdown.
 *
 * ctrl-c on a box prints `terminating connection due to administrator command`
 * plus two `pg` stack traces before it exits. Nothing is wrong - the data is
 * checkpointed and the cluster shuts down cleanly - it just reads like a crash.
 *
 * This was the obvious suspect and it is not the cause: instrumenting the
 * shutdown showed Postgres receiving its fast-shutdown request FIRST, with
 * `knex.destroy()` only resolving afterwards, so the pool is being torn down by
 * the cluster stopping rather than the other way round. `embedded-postgres`
 * registers no signal handlers of its own, so the trigger is still unidentified.
 * Left as cosmetic; closing the pool first is right regardless of what prints.
 */
async function closePoolThenCluster(): Promise<void> {
  try {
    // Relative require, never '@/db/knex_config': swc does not rewrite the '@/'
    // alias inside a function body. Same rule as base/task_dispatch.ts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await require('./db/knex_config').default.destroy();
  } catch {
    /* Best effort - a pool that will not close must not block the cluster stopping. */
  }
  await stopEmbeddedPostgres();
}

installShutdownHandlers();

main().catch(async (error) => {
  console.error('Failed to start server', error);
  await stopEmbeddedPostgres();
  process.exit(1);
});
