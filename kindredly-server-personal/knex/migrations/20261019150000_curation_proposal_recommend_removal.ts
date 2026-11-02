import {Knex} from 'knex';

/**
 * HAT-623. The curation AI can suggest taking an item out of the catalog: a proposal carries the
 * suggestion and its reason, and the curator presses Remove from the catalog or Reject on /curate.
 */
export async function up(knex: Knex): Promise<void> {
  const has = await knex.schema.hasColumn('curation_proposal', 'recommendRemoval');
  if (!has) {
    await knex.schema.alterTable('curation_proposal', (table) => {
      table.boolean('recommendRemoval').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const has = await knex.schema.hasColumn('curation_proposal', 'recommendRemoval');
  if (has) {
    await knex.schema.alterTable('curation_proposal', (table) => {
      table.dropColumn('recommendRemoval');
    });
  }
}
