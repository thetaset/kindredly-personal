import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';
import {FINAL_LABEL_SQL, FINAL_TOPICS_SQL, goldTopicsOf} from '@/utils/classification_dataset_labels';

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

  /** Every sample of a dataset in id order, with its gold label (null when it has none). */
  async listGoldLabels(datasetId: string): Promise<Array<{_id: number; gold: string | null; goldTopics: string[]}>> {
    const rows = await this.query()
      .where('datasetId', datasetId)
      .select('_id')
      .select(this.knex.raw(`${FINAL_LABEL_SQL} as gold`))
      .select(this.knex.raw(`${FINAL_TOPICS_SQL} as "goldTopics"`))
      .orderBy('_id', 'asc');
    return (rows as any[]).map((row) => ({
      _id: Number(row._id),
      gold: row.gold ?? null,
      goldTopics: goldTopicsOf(row.goldTopics),
    }));
  }

  async create(input: ClassificationDatasetSampleRow) {
    return (await this.query().insert(this._updateInput(input)).returning('*')) as any;
  }

  async updateWithId(id: number, update: Partial<ClassificationDatasetSampleRow>) {
    return await this.where({_id: id} as any).update(this._updateInput(update as any));
  }
}
