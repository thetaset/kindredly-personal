import {Knex} from 'knex';
import knex from './knex_config';
import type {CurationProposalChanges, CurationProposalStatus} from 'tset-sharedlib/api';

export type CurationProposalRow = {
  _id: string;
  publishedId: string;
  status: CurationProposalStatus;
  changes: CurationProposalChanges;
  imageSourceUrl: string | null;
  reason: string | null;
  recommendCurated: boolean;
  /** The AI suggests taking the item out of the catalog (HAT-623). */
  recommendRemoval: boolean;
  agentKeyId: string | null;
  proposedBy: string | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CurationProposalInsertRow = Pick<
  CurationProposalRow,
  | '_id'
  | 'publishedId'
  | 'changes'
  | 'imageSourceUrl'
  | 'reason'
  | 'recommendCurated'
  | 'recommendRemoval'
  | 'agentKeyId'
  | 'proposedBy'
>;

export class CurationProposalRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async findById(id: string): Promise<CurationProposalRow | undefined> {
    return await this.knex<CurationProposalRow>('curation_proposal').where({_id: id}).first();
  }

  async findPendingForItem(publishedId: string): Promise<CurationProposalRow | undefined> {
    return await this.knex<CurationProposalRow>('curation_proposal').where({publishedId, status: 'pending'}).first();
  }

  /** Pending oldest first (the curator's queue); a decided status newest decision first. */
  async listByStatus(status: CurationProposalStatus, limit = 200): Promise<CurationProposalRow[]> {
    const q = this.knex<CurationProposalRow>('curation_proposal').where({status});
    return await (status === 'pending' ? q.orderBy('createdAt', 'asc') : q.orderBy('decidedAt', 'desc')).limit(limit);
  }

  /** The items' rejected proposals, newest decision first (HAT-626). */
  async listRejectedForItems(publishedIds: string[], limit = 200): Promise<CurationProposalRow[]> {
    if (publishedIds.length === 0) return [];
    return await this.knex<CurationProposalRow>('curation_proposal')
      .where({status: 'rejected'})
      .whereIn('publishedId', publishedIds)
      .orderBy('decidedAt', 'desc')
      .limit(limit);
  }

  async listPendingItemIds(publishedIds: string[]): Promise<string[]> {
    if (publishedIds.length === 0) return [];
    const rows = await this.knex('curation_proposal')
      .select('publishedId')
      .where({status: 'pending'})
      .whereIn('publishedId', publishedIds);
    return rows.map((r: {publishedId: string}) => r.publishedId);
  }

  async insert(row: CurationProposalInsertRow): Promise<CurationProposalRow> {
    const now = this.knex.fn.now();
    await this.knex('curation_proposal').insert({
      ...row,
      status: 'pending',
      changes: JSON.stringify(row.changes ?? {}),
      createdAt: now,
      updatedAt: now,
    });
    return (await this.findById(row._id))!;
  }

  async updatePending(
    id: string,
    patch: Partial<
      Pick<
        CurationProposalRow,
        'changes' | 'imageSourceUrl' | 'reason' | 'recommendCurated' | 'recommendRemoval' | 'agentKeyId' | 'proposedBy'
      >
    >,
  ): Promise<CurationProposalRow> {
    const update: Record<string, unknown> = {...patch, updatedAt: this.knex.fn.now()};
    if (patch.changes) update.changes = JSON.stringify(patch.changes);
    await this.knex('curation_proposal').where({_id: id, status: 'pending'}).update(update);
    return (await this.findById(id))!;
  }

  /** Moves a pending proposal to its outcome. Returns false when it was no longer pending. */
  async decide(
    id: string,
    status: Exclude<CurationProposalStatus, 'pending'>,
    decidedBy: string | null,
    decisionNote: string | null,
  ): Promise<boolean> {
    const count = await this.knex('curation_proposal')
      .where({_id: id, status: 'pending'})
      .update({status, decidedBy, decisionNote, decidedAt: this.knex.fn.now(), updatedAt: this.knex.fn.now()});
    return count > 0;
  }
}
