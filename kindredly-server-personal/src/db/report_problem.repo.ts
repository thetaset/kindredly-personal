import ReportProblem from '@/schemas/public/ReportProblem';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import { Knex } from 'knex';

export class ReportProblemRepo extends BaseRepo<ReportProblem> {
  public jsonArrayFields = []; //['details', 'adminStatusInfo'];
  constructor(db: Knex = knex) {
    super('report_problem', db);
  }

  async findById(id: number) {
    return await this.where({_id: id}).first();
  }

  async findWhere(data: ReportProblem) {
    const result = await this.where(data);
    if (result.length == 1) {
      return result[0];
    } else if (result.length > 0) {
      throw new Error('Found more than one item');
    } else {
      return null;
    }
  }

  async updateWithId(id: number, update: ReportProblem) {
    return await this.where({_id: id}).update(this._updateInput(update));
  }

  async create(input: ReportProblem) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async deleteWithId(id: number) {
    return await this.where({_id: id}).delete();
  }

  async findWhereIdIn(vals: number[]) {
    return await this.query().whereIn('_id', vals);
  }
}
