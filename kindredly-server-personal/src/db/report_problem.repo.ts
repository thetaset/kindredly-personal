import ReportProblem from 'tset-sharedlib/schemas/public/ReportProblem';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export class ReportProblemRepo extends BaseRepo<ReportProblem> {
  public jsonArrayFields = []; //['details', 'adminStatusInfo'];
  constructor(db: Knex = knex) {
    super('report_problem', db);
  }

  async findById(id: number) {
    return await this.where({_id: id}).first();
  }

  async findWhere(data: ReportProblem) {
    const result = await this.where(data);
    if (result.length == 1) {
      return result[0];
    } else if (result.length > 0) {
      throw new Error('Found more than one item');
    } else {
      return null;
    }
  }

  async updateWithId(id: number, update: ReportProblem) {
    return await this.where({_id: id}).update(this._updateInput(update));
  }

  async create(input: ReportProblem) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  async deleteWithId(id: number) {
    return await this.where({_id: id}).delete();
  }

  async findWhereIdIn(vals: number[]) {
    return await this.query().whereIn('_id', vals);
  }

  /** How many reports of a kind one person sent since a time. */
  async countForUserSince(userId: string, category: string, since: Date): Promise<number> {
    const row: any = await this.query()
      .where({userId, category})
      .andWhere('createdAt', '>', since)
      .count({count: '*'})
      .first();
    return Number(row?.count ?? 0);
  }

  /** Whether this person already reported into this curation review. */
  async userReportedReview(userId: string, reviewId: string): Promise<boolean> {
    return !!(await this.query().where({userId, curationReviewId: reviewId}).first());
  }

  /** Catalog reports from one account since a time that took an item out of recommendations. */
  async countPullsForAccountSince(accountId: string, since: Date): Promise<number> {
    const row: any = await this.query()
      .where({category: 'flagPublished'})
      .andWhere('createdAt', '>', since)
      .whereRaw(`"details"->>'accountId' = ?`, [accountId])
      .whereRaw(`"details"->>'pulled' = 'true'`)
      .count({count: '*'})
      .first();
    return Number(row?.count ?? 0);
  }

  /** The reports attached to curation reviews, oldest first. */
  async listForCurationReviews(reviewIds: string[]): Promise<ReportProblem[]> {
    if (reviewIds.length === 0) return [];
    return (await this.query()
      .whereIn('curationReviewId', reviewIds)
      .orderBy('createdAt', 'asc')
      .orderBy('_id', 'asc')) as any;
  }

  /** Marks every report a finished curation review answered as resolved. */
  async resolveForCurationReview(reviewId: string, info: Record<string, any>): Promise<number> {
    return Number(
      await this.query()
        .where({curationReviewId: reviewId})
        .update({adminStatus: 'resolved', adminStatusInfo: info} as any),
    );
  }

  async findLatestBySource(params: {
    category: string;
    sourceType: string;
    sourceId: string;
  }): Promise<ReportProblem | null> {
    return (await this.query()
      .where({
        category: params.category,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      })
      .orderBy('createdAt', 'desc')
      .orderBy('_id', 'desc')
      .first()) as any;
  }
}
