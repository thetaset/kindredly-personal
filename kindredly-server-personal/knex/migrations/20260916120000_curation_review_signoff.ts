import {Knex} from 'knex';

/**
 * Curation sign-offs (docs/specs/curation-review.md, CRV-12).
 *
 * Adding an item to Kindredly's catalog takes more than one curator (founder decision 2026-09-15).
 * Each curator answers the checklist on their own, and `curation_review_signoff` holds one such set
 * of answers. The review row keeps what the curators agreed on, which is what families read.
 *
 * No foreign key to `curation_review` or `published`, for the same reason the review has none: the
 * record of what curators found outlives an unpublish. `curatorId` is a public profile id and
 * `curatorAccountId` the account behind it, kept so two curators in one family count once.
 *
 * Open reviews written before this have draft answers on the review row with no curator recorded
 * (`saveDraft` only stored one when finishing), so they are cleared rather than handed to whichever
 * curator opens the review next. Nothing has used the form yet.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('curation_review_signoff', (table) => {
    table.string('_id', 255).primary();
    table.string('reviewId', 255).notNullable();
    // Always the canonical published `_id`, never an easyId.
    table.string('publishedId', 255).notNullable();
    // The curator's public profile id, and the account it belongs to.
    table.string('curatorId', 255).notNullable();
    table.string('curatorAccountId', 255).nullable();
    // 'curator' today. Apprentices and parents as curators would be new values here.
    table.string('curatorRole', 40).notNullable().defaultTo('curator');
    // 'draft' | 'finished' | 'superseded' (another curator decided the review first)
    table.string('status', 40).notNullable().defaultTo('draft');
    // {[checkKey]: {value, comment?, screenshots?, source}}
    table.jsonb('answers').notNullable().defaultTo('{}');
    // 'curate' | 'decline', set when this curator finished.
    table.string('outcome', 40).nullable();
    table.string('declineReason', 40).nullable();
    // What this curator would tell families.
    table.text('summary').nullable();
    // Curators only.
    table.text('internalNote').nullable();
    table.integer('reviewAgainMonths').nullable();
    // What the item looked like when this curator answered (curationItemFingerprint). A sign-off
    // stops counting when the item has changed since.
    table.string('itemFingerprint', 64).nullable();
    // Optimistic concurrency, as on the review: a save must send the version it read.
    table.integer('version').notNullable().defaultTo(1);
    table.timestamp('finishedAt', {useTz: true}).nullable();
    table.timestamp('createdAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', {useTz: true}).notNullable().defaultTo(knex.fn.now());

    // Deciding a review reads every sign-off on it.
    table.index(['reviewId', 'status'], 'idx_curation_signoff_review_status');
    // A curator's queue: what they have already answered.
    table.index(['curatorId', 'status'], 'idx_curation_signoff_curator_status');
    // One sign-off per curator per review; a second tab must not open a second one.
    table.unique(['reviewId', 'curatorId'], {indexName: 'uq_curation_signoff_review_curator'});
  });

  await knex.schema.alterTable('curation_review', (table) => {
    // How many curators had to agree, recorded when the review was decided. Null on a review from
    // before this, which one curator finished.
    table.integer('signoffsRequired').nullable();
  });

  await knex('curation_review').where({status: 'open'}).update({answers: '{}'});
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('curation_review', (table) => {
    table.dropColumn('signoffsRequired');
  });
  await knex.schema.dropTable('curation_review_signoff');
}
