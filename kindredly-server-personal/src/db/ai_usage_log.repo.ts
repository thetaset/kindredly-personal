import {BaseRepo} from './base.repo';
import knex from './knex_config';
import type {Knex} from 'knex';

export type AIUsageLogRow = {
  _id: string;
  accountId: string;
  userId: string;
  feature: string;
  provider: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  /** USD cost at the time of the call. Null when the model had no configured price. */
  costUsd?: number | null;
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
};

export class AIUsageLogRepo extends BaseRepo<AIUsageLogRow> {
  constructor(db: Knex = knex) {
    super('ai_usage_log', db);
    this.jsonArrayFields = [];
  }

  async create(input: AIUsageLogRow) {
    return (await this.query().insert(input).returning('*')) as any;
  }

  async sumForAccountInRange(input: {
    accountId: string;
    start: Date;
    end: Date;
  }): Promise<{promptTokens: number; completionTokens: number; totalTokens: number}> {
    const row = await this.query()
      .where('accountId', input.accountId)
      .andWhere('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({
        promptTokens: 'promptTokens',
        completionTokens: 'completionTokens',
        totalTokens: 'totalTokens',
      })
      .first();

    const promptTokens = Number((row as any)?.promptTokens || 0);
    const completionTokens = Number((row as any)?.completionTokens || 0);
    const totalTokens = Number((row as any)?.totalTokens || 0);

    return {promptTokens, completionTokens, totalTokens};
  }

  /**
   * Month-to-date USD spend for an account, and how much of it is unpriced.
   *
   * `unpricedRows` is not incidental: if models have no configured price, `costUsd` is 0
   * and a dollar budget would never trigger. Callers surface that as "pricing not
   * configured" rather than treating an unmeasurable spend as being under budget.
   */
  async sumCostForAccountInRange(input: {accountId: string; start: Date; end: Date}): Promise<{
    costUsd: number;
    unpricedRows: number;
  }> {
    const row = await this.query()
      .where('accountId', input.accountId)
      .andWhere('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({costUsd: 'costUsd'})
      .count({unpricedRows: this.knex.raw('CASE WHEN "costUsd" IS NULL THEN 1 END') as any})
      .first();

    return {
      costUsd: Number((row as any)?.costUsd || 0),
      unpricedRows: Number((row as any)?.unpricedRows || 0),
    };
  }

  /**
   * Spend across EVERY account in a window — the operator's question, not a member's.
   *
   * Per-account budgets cap each family, but nothing caps their sum, so the only way to
   * see a fleet-wide blowout coming is to total it. `accounts` is what turns a number into
   * a judgement: $40 across 400 accounts is normal, $40 across one is an incident.
   */
  async sumCostAllAccountsInRange(input: {start: Date; end: Date}): Promise<{
    costUsd: number;
    unpricedRows: number;
    rows: number;
    accounts: number;
  }> {
    const row = await this.query()
      .where('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({costUsd: 'costUsd'})
      .count({rows: '_id'})
      .count({unpricedRows: this.knex.raw('CASE WHEN "costUsd" IS NULL THEN 1 END') as any})
      .countDistinct({accounts: 'accountId'})
      .first();

    return {
      costUsd: Number((row as any)?.costUsd || 0),
      unpricedRows: Number((row as any)?.unpricedRows || 0),
      rows: Number((row as any)?.rows || 0),
      accounts: Number((row as any)?.accounts || 0),
    };
  }

  /** The heaviest spenders in a window, for naming who is behind a fleet-wide total. */
  async topSpendersInRange(input: {
    start: Date;
    end: Date;
    limit?: number;
  }): Promise<Array<{accountId: string; costUsd: number}>> {
    const limit = Math.max(1, Math.min(input.limit || 5, 50));
    const rows = await this.query()
      .select('accountId')
      .where('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({costUsd: 'costUsd'})
      .groupBy('accountId')
      .orderBy('costUsd', 'desc')
      .limit(limit);

    return (rows as any[]).map((r) => ({accountId: String(r.accountId), costUsd: Number(r.costUsd || 0)}));
  }

  /** Same as above, scoped to a single user within the account. */
  async sumCostForUserInRange(input: {userId: string; start: Date; end: Date}): Promise<{
    costUsd: number;
    unpricedRows: number;
  }> {
    const row = await this.query()
      .where('userId', input.userId)
      .andWhere('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({costUsd: 'costUsd'})
      .count({unpricedRows: this.knex.raw('CASE WHEN "costUsd" IS NULL THEN 1 END') as any})
      .first();

    return {
      costUsd: Number((row as any)?.costUsd || 0),
      unpricedRows: Number((row as any)?.unpricedRows || 0),
    };
  }
}
