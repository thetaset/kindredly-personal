import {Knex} from 'knex';

/**
 * The admin console's authenticator code (HAT-529, docs/guides/admin-lockdown.md). One row,
 * `_id = 'admin'`, because the admin console has one sign-in.
 *
 * secret / pendingSecret: the base32 key, encrypted with PASSWORD_STORAGE_ENCRYPTION_KEY.
 * lastStep: the last 30-second step accepted, so a code can't be used twice.
 * recoveryCodeHashes: SHA-256 of the one-time codes shown once at setup, for a lost phone.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('admin_second_factor', (table) => {
    table.string('_id', 40).primary();
    table.jsonb('secret').nullable();
    table.jsonb('pendingSecret').nullable();
    table.timestamp('pendingAt', {useTz: true}).nullable();
    table.timestamp('enabledAt', {useTz: true}).nullable();
    table.bigInteger('lastStep').nullable();
    table.jsonb('recoveryCodeHashes').notNullable().defaultTo('[]');
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('admin_second_factor');
}
