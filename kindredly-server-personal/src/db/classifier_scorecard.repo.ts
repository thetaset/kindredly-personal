import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type ClassifierScorecardRow = {
  _id?: number;
  versionId: string;
  datasetId: string;
  /** The dataset's signature when the score was taken. */
  datasetSignature: string;
  /** The browser's answer for each page: [{sampleId, predicted}]. */
  answers: Array<{sampleId: number; predicted: string | null}>;
  /** Worked out on the server from `answers` and the gold labels. */
  metrics: any;
  createdBy: string | null;
  createdAt?: Date;
};

/**
 * How a classifier version did on a dataset (CLS-7). Rows are only ever inserted; for one
 * (versionId, datasetId, datasetSignature) the newest row is the one that counts.
 */
export class ClassifierScorecardRepo extends BaseRepo<ClassifierScorecardRow> {
  constructor(db: Knex = knex) {
    super('classifier_scorecard', db);
    // node-postgres would send a JS array as a Postgres array, not JSON.
    this.jsonArrayFields = ['answers', 'metrics'];
  }

  async insertRow(row: ClassifierScorecardRow): Promise<ClassifierScorecardRow> {
    const [inserted] = (await this.query().insert(this._updateInput(row)).returning('*')) as ClassifierScorecardRow[];
    return inserted;
  }

  async findNewest(
    versionId: string,
    datasetId: string,
    datasetSignature: string,
  ): Promise<ClassifierScorecardRow | null> {
    return (
      ((await this.query().where({versionId, datasetId, datasetSignature}).orderBy('_id', 'desc').first()) as
        | ClassifierScorecardRow
        | undefined) ?? null
    );
  }

  async listNewestFirst(filter: {
    versionId?: string;
    datasetId?: string;
    limit: number;
    includeAnswers?: boolean;
  }): Promise<ClassifierScorecardRow[]> {
    const query = this.query().orderBy('_id', 'desc').limit(filter.limit);
    if (filter.versionId) query.where('versionId', filter.versionId);
    if (filter.datasetId) query.where('datasetId', filter.datasetId);
    const columns = ['_id', 'versionId', 'datasetId', 'datasetSignature', 'metrics', 'createdBy', 'createdAt'];
    query.select(filter.includeAnswers ? [...columns, 'answers'] : columns);
    return (await query) as ClassifierScorecardRow[];
  }
}
