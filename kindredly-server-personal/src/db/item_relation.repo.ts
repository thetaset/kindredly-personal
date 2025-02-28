import ItemRelation from '@/schemas/public/ItemRelation';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class ItemRelationRepo extends BaseRepo<ItemRelation> {
  constructor(db: Knex = knex) {
    super('item_relation', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async updateWithId(id: string, update: ItemRelation) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: ItemRelation) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
