import {RequestContext} from '@/base/request_context';
import {FamilyPolicyRuleRepo, type FamilyPolicyRuleUpsertRow} from '@/db/family_policy_rule.repo';
import {UserRepo} from '@/db/user.repo';
import SSEManager from './sse.manager';
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
  constructor(
    private repo = new FamilyPolicyRuleRepo(),
    private users = new UserRepo(),
  ) {}

  /**
   * Tell every member's browsers that the rules changed (BTL-9).
   *
   * Rules are enforced in each person's own Kindredly, which caches them for five minutes
   * (`FamilyPolicyRuleService.STORED_RULES_TTL_MS` on the client). Blocked saves on tap, so a site
   * a parent had just blocked stayed open on the child's browser for up to five minutes with the
   * page saying Blocked. Content-free: the rules are end-to-end encrypted, so each browser
   * refetches them itself. Never awaited, and never allowed to fail the parent's save.
   */
  private notifyRulesChanged(accountId: string): void {
    void (async () => {
      const members = (await this.users.listByAccountId(accountId).select('_id')) as Array<{_id: string}>;
      const sse = SSEManager.getInstance();
      for (const member of members) {
        sse.broadcastToUser(member._id, 'familyPolicyRulesUpdate', {}).catch((e) => {
          console.warn('[family-policy-rule] SSE nudge failed', e?.message || e);
        });
      }
    })().catch((e) => console.warn('[family-policy-rule] could not list members to nudge', e?.message || e));
  }

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
    this.notifyRulesChanged(ctx.accountId);

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
    if (deleted > 0) this.notifyRulesChanged(ctx.accountId);
    return {deleted: deleted > 0};
  }
}
