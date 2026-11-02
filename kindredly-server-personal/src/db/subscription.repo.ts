import knex from './knex_config';
import Subscription from 'tset-sharedlib/schemas/public/Subscription';
import {BaseRepo} from './base.repo';
import {Knex} from 'knex';

/**
 * The refTypes whose target is a library item that can be deleted out from under the
 * subscription. `item_feed` is left out on purpose: its feed URL is stored on the subscription,
 * so it keeps working after the saved page it was found on is deleted.
 */
export const SUBSCRIPTION_LIBRARY_COLLECTION_REF_TYPES = ['col', 'shared_col'];

export class SubscriptionRepo extends BaseRepo<Subscription> {
  constructor(db: Knex = knex) {
    super('subscription', db);
  }
  async findById(_id: string) {
    return await this.where({_id: _id}).first();
  }

  async findForUserAndRef(userId: string, refType: string, refId: string): Promise<Subscription | undefined> {
    return await this.query().where({userId, refType, refId}).orderBy('createdAt', 'asc').first();
  }

  async countWithRef(refId: string, refType: string) {
    return await this.countFromQuery(this.where({refId: refId, refType: refType}));
  }

  async updateWithId(_id: string, update: Subscription) {
    return await this.where({_id: _id}).update(update);
  }

  /**
   * Update a row only if nobody has written it since `since` (the `updatedAt` the caller read).
   * Returns the number of rows written: 0 means another write got there first, or the row is gone.
   *
   * Compared to the millisecond, because that is all a JS Date carries: `node-pg` drops the
   * microseconds of a stored `now()` on the way out, so the value the client sends back is the
   * stored one truncated, never later than it.
   */
  async updateWithIdIfUnchangedSince(_id: string, update: Subscription, since: string | null | undefined) {
    const query = this.query().where({_id});
    if (since) query.andWhereRaw(`date_trunc('milliseconds', "updatedAt") <= ?::timestamptz`, [since]);
    return await query.update(update);
  }

  async deleteWithId(_id: string) {
    return await this.where({_id: _id}).delete();
  }

  async create(input: Subscription) {
    return await this.query().insert(input);
  }

  async listByUserId(userId: string): Promise<Subscription[]> {
    return this.query().where({userId: userId}).orderBy('createdAt', 'asc');
  }

  async listWhereUserIdsIn(refId: string, refType: string, userIds: string[]) {
    return this.query().where({refId, refType}).whereIn('userId', userIds);
  }

  async listByRefId(refId: string, refType: string) {
    return this.where({refId: refId, refType: refType});
  }

  /**
   * Which of these ids still exist in `item` or `published`. Existence only, read across accounts:
   * a shared collection can belong to another family, and its subscriber must still be told when it
   * is gone. Nothing about the row is returned.
   */
  async existingIds(table: 'item' | 'published', ids: string[]): Promise<Set<string>> {
    const wanted = [...new Set(ids.filter(Boolean))];
    if (!wanted.length) return new Set();
    const rows = await this.knex(table).whereIn('_id', wanted).select('_id');
    return new Set(rows.map((row: any) => row._id));
  }

  /** Remove every subscription of these refTypes that follows one of these ids. Returns the rows removed. */
  async deleteByRefIds(refIds: string[], refTypes: string[]): Promise<Subscription[]> {
    const ids = refIds.filter(Boolean);
    if (!ids.length || !refTypes.length) return [];
    return await this.query().whereIn('refId', ids).whereIn('refType', refTypes).delete().returning('*');
  }

  /** Remove all of one person's subscriptions. Returns the rows removed. */
  async deleteAllForUser(userId: string): Promise<Subscription[]> {
    if (!userId) return [];
    return await this.query().where({userId}).delete().returning('*');
  }

  /**
   * Set each published row's `statSubCount` to the number of people subscribed to it, leaving
   * out deleted users. Counted in one statement so it cannot drift from the rows it counts.
   */
  async recountPublishedSubscribers(publishedIds: string[]) {
    const ids = [...new Set(publishedIds.filter(Boolean))];
    if (!ids.length) return;
    await this.knex.raw(
      `UPDATE "published" AS p
          SET "statSubCount" = (
            SELECT count(*)
              FROM "subscription" AS s
              JOIN "user" AS u ON u."_id" = s."userId"
             WHERE s."refType" = 'pub_col'
               AND s."refId" = p."_id"
               AND u."deleted" IS NOT TRUE
          )
        WHERE p."_id" = ANY(?)`,
      [ids],
    );
  }
}
