import Verification from 'tset-sharedlib/schemas/public/Verification';
import {BaseRepo} from './base.repo';
import knex from './knex_config';

export class VerificationRepo extends BaseRepo<Verification> {
  constructor(db = knex) {
    super('verification', db);
  }

  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async updateWithId(id: string, update: Verification) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: Verification) {
    return await this.query().insert(input);
  }

  /** The newest unexpired family invite sent to this email. Emails compare without case. */
  async findPendingFamilyInviteForEmail(email: string): Promise<Verification | undefined> {
    return await this.query()
      .where({type: 'joinFamily'})
      .whereRaw(`lower(data->>'email') = ?`, [email.trim().toLowerCase()])
      .where((q) => q.whereNull('expiresAt').orWhere('expiresAt', '>', new Date()))
      .orderBy('createdAt', 'desc')
      .first();
  }
}
