import { Knex } from 'knex';

/**
 * Per-sample eval predictions — drill-down + cross-candidate row diffs ("which
 * rows did A get wrong that B got right"). `predicted` is nullable (abstention).
 * `correct` is denormalized for fast diff queries. Cascade-deletes with the run.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('classification_eval_prediction', (table) => {
    table.increments('_id').primary();
    table.integer('evalRunId').notNullable();
    table.integer('sampleId').notNullable();
    table.string('gold', 255).notNullable();
    table.string('predicted', 255);
    table.boolean('correct').notNullable();
    table.jsonb('scores');
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('evalRunId').references('_id').inTable('classification_eval_run').onDelete('cascade');
    table.index('evalRunId');
    table.index('sampleId');
    table.index(['evalRunId', 'sampleId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('classification_eval_prediction');
}
