import {BaseRepo} from './base.repo';
import knex from './knex_config';
import type {Knex} from 'knex';

export type UserShowcase = {
  _id: string;
  userId: string;
  entries?: Array<Record<string, any>> | null;
  config?: Record<string, any> | null;
  publicEnabled?: boolean | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export class UserShowcaseRepo extends BaseRepo<UserShowcase> {
  public jsonArrayFields = ['entries', 'config'];

  constructor(db: Knex = knex) {
    super('user_showcase', db);
  }

  async findById(id: string) {
    return await this.where({_id: id} as any).first();
  }

  async save(input: UserShowcase) {
    const result = (await this.query()
      .insert(this._updateInput(input) as any)
      .onConflict('_id')
      .merge()
      .returning('*')) as any;

    if (Array.isArray(result) && result.length > 0) return result[0];
    return null;
  }

  async updateWithId(id: string, update: Partial<UserShowcase>) {
    return await this.where({_id: id} as any).update(this._updateInput(update as any) as any);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id} as any).delete();
  }
}
