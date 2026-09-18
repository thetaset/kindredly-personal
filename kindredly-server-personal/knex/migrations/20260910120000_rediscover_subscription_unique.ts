import {Knex} from 'knex';

/**
 * One Rediscover source per user, enforced by the database.
 *
 * The built-in Rediscover subscription is created by the server the first time a person
 * lists their own subscriptions (SubscriptionService.ensureDefaultSubscriptions). That was
 * a read followed by a write with no lock between them, so two listings arriving at the
 * same moment — the Today card and the Subscriptions page on one load, or two devices —
 * both found no row and both inserted one. The Subscriptions page then listed Rediscover
 * twice, and dev rows show the pairs were written under a millisecond apart with identical
 * default data.
 *
 * Nothing points at a subscription row except `item.subscriptionId`, which Rediscover never
 * writes (its items are the person's own library), so the extra rows can simply go. The
 * earliest row per user is kept; duplicates carry the same default `data`, so which survives
 * only matters for its id.
 *
 * The partial unique index is what actually closes the race — the loser's INSERT now fails
 * instead of succeeding, and the service treats that failure as "someone else created it".
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DELETE FROM "subscription" AS s
    USING "subscription" AS keeper
    WHERE s."refType" = 'rediscover'
      AND keeper."refType" = 'rediscover'
      AND s."userId" = keeper."userId"
      AND (keeper."createdAt", keeper."_id") < (s."createdAt", s."_id")
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX "subscription_user_rediscover_unique"
      ON "subscription" ("userId")
      WHERE "refType" = 'rediscover'
  `);
}

/**
 * Drops the index only. The duplicate rows it removed are not restored — they were copies
 * of the row that remains.
 */
export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS "subscription_user_rediscover_unique"');
}
