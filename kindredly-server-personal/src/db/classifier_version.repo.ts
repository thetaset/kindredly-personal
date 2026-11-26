import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export type ClassifierVersionRow = {
  /** 'v2', 'v3', … ('v1' is bundled in the apps and has no row). */
  _id: string;
  parent: string | null;
  schema: number;
  textModel: string;
  notes: string | null;
  /** Where the document is in the published file store, written once. */
  fileKey: string;
  /** sha256 hex of the stored JSON. */
  contentHash: string;
  createdBy: string | null;
  createdAt: Date;
};

/** Saved classifier versions (CLS-3). Rows are never updated or removed. */
export class ClassifierVersionRepo extends BaseRepo<ClassifierVersionRow> {
  constructor(db: Knex = knex) {
    super('classifier_version', db);
  }

  async findByVersionId(id: string): Promise<ClassifierVersionRow | null> {
    if (!id) return null;
    return ((await this.query().where({_id: id}).first()) as ClassifierVersionRow | undefined) ?? null;
  }

  async listNewestFirst(): Promise<ClassifierVersionRow[]> {
    return (await this.query().orderBy('createdAt', 'desc').orderBy('_id', 'desc')) as ClassifierVersionRow[];
  }

  /**
   * Insert the row and run `whileInserting` in the same transaction: the row commits only if it
   * succeeds. The primary key reserves the id, so two saves that picked the same id cannot both
   * reach the file store.
   */
  async insertWith(row: ClassifierVersionRow, whileInserting: () => Promise<void>): Promise<void> {
    await this.db.transaction(async (trx) => {
      await trx(this.tbl).insert(row);
      await whileInserting();
    });
  }
}
