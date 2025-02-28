import Reaction from '@/schemas/public/Reaction';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class ReactionRepo extends BaseRepo<Reaction> {
  constructor(db: Knex = knex) {
    super('reaction', db);
  }

  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async updateWithId(id: string, update: Reaction) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findIdWhereIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async create(input: Reaction) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }
}
