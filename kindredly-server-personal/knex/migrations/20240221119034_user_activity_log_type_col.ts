import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_activity_log', (table) => {
    table.string('type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_activity_log', (table) => {
    table.dropColumn('type');
  });
}
