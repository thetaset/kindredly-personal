import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

type ClassificationAnchorSetRow = {
  _id?: number;
  version: string;
  label?: string | null;
  // Anchor phrases keyed by eduValue class: Record<string, string[]>.
  anchors: any;
  metrics?: any;
  datasetId?: string | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export class ClassificationAnchorSetRepo extends BaseRepo<ClassificationAnchorSetRow> {
  constructor(db: Knex = knex) {
    super('classification_anchor_set', db);
  }

  async findByVersion(version: string): Promise<ClassificationAnchorSetRow | null> {
    return (await this.query().where({version}).first()) as any;
  }

  /** The currently-active anchor set (or null when none is active). */
  async findActive(): Promise<ClassificationAnchorSetRow | null> {
    return (await this.query().where({active: true}).orderBy('_id', 'desc').first()) as any;
  }

  /** Clear the active flag on every row (before activating one). */
  async deactivateAll() {
    return await this.query().update({active: false} as any);
  }

  async create(input: ClassificationAnchorSetRow) {
    return (await this.query().insert(this._updateInput(input)).returning('*')) as any;
  }

  /**
   * Atomically insert a new anchor set and make it the only active one.
   * Deactivate + insert run in one transaction so a failed insert can never leave
   * the table with zero active rows.
   */
  async createActive(input: ClassificationAnchorSetRow) {
    return await this.db.transaction(async (trx) => {
      await trx(this.tbl).update({active: false} as any);
      return (await trx(this.tbl).insert(this._updateInput(input)).returning('*')) as any;
    });
  }

  async updateWithId(id: number, update: Partial<ClassificationAnchorSetRow>) {
    return await this.where({_id: id} as any).update(this._updateInput(update as any));
  }

  /**
   * Make exactly one row active: clear the active flag everywhere, then set it
   * on the target row — atomically, so the table is never left with two active
   * rows nor (on failure) zero.
   */
  async activateById(id: number) {
    return await this.db.transaction(async (trx) => {
      await trx(this.tbl).update({active: false, updatedAt: new Date()} as any);
      return await trx(this.tbl)
        .where({_id: id})
        .update({active: true, updatedAt: new Date()} as any);
    });
  }
}
