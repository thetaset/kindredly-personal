import {RequestContext} from '@/base/request_context';
import {FamilyPolicyRuleRepo, type FamilyPolicyRuleUpsertRow} from '@/db/family_policy_rule.repo';
import {assertEncInfoUpdateIsSafe, assertEncryptedUpdateHasEncInfo} from '@/utils/encinfo_guards';
import type {FamilyPolicyRuleDeleteRequest, FamilyPolicyRuleUpsertRequest} from 'tset-sharedlib/api';
import type FamilyPolicyRuleRecord from 'tset-sharedlib/src/schemas/public/FamilyPolicyRule';

function buildStoredRuleId(accountId: string, candidateId?: string | null): string {
  const normalizedCandidate = typeof candidateId === 'string' ? candidateId.trim() : '';
  if (normalizedCandidate.startsWith(`family_policy_rule:${accountId}:`)) {
    return normalizedCandidate;
  }

  const baseId = normalizedCandidate || `local_${Date.now()}`;
  return `family_policy_rule:${accountId}:${baseId}`;
}

export class FamilyPolicyRuleService {
  constructor(private repo = new FamilyPolicyRuleRepo()) {}

  async list(ctx: RequestContext): Promise<{entries: FamilyPolicyRuleRecord[]}> {
    if (!ctx.accountId) {
      throw new Error('Missing accountId');
    }

    const rows = await this.repo.listByAccountId(ctx.accountId);
    return {
      entries: rows,
    };
  }

  async upsert(ctx: RequestContext, input: FamilyPolicyRuleUpsertRequest): Promise<{entry: FamilyPolicyRuleRecord}> {
    if (!ctx.accountId) {
      throw new Error('Missing accountId');
    }
    await ctx.verifyCurrentUserIsAdmin();

    const currentUserId = ctx.getCurrentUserId();
    const ruleId = buildStoredRuleId(ctx.accountId, input._id || input.data?._id);

    const existing = await this.repo.findById(ctx.accountId, ruleId);
    assertEncryptedUpdateHasEncInfo({
      currentEncInfo: existing?.encInfo,
      nextEncInfo: input.encInfo ?? null,
      context: '/familyPolicyRule/upsert',
    });
    if (existing?.encInfo && input.encInfo != null) {
      assertEncInfoUpdateIsSafe({
        currentEncInfo: existing.encInfo,
        nextEncInfo: input.encInfo,
        context: '/familyPolicyRule/upsert',
        payloadForCiphertextCheck: {data: input.data},
      });
    }

    const rowInput: FamilyPolicyRuleUpsertRow = {
      _id: ruleId,
      accountId: ctx.accountId,
      data: input.data,
      encrypted: input.encInfo != null,
      encInfo: input.encInfo ?? null,
      createdByUserId: currentUserId,
      updatedByUserId: currentUserId,
    };

    const row = await this.repo.upsert(rowInput);

    return {
      entry: row,
    };
  }

  async delete(ctx: RequestContext, input: FamilyPolicyRuleDeleteRequest): Promise<{deleted: boolean}> {
    if (!ctx.accountId) {
      throw new Error('Missing accountId');
    }
    await ctx.verifyCurrentUserIsAdmin();

    const deleted = await this.repo.deleteById(ctx.accountId, input.ruleId);
    return {deleted: deleted > 0};
  }
}
