import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {

  await knex.schema.createTable('following', (table) => {
    table.increments('id').primary();
    table.string('refType');
    table.string('refId').index();
    table.string('userId').index();
    table.integer("statusCode").defaultTo(0);
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });


}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('following');
}
