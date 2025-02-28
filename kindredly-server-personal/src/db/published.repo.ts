import Published from '@/schemas/public/Published';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class PublishedRepo extends BaseRepo<Published> {
  public jsonArrayFields = ['useCriteria', 'categories'];
  constructor(db: Knex = knex) {
    super('published', db);
  }

  async updateWithId(id: string, update: Published) {
    return await this.where({_id: id}).update(this._updateInput(update));
  }

  async create(input: Published) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async findById(id: string) {
    if (!id) {
      return null;
    }
    if (id.startsWith('pub_')) {
      return await this.where({_id: id}).first();
    } else if (id.length > 5) return await this.where({easyId: id}).first();
    else return null;
  }

  findWhereIdsIn(vals: any[]) {
    const easyIds = vals.filter((v) => !v.startsWith('pub_'));
    const regIds = vals.filter((v) => v.startsWith('pub_'));
    return this.query().whereIn('_id', regIds).orWhereIn('easyId', easyIds);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }
}
