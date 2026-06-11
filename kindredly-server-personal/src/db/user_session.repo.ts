import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

// Matches the user_session table. Defined locally until kanel regenerates
// schema types from the database.
export interface UserSession {
  _id?: string;
  userId?: string;
  accountId?: string | null;
  appType?: string | null;
  clientId?: string | null;
  createdAt?: Date;
  lastSeenAt?: Date;
  revokedAt?: Date | null;
  revokedReason?: string | null;
}

export class UserSessionRepo extends BaseRepo<UserSession> {
  constructor(db: Knex = knex) {
    super('user_session', db);
  }

  async findById(id: string): Promise<UserSession | undefined> {
    return await this.where({_id: id}).first();
  }

  async create(input: UserSession) {
    return await this.query().insert(input).onConflict('_id').ignore();
  }

  async touch(id: string) {
    return await this.where({_id: id}).update({lastSeenAt: new Date()});
  }

  async revoke(id: string, reason: string) {
    return await this.where({_id: id}).whereNull('revokedAt').update({revokedAt: new Date(), revokedReason: reason});
  }

  async revokeAllForUser(userId: string, reason: string, exceptSessionId?: string) {
    let q = this.query().where({userId}).whereNull('revokedAt');
    if (exceptSessionId) {
      q = q.whereNot('_id', exceptSessionId);
    }
    return await q.update({revokedAt: new Date(), revokedReason: reason}).returning('_id');
  }

  async listActiveForUser(userId: string): Promise<UserSession[]> {
    return await this.query().where({userId}).whereNull('revokedAt').orderBy('lastSeenAt', 'desc');
  }
}
