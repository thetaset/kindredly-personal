import {BaseRepo} from './base.repo';
import knex from './knex_config';
import {Knex} from 'knex';
import crypto from 'crypto';

export type EmbeddingVectorCacheEntry = {
  _id: string;
  accountId: string;
  namespace: string;
  modelId: string;
  cacheKey: string;
  embedding: number[];
  dimensions: number;
  createdAt: Date;
  updatedAt: Date;
};

export class EmbeddingVectorCacheRepo extends BaseRepo<EmbeddingVectorCacheEntry> {
  constructor(db: Knex = knex) {
    super('embedding_vector_cache', db);
  }

  static generateId(params: {accountId: string; namespace: string; modelId: string; cacheKey: string}): string {
    const key = `${params.accountId}:${params.namespace}:${params.modelId}:${params.cacheKey}`;
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 64);
  }

  async getMany(params: {
    accountId: string;
    namespace: string;
    modelId: string;
    cacheKeys: string[];
  }): Promise<EmbeddingVectorCacheEntry[]> {
    if (!params.cacheKeys.length) return [];

    return await this.query()
      .where({
        accountId: params.accountId,
        namespace: params.namespace,
        modelId: params.modelId,
      })
      .whereIn('cacheKey', params.cacheKeys);
  }

  async upsertMany(params: {
    accountId: string;
    namespace: string;
    modelId: string;
    items: Array<{cacheKey: string; embedding: number[]; dimensions?: number}>;
  }): Promise<number> {
    if (!params.items.length) return 0;

    const now = new Date();
    const rows = params.items.map((item) => {
      const dimensions = item.dimensions ?? item.embedding.length;
      const namespace = params.namespace || 'default';
      const modelId = params.modelId;
      const accountId = params.accountId;
      const cacheKey = item.cacheKey;
      const _id = EmbeddingVectorCacheRepo.generateId({accountId, namespace, modelId, cacheKey});
      return {
        _id,
        accountId,
        namespace,
        modelId,
        cacheKey,
        embedding: item.embedding,
        dimensions,
        createdAt: now,
        updatedAt: now,
      };
    });

    await this.query()
      .insert(rows as any)
      .onConflict('_id')
      .merge({
        embedding: this.db.raw('EXCLUDED."embedding"'),
        dimensions: this.db.raw('EXCLUDED."dimensions"'),
        updatedAt: now,
      });

    return rows.length;
  }

  async clear(params: {accountId: string; namespace?: string; modelId?: string}): Promise<number> {
    const q = this.query().where({accountId: params.accountId});
    if (params.namespace) q.andWhere({namespace: params.namespace});
    if (params.modelId) q.andWhere({modelId: params.modelId});
    return await q.delete();
  }

  async getStats(params: {accountId: string; namespace?: string; modelId?: string}): Promise<{
    totalEntries: number;
    byModelId: Record<string, number>;
    byNamespace: Record<string, number>;
  }> {
    const base = this.query().where({accountId: params.accountId});
    if (params.namespace) base.andWhere({namespace: params.namespace});
    if (params.modelId) base.andWhere({modelId: params.modelId});

    const [totalResult, byModel, byNamespace] = await Promise.all([
      base.clone().count('* as count').first(),
      base.clone().select('modelId').count('* as count').groupBy('modelId'),
      base.clone().select('namespace').count('* as count').groupBy('namespace'),
    ]);

    const totalEntries = Number((totalResult as any)?.count || 0);
    const byModelId = Object.fromEntries((byModel as any[]).map((row) => [row.modelId, Number(row.count)]));
    const byNamespaceMap = Object.fromEntries((byNamespace as any[]).map((row) => [row.namespace, Number(row.count)]));

    return {totalEntries, byModelId, byNamespace: byNamespaceMap};
  }
}
