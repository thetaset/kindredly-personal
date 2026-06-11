import {Knex} from 'knex';
import knex from './knex_config';

export type RefStateRow = {
  _id: string;
  refType: string;
  refId: string;
  ownerType: string;
  ownerId: string;
  stateKey: string;
  stateSubKey: string;
  data: any;
  encrypted: boolean;
  encInfo: any;
  createdAt: Date;
  updatedAt: Date;
};

export class RefStateRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async upsert(row: Omit<RefStateRow, 'createdAt' | 'updatedAt'>): Promise<RefStateRow> {
    const now = this.knex.fn.now();
    await this.knex('ref_state')
      .insert({
        ...row,
        createdAt: now,
        updatedAt: now,
      })
      .onConflict(['ownerType', 'ownerId', 'refType', 'refId', 'stateKey', 'stateSubKey'])
      .merge({
        data: row.data,
        encrypted: row.encrypted,
        encInfo: row.encInfo,
        updatedAt: now,
      });

    const result = await this.knex<RefStateRow>('ref_state')
      .where({
        ownerType: row.ownerType,
        ownerId: row.ownerId,
        refType: row.refType,
        refId: row.refId,
        stateKey: row.stateKey,
        stateSubKey: row.stateSubKey,
      })
      .first();
    if (!result) throw new Error('Failed to load upserted ref_state row');
    return result;
  }

  async findById(id: string): Promise<RefStateRow | undefined> {
    return await this.knex<RefStateRow>('ref_state').where({_id: id}).first();
  }

  async listByRef(input: {
    refType: string;
    refId: string;
    ownerType: string;
    ownerId: string;
    stateKey?: string;
    stateSubKey?: string;
    limit: number;
    cursorUpdatedAt?: Date;
  }): Promise<RefStateRow[]> {
    const query = this.knex<RefStateRow>('ref_state')
      .where({
        refType: input.refType,
        refId: input.refId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
      })
      .orderBy('updatedAt', 'desc')
      .limit(input.limit);

    if (input.stateKey) query.andWhere({stateKey: input.stateKey});
    if (input.stateSubKey !== undefined) query.andWhere({stateSubKey: input.stateSubKey});
    if (input.cursorUpdatedAt) query.andWhere('updatedAt', '<', input.cursorUpdatedAt);

    return await query;
  }

  async listByRefs(input: {
    refType: string;
    refIds: string[];
    ownerType: string;
    ownerId: string;
    stateKey?: string;
    stateSubKey?: string;
  }): Promise<RefStateRow[]> {
    if (input.refIds.length === 0) {
      return [];
    }

    const query = this.knex<RefStateRow>('ref_state')
      .where({
        refType: input.refType,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
      })
      .whereIn('refId', input.refIds);

    if (input.stateKey) query.andWhere({stateKey: input.stateKey});
    if (input.stateSubKey !== undefined) query.andWhere({stateSubKey: input.stateSubKey});

    return await query;
  }

  async deleteOne(input: {
    refType: string;
    refId: string;
    ownerType: string;
    ownerId: string;
    stateKey: string;
    stateSubKey: string;
  }): Promise<number> {
    return await this.knex('ref_state')
      .where({
        refType: input.refType,
        refId: input.refId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        stateKey: input.stateKey,
        stateSubKey: input.stateSubKey,
      })
      .delete();
  }
}
