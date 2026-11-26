import {HttpException} from '@/exceptions/HttpException';
import {RequestContext} from '@/base/request_context';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import {publishedReader, type PublishedReader} from '@/services/published_access';
import {isRecommendable} from 'tset-sharedlib/publish.rules';
import {
  BLOCK_PAGE_PUBLISHED_ITEMS_MAX,
  blockPageItemFromPublished,
  sanitizeBlockPageDefaults,
  type BlockPageDefaultEntry,
  type BlockPageDefaults,
  type BlockPageDefaultsForDevices,
} from 'tset-sharedlib/inspiration/blockPageDefaults';
import type {InspirationItem} from 'tset-sharedlib/inspiration/inspiration';
import type {AdminBlockPageDefaultsResponse} from 'tset-sharedlib/api/api-route-map';

/** One row in `sys_info`, like the setup catalog's. */
const SYS_INFO_ID = 'block_page_defaults';
/**
 * How long the devices' answer is reused: a published collection's items change without a save
 * here, and every block page on every device asks at most once a day, so this only spares the
 * database a read per device.
 */
const DEVICES_CACHE_MS = 10 * 60 * 1000;
const MAX_COLLECTIONS = 30;

/**
 * Kindredly's default collections for Block page customization (HAT-1268): chosen on the admin
 * page, read by every device with the catalog. Nothing saved means what ships. The admin routes
 * live in `_internal/admin.route.ts`; the public read in `block_page.route.ts`, which a box
 * registers too and answers with no choice (its published reader is empty and nothing is saved).
 */
export class BlockPageDefaultsService {
  private sysInfo = new SysInfoRepo();
  private reader: PublishedReader | null = null;
  private devicesCache: {at: number; value: BlockPageDefaultsForDevices} | null = null;

  private published(): PublishedReader {
    if (!this.reader) this.reader = publishedReader();
    return this.reader;
  }

  async getDefaults(): Promise<BlockPageDefaults | null> {
    const row = await this.sysInfo.findById(SYS_INFO_ID);
    return sanitizeBlockPageDefaults(row?.data ?? null);
  }

  /** A published collection's items that anyone may see, made into pictures and notes. */
  private async publishedItems(id: string): Promise<InspirationItem[]> {
    // Signed out on purpose: a default reaches every family, so only what is public may show.
    const anyone = new RequestContext({request: {}});
    // Twice what is kept, since some rows are held for review or have nothing to show.
    const rows = await this.published()
      .getCollectionItemFeed(anyone, id, BLOCK_PAGE_PUBLISHED_ITEMS_MAX * 2)
      .catch(() => []);
    return rows
      .filter(isRecommendable)
      .map((row) => blockPageItemFromPublished(row as any))
      .filter((item): item is InspirationItem => !!item)
      .slice(0, BLOCK_PAGE_PUBLISHED_ITEMS_MAX);
  }

  async getForDevices(): Promise<BlockPageDefaultsForDevices> {
    const now = Date.now();
    if (this.devicesCache && now - this.devicesCache.at < DEVICES_CACHE_MS) return this.devicesCache.value;
    const defaults = await this.getDefaults();
    const ids = (defaults?.collections ?? []).filter((c) => c.source === 'published').map((c) => c.id);
    // Every collection at once: a choice of thirty must not be thirty reads one after another.
    const lists = await Promise.all(ids.map((id) => this.publishedItems(id)));
    const published: Record<string, InspirationItem[]> = Object.fromEntries(ids.map((id, i) => [id, lists[i]]));
    const value = {defaults, published};
    this.devicesCache = {at: now, value};
    return value;
  }

  /**
   * The admin page's view. The counts come from the devices' answer, so the reads it makes also
   * fill the cache a device asks next, and a save is counted once, not once here and again there.
   */
  async getAdmin(): Promise<AdminBlockPageDefaultsResponse> {
    const {defaults, published: items} = await this.getForDevices();
    const published: AdminBlockPageDefaultsResponse['published'] = {};
    const ids = (defaults?.collections ?? []).filter((c) => c.source === 'published').map((c) => c.id);
    const rows = ids.length
      ? await this.published()
          .getPublishedWithIds(ids)
          .catch(() => [])
      : [];
    for (const entry of defaults?.collections ?? []) {
      if (entry.source !== 'published') continue;
      const row = rows.find((r) => r._id === entry.id);
      published[entry.id] = row
        ? {name: row.name || entry.name, shown: items[entry.id]?.length ?? 0}
        : {name: entry.name, shown: 0, missing: true};
    }
    return {defaults, published};
  }

  async save(input: {collections?: unknown}): Promise<AdminBlockPageDefaultsResponse> {
    const list = Array.isArray(input?.collections) ? input.collections : null;
    if (!list || list.length === 0 || list.length > MAX_COLLECTIONS) {
      throw new HttpException(400, `Choose between 1 and ${MAX_COLLECTIONS} collections`);
    }
    const defaults = sanitizeBlockPageDefaults({revision: String(Date.now()), collections: list});
    if (!defaults || defaults.collections.length !== list.length) {
      throw new HttpException(400, 'Each collection needs its kind, id, a name when published, and who it is on for');
    }
    const publishedIds = defaults.collections
      .filter((c): c is Extract<BlockPageDefaultEntry, {source: 'published'}> => c.source === 'published')
      .map((c) => c.id);
    if (publishedIds.length) {
      const rows = await this.published().getPublishedWithIds(publishedIds);
      const found = new Set(rows.filter((r) => r.type === 'col' && r.visibilityCode === 2).map((r) => r._id));
      const notPublic = publishedIds.filter((id) => !found.has(id));
      if (notPublic.length) {
        throw new HttpException(400, `Not a public published collection: ${notPublic.join(', ')}`);
      }
    }
    await this.sysInfo.create({_id: SYS_INFO_ID, data: defaults} as any);
    this.devicesCache = null;
    return this.getAdmin();
  }

  async reset(): Promise<AdminBlockPageDefaultsResponse> {
    await this.sysInfo.deleteWithId(SYS_INFO_ID);
    this.devicesCache = null;
    return this.getAdmin();
  }
}

/** One per process, so a save on the admin page clears the cache the public route reads. */
export const blockPageDefaultsService = new BlockPageDefaultsService();
