import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item', (table) => {
    table.json('attachments');
    table.json('sourceInfo');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item', (table) => {
    table.dropColumn('attachments');
    table.dropColumn('sourceInfo');
  });
}
