import UserActivity from '@/schemas/public/UserActivity';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class UserActivityRepo extends BaseRepo<UserActivity> {
  constructor(db: Knex = knex) {
    super('user_activity', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: UserActivity) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: UserActivity) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
