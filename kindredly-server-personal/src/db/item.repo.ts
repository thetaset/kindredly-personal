import Item from '@/schemas/public/Item';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class ItemRepo extends BaseRepo<Item> {
  public jsonArrayFields = ['useCriteria', 'tags', 'patterns', 'categories'];
  constructor(db: Knex = knex) {
    super('item', db);
  }
  async findById(id: string) :Promise<Item>{
    return await this.where({_id: id}).first();
  }

  async findWhere(data: Partial<Item>) : Promise<Item> {
    const result = await this.where(data);
    if (result.length == 1) {
      return result[0];
    } else if (result.length > 0) {
      throw new Error('Found more than one item');
    } else {
      return null;
    }
  }

  async updateWithId(id: string, update: Item) {
    if (update.userId){
      
      delete update.userId;
    }
    return await this.where({_id: id}).update(this._updateInput(update));
  }

  async updateOwner(id: string, ownerUserId: string) {
    return await this.where({_id: id}).update({userId:ownerUserId, updatedAt: new Date()});
  }

  async create(input: Item) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async findWhereIdInAndInAccount(vals: string[], accountId: string, keyCol = '_id') {
    if (!accountId) throw new Error('accountId is required');
    return await this.query().whereIn(keyCol, vals).andWhere({accountId});
  }

  async getItemsByIds(accountId: string, ids: string[]) {
    if (!ids) return [];
    const results = await this.findWhereIdInAndInAccount(ids, accountId);
    return results;
  }
}
