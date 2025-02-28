import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user', (table) => {
    table.timestamp('emailChangedAt')
    table.timestamp('verifyEmailSentAt');

  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user', (table) => {
    table.dropColumn('emailChangedAt');
    table.dropColumn('verifyEmailSentAt');
  });
}
