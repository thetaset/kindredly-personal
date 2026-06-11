import {AIUsageLogRepo} from '@/db/ai_usage_log.repo';
import {RequestContext} from '@/base/request_context';

export type TokenUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export class AIUsageService {
  private static _staticInstance: AIUsageService | null = null;
  private repo: AIUsageLogRepo;

  constructor(repo: AIUsageLogRepo) {
    this.repo = repo;
  }

  static get instance(): AIUsageService {
    if (!this._staticInstance) {
      this._staticInstance = new AIUsageService(new AIUsageLogRepo());
    }
    return this._staticInstance;
  }

  async recordUsage(
    ctx: RequestContext,
    input: {
      feature: string;
      provider: string;
      model?: string;
      usage: TokenUsage | null | undefined;
      meta?: any;
    },
  ): Promise<void> {
    if (!ctx.accountId || !ctx.currentUserId) return;
    if (!input.usage) return;

    const promptTokens = typeof input.usage.prompt_tokens === 'number' ? input.usage.prompt_tokens : null;
    const completionTokens = typeof input.usage.completion_tokens === 'number' ? input.usage.completion_tokens : null;
    const totalTokens = typeof input.usage.total_tokens === 'number' ? input.usage.total_tokens : null;

    // If usage is malformed/empty, skip.
    if (promptTokens == null && completionTokens == null && totalTokens == null) return;

    const now = new Date();
    const id = `aiul_${now.getTime()}_${Math.random().toString(16).slice(2)}`;

    await this.repo.create({
      _id: id,
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
      feature: input.feature,
      provider: input.provider,
      model: input.model || null,
      promptTokens,
      completionTokens,
      totalTokens,
      meta: input.meta || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  private getMonthRangeUtc(date: Date): {start: Date; end: Date} {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
    return {start, end};
  }

  async getMonthlySummary(
    ctx: RequestContext,
    input?: {forDate?: string},
  ): Promise<{
    period: 'month';
    periodStart: string;
    periodEnd: string;
    promptTokensUsed: number;
    completionTokensUsed: number;
    tokensUsed: number;
    limitTokens: number | null;
  }> {
    if (!ctx.accountId) {
      return {
        period: 'month',
        periodStart: new Date(0).toISOString(),
        periodEnd: new Date(0).toISOString(),
        promptTokensUsed: 0,
        completionTokensUsed: 0,
        tokensUsed: 0,
        limitTokens: null,
      };
    }

    const forDate = input?.forDate ? new Date(input.forDate) : new Date();
    const {start, end} = this.getMonthRangeUtc(forDate);

    const sums = await this.repo.sumForAccountInRange({
      accountId: ctx.accountId,
      start,
      end,
    });

    // TODO: Pull per-account limit from account sysOptions or plan.
    const limitTokens: number | null = null;

    return {
      period: 'month',
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      promptTokensUsed: sums.promptTokens,
      completionTokensUsed: sums.completionTokens,
      tokensUsed: sums.totalTokens,
      limitTokens,
    };
  }
}
