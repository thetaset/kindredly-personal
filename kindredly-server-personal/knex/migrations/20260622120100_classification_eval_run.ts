import { Knex } from 'knex';

/**
 * Eval run (scorecard) — one comparable result per (candidate, test set, run).
 * Model-agnostic: candidateKind/candidateRef are opaque (any anchor version,
 * logreg artifact, or LLM config). task/target default to content/eduValue so
 * the first new label task or classifier needs zero migration. No `active`
 * column and no idempotency unique constraint — history is kept; the leaderboard
 * collapses to the latest run per candidate identity at read time.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('classification_eval_run', (table) => {
    table.increments('_id').primary();
    table.string('evalRunId', 180).notNullable().unique();
    table.string('task', 100).notNullable().defaultTo('content');
    table.string('target', 100).notNullable().defaultTo('eduValue');
    table.string('testSetDatasetId', 180).index();
    table.string('testSetSignature', 255);
    table.string('candidateKind', 100).notNullable();
    table.jsonb('candidateRef');
    table.string('candidateConfigHash', 255).index();
    table.string('candidateLabel', 300);
    table.jsonb('metrics');
    table.jsonb('runConfig');
    table.string('status', 50).notNullable().defaultTo('complete');
    table.string('createdBy', 100).index();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('createdBy').references('_id').inTable('user');
    table.index('task');
    table.index('candidateKind');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('classification_eval_run');
}
