import knex from './knex_config';
import { Knex } from 'knex';
import UserChangeLog from '@/schemas/public/UserChangeLog';
import {BaseRepo} from './base.repo';

export class UserChangeLogRepo extends BaseRepo<UserChangeLog> {
  constructor(db: Knex = knex) {
    super('user_change_log', db);
  }
  async findById(id: number) {
    return await this.where({id: id}).first();
  }

  async updateWithId(id: number, update: UserChangeLog) {
    return await this.where({id: id}).update(update);
  }

  async deleteWithId(id: number) {
    return await this.where({id: id}).delete();
  }

  async create(input: UserChangeLog) {
    return await this.query().insert(input);
  }

  async changeLogSince(userId: string, time: Date) {
    const q = this.query();
    const results = await q.select('*').where((qb) => {
      qb.where({userId});
      if (time != null) qb.andWhere('createdAt', '>=', time);
    });
    return results;
  }

  async addChangeLogEntry(userId: string, sourceId = null, data) {
    await this.create({userId, sourceId, data});
    const nowSt = new Date();
    await knex('user').where({_id: userId}).update({updatedAt: nowSt});
    return true;
  }

  async logLastUpdateForUsers(userIds: string[], data) {
    for (const userId of userIds) {
      await this.addChangeLogEntry(userId, null, data);
    }
  }
}
