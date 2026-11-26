import type {Knex} from 'knex';

/**
 * CLS-7 (docs/trackers/classifier-loop-tracker.md): how a classifier version did on a dataset.
 *
 * The browser sends only its answer for each page (`answers` = [{sampleId, predicted}]); the server
 * reads the gold labels itself and works out `metrics`. `datasetSignature` is the dataset's
 * signature when the score was taken (a hash of its labelled samples), so a score taken before a
 * page was added, removed or relabelled no longer counts.
 *
 * Rows are only ever inserted. For one (versionId, datasetId, datasetSignature) the newest row is
 * the one that counts. No foreign keys: 'v1' is bundled and has no `classifier_version` row, and a
 * dataset can exist without a registry row.
 */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('classifier_scorecard')) return;
  await knex.schema.createTable('classifier_scorecard', (table) => {
    table.increments('_id').primary();
    table.string('versionId', 32).notNullable();
    table.string('datasetId', 180).notNullable();
    table.string('datasetSignature', 64).notNullable();
    table.jsonb('answers').notNullable();
    table.jsonb('metrics').notNullable();
    table.string('createdBy', 255).nullable();
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.index(['versionId', 'datasetId', 'datasetSignature'], 'idx_classifier_scorecard_version_dataset');
    table.index('datasetId', 'idx_classifier_scorecard_dataset');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('classifier_scorecard');
}
