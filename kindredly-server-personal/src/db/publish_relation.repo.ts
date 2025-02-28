import PublishedRelation from '@/schemas/public/PublishedRelation';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class PublishedRelationRepo extends BaseRepo<PublishedRelation> {
  constructor(db: Knex = knex) {
    super('published_relation', db);
  }

  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async updateWithId(id: string, update: PublishedRelation) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: PublishedRelation) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
