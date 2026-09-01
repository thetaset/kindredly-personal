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

  /**
   * Revokes every live session belonging to one client of one user.
   *
   * Used to cut off a single device without signing the user out everywhere. The key
   * is `clientId` rather than a device column because both Companion platforms already
   * send `tsclientid: cmp_<deviceId>` and the session registry records that header on
   * the row — so this targets exactly one device with no schema change, and works for
   * devices linked long before this existed.
   *
   * ALL matching sessions, not just the newest: re-linking a device deliberately reuses
   * its deviceId, so one device can have accumulated several sessions over time and
   * leaving any of them live would leave the device connected.
   */
  async revokeByClientId(userId: string, clientId: string, reason: string) {
    return await this.query()
      .where({userId, clientId})
      .whereNull('revokedAt')
      .update({revokedAt: new Date(), revokedReason: reason})
      .returning('_id');
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
