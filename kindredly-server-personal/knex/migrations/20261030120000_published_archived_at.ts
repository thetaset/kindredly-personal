import type {Knex} from 'knex';

/**
 * CWS-2 (docs/trackers/curator-workspace-tracker.md): a curator can archive a catalog item.
 *
 * Archived means out of the catalog: no search, Explore, gallery, Knowledge Map, recently added,
 * starter bundle or curation scan offers it. Its page still opens and says so, and a family that
 * subscribed keeps the subscription. A curator can restore it, and only an archived item can be
 * deleted (founder, 2026-10-30).
 *
 * Its own column, like `underReviewAt` and for the same reasons: `curated = false` hides a family's
 * page entirely, and republish and approval overwrite `excludeFromSearch`.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('published', 'archivedAt'))) {
    await knex.schema.alterTable('published', (table) => {
      table.timestamp('archivedAt', {useTz: true}).nullable();
    });
  }
  // Null on nearly every row; a partial index keeps it small.
  await knex.schema.raw(
    `CREATE INDEX IF NOT EXISTS published_archived_at_idx ON published ("archivedAt") WHERE "archivedAt" IS NOT NULL`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`DROP INDEX IF EXISTS published_archived_at_idx`);
  if (await knex.schema.hasColumn('published', 'archivedAt')) {
    await knex.schema.alterTable('published', (table) => {
      table.dropColumn('archivedAt');
    });
  }
}
