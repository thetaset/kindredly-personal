import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_feedback', (table) => {
    table.boolean('isHidden');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_feedback', (table) => {
    table.dropColumn('isHidden');
  });
}
