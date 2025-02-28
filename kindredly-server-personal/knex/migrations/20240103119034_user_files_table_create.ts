import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_file', (table) => {
    table.string('_id', 255).primary();
    table.string('userId').index();
    table.string('accountId').index();
    table.string('refId');
    table.string('refType');
    table.string('filename');
    table.string('fileType');
    // filesize
    table.integer('fileSize');
    table.timestamp('lastViewedAt', {useTz: true});
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deletedAt', {useTz: true});

    table.boolean('encrypted').defaultTo(false);
    table.json('encInfo');

    table.index(['refId', 'refType']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_file');
}
