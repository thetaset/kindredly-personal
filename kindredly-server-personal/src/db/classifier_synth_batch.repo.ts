import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type ClassifierSynthCounts = {
  pages: number;
  /** The blind relabel gave the Category the batch was written for. */
  agree: number;
  disagree: number;
  unlabelled: number;
  /** Pages copied into a training set when the batch was accepted. */
  kept?: number;
};

export type ClassifierSynthBatchRow = {
  _id?: number;
  datasetId: string;
  keyId: string;
  keyLabel: string | null;
  category: string;
  kind: string;
  notes: string | null;
  /** The recipe the batch was written from (CLS-10). */
  recipeId?: number | null;
  status: 'labelling' | 'ready' | 'failed' | 'accepted' | 'dropped';
  counts: ClassifierSynthCounts;
  decisionReason?: string | null;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  intoDatasetId?: string | null;
  createdAt?: Date;
};

/** Batches of synthetic pages (CLS-9). */
export class ClassifierSynthBatchRepo extends BaseRepo<ClassifierSynthBatchRow> {
  constructor(db: Knex = knex) {
    super('classifier_synth_batch', db);
  }

  async insertRow(row: ClassifierSynthBatchRow): Promise<ClassifierSynthBatchRow> {
    const [inserted] = (await this.query().insert(this._updateInput(row)).returning('*')) as ClassifierSynthBatchRow[];
    return inserted;
  }

  async findById(id: number): Promise<ClassifierSynthBatchRow | null> {
    return ((await this.query().where({_id: id}).first()) as ClassifierSynthBatchRow) || null;
  }

  async update(id: number, changes: Partial<ClassifierSynthBatchRow>): Promise<ClassifierSynthBatchRow | null> {
    const [row] = (await this.query()
      .where({_id: id})
      .update(this._updateInput(changes as ClassifierSynthBatchRow))
      .returning('*')) as ClassifierSynthBatchRow[];
    return row || null;
  }

  /** How many batches each recipe has, by recipe id. */
  async countByRecipe(recipeIds: number[]): Promise<Map<number, number>> {
    if (!recipeIds.length) return new Map();
    const rows = (await this.query()
      .whereIn('recipeId', recipeIds)
      .select('recipeId')
      .count('* as batches')
      .groupBy('recipeId')) as Array<{recipeId: number; batches: string | number}>;
    return new Map(rows.map((row) => [Number(row.recipeId), Number(row.batches)]));
  }

  async listNewestFirst(filter: {keyId?: string; limit: number}): Promise<ClassifierSynthBatchRow[]> {
    const query = this.query().orderBy('_id', 'desc').limit(filter.limit);
    if (filter.keyId) query.where({keyId: filter.keyId});
    return (await query) as ClassifierSynthBatchRow[];
  }
}
