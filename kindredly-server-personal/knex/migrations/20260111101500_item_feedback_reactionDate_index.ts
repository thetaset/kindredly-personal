import type { Knex } from 'knex';

const indexName = 'item_feedback_userId_reactionDate_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${indexName}
    ON "item_feedback" ("userId", "reactionDate" DESC)
    WHERE "reactionDate" IS NOT NULL
      AND "reaction" IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS ${indexName}`);
}
