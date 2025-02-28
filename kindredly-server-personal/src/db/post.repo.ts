import Post from '@/schemas/public/Post';
import { BaseRepo } from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class PostRepo extends BaseRepo<Post> {
  public jsonArrayFields = ['data', 'sharedWith', 'attachedItems'];
  constructor(db: Knex = knex) {
    super('post', db);
  }

  async findById(id: string) {
    return await this.where({ _id: id }).first();
  }

  async updateWithId(id: string, update: Post) {
    return await this.where({ _id: id }).update(this._updateInput(update));
  }

  async create(input: Post) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async deleteWithId(id: string) {
    return await this.where({ _id: id }).delete();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }
}
