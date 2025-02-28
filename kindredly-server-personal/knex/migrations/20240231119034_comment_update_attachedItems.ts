import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('comment', (table) => {
    table.json('attachments');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('comment', (table) => {
    table.dropColumn('attachments');
  });
}
