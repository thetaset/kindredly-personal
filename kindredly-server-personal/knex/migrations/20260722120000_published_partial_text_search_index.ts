import {Knex} from 'knex';

// Replace the full-table full-text GIN index on `published` with a PARTIAL index
// that only covers catalog-searchable rows (published + public + not excluded).
//
// Two problems this fixes:
//  1. The old index covered every published row, so high-volume non-catalog
//     content (daily/feed/drip children, needs-review, non-public) bloated it
//     even though `excludeFromSearch` filters them out at query time.
//  2. The old index expression (`"name" || ' ' || "description"`) did not match
//     the query expression (`COALESCE("name",'') || ' ' || COALESCE("description",'')`),
//     so Postgres could not use it — it was pure overhead. The new expression
//     matches the query in internal_published.service.ts::filteredSearch.
//
// Built CONCURRENTLY so it does not lock writes; CONCURRENTLY cannot run inside a
// transaction, hence `config.transaction = false`.
export const config = {transaction: false};

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS published_text_search_index_v2
      ON published USING GIN (
        to_tsvector('english', COALESCE("name", '') || ' ' || COALESCE("description", ''))
      )
      WHERE "published" = true
        AND "visibilityCode" = 2
        AND COALESCE("excludeFromSearch", false) = false;
  `);
  await knex.schema.raw(`DROP INDEX IF EXISTS published_text_search_index;`);
  await knex.schema.raw(
    `ALTER INDEX published_text_search_index_v2 RENAME TO published_text_search_index;`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`DROP INDEX IF EXISTS published_text_search_index;`);
  await knex.schema.raw(`
    CREATE INDEX published_text_search_index ON published
      USING GIN (to_tsvector('english', "name" || ' ' || "description"));
  `);
}
