import {Knex} from 'knex';

/**
 * Curation review (docs/specs/curation-review.md, CRV-2).
 *
 * `curation_review` holds every review of a catalog row against the checklist in
 * tset-sharedlib/src/curation.checklist.ts: one open review at a time per row, and every finished
 * one kept, so a family can read what was checked and when.
 *
 * No foreign key to `published`: unpublishing a collection deletes its row, and the history of
 * what curators found should outlive that. Nothing here is a user's data; `curatorId` is a
 * public profile id, the same value `published.curatorId` already stores.
 *
 * `published.underReviewAt` is what takes a row out of recommendations while a review is open.
 * It is deliberately a new column rather than `curated = false` (which hides a family's page
 * entirely, published_visibility.ts) or `excludeFromSearch` (which republish and approval both
 * overwrite). `published.nextReviewAt` is copied from the last finished review so the scheduled
 * job scans one table.
 *
 * `report_problem.curationReviewId` links a family's report to the review it opened or joined.
 * The reporter's words stay in `report_problem`, which is per-user data; they are never copied
 * into the review.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('curation_review', (table) => {
    table.string('_id', 255).primary();
    // Always the canonical published `_id`, never an easyId.
    table.string('publishedId', 255).notNullable();
    // Answers are only readable against the checklist version they were given for.
    table.integer('checklistVersion').notNullable();
    // 'open' | 'finalized' | 'closed' (an admin decided outside the review, or the row was blocked)
    table.string('status', 40).notNullable().defaultTo('open');
    // Why it was opened: 'report' | 'scheduled' | 'backfill' | 'suggestion' | 'curator'
    table.string('openReason', 40).notNullable();
    // Whether this review took the row out of recommendations when it opened or later.
    table.boolean('underReview').notNullable().defaultTo(false);
    // {[checkKey]: {value, comment?, screenshots?, source}}
    table.jsonb('answers').notNullable().defaultTo('{}');
    // The AI's suggestions and reasoning. Curators only; never returned to families.
    table.jsonb('aiDraft').nullable();
    // 'curate' | 'decline', set when finalized.
    table.string('outcome', 40).nullable();
    // A DECLINE_REASONS code when the outcome is 'decline'.
    table.string('declineReason', 40).nullable();
    // Public: what families read above the checks.
    table.text('summary').nullable();
    // Curators only.
    table.text('internalNote').nullable();
    table.integer('reviewAgainMonths').nullable();
    table.timestamp('nextReviewAt', {useTz: true}).nullable();
    // The curator's public profile id, or 'admin' for the admin console.
    table.string('curatorId', 255).nullable();
    table.timestamp('openedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('finalizedAt', {useTz: true}).nullable();
    // Optimistic concurrency: a save must send the version it read, so two curators working the
    // same review cannot overwrite each other.
    table.integer('version').notNullable().defaultTo(1);
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());

    // The item page: finished reviews for one row, newest first.
    table.index(['publishedId', 'finalizedAt'], 'idx_curation_review_published_finalized');
    // The curator queue: open reviews, oldest first.
    table.index(['status', 'openedAt'], 'idx_curation_review_status_opened');
  });

  // At most one open review per row, held by the database: two reports arriving together must
  // join one review, which a read-then-insert cannot promise.
  await knex.schema.raw(
    `CREATE UNIQUE INDEX uq_curation_review_one_open ON curation_review ("publishedId") WHERE status = 'open'`,
  );

  await knex.schema.alterTable('published', (table) => {
    table.timestamp('underReviewAt', {useTz: true}).nullable();
    table.timestamp('nextReviewAt', {useTz: true}).nullable();
  });
  // Both are null on nearly every row; partial indexes keep them small.
  await knex.schema.raw(
    `CREATE INDEX IF NOT EXISTS published_under_review_at_idx ON published ("underReviewAt") WHERE "underReviewAt" IS NOT NULL`,
  );
  await knex.schema.raw(
    `CREATE INDEX IF NOT EXISTS published_next_review_at_idx ON published ("nextReviewAt") WHERE "nextReviewAt" IS NOT NULL`,
  );

  await knex.schema.alterTable('report_problem', (table) => {
    table.string('curationReviewId', 255).nullable().index();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('report_problem', (table) => {
    table.dropColumn('curationReviewId');
  });
  await knex.schema.raw(`DROP INDEX IF EXISTS published_next_review_at_idx`);
  await knex.schema.raw(`DROP INDEX IF EXISTS published_under_review_at_idx`);
  await knex.schema.alterTable('published', (table) => {
    table.dropColumn('nextReviewAt');
    table.dropColumn('underReviewAt');
  });
  await knex.schema.dropTable('curation_review');
}
