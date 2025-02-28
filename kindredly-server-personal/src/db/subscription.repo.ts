import knex from './knex_config';
import Subscription from '@/schemas/public/Subscription';
import {BaseRepo} from './base.repo';
import { Knex } from 'knex';

export class SubscriptionRepo extends BaseRepo<Subscription> {
  constructor(db: Knex = knex) {
    super('subscription',db);
  }
  async findById(_id: string) {
    return await this.where({_id: _id}).first();
  }

  async countWithRef(refId: string, refType: string) {
    return await this.countFromQuery(this.where({refId: refId, refType: refType}));
  }

  async updateWithId(_id: string, update: Subscription) {
    return await this.where({_id: _id}).update(update);
  }

  async deleteWithId(_id: string) {
    return await this.where({_id: _id}).delete();
  }

  async create(input: Subscription) {
    return await this.query().insert(input);
  }

  async listByUserId(userId: string) {
    return this.where({userId: userId})
  }

  async listWhereUserIdsIn(refId:string,refType:string, userIds: string[]) {
    return this.query().where({refId, refType}).whereIn('userId', userIds)
  }

  async listByRefId(refId: string, refType: string) {
    return this.where({refId: refId, refType: refType})
  }
}
