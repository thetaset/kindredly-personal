import type {Knex} from 'knex';

// SYNC-3. Every delta sync runs
//   WHERE "userId" = ? AND "createdAt" >= ?
// (UserChangeLogRepo.changeLogSince), against a table whose only index is on "userId"
// alone. With 90-day retention (data_retention.service.ts) that means every poll, from
// every device, fetches the user's whole changelog history and filters it in memory.
//
// Deliberately (userId, createdAt) and not (userId, id): this serves the query that
// exists TODAY. SYNC-4 replaces the wall-clock cursor with the changelog's own id and
// adds (userId, id) alongside this one -- both are needed during its compatibility
// window, and this one can be dropped once no client sends a date cursor.
const indexName = 'user_change_log_userId_createdAt_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${indexName}
    ON "user_change_log" ("userId", "createdAt")
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS ${indexName}`);
}
