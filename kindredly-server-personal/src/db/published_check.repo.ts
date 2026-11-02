import PublishedCheck from 'tset-sharedlib/schemas/public/PublishedCheck';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

/** The jsonb columns, serialized explicitly so an array can never reach pg as a Postgres array. */
function serialize(row: Partial<PublishedCheck>): Record<string, any> {
  const out: Record<string, any> = {...row};
  for (const key of ['scriptHosts', 'findings'] as const) {
    if (key in out && out[key] !== null && out[key] !== undefined) out[key] = JSON.stringify(out[key]);
  }
  return out;
}

/** An item due for its daily read, with what the monitor saw last time. */
export type DueCatalogItem = {
  publishedId: string;
  name: string | null;
  url: string;
  feedUrl: string | null;
};

/** The catalog monitor's records: one current row per item and kind (MON-1). */
export class PublishedCheckRepo extends BaseRepo<PublishedCheck> {
  constructor(db: Knex = knex) {
    super('published_check', db);
  }

  async findForItem(publishedId: string): Promise<PublishedCheck[]> {
    if (!publishedId) return [];
    return await this.query().where({publishedId});
  }

  async findByIds(ids: string[]): Promise<PublishedCheck[]> {
    if (ids.length === 0) return [];
    return await this.query().whereIn('_id', ids);
  }

  async save(row: PublishedCheck): Promise<void> {
    await this.query().insert(serialize(row)).onConflict('_id').merge();
  }

  /**
   * Catalog items whose page is due: public, published, not blocked or archived, with an address;
   * never read first, then the longest overdue. Families see these, so these are what to watch.
   */
  async listDue(limit: number, now: Date = new Date()): Promise<DueCatalogItem[]> {
    const rows = await this.db('published as p')
      .leftJoin('published_check as c', function () {
        this.on('c.publishedId', '=', 'p._id').andOn('c.kind', '=', knex.raw('?', ['page']));
      })
      .select(
        'p._id as publishedId',
        'p.name as name',
        knex.raw(`COALESCE(p.data->>'url', p.meta->>'url') as url`),
        // The first feed's address (`ItemFeed.feedURL`); `url` there is the feed's home page.
        knex.raw(`p.info->'feeds'->0->>'feedURL' as "feedUrl"`),
      )
      .where('p.published', true)
      .where('p.visibilityCode', 2)
      .whereNull('p.blockedAt')
      .whereNull('p.archivedAt')
      // What search offers; a feed's own posts are rows too, and are not watched one by one.
      .whereRaw('COALESCE(p."excludeFromSearch", false) = false')
      // No `?` in the pattern: knex reads it as a placeholder.
      .whereRaw(`COALESCE(p.data->>'url', p.meta->>'url') ~* '^(http|https)://'`)
      .where((q) => q.whereNull('c.nextCheckAt').orWhere('c.nextCheckAt', '<=', now))
      .orderByRaw('c."nextCheckAt" ASC NULLS FIRST')
      .limit(limit);
    return rows.map((row: any) => ({
      publishedId: row.publishedId,
      name: row.name ?? null,
      url: row.url,
      feedUrl: row.feedUrl || null,
    }));
  }
}
