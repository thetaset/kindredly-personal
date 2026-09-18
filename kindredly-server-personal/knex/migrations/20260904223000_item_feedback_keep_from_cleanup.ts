import {Knex} from 'knex';

/**
 * "Keep out of cleanup" gets its own flag.
 *
 * Until now Cleanup's Keep wrote `neverRemindDate`, the same column as Rediscover's
 * "Don't show again", so keeping an item out of Cleanup silently removed it from
 * Rediscover forever, and vice versa. They are two intents, so they become two columns.
 *
 * Existing rows are copied rather than left empty: every item that was kept out of
 * Cleanup so far stays out of it, and nothing that was hidden from Rediscover reappears
 * there. The two only diverge from here on.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_feedback', (table) => {
    table.timestamp('keepFromCleanupDate');
  });
  await knex.raw(
    'UPDATE item_feedback SET "keepFromCleanupDate" = "neverRemindDate" WHERE "neverRemindDate" IS NOT NULL',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_feedback', (table) => {
    table.dropColumn('keepFromCleanupDate');
  });
}
