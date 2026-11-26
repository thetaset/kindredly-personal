import Item from 'tset-sharedlib/schemas/public/Item';
import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';

export class ItemRepo extends BaseRepo<Item> {
  public jsonArrayFields = ['useCriteria', 'tags', 'patterns', 'categories', 'kinds'];
  constructor(db: Knex = knex) {
    super('item', db);
  }
  async findById(id: string): Promise<Item> {
    return await this.where({_id: id}).first();
  }

  async findWhere(data: Partial<Item>): Promise<Item> {
    const result = await this.where(data);
    if (result.length == 1) {
      return result[0];
    } else if (result.length > 0) {
      throw new Error('Found more than one item');
    } else {
      return null;
    }
  }

  async updateWithId(id: string, update: Item) {
    if (update.userId) {
      delete update.userId;
    }
    return await this.where({_id: id}).update(this._updateInput(update));
  }

  async updateOwner(id: string, ownerUserId: string) {
    return await this.where({_id: id}).update({userId: ownerUserId, updatedAt: new Date()});
  }

  async create(input: Item) {
    return (await this.query().insert(this._updateInput(input)).onConflict('_id').merge().returning('*')) as any;
  }

  /**
   * Inserts the row only if no row has its `_id`, and answers whether it did. For an id chosen
   * before the save (a device's `newItemId`, a post attachment's copy), where `create`'s merge
   * would let a second save write over the first one's row.
   */
  async createIfAbsent(input: Item): Promise<boolean> {
    const rows = await this.query().insert(this._updateInput(input)).onConflict('_id').ignore().returning('_id');
    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Updates the row only if its `updatedAt` is not later than `since`, compared to the
   * millisecond, and answers how many rows changed (0 or 1). `node-pg` drops the microseconds of a
   * stored time on the way out, so the time a client sends back is the stored one truncated,
   * never later than it. Same rule as `SubscriptionRepo.updateWithIdIfUnchangedSince`.
   */
  async updateWithIdIfUnchangedSince(id: string, update: Item, since: Date): Promise<number> {
    if (update.userId) {
      delete update.userId;
    }
    return await this.query()
      .where({_id: id})
      .andWhereRaw(`date_trunc('milliseconds', "updatedAt") <= ?::timestamptz`, [since.toISOString()])
      .update(this._updateInput(update));
  }

  async deleteWithId(id: string) {
    return await this.where({_id: id}).delete();
  }

  async findWhereIdIn(vals: string[]) {
    return await this.query().whereIn('_id', vals);
  }

  /**
   * Which of these picture names (`uf_<fileId>`) some item still shows. Reads the plaintext column
   * only: an sv:2 item keeps its picture name in the encrypted blob, out of the server's sight.
   */
  async listImageFilenamesInUse(names: string[]): Promise<Set<string>> {
    if (!names.length) return new Set();
    const rows = (await this.query().whereIn('imageFilename', names).select('imageFilename')) as Array<{
      imageFilename: string;
    }>;
    return new Set(rows.map((r) => r.imageFilename));
  }

  async findWhereIdInAndInAccount(vals: string[], accountId: string, keyCol = '_id'): Promise<Item[]> {
    if (!accountId) throw new Error('accountId is required');
    return await this.query().whereIn(keyCol, vals).andWhere({accountId});
  }

  async getItemsByIds(accountId: string, ids: string[]) {
    if (!ids) return [];
    const results = await this.findWhereIdInAndInAccount(ids, accountId);
    return results;
  }

  /**
   * Find all items that reference a specific fileId in their attachments
   * Used for reference counting before deleting files
   */
  async findItemsWithFileId(fileId: string): Promise<Item[]> {
    // Query items where attachments.entries contains an object with the specified fileId
    // Using PostgreSQL JSONB operators
    return await this.query().whereRaw(`attachments->'entries' @> ?::jsonb`, [JSON.stringify([{fileId}])]);
  }
}
