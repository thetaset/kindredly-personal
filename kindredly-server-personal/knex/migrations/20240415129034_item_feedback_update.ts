import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_feedback', (table) => {

    table.timestamp('starredDate')


  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_feedback', (table) => {
    table.dropColumn('starredDate');

  });
}
