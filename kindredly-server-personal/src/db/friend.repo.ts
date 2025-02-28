import Friend from '@/schemas/public/Friend';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class FriendRepo extends BaseRepo<Friend> {
  constructor(db: Knex = knex) {
    super('friend', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: Friend) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findIdWhereIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async create(input: Friend) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }

  async listFriendIds(targetUserId: string) {
    return this.query().where({userId: targetUserId, confirmed: true}).select('friendUserId');
  }
}
