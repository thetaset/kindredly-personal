import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type ClassifierActivationRow = {
  _id?: number;
  versionId: string;
  activatedBy: string | null;
  reason: string | null;
  activatedAt?: Date;
};

/**
 * The classifier activation log, which is also the active pointer (CLS-3): the newest row names the
 * active version. Activating is one insert. Rows are never updated or removed.
 */
export class ClassifierActivationRepo extends BaseRepo<ClassifierActivationRow> {
  constructor(db: Knex = knex) {
    super('classifier_activation', db);
  }

  async findNewest(): Promise<ClassifierActivationRow | null> {
    return ((await this.query().orderBy('_id', 'desc').first()) as ClassifierActivationRow | undefined) ?? null;
  }

  async insertRow(row: ClassifierActivationRow): Promise<ClassifierActivationRow> {
    const [inserted] = (await this.query().insert(row).returning('*')) as ClassifierActivationRow[];
    return inserted;
  }

  /** True when `versionId` has ever been the active version. */
  async hasActivated(versionId: string): Promise<boolean> {
    return !!(await this.query().where({versionId}).first('_id'));
  }

  async listNewestFirst(limit: number): Promise<ClassifierActivationRow[]> {
    return (await this.query().orderBy('_id', 'desc').limit(limit)) as ClassifierActivationRow[];
  }
}
