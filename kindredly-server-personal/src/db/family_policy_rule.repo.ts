import {Knex} from 'knex';
import knex from './knex_config';
import type FamilyPolicyRuleRecord from 'tset-sharedlib/src/schemas/public/FamilyPolicyRule';

export type FamilyPolicyRuleRow = FamilyPolicyRuleRecord & {
  _id: string;
  accountId: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FamilyPolicyRuleUpsertRow = Omit<FamilyPolicyRuleRow, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export class FamilyPolicyRuleRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async listByAccountId(accountId: string): Promise<FamilyPolicyRuleRow[]> {
    return await this.knex<FamilyPolicyRuleRow>('family_policy_rule').where({accountId}).orderBy('updatedAt', 'desc');
  }

  async findById(accountId: string, ruleId: string): Promise<FamilyPolicyRuleRow | undefined> {
    return await this.knex<FamilyPolicyRuleRow>('family_policy_rule').where({accountId, _id: ruleId}).first();
  }

  async upsert(row: FamilyPolicyRuleUpsertRow): Promise<FamilyPolicyRuleRow> {
    const now = this.knex.fn.now();

    await this.knex('family_policy_rule')
      .insert({
        ...row,
        createdAt: row.createdAt ?? now,
        updatedAt: now,
      })
      .onConflict('_id')
      .merge({
        data: row.data ?? null,
        encrypted: !!row.encInfo,
        encInfo: row.encInfo ?? null,
        updatedByUserId: row.updatedByUserId,
        updatedAt: now,
      });

    const result = await this.knex<FamilyPolicyRuleRow>('family_policy_rule').where({_id: row._id}).first();

    if (!result) {
      throw new Error('Failed to load upserted family policy rule');
    }

    return result;
  }

  async deleteById(accountId: string, ruleId: string): Promise<number> {
    return await this.knex('family_policy_rule').where({accountId, _id: ruleId}).delete();
  }
}
