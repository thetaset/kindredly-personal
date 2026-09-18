import {BaseRepo} from './base.repo';
import knex from './knex_config';
import type {Knex} from 'knex';

export type AiExtraUsageGrantRow = {
  _id: string;
  accountId: string;
  /** `staff` is granted from the admin console; `purchase` is reserved for bought extra AI usage. */
  source: 'staff' | 'purchase';
  amountMicroUsd: number;
  remainingMicroUsd: number;
  expiresAt: Date | null;
  note: string | null;
  grantedBy: string | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AiExtraUsageDebitRow = {
  _id: string;
  grantId: string;
  accountId: string;
  usageLogId: string | null;
  amountMicroUsd: number;
  createdAt: Date;
};

/** Postgres returns bigint columns as strings. */
function toGrant(row: any): AiExtraUsageGrantRow {
  return {
    ...row,
    amountMicroUsd: Number(row.amountMicroUsd),
    remainingMicroUsd: Number(row.remainingMicroUsd),
  };
}

/** A grant counts while it has a balance, has not been revoked, and has not expired. */
function whereActive(q: Knex.QueryBuilder, now: Date) {
  return q
    .whereNull('revokedAt')
    .andWhere('remainingMicroUsd', '>', 0)
    .andWhere((w) => w.whereNull('expiresAt').orWhere('expiresAt', '>', now));
}

export class AiExtraUsageRepo extends BaseRepo<AiExtraUsageGrantRow> {
  constructor(db: Knex = knex) {
    super('ai_extra_usage_grant', db);
  }

  async createGrant(row: AiExtraUsageGrantRow): Promise<AiExtraUsageGrantRow> {
    const [created] = await this.query().insert(row).returning('*');
    return toGrant(created);
  }

  async findGrant(grantId: string): Promise<AiExtraUsageGrantRow | null> {
    const row = await this.query().where('_id', grantId).first();
    return row ? toGrant(row) : null;
  }

  async listGrants(accountId: string): Promise<AiExtraUsageGrantRow[]> {
    const rows = await this.query().where('accountId', accountId).orderBy('createdAt', 'desc');
    return (rows as any[]).map(toGrant);
  }

  /** Balance left across active grants, and the soonest expiry among them. */
  async balance(accountId: string, now: Date): Promise<{remainingMicroUsd: number; nextExpiresAt: Date | null}> {
    const row = await whereActive(this.query().where('accountId', accountId), now)
      .sum({remaining: 'remainingMicroUsd'})
      .min({nextExpiresAt: 'expiresAt'})
      .first();
    return {
      remainingMicroUsd: Number((row as any)?.remaining || 0),
      nextExpiresAt: (row as any)?.nextExpiresAt ? new Date((row as any).nextExpiresAt) : null,
    };
  }

  async hasAnyGrant(accountId: string): Promise<boolean> {
    return !!(await this.query().where('accountId', accountId).first('_id'));
  }

  async revoke(grantId: string, now: Date): Promise<void> {
    await this.query()
      .where('_id', grantId)
      .update({revokedAt: now, remainingMicroUsd: 0, updatedAt: now} as any);
  }

  /**
   * Take up to `microUsd` from the account's active grants, soonest-expiring first, in one
   * transaction with the grant rows locked, so two debits at once can never take the same
   * balance twice. Returns what could not be covered.
   */
  async debit(input: {accountId: string; microUsd: number; usageLogId: string | null; now: Date}): Promise<{
    shortfallMicroUsd: number;
  }> {
    return this.db.transaction(async (trx) => {
      const grants = (await whereActive(trx('ai_extra_usage_grant').where('accountId', input.accountId), input.now)
        .orderByRaw('"expiresAt" ASC NULLS LAST, "createdAt" ASC')
        .forUpdate()) as any[];

      let owed = Math.max(0, Math.round(input.microUsd));
      for (const raw of grants) {
        if (owed <= 0) break;
        const grant = toGrant(raw);
        const take = Math.min(owed, grant.remainingMicroUsd);
        if (take <= 0) continue;
        await trx('ai_extra_usage_grant')
          .where('_id', grant._id)
          .update({remainingMicroUsd: grant.remainingMicroUsd - take, updatedAt: input.now});
        await trx('ai_extra_usage_debit').insert({
          _id: `aixd_${input.now.getTime()}_${Math.random().toString(16).slice(2)}`,
          grantId: grant._id,
          accountId: input.accountId,
          usageLogId: input.usageLogId,
          amountMicroUsd: take,
          createdAt: input.now,
        });
        owed -= take;
      }
      return {shortfallMicroUsd: owed};
    });
  }

  /** Total left across every active grant on the host, for the fleet diagnostic. */
  async outstandingAllAccounts(now: Date): Promise<{remainingMicroUsd: number; accounts: number}> {
    const row = await whereActive(this.query(), now)
      .sum({remaining: 'remainingMicroUsd'})
      .countDistinct({accounts: 'accountId'})
      .first();
    return {remainingMicroUsd: Number((row as any)?.remaining || 0), accounts: Number((row as any)?.accounts || 0)};
  }
}
