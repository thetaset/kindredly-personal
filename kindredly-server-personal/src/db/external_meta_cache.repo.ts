import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';
import type {ExternalMetaCacheEntry, ExternalResourceType} from 'tset-sharedlib/types/cache.types';
import crypto from 'crypto';

/**
 * Repository for external_meta_cache table
 * Handles caching of metadata from external APIs (YouTube, Reddit, etc.)
 */
export class ExternalMetaCacheRepo extends BaseRepo<ExternalMetaCacheEntry> {
  constructor(db: Knex = knex) {
    super('external_meta_cache', db);
  }

  /**
   * Generate consistent cache ID from resourceType and externalId
   */
  static generateCacheId(resourceType: string, externalId: string): string {
    const key = `${resourceType}:${externalId}`;
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 64);
  }

  /**
   * Find cache entry by external ID and resource type
   */
  async getByExternalId(
    resourceType: ExternalResourceType,
    externalId: string,
  ): Promise<ExternalMetaCacheEntry | null> {
    const result = await this.query().where({resourceType, externalId}).first();
    return result || null;
  }

  /**
   * Find cache entry by generated ID
   */
  async getById(id: string): Promise<ExternalMetaCacheEntry | null> {
    const result = await this.query().where('_id', id).first();
    return result || null;
  }

  /**
   * Find all children by parent external ID (e.g., all videos for a channel)
   */
  async getByParentId(resourceType: ExternalResourceType, parentExternalId: string): Promise<ExternalMetaCacheEntry[]> {
    return await this.query().where({resourceType, parentExternalId});
  }

  /**
   * Find cache entry by canonical URL
   */
  async getByCanonicalUrl(canonicalUrl: string): Promise<ExternalMetaCacheEntry | null> {
    const result = await this.query().where({canonicalUrl}).first();
    return result || null;
  }

  /**
   * Upsert cache entry (insert or update on conflict)
   */
  async upsert(entry: ExternalMetaCacheEntry): Promise<ExternalMetaCacheEntry> {
    // Generate ID if not provided
    if (!entry._id && entry.resourceType && entry.externalId) {
      entry._id = ExternalMetaCacheRepo.generateCacheId(entry.resourceType, entry.externalId);
    }

    // Ensure timestamps
    const now = new Date();
    entry.updatedAt = now;
    if (!entry.createdAt) {
      entry.createdAt = now;
    }

    const result = await this.query()
      .insert(entry as any)
      .onConflict('_id')
      .merge({
        meta: entry.meta,
        extendedInfo: entry.extendedInfo,
        sourceId: entry.sourceId,
        fetchedAt: entry.fetchedAt,
        expiresAt: entry.expiresAt,
        updatedAt: now,
        fetchCount: this.db.raw('COALESCE(external_meta_cache."fetchCount", 0) + 1'),
      })
      .returning('*');

    return result[0] as ExternalMetaCacheEntry;
  }

  /**
   * Update fetch count (touch) without changing other data
   */
  async touch(id: string): Promise<void> {
    await this.query()
      .where({_id: id})
      .update({
        fetchCount: this.db.raw('"fetchCount" + 1'),
        updatedAt: new Date(),
      });
  }

  /**
   * Delete expired cache entries
   * Returns number of deleted rows
   */
  async deleteExpired(): Promise<number> {
    const result = await this.query().where('expiresAt', '<', new Date()).whereNotNull('expiresAt').delete();
    return result;
  }

  /**
   * Delete cache entry by ID
   */
  async deleteById(id: string): Promise<void> {
    await this.query().where('_id', id).delete();
  }

  /**
   * Delete cache entries by resource type and external ID
   */
  async deleteByExternalId(resourceType: ExternalResourceType, externalId: string): Promise<void> {
    await this.query().where({resourceType, externalId}).delete();
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    byResourceType: Record<string, number>;
  }> {
    const [totalResult, expiredResult, byTypeResult] = await Promise.all([
      this.query().count('* as count').first(),
      this.query().where('expiresAt', '<', new Date()).whereNotNull('expiresAt').count('* as count').first(),
      this.query().select('resourceType').count('* as count').groupBy('resourceType'),
    ]);

    const byResourceType: Record<string, number> = {};
    for (const row of byTypeResult as any[]) {
      byResourceType[row.resourceType] = Number(row.count);
    }

    return {
      totalEntries: Number((totalResult as any)?.count || 0),
      expiredEntries: Number((expiredResult as any)?.count || 0),
      byResourceType,
    };
  }

  /**
   * Check if entry exists and is fresh (not expired)
   */
  async isFresh(resourceType: ExternalResourceType, externalId: string): Promise<boolean> {
    const entry = await this.getByExternalId(resourceType, externalId);
    if (!entry) return false;
    if (!entry.expiresAt) return true; // No expiry means always fresh
    return new Date(entry.expiresAt) > new Date();
  }
}
