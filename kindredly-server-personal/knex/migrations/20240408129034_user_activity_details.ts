import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_activity', (table) => {

    table.jsonb('info')


  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_activity', (table) => {
    table.dropColumn('info');

  });
}
