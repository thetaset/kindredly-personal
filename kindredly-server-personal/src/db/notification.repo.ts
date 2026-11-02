import Notification from 'tset-sharedlib/schemas/public/Notification';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export class NotificationRepo extends BaseRepo<Notification> {
  constructor(db: Knex = knex) {
    super('notification', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: Notification) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  /** How many notifications of `type` one person caused since `since`: a cap for self-reported ones. */
  async countFromSenderSince(senderId: string, type: string, since: Date): Promise<number> {
    const row = await this.query().where({senderId, type}).where('createdAt', '>=', since).count({n: '*'}).first();
    return Number((row as any)?.n || 0);
  }

  async create(input: Notification) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
