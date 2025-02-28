import UserFeed from '@/schemas/public/UserFeed';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class UserFeedRepo extends BaseRepo<UserFeed> {
  public jsonArrayFields = [];
  constructor(db: Knex = knex) {
    super('user_feed', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async updateWithId(id: string, update: UserFeed) {
    return await this.where({_id: id}).update(this._updateInput(update));
  }

  async create(input: UserFeed) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }
}
