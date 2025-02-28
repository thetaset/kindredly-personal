import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('access_request', (table) => {
    table.string('type');
    table.string('approverId');
    table.string('sourceRefType');
    table.string('sourceRefId');
    table.json('details');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('access_request', (table) => {
    table.dropColumn('type');
    table.dropColumn('approverId');
    table.dropColumn('sourceRefType');
    table.dropColumn('sourceRefId');
    table.dropColumn('details');
  });
}
