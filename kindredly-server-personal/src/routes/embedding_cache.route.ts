import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper} from '@/utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {HttpException} from '@/exceptions/HttpException';
import {EmbeddingVectorCacheRepo} from '@/db/embedding_vector_cache.repo';

import {
  MAX_GET_KEYS,
  MAX_MODEL_ID_LEN,
  MAX_PUT_ITEMS,
  normalizeCacheKeys,
  normalizeNamespace,
  requireString,
  validatePutItems,
} from '@/utils/embedding_cache_utils';

class EmbeddingCacheRoute implements Routes {
  public router = Router();

  private repo = new EmbeddingVectorCacheRepo();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    this.router.post(
      '/embeddingCache/get',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/embeddingCache/get'>, res) => {
        const ctx = RequestContext.instance(req);
        if (!ctx.accountId) throw new HttpException(401, 'Missing accountId');

        const namespace = normalizeNamespace(req.body.namespace);
        const modelId = requireString(req.body.modelId, 'modelId', {maxLen: MAX_MODEL_ID_LEN});
        const cacheKeys = normalizeCacheKeys(req.body.cacheKeys);
        if (cacheKeys.length > MAX_GET_KEYS) throw new HttpException(400, `Too many cacheKeys (max ${MAX_GET_KEYS})`);

        const rows = await this.repo.getMany({
          accountId: ctx.accountId,
          namespace,
          modelId,
          cacheKeys,
        });

        res.json({
          success: true,
          results: {
            items: rows.map((r) => ({
              cacheKey: r.cacheKey,
              embedding: r.embedding,
              dimensions: r.dimensions,
              updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
            })),
          },
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/embeddingCache/put',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/embeddingCache/put'>, res) => {
        const ctx = RequestContext.instance(req);
        if (!ctx.accountId) throw new HttpException(401, 'Missing accountId');

        const namespace = normalizeNamespace(req.body.namespace);
        const modelId = requireString(req.body.modelId, 'modelId', {maxLen: MAX_MODEL_ID_LEN});

        const items = validatePutItems(req.body.items);
        if (items.length > MAX_PUT_ITEMS) throw new HttpException(400, `Too many items (max ${MAX_PUT_ITEMS})`);

        const stored = await this.repo.upsertMany({
          accountId: ctx.accountId,
          namespace,
          modelId,
          items,
        });

        res.json({success: true, results: {stored}});
      }),
    );

    // SCH-OK
    this.router.post(
      '/embeddingCache/stats',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/embeddingCache/stats'>, res) => {
        const ctx = RequestContext.instance(req);
        if (!ctx.accountId) throw new HttpException(401, 'Missing accountId');

        const stats = await this.repo.getStats({
          accountId: ctx.accountId,
          namespace: req.body.namespace ? normalizeNamespace(req.body.namespace) : undefined,
          modelId: req.body.modelId
            ? requireString(req.body.modelId, 'modelId', {maxLen: MAX_MODEL_ID_LEN})
            : undefined,
        });

        res.json({success: true, results: stats});
      }),
    );

    // SCH-OK
    this.router.post(
      '/embeddingCache/clear',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/embeddingCache/clear'>, res) => {
        const ctx = RequestContext.instance(req);
        if (!ctx.accountId) throw new HttpException(401, 'Missing accountId');

        const deleted = await this.repo.clear({
          accountId: ctx.accountId,
          namespace: req.body.namespace ? normalizeNamespace(req.body.namespace) : undefined,
          modelId: req.body.modelId
            ? requireString(req.body.modelId, 'modelId', {maxLen: MAX_MODEL_ID_LEN})
            : undefined,
        });

        res.json({success: true, results: {deleted}});
      }),
    );
  }
}

export default EmbeddingCacheRoute;
