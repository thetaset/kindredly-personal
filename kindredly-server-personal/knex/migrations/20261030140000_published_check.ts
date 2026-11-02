import type {Knex} from 'knex';

/**
 * MON-1 (docs/trackers/catalog-monitor-tracker.md): what the catalog monitor last saw at each
 * address of a catalog item — its page, its feed, later its privacy policy and terms. One row per
 * item and kind, kept current; the curator page reads it beside the item's history.
 *
 * Public page text only. No foreign key to `published`: the monitor's job skips rows whose item is
 * gone, and a delete leaves nothing that matters behind.
 */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('published_check')) return;
  await knex.schema.createTable('published_check', (table) => {
    table.string('_id', 300).primary();
    table.string('publishedId', 255).notNullable().index();
    table.string('kind', 20).notNullable();
    table.text('url').notNullable();
    table.timestamp('checkedAt', {useTz: true}).nullable();
    table.timestamp('nextCheckAt', {useTz: true}).nullable();
    table.string('result', 20).nullable();
    table.string('reason', 60).nullable();
    table.integer('httpStatus').nullable();
    table.text('finalUrl').nullable();
    table.text('etag').nullable();
    table.string('lastModified', 120).nullable();
    table.text('title').nullable();
    table.text('text').nullable();
    table.string('textHash', 64).nullable();
    table.integer('textLength').nullable();
    table.jsonb('scriptHosts').nullable();
    table.timestamp('newestPostAt', {useTz: true}).nullable();
    table.integer('failures').notNullable().defaultTo(0);
    table.timestamp('changedAt', {useTz: true}).nullable();
    table.float('changeRatio').nullable();
    table.text('previousText').nullable();
    table.text('previousTitle').nullable();
    table.jsonb('findings').nullable();
    table.index(['nextCheckAt'], 'idx_published_check_next');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('published_check');
}
