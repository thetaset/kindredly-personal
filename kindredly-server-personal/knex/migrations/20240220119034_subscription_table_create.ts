import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {

  await knex.schema.createTable('subscription', (table) => {
    table.string('_id').primary();
    table.string('userId').index();
    table.string('refType');//col, item, pubItem, pubCol, custom
    table.string('refId').index();
    table.json('data')

    table.integer("statusCode").defaultTo(0);

    table.boolean('encrypted').defaultTo(false);
    table.json('encInfo');
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });


}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('subscription');
}
