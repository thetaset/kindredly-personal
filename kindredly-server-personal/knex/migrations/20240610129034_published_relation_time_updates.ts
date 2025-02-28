import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('published_relation', (table) => {

    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('availableAt').defaultTo(knex.fn.now());


  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('published_relation', (table) => {
    table.dropColumn('updatedAt');
    table.dropColumn('availableAt');

  });
}
