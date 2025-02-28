import EventLog from '@/schemas/public/EventLog';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class EventLogRepo extends BaseRepo<EventLog> {
  constructor(db: Knex = knex) {
    super('event_log', db);
  }
  async findById(id: number) {
    return await this.where({_id: id}).first();
  }

  async updateWithId(id: number, update: EventLog) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: number) {
    return await this.where({_id: id}).delete();
  }

  async create(input: EventLog) {
    return await this.query().insert(input);
  }
}
