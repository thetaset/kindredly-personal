import KeyEntry from '@/schemas/public/KeyEntry';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class KeyEntryRepo extends BaseRepo<KeyEntry> {
  public jsonArrayFields = ['keyData', 'keyAlgo', 'keyOps'];
  constructor(db: Knex = knex) {
    super('key_entry', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async listPublicKeysForUsers(userIds: string[]) {
    return await this.query().whereIn('selectId', userIds).where({selectType: 'user', keyType: 'pub', keyName: 'default'});
  }

  async listForUser(userId: string) {
    return await this.where({selectId: userId, selectType: 'user'});
  }

  async listForAccount(accountId: string) {
    return await this.where({selectId: accountId, selectType: 'account'});
  }

  async updateWithId(id: string, update: KeyEntry) {
    return await this.where({_id: id}).update(this._updateInput(update));
  }

  async create(input: KeyEntry) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async createMany(inputs: KeyEntry[]) {
    return (await this.query()
      .insert(inputs.map((r) => this._updateInput(r)))
      .onConflict('_id')
      .merge()
      .returning('*')) as any;
  }

  async findWhereUserIdIn(col: string, vals: any[]) {
    return this.query().where({selectType: 'user'}).whereIn(col, vals);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }
}
