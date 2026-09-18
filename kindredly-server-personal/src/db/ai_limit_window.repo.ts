import {BaseRepo} from './base.repo';
import knex from './knex_config';
import type {Knex} from 'knex';

export type AiLimitWindowKind = '5h' | 'week';

export type AiLimitWindowRow = {
  accountId: string;
  kind: AiLimitWindowKind;
  startedAt: Date;
  endsAt: Date;
};

/**
 * One row per account and window kind. A window is open while `endsAt` is in the future; when it
 * has ended, the next request that uses the plan's limits starts a new one in the same row.
 */
export class AiLimitWindowRepo extends BaseRepo<AiLimitWindowRow> {
  constructor(db: Knex = knex) {
    super('ai_limit_window', db);
  }

  /** The account's windows, open or not, keyed by kind. */
  async getForAccount(accountId: string): Promise<Partial<Record<AiLimitWindowKind, AiLimitWindowRow>>> {
    const rows = (await this.query().where('accountId', accountId)) as AiLimitWindowRow[];
    const byKind: Partial<Record<AiLimitWindowKind, AiLimitWindowRow>> = {};
    for (const row of rows)
      byKind[row.kind] = {...row, startedAt: new Date(row.startedAt), endsAt: new Date(row.endsAt)};
    return byKind;
  }

  /**
   * The open window of `kind`, starting one at `now` when none is open.
   *
   * One statement, so two requests that start a window at the same moment cannot both start
   * one: the upsert replaces the row only when its window has ended, and the loser of the race
   * reads the winner's row.
   */
  async openOrGet(
    accountId: string,
    kind: AiLimitWindowKind,
    durationMs: number,
    now: Date,
  ): Promise<AiLimitWindowRow> {
    const endsAt = new Date(now.getTime() + durationMs);
    const result = await this.knex.raw(
      `INSERT INTO ai_limit_window ("accountId", "kind", "startedAt", "endsAt")
       VALUES (?, ?, ?, ?)
       ON CONFLICT ("accountId", "kind") DO UPDATE
         SET "startedAt" = EXCLUDED."startedAt", "endsAt" = EXCLUDED."endsAt"
         WHERE ai_limit_window."endsAt" <= EXCLUDED."startedAt"
       RETURNING *`,
      [accountId, kind, now, endsAt],
    );
    const row = (result?.rows?.[0] ?? (await this.query().where({accountId, kind}).first())) as AiLimitWindowRow;
    return {...row, startedAt: new Date(row.startedAt), endsAt: new Date(row.endsAt)};
  }
}
