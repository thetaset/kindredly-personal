import {Knex} from 'knex';

/**
 * Owned source-reputation database for the article-trust feature.
 *
 * One row per domain: a coarse credibility band + bias lean + category that the
 * article-trust pipeline anchors its verdict on. Curated/editable (source tracks
 * provenance: 'seed' rows ship with the app, 'admin' rows are hand-edited).
 * Seeded lazily by SourceReputationService on first use; the static
 * source_priority_domain_policy provides runtime coverage for domains not here.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('source_reputation', (table) => {
    // Normalized registrable domain (e.g. "bbc.com"), used as the primary key.
    table.string('_id', 255).primary();
    table.string('domain', 255).notNullable().unique();

    table.string('credibility', 20).notNullable().defaultTo('unknown'); // high|mostly|mixed|low|satire|unknown
    table.string('bias', 20).notNullable().defaultTo('na'); // left|center-left|center|center-right|right|none|na
    table.string('category', 60).nullable();
    table.float('confidence').notNullable().defaultTo(0); // 0..1
    table.text('notes').nullable();
    table.jsonb('aliases').nullable(); // alternate domains that map to this record
    table.string('source', 20).notNullable().defaultTo('seed'); // seed|admin|imported

    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());

    table.index(['credibility'], 'idx_source_rep_credibility');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('source_reputation');
}
