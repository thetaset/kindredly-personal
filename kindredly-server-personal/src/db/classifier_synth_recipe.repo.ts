import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type ClassifierSynthRecipeRow = {
  _id?: number;
  category: string;
  kind: string;
  topicId: string | null;
  notes: string;
  pages: number;
  status: 'open' | 'closed';
  createdBy: string | null;
  createdAt?: Date;
  closedAt?: Date | null;
};

/** Recipes for synthetic pages (CLS-10). */
export class ClassifierSynthRecipeRepo extends BaseRepo<ClassifierSynthRecipeRow> {
  constructor(db: Knex = knex) {
    super('classifier_synth_recipe', db);
  }

  async insertRow(row: ClassifierSynthRecipeRow): Promise<ClassifierSynthRecipeRow> {
    const [inserted] = (await this.query().insert(this._updateInput(row)).returning('*')) as ClassifierSynthRecipeRow[];
    return inserted;
  }

  async findById(id: number): Promise<ClassifierSynthRecipeRow | null> {
    return ((await this.query().where({_id: id}).first()) as ClassifierSynthRecipeRow) || null;
  }

  async close(id: number): Promise<ClassifierSynthRecipeRow | null> {
    const [row] = (await this.query()
      .where({_id: id})
      .update({status: 'closed', closedAt: new Date()})
      .returning('*')) as ClassifierSynthRecipeRow[];
    return row || null;
  }

  async listNewestFirst(filter: {status?: 'open' | 'closed'; limit: number}): Promise<ClassifierSynthRecipeRow[]> {
    const query = this.query().orderBy('_id', 'desc').limit(filter.limit);
    if (filter.status) query.where({status: filter.status});
    return (await query) as ClassifierSynthRecipeRow[];
  }
}
