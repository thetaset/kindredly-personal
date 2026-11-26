import type {Knex} from 'knex';

/**
 * CLS-9 (docs/trackers/classifier-loop-tracker.md): a batch of synthetic pages an AI sent through
 * its own key. The pages are samples of the batch's own dataset (`datasetId`, role 'synthetic');
 * this row holds what the batch was for, the blind relabel's counts, and the admin's decision.
 * Synthetic pages only ever teach: an accepted batch is copied into a training set, never a test
 * or pinned set.
 */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('classifier_synth_batch')) return;
  await knex.schema.createTable('classifier_synth_batch', (table) => {
    table.increments('_id').primary();
    table.string('datasetId', 180).notNullable().unique();
    table.string('keyId', 64).notNullable();
    table.string('keyLabel', 120).nullable();
    table.string('category', 60).notNullable();
    table.string('kind', 80).notNullable();
    table.text('notes').nullable();
    /** 'labelling' → 'ready' (or 'failed'), then 'accepted' or 'dropped'. */
    table.string('status', 20).notNullable();
    table.jsonb('counts').notNullable();
    table.text('decisionReason').nullable();
    table.string('decidedBy', 255).nullable();
    table.timestamp('decidedAt', {useTz: true}).nullable();
    table.string('intoDatasetId', 180).nullable();
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.index(['keyId', 'createdAt'], 'idx_classifier_synth_batch_key');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('classifier_synth_batch');
}
