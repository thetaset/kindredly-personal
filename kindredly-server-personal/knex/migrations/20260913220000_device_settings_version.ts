import {Knex} from 'knex';

/**
 * Per-user settings version for device apps (DCP-5, device control plane redesign §4.1).
 *
 * A device sends the version it last applied and gets the settings body back only when the
 * version differs. The server raises it in the same statement or transaction as every write that
 * changes what a device enforces.
 *
 * The value is `GREATEST(version + 1, now in epoch ms)`, not a plain counter, so a database restore
 * cannot hand out a number a device already holds for different settings: the first write after a
 * restore gets the current time, which is past every value issued before it. Until that write a
 * restored server serves an older version, and devices treat any difference, lower included, as a
 * reason to fetch. Nothing orders by it.
 *
 * bigint because epoch milliseconds do not fit an int. Zero means "never changed since this
 * column was added".
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user', (table) => {
    table.bigInteger('deviceSettingsVersion').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user', (table) => {
    table.dropColumn('deviceSettingsVersion');
  });
}
