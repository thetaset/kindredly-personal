import knex from './knex_config';
import { Knex } from 'knex';
import ClientInfo  from '@/schemas/public/ClientInfo';
import {BaseRepo} from './base.repo';

export class ClientInfoRepo extends BaseRepo<ClientInfo> {
  constructor(db: Knex = knex) {
    super('client_info', db);
  }
  createId(userId:string, clientId:string) {
    return `${userId}:${clientId}`;
  }
  async findById(_id: string): Promise<ClientInfo> {
    return await this.where({_id: _id}).first();
  }

  async updateWithId(_id: string, update: ClientInfo) {
    return await this.where({_id: _id}).update(update);
  }

  async deleteWithId(_id: string) {
    return await this.where({_id: _id}).delete();
  }

  async create(input: ClientInfo) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }

  async listByUserId(userId: string) {
    return this.where({userId: userId}).orderBy('lastSeen','desc')
  }

}
