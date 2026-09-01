import knex from './knex_config';
import {Knex} from 'knex';
import ClientInfo from 'tset-sharedlib/schemas/public/ClientInfo';
import {BaseRepo} from './base.repo';

/**
 * "Last active" for a client: the most recent thing we know about it. lastSeen is
 * refreshed on every authenticated request, so it is almost always the winner —
 * the fallbacks only matter for rows written before the client ever checked in.
 */
const LAST_ACTIVE_SQL = 'COALESCE("lastSeen", "lastLogin", "updatedAt", "createdAt")';

export class ClientInfoRepo extends BaseRepo<ClientInfo> {
  constructor(db: Knex = knex) {
    super('client_info', db);
  }
  createId(userId: string, clientId: string) {
    return `${userId}:${clientId}`;
  }
  async findById(_id: string): Promise<ClientInfo> {
    return await this.where({_id: _id}).first();
  }

  async updateWithId(_id: string, update: ClientInfo) {
    return await this.where({_id: _id}).update(update);
  }

  async deleteWithId(_id: string) {
    return await this.where({_id: _id}).delete();
  }

  async create(input: ClientInfo) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }

  /** Most recently active first. Pass activeSince to skip clients that went quiet before then. */
  async listByUserId(userId: string, options: {activeSince?: Date} = {}) {
    const query = this.where({userId: userId}).orderByRaw(`${LAST_ACTIVE_SQL} DESC`);
    if (options.activeSince) {
      query.whereRaw(`${LAST_ACTIVE_SQL} >= ?`, [options.activeSince]);
    }
    return query;
  }

  async deleteInactiveForUser(userId: string, activeBefore: Date) {
    return await this.where({userId: userId}).whereRaw(`${LAST_ACTIVE_SQL} < ?`, [activeBefore]).delete();
  }
}
