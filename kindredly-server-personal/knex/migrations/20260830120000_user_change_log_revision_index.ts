import type {Knex} from 'knex';

// SYNC-4. The sync cursor becomes the changelog's own id, so delta sync runs
//   WHERE "userId" = ? AND id > ?
// alongside the date query it is replacing. This index serves the new one, and it
// also serves MAX(id) WHERE "userId" = ? -- the per-user revision the response
// carries back -- as an index-only backward scan rather than a heap scan.
//
// Both this and (userId, createdAt) are needed during the compatibility window:
// a client that has not upgraded keeps sending a date. The date index goes when no
// client sends one.
//
// The single-column "userId" index from the baseline schema is dropped here: a
// composite on (userId, ...) fully supersedes it for lookup, and this is a hot
// write table where a redundant index is pure cost on every insert. SYNC-3's
// closing note deferred this to SYNC-4 so all three would be rationalized at once
// rather than one being dropped in isolation.
const revisionIndex = 'user_change_log_userId_id_idx';
const legacyUserIdIndex = 'user_change_log_userId_index';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${revisionIndex}
    ON "user_change_log" ("userId", "id")
  `);
  await knex.raw(`DROP INDEX IF EXISTS ${legacyUserIdIndex}`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${legacyUserIdIndex}
    ON "user_change_log" ("userId")
  `);
  await knex.raw(`DROP INDEX IF EXISTS ${revisionIndex}`);
}
