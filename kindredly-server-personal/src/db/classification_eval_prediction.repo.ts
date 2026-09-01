import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type ClassificationEvalPredictionRow = {
  _id?: number;
  evalRunId: number;
  sampleId: number;
  gold: string;
  predicted?: string | null;
  correct: boolean;
  scores?: any;
  createdAt?: Date;
};

export class ClassificationEvalPredictionRepo extends BaseRepo<ClassificationEvalPredictionRow> {
  constructor(db: Knex = knex) {
    super('classification_eval_prediction', db);
  }

  async findByEvalRunId(evalRunId: number): Promise<ClassificationEvalPredictionRow[]> {
    return (await this.query().where({evalRunId})) as any;
  }

  async createBulk(inputs: ClassificationEvalPredictionRow[]) {
    if (!inputs.length) return [] as any;
    return (await this.query()
      .insert(inputs.map((i) => this._updateInput(i)))
      .returning('*')) as any;
  }

  async deleteByEvalRunId(evalRunId: number) {
    return await this.where({evalRunId} as any).delete();
  }
}
