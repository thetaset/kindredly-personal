import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import type {ApiReq} from '@/types/api-types';
import type {
  BannerAsset,
  BannerCatalogSearchRequest,
  BannerCatalogSearchResponse,
  BannerRecommendResponse,
} from 'tset-sharedlib/api/api-types';

const CURATED_BANNERS: BannerAsset[] = [
  {
    id: 'animals-lion-1',
    title: 'Lion (Warm)',
    filename: 'banners/animals/lion-1.jpg',
    thumbFilename: 'banners/animals/lion-1-thumb.jpg',
    categories: ['animals'],
    tags: ['lion', 'animal', 'savanna', 'gold', 'warm'],
  },
  {
    id: 'space-nebula-1',
    title: 'Nebula (Purple)',
    filename: 'banners/space/nebula-1.jpg',
    thumbFilename: 'banners/space/nebula-1-thumb.jpg',
    categories: ['space'],
    tags: ['space', 'nebula', 'stars', 'purple', 'cosmic'],
  },
  {
    id: 'nature-forest-1',
    title: 'Forest (Green)',
    filename: 'banners/nature/forest-1.jpg',
    thumbFilename: 'banners/nature/forest-1-thumb.jpg',
    categories: ['nature'],
    tags: ['nature', 'forest', 'trees', 'green', 'calm'],
  },
  {
    id: 'abstract-gradient-1',
    title: 'Gradient (Soft)',
    filename: 'banners/abstract/gradient-1.jpg',
    thumbFilename: 'banners/abstract/gradient-1-thumb.jpg',
    categories: ['abstract'],
    tags: ['abstract', 'gradient', 'soft', 'minimal'],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeCategories(items: BannerAsset[]): BannerCatalogSearchResponse['categories'] {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const category of item.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({key, label: key, count}));
}

function searchCatalog(request: BannerCatalogSearchRequest): BannerCatalogSearchResponse {
  const q = typeof request.q === 'string' ? normalizeText(request.q) : '';
  const category = typeof request.category === 'string' ? normalizeText(request.category) : '';
  const tag = typeof request.tag === 'string' ? normalizeText(request.tag) : '';
  const pageSize = Number.isFinite(request.pageSize) ? Math.max(1, Math.min(100, Number(request.pageSize))) : 24;
  const page = Number.isFinite(request.page) ? Math.max(1, Number(request.page)) : 1;

  const filtered = CURATED_BANNERS.filter((item) => {
    if (category && !item.categories.some((c) => normalizeText(c) === category)) return false;
    if (tag && !item.tags.some((t) => normalizeText(t) === tag)) return false;

    if (!q) return true;

    const haystack = normalizeText([item.title, ...item.categories, ...item.tags].join(' '));
    return haystack.includes(q);
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    categories: computeCategories(CURATED_BANNERS),
  };
}

class MediaBannerRoute implements Routes {
  public router = Router();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/media/banner/search',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/media/banner/search'>, res) => {
        const result = searchCatalog(req.body);
        res.json({success: true, result});
      }),
    );

    this.router.post(
      '/media/banner/recommend',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/media/banner/recommend'>, res) => {
        const kind = req.body?.context?.kind;
        const name = req.body?.context?.name;

        const q = typeof name === 'string' ? name : '';
        const searchResult = searchCatalog({q, page: 1, pageSize: 12});

        const result: BannerRecommendResponse = {
          items: searchResult.items,
        };

        // (Stub) In the future, this endpoint can use embeddings and return higher-quality results.
        // `kind` is intentionally unused in v1.
        void kind;

        res.json({success: true, result});
      }),
    );
  }
}

export default MediaBannerRoute;
