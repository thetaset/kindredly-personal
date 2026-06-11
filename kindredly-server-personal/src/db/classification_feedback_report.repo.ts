import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

type ClassificationFeedbackReportRow = {
  _id?: number;
  dedupeKey: string;
  userId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  details: any;
  reportCount: number;
  lastReportedAt: Date;
  createdAt?: Date;
};

export class ClassificationFeedbackReportRepo extends BaseRepo<ClassificationFeedbackReportRow> {
  constructor(db: Knex = knex) {
    super('classification_feedback_report', db);
  }

  async findLatestByDedupeKey(dedupeKey: string): Promise<ClassificationFeedbackReportRow | null> {
    return (await this.query().where({dedupeKey}).orderBy('_id', 'desc').first()) as any;
  }

  async create(input: ClassificationFeedbackReportRow) {
    return (await this.query().insert(this._updateInput(input)).returning('*')) as any;
  }

  async updateWithId(id: number, update: Partial<ClassificationFeedbackReportRow>) {
    return await this.where({_id: id} as any).update(this._updateInput(update as any));
  }
}
