import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('published_relation', (table) => {

    table.json('details')


  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('published_relation', (table) => {
    table.dropColumn('details');

  });
}
