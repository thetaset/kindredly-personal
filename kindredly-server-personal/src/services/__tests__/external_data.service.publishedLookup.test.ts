import {ItemResourceType} from 'tset-sharedlib/constants';
import type {RequestContext} from '@/base/request_context';
import ExternalDataService from '@/services/external_data.service';

describe('ExternalDataService published-backed lookups', () => {
  function makeService() {
    const service = new ExternalDataService();
    const metaCacheService = {
      getResourceInfoWithCache: jest.fn(),
      getCachedOrFetch: jest.fn(),
      getNegativeClassification: jest.fn(),
      storeNegativeClassification: jest.fn(),
    };

    (service as any).metaCacheService = metaCacheService;
    (service as any).contentModerationService = {
      checkContent: jest.fn(),
    };

    return {
      service,
      metaCacheService,
    };
  }

  function makeCtx(): RequestContext {
    return {
      currentUserId: 'user-1',
      accountId: 'acct-1',
    } as RequestContext;
  }

  it('returns published-backed resource info when extended lookup data exists', async () => {
    const {service, metaCacheService} = makeService();

    metaCacheService.getResourceInfoWithCache.mockResolvedValue({
      resourceType: ItemResourceType.YT_VIDEO,
      meta: {
        title: 'Published video',
        tsExtractedInfo: {
          channelId: 'UC123',
        },
      },
      extendedInfo: {
        ageRestricted: false,
        madeForKids: false,
        source: 'published',
      },
      fromCache: true,
    });

    const result = await service.getResourceInfo({
      url: 'https://www.youtube.com/watch?v=abc123xyz00',
    });

    expect(result).toEqual({
      rtype: ItemResourceType.YT_VIDEO,
      contentInfo: null,
      meta: {
        channelId: 'UC123',
        ageRestricted: false,
        madeForKids: false,
        title: 'Published video',
      },
    });
  });

  it('short-circuits classification from published-backed age restriction metadata', async () => {
    const {service, metaCacheService} = makeService();

    metaCacheService.getNegativeClassification.mockResolvedValue({
      hit: false,
      data: null,
    });
    metaCacheService.getCachedOrFetch.mockResolvedValue({
      meta: {
        title: 'Restricted published video',
      },
      extendedInfo: {
        ageRestricted: true,
        madeForKids: false,
        source: 'published',
      },
      fromCache: true,
      source: 'published_curated',
    });

    const result = await service.contentClassification(makeCtx(), {
      url: 'https://www.youtube.com/watch?v=abc123xyz00',
      features: {
        title: 'Restricted published video',
      },
    });

    expect(metaCacheService.storeNegativeClassification).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc123xyz00',
      expect.objectContaining({
        classification: 'unsafe',
        source: 'metadata_lookup',
      }),
      7 * 24 * 60 * 60 * 1000,
    );
    expect(result).toEqual(
      expect.objectContaining({
        classification: 'unsafe',
        details: expect.objectContaining({
          shortReason: 'Metadata indicates age-restricted content.',
          provenance: expect.objectContaining({
            sourceUsed: 'published_curated',
          }),
        }),
      }),
    );
  });
});
