import {Knex} from 'knex';
import knex from './knex_config';
import type {ContentSourceCandidate} from 'tset-sharedlib/api';
import type ContentSourceDraftRecord from 'tset-sharedlib/src/schemas/public/ContentSourceDraft';

export type ContentSourceDraftRow = ContentSourceDraftRecord & {
  _id: string;
  label: string | null;
  status: string;
  candidates: ContentSourceCandidate[];
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentSourceDraftInsertRow = {
  _id: string;
  label: string | null;
  status: string;
  candidates: ContentSourceCandidate[];
  createdByUserId: string | null;
};

export class ContentSourceDraftRepo {
  private readonly knex: Knex;

  constructor(knexConn: Knex = knex) {
    this.knex = knexConn;
  }

  async list(limit = 100): Promise<ContentSourceDraftRow[]> {
    return await this.knex<ContentSourceDraftRow>('content_source_draft').orderBy('updatedAt', 'desc').limit(limit);
  }

  async findById(draftId: string): Promise<ContentSourceDraftRow | undefined> {
    return await this.knex<ContentSourceDraftRow>('content_source_draft').where({_id: draftId}).first();
  }

  async insert(row: ContentSourceDraftInsertRow): Promise<ContentSourceDraftRow> {
    const now = this.knex.fn.now();
    await this.knex('content_source_draft').insert({
      _id: row._id,
      label: row.label,
      status: row.status,
      candidates: JSON.stringify(row.candidates ?? []),
      createdByUserId: row.createdByUserId,
      createdAt: now,
      updatedAt: now,
    });
    return await this.requireById(row._id);
  }

  async updateCandidates(draftId: string, candidates: ContentSourceCandidate[]): Promise<ContentSourceDraftRow> {
    await this.knex('content_source_draft')
      .where({_id: draftId})
      .update({candidates: JSON.stringify(candidates ?? []), updatedAt: this.knex.fn.now()});
    return await this.requireById(draftId);
  }

  async setStatus(draftId: string, status: string): Promise<ContentSourceDraftRow> {
    await this.knex('content_source_draft').where({_id: draftId}).update({status, updatedAt: this.knex.fn.now()});
    return await this.requireById(draftId);
  }

  async deleteById(draftId: string): Promise<number> {
    return await this.knex('content_source_draft').where({_id: draftId}).delete();
  }

  private async requireById(draftId: string): Promise<ContentSourceDraftRow> {
    const result = await this.findById(draftId);
    if (!result) {
      throw new Error('Failed to load content source draft');
    }
    return result;
  }
}
