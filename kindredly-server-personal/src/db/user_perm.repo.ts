import UserPerm from '@/schemas/public/UserPerm';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class UserPermRepo extends BaseRepo<UserPerm> {
  constructor(db: Knex = knex) {
    super('user_perm', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: UserPerm) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: UserPerm) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
