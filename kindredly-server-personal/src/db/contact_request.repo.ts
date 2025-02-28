import ContactRequest from '@/schemas/public/ContactRequest';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class ContactRequestRepo extends BaseRepo<ContactRequest> {
  constructor(db: Knex = knex) {
    super('contact_request', db);
  }

  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: ContactRequest) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: ContactRequest) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
