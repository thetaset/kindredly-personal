import Account from '@/schemas/public/Account';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class AccountRepo extends BaseRepo<Account> {
  constructor(db: Knex = knex) {
    super('account', db);
  }
  async findById(id: string) : Promise<Account> {
    return await this.where({_id: id}).first();
  }

  async updateWithId(id: string, update: Account) {
    if (!id) {
      throw new Error('id is required');
    }
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: Account) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
