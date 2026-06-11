import AdminService from '@/services/_internal/admin.service';

describe('AdminService.getPublishedInfo', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the latest moderation auto-report alongside the published record', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_1',
        name: 'Alpha',
        ownerUserId: 'secret-owner',
      }),
    };
    (service as any).publishedService = {
      getPublishedWithParent: jest.fn().mockResolvedValue([
        {
          _id: 'pub_child_1',
          name: 'Child',
          ownerUserId: 'secret-child-owner',
        },
      ]),
    };
    (service as any).reportProblemRepo = {
      findLatestBySource: jest.fn().mockResolvedValue({
        _id: 42,
        category: 'moderationAutoReport',
        sourceId: 'pub_1',
        details: {
          ruleBased: {severity: 'high', flags: [{type: 'flag_spam'}]},
          ai: {status: 'queued'},
        },
      }),
    };

    const result = await service.getPublishedInfo('pub_1');

    expect((service as any).reportProblemRepo.findLatestBySource).toHaveBeenCalledWith({
      category: 'moderationAutoReport',
      sourceType: 'published',
      sourceId: 'pub_1',
    });
    expect(result.published).toEqual({
      _id: 'pub_1',
      name: 'Alpha',
    });
    expect(result.children).toEqual([
      {
        _id: 'pub_child_1',
        name: 'Child',
      },
    ]);
    expect(result.moderationReport).toEqual(
      expect.objectContaining({
        _id: 42,
        details: expect.objectContaining({
          ai: {status: 'queued'},
        }),
      }),
    );
  });

  it('updates persisted plan fields when changing an account to plus', async () => {
    const service = new AdminService();

    (service as any).accounts = {
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };

    await service.changeAccountType('ac_1', 'plus');

    expect((service as any).accounts.updateWithId).toHaveBeenCalledWith('ac_1', {
      accountType: 'plus',
      maxUsers: 10,
      maxCollections: 5000,
      maxItemsPerCollection: 50000,
    });
  });

  it('rejects unsupported account types', async () => {
    const service = new AdminService();

    await expect(service.changeAccountType('ac_1', 'superplus')).rejects.toThrow('Unsupported account type: superplus');
  });

  it('deletes a published record, clears relations, and resets the source item publish flags', async () => {
    const service = new AdminService();

    (service as any).published = {
      findById: jest.fn().mockResolvedValue({
        _id: 'pub_1',
        sourceItemId: 'item_1',
        meta: {url: 'https://example.org/article'},
      }),
      deleteWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).publishedRelations = {
      deleteWhere: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).items = {
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).publishedFileService = {
      pubFileAccessProvider: {
        deletePublishFiles: jest.fn().mockResolvedValue(undefined),
      },
    };
    (service as any).externalMetaCacheService = {
      invalidateByUrl: jest.fn().mockResolvedValue(undefined),
    };

    const result = await service.deletePublished('pub_1');

    expect((service as any).publishedRelations.deleteWhere).toHaveBeenNthCalledWith(1, {parentId: 'pub_1'});
    expect((service as any).publishedRelations.deleteWhere).toHaveBeenNthCalledWith(2, {itemId: 'pub_1'});
    expect((service as any).publishedFileService.pubFileAccessProvider.deletePublishFiles).toHaveBeenCalledWith(
      expect.anything(),
      'pub_1',
    );
    expect((service as any).published.deleteWithId).toHaveBeenCalledWith('pub_1');
    expect((service as any).items.updateWithId).toHaveBeenCalledWith('item_1', {
      published: false,
      publishId: null,
    });
    expect((service as any).externalMetaCacheService.invalidateByUrl).toHaveBeenCalledWith('https://example.org/article');
    expect(result).toEqual({deleted: true});
  });
});
