import SitePlugin from '@/schemas/public/SitePlugin';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class SitePluginRepo extends BaseRepo<SitePlugin> {
  public jsonArrayFields = ['scripts', 'css', 'patterns', 'tags'];

  constructor(db: Knex = knex) {
    super('site_plugin', db);
  }

  _updateInput(data) {
    for (const fieldName of this.jsonArrayFields) {
      if (fieldName in data && data[fieldName]) {
        data[fieldName] = JSON.stringify(data[fieldName]);
      }
    }
    return data;
  }

  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: SitePlugin) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: SitePlugin) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }
}
