import UserFile from '@/schemas/public/UserFile';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class UserFileRepo extends BaseRepo<UserFile> {
  constructor(db: Knex = knex) {
    super('user_file', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findByRef(refId: string, refType: string, filename: string) {
    return await this.where({refId, refType, filename}).first();
  }

  async listByRef(refType: string, refId: string) {
    return await this.where({refId, refType});
  }

  async listForUser(userId: string, orderBy: string, order: string) {
    return await this.where({userId}).orderBy(orderBy, order);
  }

  async updateWithId(id: string, update: UserFile) {
    return await this.where({_id: id}).update(this._updateInput(update));
  }

  async create(input: UserFile) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async softDeleteWithId(id: string) {
    return await this.where({_id: id}).update({deletedAt: new Date()});
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }
}
