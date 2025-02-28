import Verification from '@/schemas/public/Verification';
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
}