import UserPublic from '@/schemas/public/UserPublic';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class UserPublicRepo extends BaseRepo<UserPublic> {
  constructor(db: Knex = knex) {
    super('user_public', db);
  }
  async findById(id: string) {
    if (!id) return null;
    return await this.where({_id: id}).first();
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async updateWithId(id: string, update: UserPublic) {
    return await this.where({_id: id}).update(update);
  }

  async create(input: UserPublic) {
    return await this.query().insert(input);
  }
}
