import Notification from '@/schemas/public/Notification';
import { BaseRepo } from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class NotificationRepo extends BaseRepo<Notification> {
  constructor(db: Knex = knex) {
    super('notification', db);
  }
  async findById(id: string) {
    return await this.where({ _id: id }).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: Notification) {
    return await this.where({ _id: id }).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({ _id: id }).delete();
  }

  async create(input: Notification) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
