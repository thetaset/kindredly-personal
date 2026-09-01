import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

type ClassificationModelArtifactRow = {
  _id?: number;
  version: string;
  kind: string;
  embeddingModelId: string;
  active: boolean;
  artifact: any;
  metrics?: any;
  datasetSnapshot?: any;
  createdBy?: string | null;
  createdAt?: Date;
};

export class ClassificationModelArtifactRepo extends BaseRepo<ClassificationModelArtifactRow> {
  constructor(db: Knex = knex) {
    super('classification_model_artifact', db);
  }

  async findByVersion(version: string): Promise<ClassificationModelArtifactRow | null> {
    return (await this.query().where({version}).first()) as any;
  }

  /** The currently-active artifact for a kind (or any kind when omitted). */
  async findActive(kind?: string): Promise<ClassificationModelArtifactRow | null> {
    const q = this.query().where({active: true});
    if (kind) q.andWhere({kind});
    return (await q.orderBy('_id', 'desc').first()) as any;
  }

  /** Clear the active flag for every artifact of a kind (before activating one). */
  async deactivateKind(kind: string) {
    return await this.query()
      .where({kind})
      .update({active: false} as any);
  }

  async create(input: ClassificationModelArtifactRow) {
    return (await this.query().insert(this._updateInput(input)).returning('*')) as any;
  }

  /**
   * Atomically insert a new artifact and make it the only active one of its kind.
   * Deactivate + insert run in one transaction so a failed insert can never leave
   * the kind with zero active artifacts.
   */
  async createActive(input: ClassificationModelArtifactRow) {
    return await this.db.transaction(async (trx) => {
      await trx(this.tbl)
        .where({kind: input.kind})
        .update({active: false} as any);
      return (await trx(this.tbl).insert(this._updateInput(input)).returning('*')) as any;
    });
  }

  async updateWithId(id: number, update: Partial<ClassificationModelArtifactRow>) {
    return await this.where({_id: id} as any).update(this._updateInput(update as any));
  }
}
