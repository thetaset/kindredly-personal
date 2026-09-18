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
  /**
   * `plan` counts toward the AI limit windows; `extra` was paid from extra AI usage; `credit` is a
   * picture paid with a picture credit, which counts toward neither. Null is plan.
   */
  billedTo?: 'plan' | 'extra' | 'credit' | null;
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

  /**
   * Plan spend for an account since `since`: what counts toward an AI limit window.
   *
   * Rows paid from extra AI usage are left out, so a family's extra spend never uses up the
   * next window. Rows from before `billedTo` existed are null, and are plan spend.
   */
  async sumPlanCostSince(input: {accountId: string; since: Date}): Promise<number> {
    const row = await this.query()
      .where('accountId', input.accountId)
      .andWhere('createdAt', '>=', input.since)
      .andWhere((q) => q.whereNull('billedTo').orWhere('billedTo', 'plan'))
      .sum({costUsd: 'costUsd'})
      .first();
    return Number((row as any)?.costUsd || 0);
  }

  /**
   * When the account's rows for `features` were written since `since`, oldest first, however they
   * were billed: every hosted picture uses a picture credit, including ones from before credits.
   */
  async listFeatureTimesSince(input: {accountId: string; features: readonly string[]; since: Date}): Promise<Date[]> {
    const rows = await this.query()
      .where('accountId', input.accountId)
      .whereIn('feature', [...input.features])
      .andWhere('createdAt', '>=', input.since)
      .orderBy('createdAt', 'asc')
      .select('createdAt');
    return rows.map((row: any) => new Date(row.createdAt));
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
   * The window split by what the money went on: image generation, and everything else.
   *
   * Split on `feature` rather than on `meta`, because `feature` is an indexed string column
   * every database in the stack can group by, and `meta` is json. `imageCount` counts rows:
   * every image call asks for one picture.
   */
  async sumCostForAccountInRangeByFeature(input: {
    accountId: string;
    start: Date;
    end: Date;
    imageFeatures: readonly string[];
  }): Promise<{
    imageCostUsd: number;
    imageCount: number;
    textCostUsd: number;
    textTokens: number;
  }> {
    const rows = await this.query()
      .select('feature')
      .where('accountId', input.accountId)
      .andWhere('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({costUsd: 'costUsd'})
      .sum({totalTokens: 'totalTokens'})
      .count({rows: '_id'})
      .groupBy('feature');

    let imageCostUsd = 0;
    let imageCount = 0;
    let textCostUsd = 0;
    let textTokens = 0;

    for (const row of rows as any[]) {
      const isImage = input.imageFeatures.includes(String(row.feature));
      if (isImage) {
        imageCostUsd += Number(row.costUsd || 0);
        imageCount += Number(row.rows || 0);
      } else {
        textCostUsd += Number(row.costUsd || 0);
        textTokens += Number(row.totalTokens || 0);
      }
    }

    return {imageCostUsd, imageCount, textCostUsd, textTokens};
  }

  /**
   * Spend across EVERY account in a window — the operator's question, not a member's.
   *
   * Per-account budgets cap each family, but nothing caps their sum, so the only way to
   * see a fleet-wide blowout coming is to total it. `accounts` is what turns a number into
   * a judgement: $40 across 400 accounts is normal, $40 across one is an incident.
   */
  async sumCostAllAccountsInRange(input: {start: Date; end: Date; platformAccountId?: string}): Promise<{
    costUsd: number;
    unpricedRows: number;
    rows: number;
    accounts: number;
    /** What Kindredly paid for itself, included in `costUsd`. */
    platformCostUsd: number;
    /** Calls that ran with no metering scope and were charged to the platform by default. */
    unscopedRows: number;
  }> {
    const platform = input.platformAccountId ?? null;
    const row = await this.query()
      .where('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end)
      .sum({costUsd: 'costUsd'})
      .count({rows: '_id'})
      .count({unpricedRows: this.knex.raw('CASE WHEN "costUsd" IS NULL THEN 1 END') as any})
      // The platform is not a family: counting it would read as one more account using AI.
      .countDistinct({
        accounts: this.knex.raw('CASE WHEN "accountId" IS DISTINCT FROM ? THEN "accountId" END', [platform]) as any,
      })
      .sum({platformCostUsd: this.knex.raw('CASE WHEN "accountId" = ? THEN "costUsd" END', [platform]) as any})
      .count({unscopedRows: this.knex.raw(`CASE WHEN "meta"->>'unscoped' = 'true' THEN 1 END`) as any})
      .first();

    return {
      costUsd: Number((row as any)?.costUsd || 0),
      unpricedRows: Number((row as any)?.unpricedRows || 0),
      rows: Number((row as any)?.rows || 0),
      accounts: Number((row as any)?.accounts || 0),
      platformCostUsd: Number((row as any)?.platformCostUsd || 0),
      unscopedRows: Number((row as any)?.unscopedRows || 0),
    };
  }

  /** The heaviest spenders in a window, for naming who is behind a fleet-wide total. */
  async topSpendersInRange(input: {
    start: Date;
    end: Date;
    limit?: number;
    /** Left out of the ranking: the platform is not a family. */
    excludeAccountId?: string;
  }): Promise<Array<{accountId: string; costUsd: number}>> {
    const limit = Math.max(1, Math.min(input.limit || 5, 50));
    const query = this.query()
      .select('accountId')
      .where('createdAt', '>=', input.start)
      .andWhere('createdAt', '<', input.end);
    if (input.excludeAccountId) query.andWhereNot('accountId', input.excludeAccountId);
    const rows = await query
      .sum({costUsd: 'costUsd'})
      .groupBy('accountId')
      // NULLS LAST: Postgres sorts NULL first under DESC, which put accounts with only
      // unpriced calls at the top of "who is spending the most".
      .orderByRaw('SUM("costUsd") DESC NULLS LAST')
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
