import Review from '@/schemas/public/Review';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class ReviewRepo extends BaseRepo<Review> {
  constructor(db: Knex = knex) {
    super('review', db);
  }

  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async updateWithId(id: string, update: Review) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async create(input: Review) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
