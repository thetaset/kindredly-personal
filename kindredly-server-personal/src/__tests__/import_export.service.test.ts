import {KEY_DIL} from '@/templates/email.templates';
import JSZip from 'jszip';
import {Readable} from 'stream';

const mockPublishedRepo = {
  findById: jest.fn(),
  query: jest.fn(),
  create: jest.fn(),
};

const mockPublishedRelationRepo = {
  query: jest.fn(),
  create: jest.fn(),
  deleteWithId: jest.fn(),
};

const mockPublishedFileService = {
  getPublishImageStream: jest.fn(),
  getPubFileStream: jest.fn(),
  savePublishImage: jest.fn(),
  savePublishAttachment: jest.fn(),
  pubFileAccessProvider: {
    deletePublishFiles: jest.fn(),
  },
};

jest.mock('@/db/published.repo', () => ({
  PublishedRepo: jest.fn().mockImplementation(() => mockPublishedRepo),
}));

jest.mock('@/db/publish_relation.repo', () => ({
  PublishedRelationRepo: jest.fn().mockImplementation(() => mockPublishedRelationRepo),
}));

jest.mock('@/services/_internal/internal_published.service', () => ({
  publishedItemSchemaUpdater: jest.fn((value) => value),
}));

jest.mock('@/services/_internal/published_file.service', () => ({
  PublishedFileService: jest.fn().mockImplementation(() => mockPublishedFileService),
}));

const mockModerationReporter = {
  reportIfNeeded: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/services/_internal/published_moderation_reporter.service', () => ({
  PublishedModerationReporter: {
    get instance() {
      return mockModerationReporter;
    },
  },
}));

import ImportExportService from '@/services/import_export.service';

