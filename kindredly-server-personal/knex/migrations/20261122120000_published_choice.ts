import type {Knex} from 'knex';

/**
 * CCH-1 (docs/trackers/curators-choice-tracker.md): a second tier above "in the catalog".
 *
 * `published.choice` is null for an item that a curator checked and that families can find, and
 * 'curator' for one Kindredly recommends: Curator's Choice. Text, not boolean, so the founder's
 * later parents', teachers' and kids' choices (HAT-1281) are further values, not more columns.
 * `curated` keeps meaning "checked" and stays the visibility gate; only updateCurationStatus writes
 * `choice`, and clearing `curated` clears it.
 *
 * `curation_proposal.recommendChoice`: the curation AI may recommend the mark; the curator applies.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('published', 'choice'))) {
    await knex.schema.alterTable('published', (table) => {
      table.string('choice', 32).nullable();
    });
  }
  // Set on a small minority of rows; a partial index keeps the "Choice first" order cheap.
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS published_choice_idx ON published ("choice") WHERE "choice" IS NOT NULL`);
  if (!(await knex.schema.hasColumn('curation_proposal', 'recommendChoice'))) {
    await knex.schema.alterTable('curation_proposal', (table) => {
      table.boolean('recommendChoice').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`DROP INDEX IF EXISTS published_choice_idx`);
  if (await knex.schema.hasColumn('published', 'choice')) {
    await knex.schema.alterTable('published', (table) => {
      table.dropColumn('choice');
    });
  }
  if (await knex.schema.hasColumn('curation_proposal', 'recommendChoice')) {
    await knex.schema.alterTable('curation_proposal', (table) => {
      table.dropColumn('recommendChoice');
    });
  }
}
