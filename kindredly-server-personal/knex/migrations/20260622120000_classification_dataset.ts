import { Knex } from 'knex';

/**
 * Dataset registry — makes datasets first-class (name, task, role, frozen,
 * provenance). Additive: no FK from classification_dataset_sample, no backfill.
 * A sample's datasetId may exist without a registry row; consumers LEFT JOIN and
 * default role to 'mixed'. role/task are open strings validated in app code (no
 * enum) so new label tasks stay additive.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('classification_dataset', (table) => {
    table.increments('_id').primary();
    table.string('datasetId', 180).notNullable().unique();
    table.string('name', 300).notNullable();
    table.text('description');
    table.string('task', 100).notNullable().defaultTo('content');
    table.string('role', 100);
    table.boolean('frozen').notNullable().defaultTo(false);
    table.jsonb('composedFrom');
    table.string('createdBy', 100).index();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('createdBy').references('_id').inTable('user');
    table.index('task');
    table.index('frozen');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('classification_dataset');
}
