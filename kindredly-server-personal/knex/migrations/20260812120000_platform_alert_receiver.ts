import {Knex} from 'knex';

/**
 * Users designated to receive platform-operations alerts (bug reports, emergencies)
 * as in-app Kindredly notifications + push + email.
 *
 * Managed from the admin console. `userId` references user._id by convention
 * (no FK, matching the rest of the schema).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('platform_alert_receiver', (table) => {
    table.string('userId').primary();
    table.string('note').nullable();
    table.timestamp('createdAt').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('platform_alert_receiver');
}
