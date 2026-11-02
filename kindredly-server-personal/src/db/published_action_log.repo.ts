import PublishedActionLog from 'tset-sharedlib/schemas/public/PublishedActionLog';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

/** The jsonb column, serialized explicitly so an array value can never reach pg as a Postgres array. */
function serialize(row: Partial<PublishedActionLog>): Record<string, any> {
  const out: Record<string, any> = {...row};
  if ('detail' in out && out.detail !== null && out.detail !== undefined) out.detail = JSON.stringify(out.detail);
  return out;
}

/** What curators did to catalog items, newest first per item (CWS-3). */
export class PublishedActionLogRepo extends BaseRepo<PublishedActionLog> {
  constructor(db: Knex = knex) {
    super('published_action_log', db);
  }

  async insertRow(row: PublishedActionLog): Promise<void> {
    await this.query().insert(serialize(row));
  }

  async listForItem(publishedId: string, limit: number): Promise<PublishedActionLog[]> {
    if (!publishedId) return [];
    return await this.query().where({publishedId}).orderBy('createdAt', 'desc').limit(limit);
  }
}
