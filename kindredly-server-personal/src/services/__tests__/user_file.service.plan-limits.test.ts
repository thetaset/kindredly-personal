import {RequestContext} from '@/base/request_context';
import UserFileService from '@/services/user_file.service';

const MB = 1024 * 1024;

describe('UserFileService plan limits', () => {
  let service: UserFileService;

  beforeEach(() => {
    service = new UserFileService({
      uploadUserFileData: jest.fn().mockResolvedValue(undefined),
      uploadUserFileBytes: jest.fn().mockResolvedValue(undefined),
    } as any);
    (service as any).permissionService = {
      _hasEditPermissionDirectOrAsAdmin: jest.fn().mockResolvedValue(true),
    };
    (service as any).userFileRepo = {
      findById: jest.fn().mockResolvedValue(null),
      findByRef: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      updateWithId: jest.fn().mockResolvedValue(undefined),
      getVisibleStorageUsageForAccount: jest.fn().mockResolvedValue(0),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeCtx(accountType: 'standard' | 'plus' | 'superplus' = 'standard') {
    const ctx = new RequestContext({
      currentUserId: 'user-1',
      authUserId: 'user-1',
      accountId: 'acct-1',
      request: {headers: {}},
    });

    jest.spyOn(ctx, 'getAccount').mockResolvedValue({accountType} as any);
    return ctx;
  }

  it('blocks standard uploads above the per-plan upload size', async () => {
    const ctx = makeCtx('standard');

    await expect(
      service.initChunkedUpload(ctx, {
        refId: 'item-1',
        refType: 'item',
        filename: 'large-file.bin',
        fileType: 'application/octet-stream',
        fileSize: 36 * MB,
        chunkSize: MB,
        chunkCount: 36,
      } as any),
    ).rejects.toThrow('File too large');
  });

  it('blocks uploads that exceed the visible storage limit', async () => {
    const ctx = makeCtx('standard');
    ((service as any).userFileRepo.getVisibleStorageUsageForAccount as jest.Mock).mockResolvedValue(500 * MB);

    await expect(
      service.initChunkedUpload(ctx, {
        refId: 'item-1',
        refType: 'item',
        filename: 'another-file.bin',
        fileType: 'application/octet-stream',
        fileSize: 1,
        chunkSize: 1,
        chunkCount: 1,
      } as any),
    ).rejects.toThrow('Storage limit reached');
  });
});
