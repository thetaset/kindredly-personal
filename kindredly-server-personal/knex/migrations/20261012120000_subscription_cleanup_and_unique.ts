import {Knex} from 'knex';

/**
 * Subscriptions that follow nothing, and second copies of one subscription (HAT-371).
 *
 * Until now nothing removed a subscription: deleting its collection, unpublishing a published one
 * or deleting the person all left the row behind, and nothing stopped a second Subscribe from
 * writing a second row. The services now do both; this clears what built up before they did.
 *
 * 1. A published-collection subscription whose refId is a *library* collection id (an admin's
 *    subscribe once stored one) is pointed at that collection's published row, when it has one.
 * 2. Subscriptions of deleted or missing users are removed: they follow nothing anyone reads and
 *    still counted towards a published collection's subscribers.
 * 3. Subscriptions to a library collection or published collection that no longer exists are
 *    removed; they can never load. Feed subscriptions are kept even when the saved page is gone,
 *    because the feed URL is stored on the subscription and still works.
 * 4. Second copies are removed, keeping the earliest, and a unique index stops new ones. A feed
 *    subscription is left out of both: an item can carry several feeds, and which one a row follows
 *    is inside its encrypted `data`, so two rows for one item can be two different feeds.
 * 5. Every published row's `statSubCount` is recounted without deleted users.
 *
 * `data` is end-to-end encrypted, so none of this reads or merges it; a removed duplicate's own
 * settings and progress go with it.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    UPDATE "subscription" AS s
       SET "refId" = i."publishId"
      FROM "item" AS i
     WHERE s."refType" = 'pub_col'
       AND s."refId" = i."_id"
       AND i."publishId" IS NOT NULL
       AND EXISTS (SELECT 1 FROM "published" AS p WHERE p."_id" = i."publishId")
       AND NOT EXISTS (SELECT 1 FROM "published" AS p WHERE p."_id" = s."refId")
  `);

  await knex.raw(`
    DELETE FROM "subscription" AS s
     WHERE NOT EXISTS (
       SELECT 1 FROM "user" AS u WHERE u."_id" = s."userId" AND u."deleted" IS NOT TRUE
     )
  `);

  await knex.raw(`
    DELETE FROM "subscription" AS s
     WHERE s."refType" IN ('col', 'shared_col')
       AND NOT EXISTS (SELECT 1 FROM "item" AS i WHERE i."_id" = s."refId")
  `);

  await knex.raw(`
    DELETE FROM "subscription" AS s
     WHERE s."refType" = 'pub_col'
       AND NOT EXISTS (SELECT 1 FROM "published" AS p WHERE p."_id" = s."refId")
  `);

  await knex.raw(`
    DELETE FROM "subscription" AS s
    USING "subscription" AS keeper
    WHERE s."refType" <> 'item_feed'
      AND keeper."userId" = s."userId"
      AND keeper."refType" = s."refType"
      AND keeper."refId" = s."refId"
      AND (keeper."createdAt", keeper."_id") < (s."createdAt", s."_id")
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX "subscription_user_ref_unique"
      ON "subscription" ("userId", "refType", "refId")
      WHERE "refType" <> 'item_feed'
  `);

  // Rows that never had a count and have no subscribers keep NULL, so the catalog's
  // "most subscribed" order (NULLS LAST) does not move for them.
  await knex.raw(`
    UPDATE "published" AS p
       SET "statSubCount" = c.n
      FROM (
        SELECT p2."_id",
               (SELECT count(*)
                  FROM "subscription" AS s
                  JOIN "user" AS u ON u."_id" = s."userId"
                 WHERE s."refType" = 'pub_col'
                   AND s."refId" = p2."_id"
                   AND u."deleted" IS NOT TRUE) AS n
          FROM "published" AS p2
      ) AS c
     WHERE c."_id" = p."_id"
       AND (p."statSubCount" IS NOT NULL OR c.n > 0)
       AND p."statSubCount" IS DISTINCT FROM c.n
  `);
}

/**
 * Drops the index only. Removed rows are not restored: they followed nothing, belonged to deleted
 * people, or were copies of a row that remains.
 */
export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS "subscription_user_ref_unique"');
}
