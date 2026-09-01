import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('classification_feedback_report', (table) => {
    table.increments('_id').primary();
    table.string('dedupeKey', 80).notNullable().unique();
    table.string('userId', 100).index();
    table.text('sourceType').notNullable().index();
    table.text('sourceId').index();
    table.jsonb('details').notNullable();
    table.integer('reportCount').notNullable().defaultTo(1);
    table.timestamp('lastReportedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('userId').references('_id').inTable('user');
    table.index(['sourceType', 'sourceId'], 'idx_cfr_source');
  });

  await knex.schema.createTable('classification_dataset_sample', (table) => {
    table.increments('_id').primary();
    table.string('dedupeKey', 80).notNullable().unique();
    table.string('datasetId', 180).notNullable().index();
    table.string('userId', 100).index();
    table.text('sourceType').notNullable().index();
    table.text('sourceId').index();
    table.jsonb('details').notNullable();
    table.integer('sampleCount').notNullable().defaultTo(1);
    table.timestamp('lastSeenAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('userId').references('_id').inTable('user');
    table.index(['sourceType', 'sourceId'], 'idx_cds_source');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('classification_dataset_sample');
  await knex.schema.dropTable('classification_feedback_report');
}
