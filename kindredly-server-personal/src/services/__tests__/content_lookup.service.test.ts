import type {RequestContext} from '@/base/request_context';
import ContentLookupService from '@/services/content_lookup.service';

describe('ContentLookupService.lookup', () => {
  function makeService() {
    const service = new ContentLookupService();
    const externalDataService = {
      fetchMetadata: jest.fn().mockResolvedValue(null),
      getResourceInfo: jest.fn().mockResolvedValue(null),
      contentClassification: jest.fn().mockResolvedValue(null),
    };

    (service as any).externalDataService = externalDataService;

    return {
      service,
      externalDataService,
    };
  }

  function makeCtx(): RequestContext {
    return {
      currentUserId: 'user-1',
      accountId: 'acct-1',
    } as RequestContext;
  }

  it('prefers a recognized canonical URL from extracted metadata when available', async () => {
    const {service, externalDataService} = makeService();

    externalDataService.fetchMetadata.mockResolvedValue({
      url: 'https://example.com/watch?v=abc123',
      title: 'Example',
      tsExtractedInfo: {
        pageType: 'SITE_ITEM',
        recognized: {
          provider: 'generic',
          resourceType: 'SITE_ITEM',
          canonicalUrl: 'https://example.com/watch/abc123',
        },
      },
    });

    const result = await service.lookup(makeCtx(), {
      url: ' https://example.com/watch?v=abc123&utm_source=test ',
      options: {
        includeMetadata: true,
        includeResourceInfo: false,
        includeClassification: false,
      },
    });

    expect(result.canonicalUrl).toBe('https://example.com/watch/abc123');
  });

  it('falls back to the trimmed request URL when metadata has no canonical identity', async () => {
    const {service} = makeService();

    const result = await service.lookup(makeCtx(), {
      url: ' https://example.com/article?ref=test ',
      options: {
        includeMetadata: false,
        includeResourceInfo: false,
        includeClassification: false,
      },
    });

    expect(result.canonicalUrl).toBe('https://example.com/article?ref=test');
  });

  it('marks classification as unavailable when it was requested but no classification was returned', async () => {
    const {service} = makeService();

    const result = await service.lookup(makeCtx(), {
      url: 'https://example.com/article',
      options: {
        includeMetadata: false,
        includeResourceInfo: false,
        includeClassification: true,
      },
    });

    expect(result.classification).toBeNull();
    expect(result.lookupMeta).toEqual(
      expect.objectContaining({
        requestedMetadata: false,
        metadataStatus: 'not-requested',
        requestedResourceInfo: false,
        resourceInfoStatus: 'not-requested',
        requestedClassification: true,
        usedClassification: false,
        classificationStatus: 'unavailable',
      }),
    );
  });

  it('degrades classification errors to an unavailable optional result instead of failing the combined lookup', async () => {
    const {service, externalDataService} = makeService();

    externalDataService.fetchMetadata.mockResolvedValue({
      title: 'Example',
      tsExtractedInfo: {
        sourceId: 'html_parser',
      },
    });
    externalDataService.getResourceInfo.mockResolvedValue({
      rtype: 'SITE_ITEM',
      meta: {},
      contentInfo: null,
    });
    externalDataService.contentClassification.mockRejectedValue(new Error('classification backend unavailable'));

    const result = await service.lookup(makeCtx(), {
      url: 'https://example.com/article',
      options: {
        includeMetadata: true,
        includeResourceInfo: true,
        includeClassification: true,
      },
    });

    expect(result.meta).toEqual(expect.objectContaining({title: 'Example'}));
    expect(result.resourceInfo).toEqual(expect.objectContaining({rtype: 'SITE_ITEM'}));
    expect(result.classification).toBeNull();
    expect(result.lookupMeta).toEqual(
      expect.objectContaining({
        requestedMetadata: true,
        usedMetadata: true,
        metadataStatus: 'available',
        requestedResourceInfo: true,
        usedResourceInfo: true,
        resourceInfoStatus: 'available',
        requestedClassification: true,
        usedClassification: false,
        classificationStatus: 'unavailable',
      }),
    );
  });

  it('marks metadata and resource info as unavailable when they were requested but not returned', async () => {
    const {service} = makeService();

    const result = await service.lookup(makeCtx(), {
      url: 'https://example.com/article',
      options: {
        includeMetadata: true,
        includeResourceInfo: true,
        includeClassification: false,
      },
    });

    expect(result.meta).toBeNull();
    expect(result.resourceInfo).toBeNull();
    expect(result.lookupMeta).toEqual(
      expect.objectContaining({
        requestedMetadata: true,
        usedMetadata: false,
        metadataStatus: 'unavailable',
        requestedResourceInfo: true,
        usedResourceInfo: false,
        resourceInfoStatus: 'unavailable',
        requestedClassification: false,
        usedClassification: false,
        classificationStatus: 'not-requested',
      }),
    );
  });

  it('degrades resource info errors to an unavailable optional result instead of failing the combined lookup', async () => {
    const {service, externalDataService} = makeService();

    externalDataService.fetchMetadata.mockResolvedValue({
      title: 'Example',
      tsExtractedInfo: {
        sourceId: 'html_parser',
      },
    });
    externalDataService.getResourceInfo.mockRejectedValue(new Error('resource info backend unavailable'));

    const result = await service.lookup(makeCtx(), {
      url: 'https://example.com/article',
      options: {
        includeMetadata: true,
        includeResourceInfo: true,
        includeClassification: false,
      },
    });

    expect(result.meta).toEqual(expect.objectContaining({title: 'Example'}));
    expect(result.resourceInfo).toBeNull();
    expect(result.lookupMeta).toEqual(
      expect.objectContaining({
        requestedMetadata: true,
        usedMetadata: true,
        metadataStatus: 'available',
        requestedResourceInfo: true,
        usedResourceInfo: false,
        resourceInfoStatus: 'unavailable',
        requestedClassification: false,
        usedClassification: false,
        classificationStatus: 'not-requested',
      }),
    );
  });
});
