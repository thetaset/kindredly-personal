import {Knex} from 'knex';
import knex from './knex_config';
import {bumpDeviceSettingsVersion} from './device_settings_version.repo';

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

  /**
   * @param options.bumpDeviceSettingsFor raise this user's device settings version in the same
   *   transaction as the write (DCP-5). Only for rows a device compiles from.
   */
  async upsert(
    row: Omit<RefStateRow, 'createdAt' | 'updatedAt'>,
    options: {bumpDeviceSettingsFor?: string} = {},
  ): Promise<RefStateRow> {
    const userId = options.bumpDeviceSettingsFor;
    if (!userId) return await this.upsertOn(this.knex, row);
    return await this.knex.transaction(async (trx) => {
      const saved = await this.upsertOn(trx, row);
      await bumpDeviceSettingsVersion(trx, [userId]);
      return saved;
    });
  }

  private async upsertOn(
    db: Knex | Knex.Transaction,
    row: Omit<RefStateRow, 'createdAt' | 'updatedAt'>,
  ): Promise<RefStateRow> {
    const now = db.fn.now();
    await db('ref_state')
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

    const result = await db<RefStateRow>('ref_state')
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
    stateSubKeyGte?: string;
    stateSubKeyLte?: string;
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
    if (input.stateSubKeyGte !== undefined) query.andWhere('stateSubKey', '>=', input.stateSubKeyGte);
    if (input.stateSubKeyLte !== undefined) query.andWhere('stateSubKey', '<=', input.stateSubKeyLte);
    if (input.cursorUpdatedAt) query.andWhere('updatedAt', '<', input.cursorUpdatedAt);

    return await query;
  }

  /**
   * Batched sibling of listByRef.
   *
   * Ordered `refId, stateSubKey` rather than `updatedAt desc` — "most recently
   * touched" is meaningless across refs, and this order matches the leading
   * columns of uniq_ref_state_owner_ref_key (ownerType, ownerId, refType, refId,
   * stateKey, stateSubKey), so the range scan satisfies the sort with no heap
   * sort and no additional index.
   */
  async listByRefs(input: {
    refType: string;
    refIds: string[];
    ownerType: string;
    ownerId: string;
    stateKey?: string;
    stateSubKey?: string;
    stateSubKeyGte?: string;
    stateSubKeyLte?: string;
    limit?: number;
    cursorRefId?: string;
    cursorStateSubKey?: string;
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
      .whereIn('refId', input.refIds)
      .orderBy([
        {column: 'refId', order: 'asc'},
        {column: 'stateSubKey', order: 'asc'},
      ]);

    if (input.limit !== undefined) query.limit(input.limit);
    if (input.stateKey) query.andWhere({stateKey: input.stateKey});
    if (input.stateSubKey !== undefined) query.andWhere({stateSubKey: input.stateSubKey});
    if (input.stateSubKeyGte !== undefined) query.andWhere('stateSubKey', '>=', input.stateSubKeyGte);
    if (input.stateSubKeyLte !== undefined) query.andWhere('stateSubKey', '<=', input.stateSubKeyLte);

    if (input.cursorRefId !== undefined && input.cursorStateSubKey !== undefined) {
      const {cursorRefId, cursorStateSubKey} = input;
      query.andWhere((builder) => {
        builder.where('refId', '>', cursorRefId).orWhere((inner) => {
          inner.where('refId', '=', cursorRefId).andWhere('stateSubKey', '>', cursorStateSubKey);
        });
      });
    }

    return await query;
  }

  /**
   * Cross-owner sweep for background jobs, keyset-paginated on (updatedAt, _id).
   *
   * Every other read here is owner-scoped, which is the right default for request
   * handling. This one exists for the Companion tamper watch, which has to notice
   * devices that have *stopped* reporting — inherently a question you cannot ask
   * one owner at a time. Callers are background jobs with no RequestContext, so
   * there is no ACL to apply; keep it that way and keep the callers few.
   */
  async listAllByStateKey(input: {
    refType: string;
    refId: string;
    stateKey: string;
    limit: number;
    cursorUpdatedAt?: Date;
    cursorId?: string;
  }): Promise<RefStateRow[]> {
    const query = this.knex<RefStateRow>('ref_state')
      .where({refType: input.refType, refId: input.refId, stateKey: input.stateKey})
      // Ascending + a tiebreaker on _id so pagination is stable even when many
      // rows share an updatedAt (they do — devices check in on the same cadence).
      .orderBy([
        {column: 'updatedAt', order: 'asc'},
        {column: '_id', order: 'asc'},
      ])
      .limit(input.limit);

    if (input.cursorUpdatedAt) {
      query.andWhere((b) =>
        b
          .where('updatedAt', '>', input.cursorUpdatedAt!)
          .orWhere((b2) => b2.where('updatedAt', input.cursorUpdatedAt!).andWhere('_id', '>', input.cursorId ?? '')),
      );
    }

    return await query;
  }

  async deleteOne(
    input: {
      refType: string;
      refId: string;
      ownerType: string;
      ownerId: string;
      stateKey: string;
      stateSubKey: string;
    },
    options: {bumpDeviceSettingsFor?: string} = {},
  ): Promise<number> {
    const userId = options.bumpDeviceSettingsFor;
    if (!userId) return await this.deleteOneOn(this.knex, input);
    return await this.knex.transaction(async (trx) => {
      const deleted = await this.deleteOneOn(trx, input);
      if (deleted > 0) await bumpDeviceSettingsVersion(trx, [userId]);
      return deleted;
    });
  }

  private async deleteOneOn(
    db: Knex | Knex.Transaction,
    input: {refType: string; refId: string; ownerType: string; ownerId: string; stateKey: string; stateSubKey: string},
  ): Promise<number> {
    return await db('ref_state')
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
