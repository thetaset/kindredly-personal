import {Knex} from 'knex';

/**
 * Suggest to Kindredly (2026-09-12): a family's public publish is a suggestion that stays hidden
 * until a curator approves it. Every public row a family published that no curator approved is
 * therefore a pending suggestion from now on. Nothing is deleted and `published` is untouched;
 * the read paths gate on `curated` (published_visibility.ts), and this column is what the
 * curator queue and the owner's status read.
 *
 * Kindredly's own un-approved imports (official publisher, or the legacy NULL / '' rows that
 * predate the constant) are the founder's backlog and are left as they are.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    UPDATE "published"
       SET "curationStatus" = 'pending'
     WHERE "visibilityCode" = 2
       AND COALESCE("publicUserId", '') NOT IN ('kindredly-official', '')
       AND "curated" IS NOT TRUE
       AND "curationStatus" IS DISTINCT FROM 'declined'
  `);
}

/** Nothing to restore: the rows were never approved, and the column was empty before. */
export async function down(_knex: Knex): Promise<void> {}
