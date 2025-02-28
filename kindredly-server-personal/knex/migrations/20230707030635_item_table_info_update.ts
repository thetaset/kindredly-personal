import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item', (table) => {
    table.json('info');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item', (table) => {
    table.dropColumn('info');
  });
}
