import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {

  await knex.schema.createTable('reaction', (table) => {
    table.string('_id').primary();
    table.string('userId').index();
    table.string('refType');//col, item, pubItem, pubCol, custom
    table.string('refId').index();
    table.string('reaction');
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  });


}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('reaction');
}