describe('ImportExportService published packages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports stored banner and attachment media as a durable zip bundle', async () => {
    const relationRows = [
      {
        _id: `pub_collection${KEY_DIL}pub_child`,
        parentId: 'pub_collection',
        itemId: 'pub_child',
        order: 0,
        details: null,
        availableAt: null,
      },
    ];

    const relationQuery: any = {
      whereIn: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn((field: string) => (field === '_id' ? Promise.resolve(relationRows) : relationQuery)),
    };

    mockPublishedRelationRepo.query.mockReturnValue(relationQuery);
    mockPublishedFileService.getPublishImageStream.mockResolvedValue(Readable.from(Buffer.from('banner-bytes')));
    mockPublishedFileService.getPubFileStream.mockResolvedValue(Readable.from(Buffer.from('attachment-bytes')));
    mockPublishedRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'pub_collection') {
        return {
          _id: 'pub_collection',
          easyId: 'space-collection',
          type: 'col',
          name: 'Space Collection',
          published: true,
        };
      }

      if (id === 'pub_child') {
        return {
          _id: 'pub_child',
          easyId: 'space-video',
          type: 'thing',
          name: 'Space Video',
          published: true,
          imageFilename: 'pub_banner_space.webp',
          data: {url: 'https://example.org/space/video'},
          attachments: {
            entries: [
              {
                id: 'attachment-1',
                type: 'file',
                filename: 'space-guide.pdf',
                fileType: 'application/pdf',
                fileId: 'pub_file_space_guide.pdf',
              },
            ],
          },
        };
      }

      return null;
    });

    const service = new ImportExportService();
    const result = await service.exportPublishedDataPackage({
      publishedIds: ['pub_collection', 'pub_child'],
      includeChildren: false,
    });

    expect(result.summary.recordCount).toBe(2);
    expect(result.summary.relationCount).toBe(1);
    expect(result.summary.assetCount).toBe(2);
    expect(result.bundleBase64).toEqual(expect.any(String));
    expect(result.bundleFileName).toBe('space-collection-2-rows.content-export.zip');
    expect(result.bundleMimeType).toBe('application/zip');

    const childRecord = result.manifest.records.find((record) => record.localId === 'space-video');
    expect(childRecord?.imageAssetId).toBe('space-video::banner');
    expect(childRecord?.imageFilename).toBeNull();
    expect(childRecord?.attachments?.[0].assetId).toBe('space-video::attachment::1');
    expect(childRecord?.attachments?.[0].fileId).toBeUndefined();

    expect(result.manifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: 'space-video::banner',
          kind: 'banner_image',
          bundlePath: 'assets/space-video/banner.webp',
          byteSize: Buffer.byteLength('banner-bytes'),
          checksumSha256: expect.any(String),
        }),
        expect.objectContaining({
          assetId: 'space-video::attachment::1',
          kind: 'published_attachment',
          bundlePath: 'assets/space-video/attachment-1-space-guide.pdf',
          byteSize: Buffer.byteLength('attachment-bytes'),
          checksumSha256: expect.any(String),
        }),
      ]),
    );
    expect(result.manifest.relations).toEqual([
      expect.objectContaining({parentLocalId: 'space-collection', childLocalId: 'space-video'}),
    ]);

    const zip = await JSZip.loadAsync(Buffer.from(result.bundleBase64 || '', 'base64'));
    const manifestText = await zip.file('manifest.json')?.async('string');
    expect(manifestText).toContain('published-package-data');
    expect(await zip.file('assets/space-video/banner.webp')?.async('string')).toBe('banner-bytes');
    expect(await zip.file('assets/space-video/attachment-1-space-guide.pdf')?.async('string')).toBe(
      'attachment-bytes',
    );
  });

  it('imports package bundles by materializing real media files and reconciling relations', async () => {
    mockPublishedRepo.findById.mockResolvedValue(null);
    mockPublishedRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
      whereRaw: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
    }));
    mockPublishedRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.deleteWithId.mockResolvedValue(undefined);
    mockPublishedFileService.savePublishImage.mockResolvedValue('pub_child_banner.webp');
    mockPublishedFileService.savePublishAttachment.mockResolvedValue('attachment-1-space-guide.pdf');
    mockPublishedRelationRepo.query.mockImplementation(() => ({
      where: jest.fn(({parentId}) => ({
        select: jest
          .fn()
          .mockResolvedValue(
            parentId === 'pub_collection'
              ? [{_id: `pub_collection${KEY_DIL}pub_old_child`, parentId, itemId: 'pub_old_child'}]
              : [],
          ),
      })),
    }));

    const manifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: '2026-04-25T00:00:00.000Z',
      records: [
        {
          localId: 'collection',
          publishId: 'pub_collection',
          type: 'col',
          name: 'Space Collection',
          published: true,
        },
        {
          localId: 'child',
          publishId: 'pub_child',
          type: 'thing',
          name: 'Space Video',
          url: 'https://example.org/space/video',
          imageAssetId: 'child::banner',
          attachments: [
            {
              id: 'attachment-1',
              type: 'file',
              filename: 'space-guide.pdf',
              fileType: 'application/pdf',
              assetId: 'child::attachment::1',
            },
          ],
        },
      ],
      relations: [
        {
          parentLocalId: 'collection',
          childLocalId: 'child',
          order: 0,
        },
      ],
      assets: [
        {
          assetId: 'child::banner',
          ownerLocalId: 'child',
          kind: 'banner_image',
          sourceRuntimeRef: 'pub_banner_space.webp',
          bundlePath: 'assets/child/banner.webp',
        },
        {
          assetId: 'child::attachment::1',
          ownerLocalId: 'child',
          kind: 'published_attachment',
          sourceRuntimeRef: 'pub_file_space_guide.pdf',
          bundlePath: 'assets/child/attachment-1-space-guide.pdf',
        },
      ],
    };

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('assets/child/banner.webp', 'banner-bytes');
    zip.file('assets/child/attachment-1-space-guide.pdf', 'attachment-bytes');
    const packageDataBase64 = await zip.generateAsync({type: 'base64'});

    const service = new ImportExportService();
    const result = await service.importPublishedDataPackage({
      packageDataBase64,
      packageFileName: 'space.package-data.zip',
    });

    expect(result.summary.createdCount).toBe(2);
    expect(result.summary.updatedCount).toBe(0);
    expect(result.summary.importedBannerCount).toBe(1);
    expect(result.summary.importedAttachmentCount).toBe(1);
    expect(result.summary.relationCount).toBe(1);
    expect(result.summary.relationDeletedCount).toBe(1);

    const importedChildPayload = mockPublishedRepo.create.mock.calls.find(
      ([payload]) => payload._id === 'pub_child',
    )?.[0];
    expect(importedChildPayload.imageFilename).toBe('pub_child_banner.webp');
    expect(importedChildPayload.attachments).toEqual({
      entries: [
        expect.objectContaining({
          fileId: 'attachment-1-space-guide.pdf',
          filename: 'space-guide.pdf',
        }),
      ],
    });
    expect(importedChildPayload.publishConfig?.packageImport).toBeUndefined();

    expect(mockPublishedFileService.savePublishImage).toHaveBeenCalledWith(
      null,
      expect.any(String),
      'banner.webp',
      'pub_child',
    );
    expect(mockPublishedFileService.savePublishAttachment).toHaveBeenCalledWith(
      null,
      expect.any(String),
      'attachment-1-space-guide.pdf',
      'pub_child',
    );

    expect(mockPublishedRelationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: `pub_collection${KEY_DIL}pub_child`,
        parentId: 'pub_collection',
        itemId: 'pub_child',
      }),
    );
    expect(mockPublishedRelationRepo.deleteWithId).toHaveBeenCalledWith(`pub_collection${KEY_DIL}pub_old_child`);
  });

  it('keeps legacy json package imports in metadata-only pending mode', async () => {
    mockPublishedRepo.findById.mockResolvedValue(null);
    mockPublishedRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
      whereRaw: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
    }));
    mockPublishedRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.deleteWithId.mockResolvedValue(undefined);
    mockPublishedRelationRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({select: jest.fn().mockResolvedValue([])})),
    }));

    const manifest = {
      kind: 'published-package-data',
      packageVersion: 1,
      exportedAt: '2026-04-25T00:00:00.000Z',
      records: [
        {
          localId: 'child',
          publishId: 'pub_child',
          type: 'thing',
          name: 'Space Video',
          imageAssetId: 'child::banner',
          attachments: [
            {
              id: 'attachment-1',
              type: 'file',
              filename: 'space-guide.pdf',
              fileType: 'application/pdf',
              assetId: 'child::attachment::1',
            },
          ],
        },
      ],
      relations: [],
      assets: [
        {
          assetId: 'child::banner',
          ownerLocalId: 'child',
          kind: 'banner_image',
          sourceRuntimeRef: 'pub_banner_space.webp',
        },
        {
          assetId: 'child::attachment::1',
          ownerLocalId: 'child',
          kind: 'published_attachment',
          sourceRuntimeRef: 'pub_file_space_guide.pdf',
        },
      ],
    };

    const service = new ImportExportService();
    const result = await service.importPublishedDataPackage({
      packageText: JSON.stringify(manifest),
      packageFileName: 'space.package-data.json',
    });

    expect(result.summary.importedBannerCount).toBe(0);
    expect(result.summary.importedAttachmentCount).toBe(0);
    expect(result.summary.pendingBannerAssetCount).toBe(1);
    expect(result.summary.pendingAttachmentCount).toBe(1);

    const importedChildPayload = mockPublishedRepo.create.mock.calls.find(
      ([payload]) => payload._id === 'pub_child',
    )?.[0];
    expect(importedChildPayload.publishConfig.packageImport).toEqual({
      importedAt: expect.any(String),
      packageVersion: 1,
      sourcePublishId: 'pub_child',
      pendingBannerAssetId: 'child::banner',
      pendingAttachmentAssetIds: ['child::attachment::1'],
    });
    expect(mockPublishedFileService.savePublishImage).not.toHaveBeenCalled();
    expect(mockPublishedFileService.savePublishAttachment).not.toHaveBeenCalled();
  });

  it('previews package imports without writing when dryRun is set', async () => {
    mockPublishedRepo.findById.mockImplementation(async (id: string) =>
      id === 'pub_existing' ? {_id: 'pub_existing', name: 'Existing record', published: true} : null,
    );
    mockPublishedRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
      whereRaw: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
    }));

    const manifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: '2026-06-01T00:00:00.000Z',
      records: [
        {localId: 'fresh', type: 'thing', name: 'Fresh record'},
        {localId: 'known', publishId: 'pub_existing', type: 'thing', name: 'Known record'},
      ],
      relations: [],
      assets: [],
    };

    const service = new ImportExportService();
    const result = await service.importPublishedDataPackage({
      packageText: JSON.stringify(manifest),
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.batchId).toBeNull();
    expect(result.summary.createdCount).toBe(1);
    expect(result.summary.updatedCount).toBe(1);
    expect(result.results).toEqual([
      expect.objectContaining({localId: 'fresh', action: 'created', publishId: null, existingName: null}),
      expect.objectContaining({
        localId: 'known',
        action: 'updated',
        publishId: 'pub_existing',
        existingName: 'Existing record',
      }),
    ]);
    expect(mockPublishedRepo.create).not.toHaveBeenCalled();
    expect(mockPublishedRelationRepo.create).not.toHaveBeenCalled();
  });

  it('imports package creates as inactive with batch-stamped processing info by default', async () => {
    mockPublishedRepo.findById.mockResolvedValue(null);
    mockPublishedRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
      whereRaw: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
    }));
    mockPublishedRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({select: jest.fn().mockResolvedValue([])})),
    }));

    const manifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: '2026-06-01T00:00:00.000Z',
      records: [{localId: 'fresh', type: 'thing', name: 'Fresh record', url: 'https://example.org/fresh', published: true}],
      relations: [],
      assets: [],
    };

    const service = new ImportExportService();
    const result = await service.importPublishedDataPackage({
      packageText: JSON.stringify(manifest),
      batchLabel: 'Prod sync',
    });

    expect(result.batchId).toMatch(/^imp_\d{8}-/);
    const payload = mockPublishedRepo.create.mock.calls[0][0];
    expect(payload.published).toBe(false);
    expect(payload.info.postImportProcessing).toEqual(
      expect.objectContaining({
        state: 'pending_metadata',
        source: 'admin_package_import',
        batchId: result.batchId,
        batchLabel: 'Prod sync',
        batchSource: 'package',
      }),
    );
  });

  it('lands collections and URL-less package items in ready, skipping metadata', async () => {
    mockPublishedRepo.findById.mockResolvedValue(null);
    mockPublishedRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
      whereRaw: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
    }));
    mockPublishedRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({select: jest.fn().mockResolvedValue([])})),
    }));

    const manifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: '2026-06-01T00:00:00.000Z',
      records: [
        {localId: 'note', type: 'thing', name: 'A note with no link'},
        {localId: 'col', type: 'col', name: 'A collection'},
      ],
      relations: [],
      assets: [],
    };

    const service = new ImportExportService();
    await service.importPublishedDataPackage({packageText: JSON.stringify(manifest)});

    for (const call of mockPublishedRepo.create.mock.calls) {
      expect(call[0].info.postImportProcessing.state).toBe('ready');
    }
  });

  it('keeps exported publish state when importVisibility is preserve', async () => {
    mockPublishedRepo.findById.mockResolvedValue(null);
    mockPublishedRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
      whereRaw: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
    }));
    mockPublishedRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({select: jest.fn().mockResolvedValue([])})),
    }));

    const manifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: '2026-06-01T00:00:00.000Z',
      records: [{localId: 'fresh', type: 'thing', name: 'Fresh record', published: true}],
      relations: [],
      assets: [],
    };

    const service = new ImportExportService();
    await service.importPublishedDataPackage({
      packageText: JSON.stringify(manifest),
      importVisibility: 'preserve',
    });

    const payload = mockPublishedRepo.create.mock.calls[0][0];
    expect(payload.published).toBe(true);

    // Preserve-mode rows go live without an approve step, so moderation
    // reporting must happen at import time.
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockModerationReporter.reportIfNeeded).toHaveBeenCalledTimes(1);
    expect(mockModerationReporter.reportIfNeeded).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({name: 'Fresh record'}),
      expect.objectContaining({sourceMode: 'admin_package_import'}),
      {source: 'packageImport'},
    );
  });

  it('keeps the existing review state when re-importing an already-approved record', async () => {
    const existingRow = {
      _id: 'pub_existing',
      name: 'Existing record',
      published: true,
      createdAt: new Date('2026-05-01'),
      info: {
        postImportProcessing: {
          state: 'approved',
          source: 'admin_content_loader',
          batchId: 'imp_old',
          importedAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
        },
      },
    };
    mockPublishedRepo.findById.mockImplementation(async (id: string) => (id === 'pub_existing' ? existingRow : null));
    mockPublishedRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
      whereRaw: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
    }));
    mockPublishedRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({select: jest.fn().mockResolvedValue([])})),
    }));

    const manifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: '2026-06-01T00:00:00.000Z',
      records: [{localId: 'known', publishId: 'pub_existing', type: 'thing', name: 'Known record'}],
      relations: [],
      assets: [],
    };

    const service = new ImportExportService();
    const result = await service.importPublishedDataPackage({packageText: JSON.stringify(manifest)});

    expect(result.summary.updatedCount).toBe(1);
    const payload = mockPublishedRepo.create.mock.calls[0][0];
    expect(payload.published).toBe(true);
    expect(payload.info.postImportProcessing).toEqual(
      expect.objectContaining({
        state: 'approved',
        batchId: result.batchId,
      }),
    );
  });

  it('treats records sharing an identity within one package as updates of the first row', async () => {
    mockPublishedRepo.findById.mockResolvedValue(null);
    mockPublishedRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
      whereRaw: jest.fn(() => ({first: jest.fn().mockResolvedValue(null)})),
    }));
    mockPublishedRepo.create.mockResolvedValue(undefined);
    mockPublishedRelationRepo.query.mockImplementation(() => ({
      where: jest.fn(() => ({select: jest.fn().mockResolvedValue([])})),
    }));

    const manifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: '2026-06-01T00:00:00.000Z',
      records: [
        {localId: 'first', type: 'thing', name: 'First', url: 'https://example.org/same'},
        {localId: 'second', type: 'thing', name: 'Second', url: 'https://example.org/same'},
      ],
      relations: [],
      assets: [],
    };

    const service = new ImportExportService();
    const result = await service.importPublishedDataPackage({packageText: JSON.stringify(manifest)});

    expect(result.summary.createdCount).toBe(1);
    expect(result.summary.updatedCount).toBe(1);
    const firstId = mockPublishedRepo.create.mock.calls[0][0]._id;
    const secondId = mockPublishedRepo.create.mock.calls[1][0]._id;
    expect(secondId).toBe(firstId);
    expect(result.results[1]).toEqual(expect.objectContaining({localId: 'second', action: 'updated'}));
  });

  it('fails bundle import when a declared asset file is missing from the zip', async () => {
    const manifest = {
      kind: 'published-package-data',
      packageVersion: 2,
      exportedAt: '2026-04-25T00:00:00.000Z',
      records: [
        {
          localId: 'child',
          publishId: 'pub_child',
          type: 'thing',
          name: 'Space Video',
          imageAssetId: 'child::banner',
        },
      ],
      relations: [],
      assets: [
        {
          assetId: 'child::banner',
          ownerLocalId: 'child',
          kind: 'banner_image',
          bundlePath: 'assets/child/banner.webp',
        },
      ],
    };

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    const packageDataBase64 = await zip.generateAsync({type: 'base64'});

    const service = new ImportExportService();
    await expect(
      service.importPublishedDataPackage({
        packageDataBase64,
        packageFileName: 'broken.package-data.zip',
      }),
    ).rejects.toThrow('Package bundle is missing assets/child/banner.webp for child::banner.');
  });
});
