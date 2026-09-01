import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('classification_model_artifact', (table) => {
    table.increments('_id').primary();
    table.string('version', 180).notNullable().unique();
    table.text('kind').notNullable().index();
    table.text('embeddingModelId').notNullable();
    table.boolean('active').notNullable().defaultTo(false).index();
    // The trained model itself: per-head weights/biases, class list, per-class
    // gate, and hyperparameters. Kept as jsonb so the shape can evolve.
    table.jsonb('artifact').notNullable();
    table.jsonb('metrics');
    table.jsonb('datasetSnapshot');
    table.string('createdBy', 100).index();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('createdBy').references('_id').inTable('user');
  });

  // Enforce at most one active artifact per kind at the database level, so the
  // invariant holds even under concurrent publish/activate.
  await knex.schema.raw(
    `CREATE UNIQUE INDEX classification_model_artifact_one_active_per_kind
     ON classification_model_artifact (kind) WHERE active`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('classification_model_artifact');
}
