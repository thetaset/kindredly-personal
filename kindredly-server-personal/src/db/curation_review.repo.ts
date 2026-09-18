import CurationReview from 'tset-sharedlib/schemas/public/CurationReview';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

/** The jsonb columns, serialized explicitly so an array value can never reach pg as a Postgres array. */
const JSON_COLUMNS = ['answers', 'aiDraft'] as const;

function serialize(update: Partial<CurationReview>): Record<string, any> {
  const out: Record<string, any> = {...update};
  for (const column of JSON_COLUMNS) {
    if (column in out && out[column] !== null && out[column] !== undefined) out[column] = JSON.stringify(out[column]);
  }
  return out;
}

export class CurationReviewRepo extends BaseRepo<CurationReview> {
  constructor(db: Knex = knex) {
    super('curation_review', db);
  }

  async findById(id: string): Promise<CurationReview | null> {
    if (!id) return null;
    return (await this.query().where({_id: id}).first()) ?? null;
  }

  async findOpenForPublished(publishedId: string): Promise<CurationReview | null> {
    return (await this.query().where({publishedId, status: 'open'}).first()) ?? null;
  }

  /**
   * Opens a review unless one is already open for the row, and returns the open one either way.
   * `uq_curation_review_one_open` decides, so two reports arriving together join one review.
   */
  async openOrGet(input: {
    _id: string;
    publishedId: string;
    checklistVersion: number;
    openReason: string;
    now: Date;
  }): Promise<CurationReview> {
    await this.knex.raw(
      `INSERT INTO curation_review
         ("_id", "publishedId", "checklistVersion", "status", "openReason", "underReview", "answers",
          "openedAt", "createdAt", "updatedAt", "version")
       VALUES (?, ?, ?, 'open', ?, false, '{}'::jsonb, ?, ?, ?, 1)
       ON CONFLICT ("publishedId") WHERE status = 'open' DO NOTHING`,
      [input._id, input.publishedId, input.checklistVersion, input.openReason, input.now, input.now, input.now],
    );
    const open = await this.findOpenForPublished(input.publishedId);
    if (!open) throw new Error('The review could not be opened.');
    return open;
  }

  async listFinalizedForPublished(publishedId: string, limit = 10): Promise<CurationReview[]> {
    return await this.query()
      .where({publishedId, status: 'finalized'})
      .orderBy('finalizedAt', 'desc')
      .orderBy('_id', 'desc')
      .limit(limit);
  }

  /**
   * Writes an open review only if nobody has saved it since `version` was read. Returns false when
   * someone did, so the caller can say so instead of overwriting their work.
   */
  async updateOpenIfVersion(id: string, version: number, update: Partial<CurationReview>): Promise<boolean> {
    const changed = await this.query()
      .where({_id: id, status: 'open', version})
      .update({...serialize(update), version: version + 1, updatedAt: new Date()} as any);
    return Number(changed) > 0;
  }

  /** Writes that do not compete with a curator's save (the AI draft, being taken out of recommendations). */
  async updateWithId(id: string, update: Partial<CurationReview>): Promise<number> {
    return Number(
      await this.query()
        .where({_id: id})
        .update({...serialize(update), updatedAt: new Date()} as any),
    );
  }

  /**
   * Open reviews joined to their catalog row, for the curator queue: under review first, then those
   * a report opened, then oldest. Blocked rows are left out, and so are the curator's own family's
   * rows, which they may not answer.
   */
  async listOpenForQueue(excludePublicUserId: string, limit = 200): Promise<Record<string, any>[]> {
    const db = this.knex as unknown as Knex;
    return await db('curation_review as r')
      .join('published as p', 'p._id', 'r.publishedId')
      .select(
        'r._id as reviewId',
        'r.publishedId',
        'r.openReason',
        'r.underReview',
        'r.openedAt',
        db.raw(`r."aiDraft"->>'status' as "aiDraftStatus"`),
        'p.name',
        'p.imageFilename',
        'p.type',
      )
      .where('r.status', 'open')
      .whereNull('p.blockedAt')
      .where((qb) => qb.whereNull('p.publicUserId').orWhereNot('p.publicUserId', excludePublicUserId))
      .orderByRaw(`r."underReview" DESC, (r."openReason" = 'report') DESC, r."openedAt" ASC`)
      .limit(limit);
  }

  async countOpenByReasons(reasons: string[]): Promise<number> {
    const row: any = await this.query().where({status: 'open'}).whereIn('openReason', reasons).count().first();
    return Number(row?.count ?? 0);
  }

  /** Catalog rows whose last finished review said to check them again by now, soonest first. */
  async listPublishedDueForReview(limit: number): Promise<string[]> {
    const db = this.knex as unknown as Knex;
    const rows = await db('published as p')
      .select('p._id')
      .where('p.published', true)
      .where('p.visibilityCode', 2)
      .whereNull('p.blockedAt')
      .where('p.nextReviewAt', '<=', new Date())
      .whereNotExists(
        db('curation_review as r').select(db.raw('1')).whereRaw('r."publishedId" = p._id').where('r.status', 'open'),
      )
      .orderBy('p.nextReviewAt', 'asc')
      .limit(limit);
    return rows.map((row: any) => row._id);
  }

  /**
   * Curated, searchable catalog rows no review has ever looked at, most viewed first. This is how
   * the catalog that predates curation review gets reviewed, a few at a time.
   */
  async listCuratedNeverReviewed(limit: number): Promise<string[]> {
    const db = this.knex as unknown as Knex;
    const rows = await db('published as p')
      .select('p._id')
      .where('p.published', true)
      .where('p.visibilityCode', 2)
      .where('p.curated', true)
      .whereNull('p.blockedAt')
      .whereNull('p.nextReviewAt')
      .whereRaw('COALESCE(p."excludeFromSearch", false) = false')
      .whereNotExists(db('curation_review as r').select(db.raw('1')).whereRaw('r."publishedId" = p._id'))
      .orderByRaw('p."statViewCount" DESC NULLS LAST, p._id ASC')
      .limit(limit);
    return rows.map((row: any) => row._id);
  }

  async closeOpenForPublished(publishedId: string): Promise<number> {
    return Number(
      await this.query()
        .where({publishedId, status: 'open'})
        .update({status: 'closed', updatedAt: new Date()} as any),
    );
  }
}
