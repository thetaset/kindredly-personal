import { Knex } from 'knex';

/**
 * Content store for the Thinking Puzzles app.
 *
 * Deliberately NOT tied to `published` or `item`. Puzzles are app content, not catalog content:
 * routing them through the publish pipeline would surface them in catalog search, the category
 * explorer and the moderation queue, all of which are wrong for them. A dedicated table costs one
 * migration and carries no ACL surface and no per-user data.
 *
 * One table, kind-discriminated — the same demux idiom `ref_state` uses. `kind` selects how `data`
 * is read; `parentId` gives the strand -> concept -> puzzle spine, so a record never restates its
 * own parentage inside `data`.
 *
 * `data` is OPAQUE to the server. The payload shape belongs to the client's standalone
 * `thinkingPuzzles` module, which is deliberately free of Kindredly imports; typing it here would
 * couple the module to the monorepo and would mean a new puzzle primitive could not ship without
 * a server change. The client re-validates every record on read, so a malformed row costs one
 * puzzle rather than the app.
 *
 * Nothing inside `data` is indexed. Bands and levels are filtered client-side because the whole
 * live catalog is one small fetch.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('puzzle_content', (table) => {
    // The authored slug: 'attention', 'variable-reward', 'surprise-box'. Ids are shared across all
    // three kinds, and become immutable once a record has been live — progress is keyed on concept
    // id, so a rename would orphan every learner's history.
    table.string('_id', 255).primary();

    // 'strand' | 'concept' | 'puzzle'
    table.string('kind', 40).notNullable().index();

    // concept -> strand _id; puzzle -> concept _id; strand -> null.
    // No foreign key on purpose: a seed import writes parents and children in one batch, and a
    // self-referencing FK would force an ordering for integrity the service already checks.
    table.string('parentId', 255).nullable().index();

    // 'draft' | 'live' | 'retired'. Defaults to draft so a half-written row can never leak into
    // the public catalog. 'retired' is not a delete: it keeps the id and title resolvable so
    // previously recorded progress still renders a label.
    table.string('status', 40).notNullable().defaultTo('draft').index();

    // Total ordering — a nullable integer sorts last in Postgres and makes catalog order wobble.
    table.integer('sortOrder').notNullable().defaultTo(0);

    table.jsonb('data').notNullable().defaultTo('{}');

    // Optimistic concurrency: an admin save must send the version it read.
    table.integer('version').notNullable().defaultTo(1);

    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    // An admin label, NOT a `user._id`. Keeping it that way keeps this table out of the
    // retention/purge surface entirely — nothing here is user data.
    table.string('updatedBy', 100).nullable();

    // The hot public read: live rows, ordered.
    table.index(['status', 'kind', 'sortOrder'], 'idx_puzzle_content_status_kind_sort');
    // Admin tree view and child lookups.
    table.index(['parentId', 'sortOrder'], 'idx_puzzle_content_parent_sort');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('puzzle_content');
}
