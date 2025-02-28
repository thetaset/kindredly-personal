import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('published', (table) => {
    table.boolean('excludeFromSearch').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('published', (table) => {
    table.dropColumn('excludeFromSearch');
  });
}
