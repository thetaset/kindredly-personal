import type {Knex} from 'knex';

/**
 * CLS-10 (docs/trackers/classifier-loop-tracker.md): a recipe for synthetic pages, made by an admin
 * from a weak spot (a Category and kind of page, or a topic). It describes the cell, never a test
 * page. A batch sent for a recipe records its id.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('classifier_synth_recipe'))) {
    await knex.schema.createTable('classifier_synth_recipe', (table) => {
      table.increments('_id').primary();
      table.string('category', 60).notNullable();
      table.string('kind', 80).notNullable();
      table.string('topicId', 80).nullable();
      table.text('notes').notNullable();
      table.integer('pages').notNullable();
      /** 'open' while the AI may write for it, then 'closed'. */
      table.string('status', 16).notNullable().defaultTo('open');
      table.string('createdBy', 120).nullable();
      table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
      table.timestamp('closedAt', {useTz: true}).nullable();
      table.index(['status']);
    });
  }
  // The batch table comes from 20261110160000_classifier_synth_batch, which runs first.
  if (
    (await knex.schema.hasTable('classifier_synth_batch')) &&
    !(await knex.schema.hasColumn('classifier_synth_batch', 'recipeId'))
  ) {
    await knex.schema.alterTable('classifier_synth_batch', (table) => {
      table.integer('recipeId').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (
    (await knex.schema.hasTable('classifier_synth_batch')) &&
    (await knex.schema.hasColumn('classifier_synth_batch', 'recipeId'))
  ) {
    await knex.schema.alterTable('classifier_synth_batch', (table) => {
      table.dropColumn('recipeId');
    });
  }
  await knex.schema.dropTableIfExists('classifier_synth_recipe');
}
