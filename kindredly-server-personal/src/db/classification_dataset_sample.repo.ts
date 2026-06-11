import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

type ClassificationDatasetSampleRow = {
  _id?: number;
  dedupeKey: string;
  datasetId: string;
  userId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  details: any;
  sampleCount: number;
  lastSeenAt: Date;
  createdAt?: Date;
};

export class ClassificationDatasetSampleRepo extends BaseRepo<ClassificationDatasetSampleRow> {
  constructor(db: Knex = knex) {
    super('classification_dataset_sample', db);
  }

  async findLatestByDedupeKey(dedupeKey: string): Promise<ClassificationDatasetSampleRow | null> {
    return (await this.query().where({dedupeKey}).orderBy('_id', 'desc').first()) as any;
  }

  async create(input: ClassificationDatasetSampleRow) {
    return (await this.query().insert(this._updateInput(input)).returning('*')) as any;
  }

  async updateWithId(id: number, update: Partial<ClassificationDatasetSampleRow>) {
    return await this.where({_id: id} as any).update(this._updateInput(update as any));
  }
}
