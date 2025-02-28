import ItemFeedback from '@/schemas/public/ItemFeedback';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class ItemFeedbackRepo extends BaseRepo<ItemFeedback> {
  constructor(db: Knex = knex) {
    super('item_feedback', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async findWhereItemIdWithUsersIn(itemId: string, userIds: string[]) {
    return await this.query().where('itemId', itemId).whereIn('userId', userIds);
  }

  async updateWithId(id: string, update: ItemFeedback) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findIdWhereIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async create(input: ItemFeedback) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}