import {Knex} from 'knex';

/**
 * Item feedback offers one heart (HAT-473). Like, haha and frown were removed from the feedback
 * menu, and every stored one becomes a heart; `reactionDate` is kept, so a hearted item keeps its
 * place on the Hearted shelf. The emoji reactions on posts are the separate `reaction` table and
 * are not touched.
 *
 * Not reversible: which of the three a heart used to be is not kept.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    UPDATE "item_feedback"
       SET "reaction" = 'heart'
     WHERE "reaction" IS NOT NULL
       AND "reaction" NOT IN ('', 'heart')
  `);
}

export async function down(): Promise<void> {
  // Nothing to undo.
}
