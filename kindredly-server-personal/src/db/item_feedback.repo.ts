import ItemFeedback from 'tset-sharedlib/schemas/public/ItemFeedback';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export class ItemFeedbackRepo extends BaseRepo<ItemFeedback> {
  constructor(db: Knex = knex) {
    super('item_feedback', db);
  }
  async findById(id: string) {
    return await this.where({_id: id}).first();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async findWhereItemIdWithUsersIn(itemId: string, userIds: string[]) {
    return await this.query().where('itemId', itemId).whereIn('userId', userIds);
  }

  async updateWithId(id: string, update: ItemFeedback) {
    return await this.where({_id: id}).update(update);
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findIdWhereIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  async create(input: ItemFeedback) {
    return (await this.query().insert(input).onConflict('_id').merge().returning('*')) as any;
  }

  /**
   * Insert-or-update many visit records in one statement.
   *
   * Merges ONLY the visit columns by name. A bare `.merge()` would merge every column
   * present on the inserted rows, so a future caller adding a field to `rows` would start
   * silently overwriting it on existing feedback.
   */
  async upsertVisitRecords(
    rows: Array<{_id: string; userId: string; itemId: string; lastVisit: any; visitTime: any; visitCount: number}>,
  ) {
    if (!rows.length) return;
    return await this.query().insert(rows).onConflict('_id').merge(['lastVisit', 'visitTime', 'visitCount']);
  }
}
