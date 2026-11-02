import {Knex} from 'knex';

/**
 * HAT-848, stored passwords and PINs in the new per-person form. Nothing writes that form until the
 * founder turns on STORED_SECRET_V2.
 *
 * stored_secret_backup: the old form of a password or PIN, kept each time the new form is written, so
 * `restoreStoredSecrets` can put every row back. `v2Salt` names the one new-form value it was kept for.
 * It never leaves this server (`realm_scope.ts`).
 *
 * `user.pin` widens from 128 to 255 characters, because the new form is 171. Postgres only: SQLite
 * doesn't enforce the length, and altering a column there rebuilds the table.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('stored_secret_backup'))) {
    await knex.schema.createTable('stored_secret_backup', (table) => {
      table.string('_id', 255).primary();
      table.string('userId', 255).notNullable();
      table.string('field', 16).notNullable();
      table.string('v1', 255).notNullable();
      table.string('v2Salt', 64).notNullable();
      table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
      table.index(['userId', 'field']);
    });
  }
  if (isPostgres(knex)) {
    await knex.raw('ALTER TABLE "user" ALTER COLUMN "pin" TYPE varchar(255)');
  }
}

export async function down(knex: Knex): Promise<void> {
  // The pin column stays wide: narrowing it would fail on any new-form PIN. A backup that holds
  // anything is kept: it's the only way back to the old form.
  if (!(await knex.schema.hasTable('stored_secret_backup'))) return;
  const [{count}] = await knex('stored_secret_backup').count({count: '*'});
  if (Number(count) === 0) await knex.schema.dropTable('stored_secret_backup');
}

function isPostgres(knex: Knex): boolean {
  return ['pg', 'postgres', 'postgresql'].includes(String(knex.client.config?.client || knex.client.dialect));
}
