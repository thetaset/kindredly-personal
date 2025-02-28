import SysInfo from '@/schemas/public/SysInfo';
import { BaseRepo } from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class SysInfoRepo extends BaseRepo<SysInfo> {
  public jsonArrayFields = ['data'];

  constructor(db: Knex = knex) {
    super('sys_info', db);
  }

  async findById(id: string) {
    return await this.where({ _id: id }).first();
  }

  async updateWithId(id: string, update: SysInfo) {
    return await this.where({ _id: id }).update(this._updateInput(update));
  }

  async create(input: SysInfo) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async deleteWithId(id: string) {
    return await this.where({ _id: id }).delete();
  }
}
