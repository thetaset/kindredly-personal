import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_relation', (table) => {

    table.timestamp('publishedUpdatedAt')
    table.timestamp('publishedAvailableAt');


  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_relation', (table) => {
    table.dropColumn('publishedUpdatedAt');
    table.dropColumn('publishedAvailableAt');
  });
}
