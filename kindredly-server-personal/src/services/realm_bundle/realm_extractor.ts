import {Knex} from 'knex';

import {BundleRecord} from './bundle_format';
import {
  ACCOUNT_EXCLUDED_FIELDS,
  REALM_TABLE_SCOPES,
  USER_EXCLUDED_FIELDS,
  filterFields,
  tablesWithScope,
} from './realm_scope';

/**
 * Walks one realm out of the database, in the order §4.1 specifies.
 *
 * Separate from the writer on purpose. The writer knows the container format and nothing about
 * this schema; this knows the schema and nothing about bytes. That seam is what lets the format be
 * tested without a database and the walk be tested without a key.
 *
 * **Reads only.** An export must never be able to change the thing it is exporting.
 */

export type ExtractedRealm = {
  realmId: string;
  /** The filtered `account` row — what `realm.json` carries. */
  realm: Record<string, unknown>;
  userIds: string[];
  /** `userId -> max user_change_log.id`. There is no realm-wide revision (§7). */
  revisions: Record<string, number>;
};

/** Per-type record version. Bumped independently when that type's field set changes (§10.1). */
export const RECORD_VERSIONS: Readonly<Record<string, number>> = Object.fromEntries(
  Object.keys(REALM_TABLE_SCOPES).map((t) => [t, 1]),
);

export class RealmExtractor {
  private readonly idColumns = new Map<string, string>();

  constructor(private readonly db: Knex) {}

  /**
   * Which column to page on, asked of the schema rather than declared.
   *
   * Most tables key on `_id`, but not all — `following` and `user_change_log` use a serial `id`.
   * A hardcoded list of exceptions is a list that goes stale the next time a table is added with
   * `increments()`, and the failure is a query error at backup time on someone's box. Cached, so
   * it costs one `columnInfo` per table per process.
   */
  private async idColumn(table: string): Promise<string> {
    let column = this.idColumns.get(table);
    if (!column) {
      const info = await this.db(table).columnInfo();
      column = '_id' in info ? '_id' : 'id';
      this.idColumns.set(table, column);
    }
    return column;
  }

  /**
   * The realm root and its roster.
   *
   * Deleted members are included deliberately: `softDeleteUser` renames `accountId` to
   * `deleted_<accountId>`, so a member deleted after the last backup would otherwise vanish from
   * the roster with their items still present and unattributable. The roster is what it was.
   */
  async openRealm(realmId: string): Promise<ExtractedRealm> {
    const account = await this.db('account').where({_id: realmId}).first();
    if (!account) throw new Error(`No such realm: ${realmId}`);

    const users = await this.db('user')
      .whereIn('accountId', [realmId, `deleted_${realmId}`])
      .select('_id');
    const userIds = users.map((u: {_id: string}) => u._id);

    const revisions: Record<string, number> = {};
    if (userIds.length) {
      const rows = await this.db('user_change_log')
        .whereIn('userId', userIds)
        .groupBy('userId')
        .select('userId')
        .max({revision: 'id'});
      for (const row of rows as Array<{userId: string; revision: number | string}>) {
        revisions[row.userId] = Number(row.revision) || 0;
      }
    }
    // A member with no journal rows still belongs in the map: an absent key and a zero mean
    // different things to the restore check in §9, and only one of them is true.
    for (const id of userIds) if (!(id in revisions)) revisions[id] = 0;

    return {
      realmId,
      realm: filterFields(account, ACCOUNT_EXCLUDED_FIELDS),
      userIds,
      revisions,
    };
  }

  /**
   * Every travelling record, one table at a time, streamed in id order.
   *
   * Batched rather than read whole: `item` alone can be tens of thousands of rows on a box with
   * 2 GB of RAM, and the writer buffers a type at a time anyway.
   */
  async *records(realm: ExtractedRealm, batchSize = 500): AsyncIterable<{table: string; record: BundleRecord}> {
    for (const table of tablesWithScope('user')) {
      const column = REALM_TABLE_SCOPES[table].column!;
      const values = table === 'user' ? [realm.realmId, `deleted_${realm.realmId}`] : realm.userIds;
      yield* this.batched(table, column, values, realm, batchSize);
    }

    for (const table of tablesWithScope('account-scoped')) {
      const column = REALM_TABLE_SCOPES[table].column!;
      yield* this.batched(table, column, [realm.realmId], realm, batchSize);
    }

    // The polymorphic pair needs both branches or the account-level rows are silently dropped —
    // and for key_entry those are the account key envelopes, without which nothing decrypts.
    for (const [table, typeColumn] of [
      ['key_entry', 'selectType'],
      ['ref_state', 'ownerType'],
    ] as const) {
      const column = REALM_TABLE_SCOPES[table].column!;
      yield* this.batched(table, column, realm.userIds, realm, batchSize, {[typeColumn]: 'user'});
      yield* this.batched(table, column, [realm.realmId], realm, batchSize, {[typeColumn]: 'account'});
    }
  }

  private async *batched(
    table: string,
    column: string,
    values: string[],
    realm: ExtractedRealm,
    batchSize: number,
    extraWhere?: Record<string, string>,
  ): AsyncIterable<{table: string; record: BundleRecord}> {
    if (!values.length) return;
    const idColumn = await this.idColumn(table);
    let cursor: string | number | null = null;

    for (;;) {
      let query = this.db(table).whereIn(column, values).orderBy(idColumn).limit(batchSize);
      if (extraWhere) query = query.where(extraWhere);
      if (cursor !== null) query = query.where(idColumn, '>', cursor);

      const rows: Array<Record<string, unknown>> = await query;
      if (!rows.length) return;

      for (const row of rows) {
        yield {table, record: this.toRecord(table, row, realm.realmId)};
      }
      cursor = rows[rows.length - 1][idColumn] as string | number;
      if (rows.length < batchSize) return;
    }
  }

  private toRecord(table: string, row: Record<string, unknown>, realmId: string): BundleRecord {
    const data = table === 'user' ? filterFields(row, USER_EXCLUDED_FIELDS) : row;
    return {
      realmId,
      recordType: table,
      recordVersion: RECORD_VERSIONS[table] ?? 1,
      recordId: String(row._id ?? row.id ?? ''),
      deletedAt: normalizeTombstone(row),
      data,
    };
  }
}

/**
 * One tombstone signal out of six conventions (§4.5).
 *
 * The source columns stay in `data` untouched, so a round trip is lossless; this is only the
 * normalized answer to "was this row deleted", which is otherwise six different questions.
 */
export function normalizeTombstone(row: Record<string, unknown>): string | null {
  const at = row.deletedAt;
  if (at instanceof Date) return at.toISOString();
  if (typeof at === 'string' && at) return new Date(at).toISOString();
  if (row.deleted === true || row.isDeleted === true) {
    const fallback = row.updatedAt ?? row.createdAt;
    return fallback instanceof Date ? fallback.toISOString() : fallback ? String(fallback) : null;
  }
  return null;
}
