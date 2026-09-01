import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type ClassificationEvalRunRow = {
  _id?: number;
  evalRunId: string;
  task: string;
  target: string;
  testSetDatasetId?: string | null;
  testSetSignature?: string | null;
  candidateKind: string;
  candidateRef?: any;
  candidateConfigHash?: string | null;
  candidateLabel?: string | null;
  metrics?: any;
  runConfig?: any;
  status: string;
  createdBy?: string | null;
  createdAt?: Date;
};

export class ClassificationEvalRunRepo extends BaseRepo<ClassificationEvalRunRow> {
  constructor(db: Knex = knex) {
    super('classification_eval_run', db);
  }

  async findByEvalRunId(evalRunId: string): Promise<ClassificationEvalRunRow | null> {
    return (await this.query().where({evalRunId}).first()) as any;
  }

  async create(input: ClassificationEvalRunRow) {
    return (await this.query().insert(this._updateInput(input)).returning('*')) as any;
  }

  async deleteByEvalRunId(evalRunId: string) {
    return await this.where({evalRunId} as any).delete();
  }
}
