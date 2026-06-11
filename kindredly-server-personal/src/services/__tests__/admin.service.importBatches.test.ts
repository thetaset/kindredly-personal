import AdminService from '@/services/_internal/admin.service';
import {RequestContext} from '@/base/request_context';

const ctx = {request: {type: 'admin'}} as unknown as RequestContext;

describe('AdminService import batches', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists import batches with per-state counts from grouped rows', async () => {
    const service = new AdminService();
    const rows = [
      {
        batchId: 'imp_20260610-abc12345',
        batchLabel: 'June drop',
        batchSource: 'manifest',
        importedAt: '2026-06-10T10:00:00.000Z',
        total: 3,
        publishedCount: 1,
        state_pending_metadata: 2,
        state_ready: 1,
        state_failed: 0,
      },
    ];

    const chain: any = {
      from: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupByRaw: jest.fn().mockReturnThis(),
      orderByRaw: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(rows),
    };
    (service as any).published = {
      query: jest.fn().mockReturnValue(chain),
      knex: {raw: jest.fn((sql: string) => sql)},
    };

    const result = await service.listImportBatches({limit: 10});

    expect(chain.whereRaw).toHaveBeenCalledWith(
      expect.stringContaining("postImportProcessing'->>'batchId' IS NOT NULL"),
    );
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(result.batches).toEqual([
      {
        batchId: 'imp_20260610-abc12345',
        batchLabel: 'June drop',
        batchSource: 'manifest',
        importedAt: '2026-06-10T10:00:00.000Z',
        total: 3,
        stateCounts: {pending_metadata: 2, ready: 1},
        publishedCount: 1,
      },
    ]);
  });

  it('approves a batch, skipping blocked rows and reporting moderation', async () => {
    const service = new AdminService();
    const items = [
      {
        _id: 'pub_a',
        type: 'thing',
        name: 'Alpha',
        published: false,
        blockedAt: null,
        meta: {url: 'https://example.org/a'},
        info: {postImportProcessing: {state: 'ready', source: 'admin_content_loader', batchId: 'imp_x'}},
      },
      {
        _id: 'pub_b',
        type: 'thing',
        name: 'Blocked',
        published: false,
        blockedAt: new Date('2026-06-01'),
        info: {postImportProcessing: {state: 'ready', source: 'admin_content_loader', batchId: 'imp_x'}},
      },
    ];

    (service as any).published = {
      query: jest.fn().mockReturnValue({
        whereRaw: jest.fn().mockResolvedValue(items),
        whereIn: jest.fn().mockResolvedValue(items),
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).publishedModerationReporter = {
      reportIfNeeded: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).externalMetaCacheService = {
      invalidateByUrl: jest.fn().mockResolvedValue(undefined),
    };

    const result = await service.approvePublishedBatch(ctx, {batchId: 'imp_x'});

    expect(result).toEqual({
      approvedCount: 1,
      skippedBlockedCount: 1,
      skippedNotReadyCount: 0,
      itemIds: ['pub_a'],
    });
    expect((service as any).published.updateWithId).toHaveBeenCalledTimes(1);
    expect((service as any).published.updateWithId).toHaveBeenCalledWith(
      'pub_a',
      expect.objectContaining({
        published: true,
        info: expect.objectContaining({
          postImportProcessing: expect.objectContaining({state: 'approved', batchId: 'imp_x'}),
        }),
      }),
    );
    expect((service as any).publishedModerationReporter.reportIfNeeded).toHaveBeenCalledTimes(1);
    expect((service as any).publishedModerationReporter.reportIfNeeded).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({_id: 'pub_a'}),
      expect.objectContaining({batchId: 'imp_x', action: 'approved'}),
      {source: 'adminApproveBatch'},
    );
    expect((service as any).externalMetaCacheService.invalidateByUrl).toHaveBeenCalledWith('https://example.org/a');
  });

  it('skips items that have not finished the pipeline and keeps their failure state', async () => {
    const service = new AdminService();
    const items = [
      {
        _id: 'pub_ready',
        type: 'thing',
        name: 'Ready',
        published: false,
        blockedAt: null,
        info: {postImportProcessing: {state: 'ready', source: 'admin_content_loader', batchId: 'imp_x'}},
      },
      {
        _id: 'pub_failed',
        type: 'thing',
        name: 'Failed',
        published: false,
        blockedAt: null,
        info: {
          postImportProcessing: {
            state: 'failed',
            source: 'admin_content_loader',
            batchId: 'imp_x',
            lastError: 'metadata fetch failed',
          },
        },
      },
      {
        _id: 'pub_pending',
        type: 'thing',
        name: 'Pending',
        published: false,
        blockedAt: null,
        info: {postImportProcessing: {state: 'pending_metadata', source: 'admin_content_loader', batchId: 'imp_x'}},
      },
    ];

    (service as any).published = {
      query: jest.fn().mockReturnValue({
        whereRaw: jest.fn().mockResolvedValue(items),
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).publishedModerationReporter = {reportIfNeeded: jest.fn().mockResolvedValue(undefined)};
    (service as any).externalMetaCacheService = {invalidateByUrl: jest.fn().mockResolvedValue(undefined)};

    const result = await service.approvePublishedBatch(ctx, {batchId: 'imp_x'});

    expect(result).toEqual({
      approvedCount: 1,
      skippedBlockedCount: 0,
      skippedNotReadyCount: 2,
      itemIds: ['pub_ready'],
    });
    expect((service as any).published.updateWithId).toHaveBeenCalledTimes(1);
    expect((service as any).published.updateWithId).toHaveBeenCalledWith('pub_ready', expect.anything());
  });

  it('does not abort the batch when cache invalidation fails for one item', async () => {
    const service = new AdminService();
    const items = [
      {
        _id: 'pub_a',
        type: 'thing',
        name: 'Alpha',
        published: false,
        blockedAt: null,
        meta: {url: 'https://example.org/a'},
        info: {postImportProcessing: {state: 'ready', source: 'admin_content_loader', batchId: 'imp_x'}},
      },
      {
        _id: 'pub_b',
        type: 'thing',
        name: 'Beta',
        published: false,
        blockedAt: null,
        meta: {url: 'https://example.org/b'},
        info: {postImportProcessing: {state: 'ready', source: 'admin_content_loader', batchId: 'imp_x'}},
      },
    ];

    (service as any).published = {
      query: jest.fn().mockReturnValue({
        whereRaw: jest.fn().mockResolvedValue(items),
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).publishedModerationReporter = {reportIfNeeded: jest.fn().mockResolvedValue(undefined)};
    (service as any).externalMetaCacheService = {
      invalidateByUrl: jest.fn().mockRejectedValueOnce(new Error('cache down')).mockResolvedValue(undefined),
    };

    const result = await service.approvePublishedBatch(ctx, {batchId: 'imp_x'});

    expect(result.approvedCount).toBe(2);
    expect(result.itemIds).toEqual(['pub_a', 'pub_b']);
  });

  it('does not block batch approval when moderation reporting fails', async () => {
    const service = new AdminService();
    (service as any).published = {
      query: jest.fn().mockReturnValue({
        whereIn: jest.fn().mockResolvedValue([
          {_id: 'pub_a', type: 'thing', name: 'Alpha', published: false, blockedAt: null, info: null},
        ]),
      }),
      updateWithId: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).publishedModerationReporter = {
      reportIfNeeded: jest.fn().mockRejectedValue(new Error('moderation unavailable')),
    };
    (service as any).externalMetaCacheService = {
      invalidateByUrl: jest.fn().mockResolvedValue(undefined),
    };

    const result = await service.approvePublishedBatch(ctx, {itemIds: ['pub_a']});

    expect(result.approvedCount).toBe(1);
  });

  it('rejects approval requests without a batchId or itemIds', async () => {
    const service = new AdminService();

    await expect(service.approvePublishedBatch(ctx, {})).rejects.toThrow(
      'Provide a batchId or itemIds to approve.',
    );
  });

  it('filters the published list by import batch id', async () => {
    const service = new AdminService();

    const countQuery: any = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnValue({first: jest.fn().mockResolvedValue({count: 0})}),
    };
    const recordQuery: any = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest
        .fn()
        .mockImplementationOnce(() => recordQuery)
        .mockImplementationOnce(() => Promise.resolve([])),
      clone: jest.fn().mockReturnValue(countQuery),
    };
    (service as any).published = {
      query: jest.fn().mockReturnValue(recordQuery),
    };

    await service.listPublished({importBatchId: 'imp_x'}, {currentPage: 1, perPage: 25});

    expect(recordQuery.whereRaw).toHaveBeenCalledWith(
      `published.info->'postImportProcessing'->>'batchId' = ?`,
      ['imp_x'],
    );
  });
});
