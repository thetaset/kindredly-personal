import AdminService from '@/services/_internal/admin.service';

function createListQuery(records: any[], count = records.length) {
  const countQuery: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnValue({
      first: jest.fn().mockResolvedValue({count}),
    }),
  };

  const recordQuery: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest
      .fn()
      .mockImplementationOnce(() => recordQuery)
      .mockImplementationOnce(() => Promise.resolve(records)),
    clone: jest.fn().mockReturnValue(countQuery),
  };

  return {recordQuery, countQuery};
}

describe('AdminService published processing state', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('filters published rows by grouped pending processing states', async () => {
    const service = new AdminService();
    const {recordQuery, countQuery} = createListQuery([
      {
        _id: 'pub_1',
        name: 'Alpha',
        ownerUserId: 'hidden-owner',
        info: {postImportProcessing: {state: 'pending_metadata'}},
      },
    ]);

    (service as any).published = {
      query: jest.fn().mockReturnValue(recordQuery),
    };

    const result = await service.listPublished(
      {processing: 'pending'},
      {currentPage: 1, perPage: 25, includeTotalRows: true, sortBy: 'updatedAt', sortDesc: true},
    );

    expect(recordQuery.whereRaw).toHaveBeenCalledWith(
      expect.stringContaining("COALESCE(published.info->'postImportProcessing'->>'state', '') IN"),
      ['pending_metadata', 'fetching_assets', 'verification_pending', 'classification_pending'],
    );
    expect(countQuery.whereRaw).toHaveBeenCalledWith(
      expect.stringContaining("COALESCE(published.info->'postImportProcessing'->>'state', '') IN"),
      ['pending_metadata', 'fetching_assets', 'verification_pending', 'classification_pending'],
    );
    expect(result.records).toEqual([
      {
        _id: 'pub_1',
        name: 'Alpha',
        info: {postImportProcessing: {state: 'pending_metadata'}},
      },
    ]);
    expect(result.count).toBe(1);
  });

  it('filters published rows by subtype', async () => {
    const service = new AdminService();
    const {recordQuery, countQuery} = createListQuery([
      {
        _id: 'pub_yt_1',
        name: 'Channel',
        subType: 'yt_channel',
      },
    ]);

    (service as any).published = {
      query: jest.fn().mockReturnValue(recordQuery),
    };

    await service.listPublished(
      {subType: 'yt_channel'},
      {currentPage: 1, perPage: 25, includeTotalRows: true, sortBy: 'updatedAt', sortDesc: true},
    );

    expect(recordQuery.where).toHaveBeenCalledWith('published.subType', 'yt_channel');
    expect(countQuery.where).toHaveBeenCalledWith('published.subType', 'yt_channel');
  });

  it('updates processing state while preserving existing import metadata and error context for retries', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_1',
        info: {
          postImportProcessing: {
            state: 'failed',
            source: 'admin_content_loader',
            importedAt: '2026-05-28T10:00:00.000Z',
            updatedAt: '2026-05-28T11:00:00.000Z',
            lastError: 'Timed out fetching metadata',
          },
        },
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };

    await service.changePublishedProcessingState('pub_1', 'pending_metadata');

    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_1',
      expect.objectContaining({
        info: expect.objectContaining({
          postImportProcessing: expect.objectContaining({
            state: 'pending_metadata',
            source: 'admin_content_loader',
            importedAt: '2026-05-28T10:00:00.000Z',
            lastError: 'Timed out fetching metadata',
            updatedAt: expect.any(String),
          }),
        }),
      }),
    );
  });

  it('rejects unsupported manual processing-state overrides', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_1',
        info: {
          postImportProcessing: {
            state: 'failed',
            source: 'admin_content_loader',
            updatedAt: '2026-05-28T11:00:00.000Z',
          },
        },
      }),
      updateWithId: jest.fn(),
    };

    await expect(service.changePublishedProcessingState('pub_1', 'ready' as any)).rejects.toThrow(
      'Unsupported admin processing state: ready',
    );
    expect((service as any).published.updateWithId).not.toHaveBeenCalled();
  });

  it('rejects processing-state updates when the row is not already in the post-import queue', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({_id: 'pub_1', info: null}),
      updateWithId: jest.fn(),
    };

    await expect(service.changePublishedProcessingState('pub_1', 'pending_metadata')).rejects.toThrow(
      'Published item is not in the post-import processing queue',
    );
    expect((service as any).published.updateWithId).not.toHaveBeenCalled();
  });

  it('rejects processing-state updates when the published row does not exist', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue(null),
      updateWithId: jest.fn(),
    };

    await expect(service.changePublishedProcessingState('pub_missing', 'needs_review')).rejects.toThrow('Published item not found');
    expect((service as any).published.updateWithId).not.toHaveBeenCalled();
  });

  it('processes metadata for a supported published row and persists ready state', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_1',
        type: 'thing',
        description: null,
        data: {url: 'https://example.org/article'},
        meta: {},
        info: {
          postImportProcessing: {
            state: 'pending_metadata',
            source: 'admin_content_loader',
            importedAt: '2026-05-28T10:00:00.000Z',
            updatedAt: '2026-05-28T10:00:00.000Z',
          },
        },
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).externalDataService = {
      fetchMetadata: jest.fn().mockResolvedValue({
        title: 'Fetched title',
        description: 'Fetched description',
        siteName: 'Example',
        imageSrc: 'https://example.org/image.jpg',
      }),
      getResourceInfo: jest.fn().mockResolvedValue({
        rtype: 'website',
        meta: {
          madeForKids: false,
          ageRestricted: false,
        },
      }),
    };

    const result = await service.processPublishedItems({
      itemIds: ['pub_1'],
      action: 'reload_metadata',
    });

    expect(result.summary).toEqual({
      requestedCount: 1,
      processedCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        itemId: 'pub_1',
        status: 'processed',
        state: 'ready',
        message: 'Metadata refreshed from source.',
        processedUrl: 'https://example.org/article',
      }),
    );
    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_1',
      expect.objectContaining({
        description: 'Fetched description',
        meta: expect.objectContaining({
          url: 'https://example.org/article',
          title: 'Fetched title',
          siteName: 'Example',
          imageSrc: 'https://example.org/image.jpg',
        }),
        info: expect.objectContaining({
          externalLookup: expect.objectContaining({
            resourceType: 'website',
            source: 'admin_manual_process',
          }),
          postImportProcessing: expect.objectContaining({
            state: 'ready',
            source: 'admin_content_loader',
            importedAt: '2026-05-28T10:00:00.000Z',
            lastError: null,
            lastAttemptMessage: 'Metadata refreshed from source.',
            lastRequestedAt: expect.any(String),
            lastCompletedAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        }),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it('upgrades an existing weaker image to the YouTube API image during metadata refresh', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_yt_1',
        type: 'thing',
        description: 'Existing description',
        data: {url: 'https://www.youtube.com/watch?v=abc123xyz00'},
        meta: {
          url: 'https://www.youtube.com/watch?v=abc123xyz00',
          title: 'Parser title',
          imageSrc: 'https://www.youtube.com/favicon.ico',
          tsExtractedInfo: {
            sourceId: 'parser_1',
          },
        },
        info: {
          postImportProcessing: {
            state: 'pending_metadata',
            source: 'admin_content_loader',
            importedAt: '2026-05-28T10:00:00.000Z',
            updatedAt: '2026-05-28T10:00:00.000Z',
          },
        },
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).publishedFileService = {
      savePublishImage: jest.fn().mockResolvedValue('pub_yt_1_banner'),
    };
    (service as any).fetchPublishedBannerData = jest
      .fn()
      .mockResolvedValue('data:image/jpeg;base64,ytbanner');
    (service as any).externalDataService = {
      fetchMetadata: jest.fn().mockResolvedValue({
        url: 'https://www.youtube.com/watch?v=abc123xyz00',
        title: 'YouTube API title',
        description: 'YouTube API description',
        imageSrc: 'https://i.ytimg.com/vi/abc123xyz00/hqdefault.jpg',
        tsExtractedInfo: {
          sourceId: 'yt_api',
        },
      }),
      getResourceInfo: jest.fn().mockResolvedValue({
        rtype: 'yt_video',
        meta: {
          madeForKids: false,
          ageRestricted: false,
        },
      }),
    };

    await service.processPublishedItems({
      itemIds: ['pub_yt_1'],
      action: 'reload_metadata',
    });

    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_yt_1',
      expect.objectContaining({
        imageFilename: 'pub_yt_1_banner',
        data: expect.objectContaining({
          url: 'https://www.youtube.com/watch?v=abc123xyz00',
          imageFilename: 'pub_yt_1_banner',
        }),
        meta: expect.objectContaining({
          title: 'YouTube API title',
          imageSrc: 'https://i.ytimg.com/vi/abc123xyz00/hqdefault.jpg',
          tsExtractedInfo: expect.objectContaining({
            sourceId: 'yt_api',
          }),
        }),
      }),
    );
    expect((service as any).fetchPublishedBannerData).toHaveBeenCalledWith(
      'https://i.ytimg.com/vi/abc123xyz00/hqdefault.jpg',
    );
    expect((service as any).publishedFileService.savePublishImage).toHaveBeenCalledWith(
      null,
      'data:image/jpeg;base64,ytbanner',
      'banner',
      'pub_yt_1',
    );
  });

  it('skips metadata refresh for collections even when they have a source URL', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_col_1',
        type: 'col',
        description: null,
        data: {url: 'https://example.org/collection'},
        meta: {},
        info: {
          postImportProcessing: {
            state: 'pending_metadata',
            source: 'admin_content_loader',
            importedAt: '2026-05-28T10:00:00.000Z',
            updatedAt: '2026-05-28T10:00:00.000Z',
          },
        },
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).externalDataService = {
      fetchMetadata: jest.fn().mockResolvedValue({
        title: 'Collection title',
        description: 'Collection description',
      }),
      getResourceInfo: jest.fn().mockResolvedValue({
        rtype: 'website',
        meta: {},
      }),
    };

    const result = await service.processPublishedItems({
      itemIds: ['pub_col_1'],
      action: 'reload_metadata',
    });

    expect(result.summary).toEqual({
      requestedCount: 1,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 1,
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        itemId: 'pub_col_1',
        status: 'skipped',
        state: 'needs_review',
        message: 'Only published link items support metadata refresh or verification.',
      }),
    );
    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_col_1',
      expect.objectContaining({
        info: expect.objectContaining({
          postImportProcessing: expect.objectContaining({
            state: 'needs_review',
            lastAttemptMessage: 'Only published link items support metadata refresh or verification.',
            lastError: null,
          }),
        }),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it('skips verification for collections even when they have a source URL', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_verify_1',
        type: 'col',
        description: 'Keep existing description',
        data: {url: 'https://example.org/verify'},
        meta: {title: 'Existing title'},
        info: {
          postImportProcessing: {
            state: 'failed',
            source: 'admin_content_loader',
            updatedAt: '2026-05-28T10:00:00.000Z',
            lastError: 'old error',
          },
        },
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).externalDataService = {
      getResourceInfo: jest.fn().mockResolvedValue({
        rtype: 'website',
        meta: {
          madeForKids: true,
          ageRestricted: false,
        },
      }),
    };

    const result = await service.processPublishedItems({
      itemIds: ['pub_verify_1'],
      action: 'verify_source',
    });

    expect(result.summary).toEqual({
      requestedCount: 1,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 1,
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        itemId: 'pub_verify_1',
        status: 'skipped',
        state: 'needs_review',
        message: 'Only published link items support metadata refresh or verification.',
        processedUrl: null,
      }),
    );
    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_verify_1',
      expect.objectContaining({
        info: expect.objectContaining({
          postImportProcessing: expect.objectContaining({
            state: 'needs_review',
            lastAttemptMessage: 'Only published link items support metadata refresh or verification.',
            lastError: null,
          }),
        }),
      }),
    );
  });

  it('records failed processing attempts when metadata refresh throws', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_fail_1',
        type: 'thing',
        data: {url: 'https://example.org/fail'},
        info: {
          postImportProcessing: {
            state: 'pending_metadata',
            source: 'admin_content_loader',
            updatedAt: '2026-05-28T10:00:00.000Z',
          },
        },
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).externalDataService = {
      fetchMetadata: jest.fn().mockResolvedValue({}),
      getResourceInfo: jest.fn().mockRejectedValue(new Error('lookup failed')),
    };

    const result = await service.processPublishedItems({
      itemIds: ['pub_fail_1'],
      action: 'reload_metadata',
    });

    expect(result.summary).toEqual({
      requestedCount: 1,
      processedCount: 0,
      failedCount: 1,
      skippedCount: 0,
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        itemId: 'pub_fail_1',
        status: 'failed',
        state: 'failed',
        message: 'lookup failed',
      }),
    );
    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_fail_1',
      expect.objectContaining({
        info: expect.objectContaining({
          postImportProcessing: expect.objectContaining({
            state: 'failed',
            lastError: 'lookup failed',
            lastAttemptMessage: 'lookup failed',
          }),
        }),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it('replaces the published image and updates the stored image filename', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_img_1',
        data: {url: 'https://example.org/article'},
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).publishedFileService = {
      savePublishImage: jest.fn().mockResolvedValue('pub_img_1_banner'),
    };

    const result = await service.replacePublishedImage('pub_img_1', 'data:image/png;base64,abc123');

    expect((service as any).publishedFileService.savePublishImage).toHaveBeenCalledWith(null, 'data:image/png;base64,abc123', 'banner', 'pub_img_1');
    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_img_1',
      expect.objectContaining({
        imageFilename: 'pub_img_1_banner',
        data: expect.objectContaining({
          url: 'https://example.org/article',
          imageFilename: 'pub_img_1_banner',
        }),
        updatedAt: expect.any(Date),
      }),
    );
    expect(result).toEqual({imageFilename: 'pub_img_1_banner'});
  });

  it('updates published type and normalizes subtype pairs', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_type_1',
        type: 'col',
        subType: null,
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };

    const result = await service.changePublishedType('pub_type_1', 'thing', null);

    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_type_1',
      expect.objectContaining({
        type: 'thing',
        subType: 'information',
        updatedAt: expect.any(Date),
      }),
    );
    expect(result).toEqual({
      type: 'thing',
      subType: 'information',
    });
  });
});