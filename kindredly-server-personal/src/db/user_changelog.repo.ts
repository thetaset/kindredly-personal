import knex from './knex_config';
import {Knex} from 'knex';
import UserChangeLog from 'tset-sharedlib/schemas/public/UserChangeLog';
import {BaseRepo} from './base.repo';

export enum SyncType {
  itemUpdate = 'itemUpdate',
  fullReset = 'fullReset',
}

// Every changelog row must carry a known type: the sync service treats any
// row with an unknown/missing type as corrupt and forces a FULL reset for
// that user (sync.service.ts runSync). Typing the writers makes an untyped
// `{}` payload a compile error instead of a silent full-sync bomb.
export type SyncChangeLogData = {type: SyncType.itemUpdate; items: string[]} | {type: SyncType.fullReset};

export class UserChangeLogRepo extends BaseRepo<UserChangeLog> {
  constructor(db: Knex = knex) {
    super('user_change_log', db);
  }
  async findById(id: number) {
    return await this.where({id: id}).first();
  }

  async updateWithId(id: number, update: UserChangeLog) {
    return await this.where({id: id}).update(update);
  }

  async deleteWithId(id: number) {
    return await this.where({id: id}).delete();
  }

  async create(input: UserChangeLog) {
    return await this.query().insert(input);
  }

  /**
   * The cursor, as an integer from the database's own sequence.
   *
   * Per user rather than global: the read below filters by userId anyway, and a
   * per-user maximum narrows the window in which a concurrently-committing row can
   * be missed to two writes for the SAME user. Served index-only by
   * (userId, id) -- a backward scan of one index entry.
   *
   * 0 when the user has no rows yet, which is a valid starting cursor: `id > 0`
   * matches everything, and there is nothing to match.
   *
   * SYNC-4. The out-of-order-commit hazard this cannot rule out (a row taking id 100
   * committing after the row that took 101) is SYNC-7's -- it only becomes reachable
   * once real transactions exist, and the fix is a watermark.
   */
  async maxRevisionForUser(userId: string): Promise<number> {
    const row = await this.query().where({userId}).max({revision: 'id'}).first();
    return Number((row as any)?.revision ?? 0);
  }

  /**
   * The oldest changelog row this user still has, or null if they have none.
   *
   * SYNC-9. `user_change_log` is purged at 90 days (data_retention.service.ts), and
   * nothing used to notice that a client's cursor pointed BELOW everything that
   * survived -- so a device offline longer than the retention window was told about
   * only the changes still in the table and believed it was caught up. A silently
   * wrong partial, which is worse than a full reset by a wide margin.
   *
   * Ids are monotonic with time and the purge deletes by `createdAt`, so "my cursor is
   * below the oldest surviving row" means the row my cursor names was itself purged,
   * and anything between it and here went with it. Index-only forward scan on
   * (userId, id) -- the mirror of maxRevisionForUser.
   */
  async oldestRevisionForUser(userId: string): Promise<number | null> {
    const row = await this.query().where({userId}).min({revision: 'id'}).first();
    const value = (row as any)?.revision;
    return value == null ? null : Number(value);
  }

  /** SYNC-4's cursor. Exact, and unaffected by either machine's clock. */
  async changeLogSinceRevision(userId: string, revision: number) {
    return await this.query().select('*').where({userId}).andWhere('id', '>', revision);
  }

  /**
   * The legacy cursor: a wall-clock date stamped by Postgres, compared against one the
   * client got from a Node process on a different machine. Kept for the compatibility
   * window while clients still send `lastUpdate`; goes when none do.
   */
  async changeLogSince(userId: string, time: Date) {
    const q = this.query();
    const results = await q.select('*').where((qb) => {
      qb.where({userId});
      if (time != null) qb.andWhere('createdAt', '>=', time);
    });
    return results;
  }

  /**
   * One change, one INSERT and one UPDATE -- regardless of how many users can see it.
   *
   * This used to run per user, so an item shared with N people cost 2N statements and
   * 2N autocommits. Postgres has no non-transactional write, so each of those paid its
   * own commit fsync for one small row. On SQLite, where there is a single writer and
   * every commit is a real fsync, the same loop is what makes an appliance feel slow.
   * SYNC-5.
   *
   * ONE statement now, and it goes through `this.query()` -- so binding a transaction
   * to this repo actually covers the whole write. It used to be followed by an
   * `UPDATE user SET updatedAt` through the GLOBALLY imported knex, which is what made
   * a transaction here silently not one: `BaseRepo.withTransaction` rebinds `this.knex`
   * and nothing else, so that second write would have escaped it. SYNC-6 deleted that
   * write; SYNC-7 can now wrap this safely.
   */
  async addChangeLogEntries(userIds: string[], data: SyncChangeLogData) {
    // knex rejects an empty multi-row insert, and there is nothing to say anyway.
    if (userIds.length === 0) return true;

    // The type guard above is a TYPE, and this package compiles with `strict: false`, so
    // `strictNullChecks` is off and `null` is assignable to `SyncType.itemUpdate`. That is not
    // hypothetical: user_activity.route.ts passed `null` for 14 months and wrote
    // `{type: null, items: [...]}` rows, which sync.service.ts treats as corrupt and answers with a
    // FULL library reset -- for ~90 days per row, since changelog rows persist. Checking at the
    // write boundary makes the invariant real regardless of how the caller was typed. Throwing is
    // the right failure: this method is already awaited and allowed to throw precisely so a
    // retryable 500 beats a silent, permanent divergence.
    if (!data || !Object.values(SyncType).includes(data.type)) {
      throw new Error(
        `Refusing to write a changelog row with an unknown type: ${JSON.stringify(data?.type)}. ` +
          `Every row must carry a SyncType -- sync treats anything else as corrupt and full-resets the user.`,
      );
    }

    await this.query().insert(userIds.map((userId) => ({userId, data})));
    return true;
  }
}
