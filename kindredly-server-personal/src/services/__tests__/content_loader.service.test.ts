jest.mock('@/db/published.repo', () => ({
  PublishedRepo: jest.fn(),
}));

jest.mock('@/db/publish_relation.repo', () => ({
  PublishedRelationRepo: jest.fn(),
}));

jest.mock('@/services/_internal/internal_published.service', () => ({
  publishedItemSchemaUpdater: jest.fn(),
}));

import {RequestContext} from '@/base/request_context';
import {PublishedRelationRepo} from '@/db/publish_relation.repo';
import {PublishedRepo} from '@/db/published.repo';
import ContentLoaderService from '@/services/content_loader.service';
import {OFFICIAL_PUBLISHER_PUBLIC_ID, OFFICIAL_PUBLISHER_USERNAME} from 'tset-sharedlib/constants';

describe('ContentLoaderService.execute moderation parity', () => {
  let tx: {commit: jest.Mock; rollback: jest.Mock};
  let rootPublishedRepo: {query: jest.Mock; createTransaction: jest.Mock; updateWithId: jest.Mock};
  let txPublishedRepo: {create: jest.Mock; updateWithId: jest.Mock; query: jest.Mock};
  let txRelationRepo: {
    findMany: jest.Mock;
    updateWithId: jest.Mock;
    create: jest.Mock;
    deleteWithId: jest.Mock;
  };
  let moderationReporter: {reportIfNeeded: jest.Mock};
  let contentModerationService: {checkContent: jest.Mock};
  let externalDataService: {
    getResourceInfo: jest.Mock;
    fetchMetadata: jest.Mock;
    contentClassification: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    tx = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    rootPublishedRepo = {
      query: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
        whereRaw: jest.fn().mockResolvedValue([]),
      }),
      createTransaction: jest.fn().mockResolvedValue(tx),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };

    txPublishedRepo = {
      create: jest.fn().mockResolvedValue(undefined),
      updateWithId: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      }),
    };

    txRelationRepo = {
      findMany: jest.fn().mockResolvedValue([]),
      updateWithId: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
      deleteWithId: jest.fn().mockResolvedValue(undefined),
    };
    (PublishedRepo as unknown as jest.Mock).mockImplementation((db?: unknown) => {
      return db ? txPublishedRepo : rootPublishedRepo;
    });
    (PublishedRelationRepo as unknown as jest.Mock).mockImplementation(() => txRelationRepo);

    moderationReporter = {
      reportIfNeeded: jest.fn().mockResolvedValue(undefined),
    };

    contentModerationService = {
      checkContent: jest.fn().mockResolvedValue({
        approved: true,
        severity: 'none',
        flags: [],
        confidence: 0.8,
        method: 'rules',
        suggestedAction: 'allow',
      }),
    };

    externalDataService = {
      getResourceInfo: jest.fn().mockResolvedValue({
        rtype: 'yt_video',
        meta: {
          madeForKids: true,
          ageRestricted: false,
        },
      }),
      fetchMetadata: jest.fn().mockResolvedValue({
        title: 'Fetched title',
        description: 'Fetched description',
        siteName: 'Example Site',
      }),
      contentClassification: jest.fn().mockResolvedValue({
        classification: 'cat_educational',
        confidence: 0.91,
        details: {
          shortReason: 'AI filled missing classification fields.',
          categories: [{value: 'cat_educational', confidence: 0.91}],
          topics: [{value: 'topic_space', confidence: 0.88}],
          eduValue: {value: 'eduval_educational', confidence: 0.9},
        },
      }),
    };

    jest.spyOn(RequestContext, 'instanceForSystem').mockReturnValue({
      request: {type: 'taskrunner'},
    } as RequestContext);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeService() {
    const service = new ContentLoaderService();

    (service as any).itemService = {
      updateAvailCategories: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).externalMetaCacheService = {
      invalidateByUrl: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).contentModerationService = contentModerationService;
    (service as any).externalDataService = externalDataService;
    (service as any).publishedModerationReporter = moderationReporter;
    (service as any).publishedFileService = {
      copyUserFilesForPublishingImage: jest.fn().mockResolvedValue('pub_asset-image_banner'),
      copyUserFilesForPublishingAttachment: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(service as any, 'findBySignal').mockResolvedValue([]);

    return service;
  }

  function makeManifestText() {
    return JSON.stringify({
      records: [
        {
          localId: 'alpha',
          easyId: 'alpha-001',
          type: 'thing',
          name: 'Alpha record',
          url: 'https://example.org/alpha',
          published: true,
        },
      ],
    });
  }

  it('reports created loader rows through the publish moderation hook for live imports', async () => {
    const service = makeService();

    const result = await service.execute({manifestText: makeManifestText(), importVisibility: 'live'});

    expect(tx.commit).toHaveBeenCalled();
    expect(moderationReporter.reportIfNeeded).toHaveBeenCalledTimes(1);

    const [ctxArg, publishedArg, manifestArg, metaArg] = moderationReporter.reportIfNeeded.mock.calls[0];
    expect(RequestContext.instanceForSystem).toHaveBeenCalled();
    expect(ctxArg).toEqual(expect.objectContaining({request: {type: 'taskrunner'}}));
    expect(publishedArg).toEqual(
      expect.objectContaining({
        _id: result.results[0].publishId,
        type: 'thing',
        name: 'Alpha record',
      }),
    );
    expect(manifestArg).toEqual(
      expect.objectContaining({
        sourceMode: 'admin_content_loader',
        localId: 'alpha',
        action: 'created',
        easyId: 'alpha-001',
      }),
    );
    expect(metaArg).toEqual({source: 'contentLoaderExecute'});
  });

  it('stamps created loader rows with the official publisher identity', async () => {
    const service = makeService();

    await service.execute({manifestText: makeManifestText()});

    expect(txPublishedRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: null,
        publicUserId: OFFICIAL_PUBLISHER_PUBLIC_ID,
        username: OFFICIAL_PUBLISHER_USERNAME,
      }),
    );
  });

  it('adds advisory suggestions to dry run rows for reviewable enrichment hints', async () => {
    const service = makeService();

    const result = await service.dryRun({
      manifestText: JSON.stringify({
        records: [
          {
            localId: 'kids-video',
            type: 'thing',
            name: 'Kids science video',
            url: 'https://www.youtube.com/watch?v=abc123xyz00',
            useCriteria: [],
          },
        ],
      }),
    });

    expect(contentModerationService.checkContent).toHaveBeenCalledTimes(1);
    expect(externalDataService.getResourceInfo).toHaveBeenCalledTimes(1);
    expect(result.manifestHash).toEqual(expect.any(String));
    expect(result.summary.advisorySuggestedCount).toBe(1);
    expect(result.results[0].advisory).toEqual(
      expect.objectContaining({
        status: 'suggested',
        enrichment: expect.objectContaining({
          suggestedUseCriteria: expect.arrayContaining(['ta_kids']),
        }),
      }),
    );
  });

  it('does not block execute when moderation reporting fails', async () => {
    moderationReporter.reportIfNeeded.mockRejectedValueOnce(new Error('moderation unavailable'));

    const service = makeService();
    const result = await service.execute({manifestText: makeManifestText(), importVisibility: 'live'});

    expect(result.summary.createdCount).toBe(1);
    expect(result.summary.pendingProcessingCount).toBe(1);
    expect(tx.commit).toHaveBeenCalled();
    expect(tx.rollback).not.toHaveBeenCalled();
    expect(moderationReporter.reportIfNeeded).toHaveBeenCalledTimes(1);
  });

  it('rejects execute when the reviewed manifest hash is stale', async () => {
    const service = makeService();

    await expect(
      service.execute({
        manifestText: makeManifestText(),
        expectedManifestHash: 'stale-hash',
      }),
    ).rejects.toThrow('Manifest changed after review. Run dry run or enrich again before execute.');
  });

  function mockPublishedLookup(row: Record<string, any> | null) {
    rootPublishedRepo.query.mockReturnValue({
      where: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue(row),
      }),
      whereRaw: jest.fn().mockResolvedValue([]),
    });
  }

  it('returns metadata and ai gap-fill patches when enriching published items', async () => {
    const service = makeService();
    mockPublishedLookup({
      _id: 'pub_thing-1',
      type: 'thing',
      name: 'Alpha record',
      easyId: 'alpha-001',
      categories: [],
      useCriteria: [],
      data: {url: 'https://example.org/alpha'},
      meta: {},
      published: false,
      info: {postImportProcessing: {state: 'pending_metadata', source: 'admin_content_loader', updatedAt: ''}},
    });

    const result = await service.enrichPublishedItems({itemIds: ['pub_thing-1']});

    expect(externalDataService.fetchMetadata).toHaveBeenCalledTimes(1);
    expect(externalDataService.contentClassification).toHaveBeenCalledTimes(1);
    expect(result.summary.enrichedCount).toBe(1);
    expect(result.summary.patchCount).toBeGreaterThan(0);
    expect(result.results[0].patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({field: 'description', source: 'metadata'}),
        expect.objectContaining({field: 'categories', source: 'ai'}),
        expect.objectContaining({field: 'useCriteria', source: 'ai'}),
      ]),
    );
  });

  it('skips ai gap-fill when categories and useCriteria already exist on the published item', async () => {
    const service = makeService();
    mockPublishedLookup({
      _id: 'pub_thing-1',
      type: 'thing',
      name: 'Alpha record',
      easyId: 'alpha-001',
      description: 'Already present',
      categories: ['cat_education'],
      useCriteria: ['ta_all'],
      data: {url: 'https://example.org/alpha'},
      meta: {},
      published: false,
    });

    await service.enrichPublishedItems({itemIds: ['pub_thing-1']});

    expect(externalDataService.contentClassification).not.toHaveBeenCalled();
  });

  it('returns a failed verification row for unknown published items during enrich', async () => {
    const service = makeService();
    mockPublishedLookup(null);

    const result = await service.enrichPublishedItems({itemIds: ['pub_missing']});

    expect(result.summary.enrichedCount).toBe(0);
    expect(result.results[0].verification.status).toBe('failed');
    expect(result.results[0].verification.notes).toEqual(['Published item not found.']);
  });

  it('applies whitelisted enrichment patches and marks the item ready', async () => {
    const service = makeService();
    mockPublishedLookup({
      _id: 'pub_thing-1',
      type: 'thing',
      name: 'Alpha record',
      categories: ['cat_education'],
      useCriteria: [],
      data: {url: 'https://example.org/alpha'},
      meta: {},
      published: false,
      info: {postImportProcessing: {state: 'pending_metadata', source: 'admin_content_loader', updatedAt: ''}},
    });

    const result = await service.applyEnrichmentPatches({
      itemId: 'pub_thing-1',
      patches: [
        {field: 'description', operation: 'set', source: 'metadata', value: 'Fetched description', reason: '', confidence: null},
        {field: 'useCriteria', operation: 'merge', source: 'ai', value: ['ta_kids'], reason: '', confidence: 0.9},
        {field: 'meta.title', operation: 'set', source: 'metadata', value: 'Fetched title', reason: '', confidence: null},
      ],
    });

    expect(result.appliedCount).toBe(3);
    expect(rootPublishedRepo.updateWithId).toHaveBeenCalledWith(
      'pub_thing-1',
      expect.objectContaining({
        description: 'Fetched description',
        useCriteria: ['ta_kids'],
        meta: expect.objectContaining({title: 'Fetched title'}),
        info: expect.objectContaining({
          postImportProcessing: expect.objectContaining({state: 'ready'}),
        }),
      }),
    );
  });

  it('keeps the approved state when enriching an already-approved item', async () => {
    const service = makeService();
    mockPublishedLookup({
      _id: 'pub_thing-1',
      type: 'thing',
      name: 'Alpha record',
      categories: [],
      useCriteria: [],
      data: {url: 'https://example.org/alpha'},
      meta: {},
      published: true,
      info: {postImportProcessing: {state: 'approved', source: 'admin_content_loader', updatedAt: ''}},
    });

    await service.applyEnrichmentPatches({
      itemId: 'pub_thing-1',
      patches: [
        {field: 'description', operation: 'set', source: 'metadata', value: 'Fetched description', reason: '', confidence: null},
      ],
      markState: 'ready',
    });

    expect(rootPublishedRepo.updateWithId).toHaveBeenCalledWith(
      'pub_thing-1',
      expect.objectContaining({
        info: expect.objectContaining({
          postImportProcessing: expect.objectContaining({state: 'approved'}),
        }),
      }),
    );
  });

  it('rejects enrichment patches outside the whitelist', async () => {
    const service = makeService();
    mockPublishedLookup({
      _id: 'pub_thing-1',
      type: 'thing',
      name: 'Alpha record',
      categories: [],
      useCriteria: [],
      meta: {},
      published: false,
    });

    await expect(
      service.applyEnrichmentPatches({
        itemId: 'pub_thing-1',
        patches: [{field: 'published', operation: 'set', source: 'ai', value: 'true', reason: '', confidence: null}],
      }),
    ).rejects.toThrow('Unsupported patch field: published');
    expect(rootPublishedRepo.updateWithId).not.toHaveBeenCalled();
  });

  it('defaults imported creates to inactive with batch stamping and no moderation report', async () => {
    const service = makeService();

    const result = await service.execute({manifestText: makeManifestText(), batchLabel: 'June drop'});

    expect(result.summary.batchId).toMatch(/^imp_\d{8}-/);
    expect(moderationReporter.reportIfNeeded).not.toHaveBeenCalled();
    expect(txPublishedRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        published: false,
        info: expect.objectContaining({
          postImportProcessing: expect.objectContaining({
            state: 'pending_metadata',
            batchId: result.summary.batchId,
            batchLabel: 'June drop',
            batchSource: 'manifest',
          }),
        }),
      }),
    );
  });

  it('preserves the existing published flag when updating a live record with default visibility', async () => {
    const service = makeService();
    const existing = {
      _id: 'pub_existing',
      type: 'thing',
      name: 'Existing record',
      easyId: 'alpha-001',
      published: true,
      blockedAt: null,
    };
    ((service as any).findBySignal as jest.Mock).mockResolvedValue([existing]);
    txPublishedRepo.query.mockReturnValue({
      where: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue(existing),
      }),
    });

    const result = await service.execute({manifestText: makeManifestText()});

    expect(result.summary.updatedCount).toBe(1);
    expect(txPublishedRepo.updateWithId).toHaveBeenCalledWith(
      'pub_existing',
      expect.objectContaining({published: true}),
    );
  });

  it('persists loader-derived lookup hints onto published rows', async () => {
    const service = makeService();

    await service.execute({
      manifestText: JSON.stringify({
        records: [
          {
            localId: 'kids-video',
            easyId: 'kids-video-001',
            type: 'thing',
            name: 'Kids science video',
            url: 'https://www.youtube.com/watch?v=abc123xyz00',
            published: true,
          },
        ],
      }),
    });

    expect(txPublishedRepo.create).toHaveBeenCalledTimes(1);
    expect(txPublishedRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        info: expect.objectContaining({
          externalLookup: expect.objectContaining({
            resourceType: 'yt_video',
            madeForKids: true,
            ageRestricted: false,
            source: 'content_loader',
          }),
          postImportProcessing: expect.objectContaining({
            state: 'pending_metadata',
            source: 'admin_content_loader',
          }),
        }),
      }),
    );
  });

  it('returns pending post-import processing state for executed link rows', async () => {
    const service = makeService();

    const result = await service.execute({manifestText: makeManifestText()});

    expect(result.summary.pendingProcessingCount).toBe(1);
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          localId: 'alpha',
          processingState: 'pending_metadata',
        }),
      ]),
    );
  });

  it('lands collections and URL-less items in ready, skipping the metadata stage', async () => {
    const service = makeService();
    jest.spyOn(service as any, 'createPublishId').mockImplementation((type: string) => `pub_${type}-x`);

    const result = await service.execute({
      manifestText: JSON.stringify({
        records: [
          {localId: 'note', easyId: 'note-1', type: 'thing', name: 'A note with no link'},
          {
            localId: 'col-1',
            easyId: 'col-1',
            type: 'col',
            name: 'A collection',
            childLocalIds: ['note'],
          },
        ],
      }),
    });

    expect(result.summary.pendingProcessingCount).toBe(0);
    for (const row of result.results) {
      expect(row.processingState).toBe('ready');
    }
    for (const call of txPublishedRepo.create.mock.calls) {
      expect(call[0].info.postImportProcessing.state).toBe('ready');
    }
  });

  it('validates missing referenced assets during dry run', async () => {
    const service = makeService();

    const result = await service.dryRun({
      manifestText: JSON.stringify({
        records: [
          {
            localId: 'alpha',
            easyId: 'alpha-001',
            type: 'thing',
            name: 'Alpha record',
            attachments: [
              {
                type: 'file',
                filename: 'guide.pdf',
                fileType: 'application/pdf',
                assetId: 'missing-asset',
              },
            ],
            published: true,
          },
        ],
        assets: [],
      }),
    });

    expect(result.summary.invalidCount).toBe(1);
    expect(result.results[0].issues).toEqual(expect.arrayContaining(['Missing attachment asset missing-asset.']));
  });

  it('copies uploaded image and attachment assets during execute', async () => {
    const service = makeService();
    jest.spyOn(service as any, 'createPublishId').mockReturnValue('pub_thing-asset-test');

    const result = await service.execute(
      {
        manifestText: JSON.stringify({
          records: [
            {
              localId: 'alpha',
              easyId: 'alpha-001',
              type: 'thing',
              name: 'Alpha record',
              imageAssetId: 'asset-image',
              attachments: [
                {
                  type: 'file',
                  filename: 'guide.pdf',
                  fileType: 'application/pdf',
                  assetId: 'asset-attachment',
                },
              ],
              published: true,
            },
          ],
          assets: [
            {
              assetId: 'asset-image',
              ownerLocalId: 'alpha',
              kind: 'banner_image',
              filename: 'alpha-banner.png',
              fileType: 'image/png',
              tempUploadId: 'file_banner_1',
            },
            {
              assetId: 'asset-attachment',
              ownerLocalId: 'alpha',
              kind: 'published_attachment',
              filename: 'guide.pdf',
              fileType: 'application/pdf',
              tempUploadId: 'file_attachment_1',
            },
          ],
        }),
      },
      {
        accountId: 'acct_1',
      } as RequestContext,
    );

    expect((service as any).publishedFileService.copyUserFilesForPublishingImage).toHaveBeenCalledWith(
      expect.objectContaining({accountId: 'acct_1'}),
      'file_banner_1',
      'banner',
      'pub_thing-asset-test',
    );
    expect((service as any).publishedFileService.copyUserFilesForPublishingAttachment).toHaveBeenCalledWith(
      expect.objectContaining({accountId: 'acct_1'}),
      'file_attachment_1',
      'guide.pdf',
      'pub_thing-asset-test',
    );
    expect(result.summary.importedBannerCount).toBe(1);
    expect(result.summary.importedAttachmentCount).toBe(1);
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        importedAssetCount: 2,
      }),
    );
    expect(txPublishedRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        imageFilename: 'pub_asset-image_banner',
        attachments: {
          entries: [
            expect.objectContaining({
              filename: 'guide.pdf',
              fileId: 'guide.pdf',
            }),
          ],
        },
      }),
    );
  });
});
