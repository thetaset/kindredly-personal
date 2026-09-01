import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type ClassificationDatasetRow = {
  _id?: number;
  datasetId: string;
  name: string;
  description?: string | null;
  task: string;
  role?: string | null;
  frozen: boolean;
  composedFrom?: any;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export class ClassificationDatasetRepo extends BaseRepo<ClassificationDatasetRow> {
  constructor(db: Knex = knex) {
    super('classification_dataset', db);
  }

  async findByDatasetId(datasetId: string): Promise<ClassificationDatasetRow | null> {
    return (await this.query().where({datasetId}).first()) as any;
  }

  async create(input: ClassificationDatasetRow) {
    return (await this.query().insert(this._updateInput(input)).returning('*')) as any;
  }

  async updateWithId(id: number, update: Partial<ClassificationDatasetRow>) {
    return await this.where({_id: id} as any).update(this._updateInput(update as any));
  }
}
