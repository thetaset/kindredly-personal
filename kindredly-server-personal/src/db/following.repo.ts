import knex from './knex_config';
import { Knex } from 'knex';
import Following from '@/schemas/public/Following';
import {BaseRepo} from './base.repo';

export class FollowingRepo extends BaseRepo<Following> {
  constructor(db: Knex = knex) {
    super('following', db);
  }
  async findById(id: number) {
    return await this.where({id: id}).first();
  }

  async updateWithId(id: number, update: Following) {
    return await this.where({id: id}).update(update);
  }

  async deleteWithId(id: number) {
    return await this.where({id: id}).delete();
  }

  async create(input: Following) {
    return await this.query().insert(input);
  }

  async listByUserId(userId: string) {
    return this.where({userId: userId});
  }

  async listByRefId(refId: string, refType: string) {
    return this.where({refId: refId, refType: refType});
  }
}
