import AccessRequest from 'tset-sharedlib/schemas/public/AccessRequest';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export class AccessRequestRepo extends BaseRepo<AccessRequest> {
  constructor(db: Knex = knex) {
    super('access_request', db);
  }
  async findById(id: string, whereData: AccessRequest = {}): Promise<AccessRequest> {
    return await this.where({_id: id, ...whereData}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: AccessRequest) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string, whereData: AccessRequest = {}) {
    return await this.where({_id: id, ...whereData}).delete();
  }

  async create(input: AccessRequest) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }

  /**
   * Everything a guardian's request screen shows: all pending rows, plus recently
   * decided ones.
   *
   * The window on decided rows exists because assistant-approved requests are
   * KEPT rather than deleted — they are the record of what was approved on the
   * parent's behalf. Without it, a busy month of automatic approvals would push
   * live pending requests past the row limit and out of the parent's sight, which
   * is the one failure this screen cannot have.
   */
  async fetchAccessRequests(accountId: string, decidedSince?: Date) {
    if (accountId == null) {
      return [];
    }
    const since = decidedSince || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return await this.query()
      .from('access_request')
      .where({'access_request.accountId': accountId} as any)
      .andWhere((builder) =>
        builder.where({'access_request.status': 'requested'} as any).orWhere('access_request.createdAt', '>=', since),
      )
      .leftJoin('user', 'user._id', '=', 'access_request.requesterId')
      .select('access_request.*', 'user.username as requesterUsername')
      .orderBy('createdAt', 'desc')
      .limit(150);
  }

  /**
   * This requester's recent site requests, for the assistant's "have we already
   * answered this?" check. Deliberately unfiltered by status: a decided row is
   * exactly what we are looking for.
   */
  async listRecentUrlRequestsByRequester(accountId: string, requesterId: string, since: Date, limit = 200) {
    if (!accountId || !requesterId) return [];
    return await this.query()
      .where({accountId, requesterId, type: 'url'} as any)
      .andWhere('createdAt', '>=', since)
      .orderBy('createdAt', 'desc')
      .limit(limit);
  }
}
