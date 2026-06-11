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
}
