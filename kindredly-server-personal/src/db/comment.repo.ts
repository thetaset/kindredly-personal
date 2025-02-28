import Comment from '@/schemas/public/Comment';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class CommentRepo extends BaseRepo<Comment> {
  public jsonArrayFields = ['data'];
  constructor(db: Knex = knex) {
    super('comment', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async updateWithId(id: string, update: Comment) {
    return await this.where({_id: id}).update(this._updateInput(update));
  }
  async create(input: Comment) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }
}
