import CurationReviewSignoff from 'tset-sharedlib/schemas/public/CurationReviewSignoff';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';
import {HttpException} from '@/exceptions/HttpException';

/** The jsonb column, serialized explicitly so an array value can never reach pg as a Postgres array. */
function serialize(update: Partial<CurationReviewSignoff>): Record<string, any> {
  const out: Record<string, any> = {...update};
  if ('answers' in out && out.answers !== null && out.answers !== undefined) out.answers = JSON.stringify(out.answers);
  return out;
}

/** Postgres' code for a unique-index conflict. */
const UNIQUE_VIOLATION = '23505';

/**
 * One curator's own answers to a curation review. A review is decided from these
 * (tset-sharedlib/src/curation.signoff.ts); the review row holds only what the curators agreed on.
 *
 * Deciding a review reads and writes several of these at once, so every statement goes through
 * `this.query()`: `withTransaction(trx)` then binds the whole repo to one transaction.
 */
export class CurationReviewSignoffRepo extends BaseRepo<CurationReviewSignoff> {
  constructor(db: Knex = knex) {
    super('curation_review_signoff', db);
  }

  inTransaction(trx: Knex.Transaction): CurationReviewSignoffRepo {
    return this.withTransaction(trx) as CurationReviewSignoffRepo;
  }

  async findById(id: string): Promise<CurationReviewSignoff | null> {
    if (!id) return null;
    return (await this.query().where({_id: id}).first()) ?? null;
  }

  async findMine(reviewId: string, curatorId: string): Promise<CurationReviewSignoff | null> {
    if (!reviewId || !curatorId) return null;
    return (await this.query().where({reviewId, curatorId}).first()) ?? null;
  }

  async listForReview(reviewId: string): Promise<CurationReviewSignoff[]> {
    return await this.query().where({reviewId}).orderBy('createdAt', 'asc');
  }

  async listForReviews(reviewIds: string[]): Promise<CurationReviewSignoff[]> {
    if (reviewIds.length === 0) return [];
    return await this.query().whereIn('reviewId', reviewIds);
  }

  /**
   * Starts this curator's sign-off. Two tabs opening the same review race here, and the unique
   * index settles it: the second gets a 409 rather than a second sign-off or a 500.
   */
  async insertDraft(row: CurationReviewSignoff): Promise<CurationReviewSignoff> {
    try {
      await this.query().insert(serialize(row) as any);
    } catch (err: any) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new HttpException(409, 'You started this review somewhere else. Reload to see it.');
      }
      throw err;
    }
    const saved = await this.findMine(row.reviewId!, row.curatorId!);
    if (!saved) throw new Error('The sign-off could not be started.');
    return saved;
  }

  /**
   * Writes a draft only if nobody has saved it since `version` was read. Returns false when someone
   * did, or when it is no longer a draft, so the caller can say so instead of overwriting.
   */
  async updateDraftIfVersion(id: string, version: number, update: Partial<CurationReviewSignoff>): Promise<boolean> {
    const changed = await this.query()
      .where({_id: id, status: 'draft', version})
      .update({...serialize(update), version: version + 1, updatedAt: new Date()} as any);
    return Number(changed) > 0;
  }

  /** Writes that do not compete with a curator's save. */
  async updateWithId(id: string, update: Partial<CurationReviewSignoff>): Promise<number> {
    return Number(
      await this.query()
        .where({_id: id})
        .update({...serialize(update), updatedAt: new Date()} as any),
    );
  }

  /** A curator's finished answers go back to a draft: to change them, or because the item changed. */
  async reopenFinished(id: string): Promise<boolean> {
    const changed = await this.query()
      .where({_id: id, status: 'finished'})
      .update({status: 'draft', finishedAt: null, updatedAt: new Date()} as any);
    return Number(changed) > 0;
  }

  /** Another curator decided the review: the drafts nobody finished are marked, never deleted. */
  async supersedeDrafts(reviewId: string): Promise<number> {
    return Number(
      await this.query()
        .where({reviewId, status: 'draft'})
        .update({status: 'superseded', updatedAt: new Date()} as any),
    );
  }

  /** How many curators have finished, per review. */
  async countFinishedByReview(reviewIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (reviewIds.length === 0) return counts;
    const rows: any[] = await this.query()
      .select('reviewId')
      .count({count: '_id'})
      .whereIn('reviewId', reviewIds)
      .where({status: 'finished'})
      .groupBy('reviewId');
    for (const row of rows) counts.set(row.reviewId, Number(row.count));
    return counts;
  }
}
