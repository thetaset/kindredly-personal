import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('post', (table) => {
    table.json('attachedItems');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('post', (table) => {
    table.dropColumn('attachedItems');
  });
}
