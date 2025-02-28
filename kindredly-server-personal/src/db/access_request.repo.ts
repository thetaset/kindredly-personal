import AccessRequest from '@/schemas/public/AccessRequest';
import { BaseRepo } from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class AccessRequestRepo extends BaseRepo<AccessRequest> {
  constructor(db: Knex = knex) {
    super('access_request', db);
  }
  async findById(id: string, whereData: AccessRequest = {}) : Promise<AccessRequest> {
    return await this.where({ _id: id, ...whereData }).first();
  }

  async findWhereIdIn(vals: string[])  {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: AccessRequest) {
    return await this.where({ _id: id }).update(update);
  }

  async deleteWithId(id: string, whereData: AccessRequest = {}) {
    return await this.where({ _id: id, ...whereData }).delete();
  }

  async create(input: AccessRequest) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }

  async fetchAccessRequests(accountId: string) {

    if (accountId == null) {
      return []
    }
    return await this
      .query()
      .from('access_request')
      .where({ 'access_request.accountId': accountId } as any)
      .leftJoin('user', 'user._id', '=', 'access_request.requesterId')
      .select(
        'access_request.*',
        'user.username as requesterUsername'

      ).limit(1000);
  }
}
