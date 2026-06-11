jest.mock('@/db/published.repo', () => ({
  PublishedRepo: jest.fn(),
}));

jest.mock('@/db/external_meta_cache.repo', () => ({
  ExternalMetaCacheRepo: jest.fn(),
}));

import {ItemResourceType} from 'tset-sharedlib/constants';
import {ExternalMetaCacheRepo} from '@/db/external_meta_cache.repo';
import {PublishedRepo} from '@/db/published.repo';
import ExternalMetaCacheService from '@/services/external_meta_cache.service';

describe('ExternalMetaCacheService published lookups', () => {
  let publishedRepo: {findMany: jest.Mock};
  let cacheRepo: {
    getByExternalId: jest.Mock;
    touch: jest.Mock;
    createOrUpdate: jest.Mock;
    getByParentId: jest.Mock;
    invalidateByResource: jest.Mock;
    deleteExpired: jest.Mock;
    getStats: jest.Mock;
    query: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    publishedRepo = {
      findMany: jest.fn(),
    };

    cacheRepo = {
      getByExternalId: jest.fn(),
      touch: jest.fn(),
      createOrUpdate: jest.fn(),
      getByParentId: jest.fn(),
      invalidateByResource: jest.fn(),
      deleteExpired: jest.fn(),
      getStats: jest.fn(),
      query: jest.fn(),
    };
    (PublishedRepo as unknown as jest.Mock).mockImplementation(() => publishedRepo);
    (ExternalMetaCacheRepo as unknown as jest.Mock).mockImplementation(() => cacheRepo);
  });

  function mockPublishedItems(items: any[]) {
    const chain = {
      where: jest.fn(),
    };

    chain.where.mockImplementationOnce(() => chain).mockImplementationOnce(() => Promise.resolve(items));

    publishedRepo.findMany.mockReturnValue(chain);
  }

  it('prefers curated published rows and normalizes external lookup hints into extendedInfo', async () => {
    mockPublishedItems([
      {
        _id: 'pub_regular',
        curated: false,
        published: true,
        name: 'Regular title',
        meta: {
          url: 'https://www.youtube.com/watch?v=abc123xyz00',
          title: 'Regular title',
          tsExtractedInfo: {
            pageType: ItemResourceType.YT_VIDEO,
          },
        },
        info: {
          externalLookup: {
            ageRestricted: true,
            madeForKids: false,
            categoryIds: ['24'],
          },
        },
      },
      {
        _id: 'pub_curated',
        curated: true,
        published: true,
        name: 'Curated fallback title',
        description: 'Curated fallback description',
        curationStatus: 'approved',
        categories: ['cat_education'],
        meta: {
          url: 'https://www.youtube.com/watch?v=abc123xyz00',
          tsExtractedInfo: {
            pageType: ItemResourceType.YT_VIDEO,
          },
        },
        info: {
          externalLookup: {
            ageRestricted: false,
            madeForKids: true,
            categoryIds: ['27'],
            contentRatingDetails: {
              ytRating: 'ytAgeRestricted',
            },
          },
        },
      },
    ]);

    const service = new ExternalMetaCacheService();
    const result = await service.getCachedOrFetch('https://www.youtube.com/watch?v=abc123xyz00');

    expect(result.fromCache).toBe(true);
    expect(result.source).toBe('published_curated');
    expect(result.meta).toEqual(
      expect.objectContaining({
        title: 'Curated fallback title',
        description: 'Curated fallback description',
        tsExtractedInfo: expect.objectContaining({
          sourceId: 'published_curated',
        }),
      }),
    );
    expect(result.extendedInfo).toEqual(
      expect.objectContaining({
        ageRestricted: false,
        madeForKids: true,
        categoryIds: ['27'],
        contentRatingDetails: {ytRating: 'ytAgeRestricted'},
        source: 'published',
        rawData: expect.objectContaining({
          publishedId: 'pub_curated',
          curationStatus: 'approved',
          categories: ['cat_education'],
        }),
      }),
    );
  });

  it('prefers canonical info.externalLookup and falls back to legacy fields only for missing signals', async () => {
    mockPublishedItems([
      {
        _id: 'pub_legacy_mix',
        curated: true,
        published: true,
        name: 'Legacy compatibility row',
        meta: {
          url: 'https://www.youtube.com/watch?v=abc123xyz00',
          tsExtractedInfo: {
            pageType: ItemResourceType.YT_VIDEO,
          },
        },
        info: {
          externalLookup: {
            madeForKids: true,
          },
        },
        sourceInfo: {
          externalLookup: {
            madeForKids: false,
            ageRestricted: true,
          },
        },
        sysInfo: {
          externalMeta: {
            categoryIds: ['17'],
          },
        },
      },
    ]);

    const service = new ExternalMetaCacheService();
    const result = await service.getCachedOrFetch('https://www.youtube.com/watch?v=abc123xyz00');

    expect(result.extendedInfo).toEqual(
      expect.objectContaining({
        madeForKids: true,
        ageRestricted: true,
        categoryIds: ['17'],
        source: 'published',
      }),
    );
  });

  it('still reads legacy manifest compatibility fields when canonical info.externalLookup is absent', async () => {
    mockPublishedItems([
      {
        _id: 'pub_manifest_legacy',
        curated: true,
        published: true,
        name: 'Manifest legacy row',
        meta: {
          url: 'https://www.youtube.com/watch?v=abc123xyz00',
          tsExtractedInfo: {
            pageType: ItemResourceType.YT_VIDEO,
          },
          tsManifest: {
            resourceHints: {
              ageRestricted: false,
              madeForKids: true,
              categoryIds: ['22'],
            },
          },
        },
      },
    ]);

    const service = new ExternalMetaCacheService();
    const result = await service.getCachedOrFetch('https://www.youtube.com/watch?v=abc123xyz00');

    expect(result.extendedInfo).toEqual(
      expect.objectContaining({
        ageRestricted: false,
        madeForKids: true,
        categoryIds: ['22'],
        source: 'published',
      }),
    );
  });
});
