import KeyEntryService from '@/services/key_entry.service';
import {RequestContext} from '@/base/request_context';
import type KeyEntry from 'tset-sharedlib/schemas/public/KeyEntry';

function makeCtx(
  overrides: Partial<RequestContext> & {
    isAdmin?: () => Promise<boolean>;
  } = {},
) {
  return {
    currentUserId: 'user_current',
    accountId: 'acct_1',
    verifyAdminPermissions: jest.fn().mockResolvedValue(undefined),
    verifySelfOrAdminOverUser: jest.fn().mockResolvedValue(undefined),
    isAdmin: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as RequestContext;
}

describe('KeyEntryService', () => {
  let service: KeyEntryService;

  const mockKeyEntriesRepo = {
    listForUser: jest.fn<Promise<KeyEntry[]>, [string]>(),
    listForAccount: jest.fn<Promise<KeyEntry[]>, [string | undefined]>(),
    listPublicKeysForUsers: jest.fn<Promise<KeyEntry[]>, [string[]]>(),
    deleteWhere: jest.fn<Promise<unknown>, [Record<string, unknown>]>(),
    updateWithId: jest.fn<Promise<unknown>, [string, Partial<KeyEntry>]>(),
  };

  const mockFriendsRepo = {
    findMany: jest.fn<Promise<any[]>, [Record<string, unknown>]>(),
  };

  const mockUsersRepo = {
    updateWithId: jest.fn<Promise<unknown>, [string, Record<string, unknown>]>(),
  };

  beforeEach(() => {
    service = new KeyEntryService();

    (service as any).keyEntries = mockKeyEntriesRepo;
    (service as any).friends = mockFriendsRepo;
    (service as any).users = mockUsersRepo;

    jest.clearAllMocks();
  });

  describe('listForUser permission filtering', () => {
    it('admin viewing another user should NOT receive self-permission keys', async () => {
      const ctx = makeCtx({
        currentUserId: 'admin_1',
        isAdmin: jest.fn().mockResolvedValue(true),
      });

      mockKeyEntriesRepo.listForUser.mockResolvedValue([
        {_id: 'ke_self', permission: 'self', deletedAt: null},
        {_id: 'ke_admin', permission: 'admin', deletedAt: null},
        {_id: 'ke_null', permission: null, deletedAt: null},
      ]);
      mockKeyEntriesRepo.listForAccount.mockResolvedValue([]);
      mockFriendsRepo.findMany.mockResolvedValue([]);
      mockKeyEntriesRepo.listPublicKeysForUsers.mockResolvedValue([]);

      const result = await service.listForUser(ctx, 'target_user');

      expect(ctx.verifyAdminPermissions).toHaveBeenCalledWith('target_user');
      expect(result.map((r) => r._id)).toEqual(['ke_admin', 'ke_null']);
    });

    it('non-admin viewing self should not receive admin-permission keys', async () => {
      const ctx = makeCtx({
        currentUserId: 'user_1',
        isAdmin: jest.fn().mockResolvedValue(false),
      });

      mockKeyEntriesRepo.listForUser.mockResolvedValue([
        {_id: 'ke_self', permission: 'self', deletedAt: null},
        {_id: 'ke_admin', permission: 'admin', deletedAt: null},
      ]);
      mockKeyEntriesRepo.listForAccount.mockResolvedValue([]);
      mockFriendsRepo.findMany.mockResolvedValue([]);
      mockKeyEntriesRepo.listPublicKeysForUsers.mockResolvedValue([]);

      const result = await service.listForUser(ctx, 'user_1');

      expect(ctx.verifyAdminPermissions).not.toHaveBeenCalled();
      expect(result.map((r) => r._id)).toEqual(['ke_self']);
    });
  });

  describe('removeUserKeys', () => {
    it('deletes keys for target user (not current user)', async () => {
      const ctx = makeCtx({currentUserId: 'admin_1'});

      await service.removeUserKeys(ctx, 'target_user', false);

      expect(ctx.verifyAdminPermissions).toHaveBeenCalledWith('target_user');
      expect(mockKeyEntriesRepo.deleteWhere).toHaveBeenCalledWith({selectId: 'target_user'});
    });

    it('optionally deletes account keys when deleteAccountKeys=true', async () => {
      const ctx = makeCtx({currentUserId: 'admin_1', accountId: 'acct_99'});

      await service.removeUserKeys(ctx, 'target_user', true);

      expect(mockKeyEntriesRepo.deleteWhere).toHaveBeenCalledWith({selectId: 'target_user'});
      expect(mockKeyEntriesRepo.deleteWhere).toHaveBeenCalledWith({selectId: 'acct_99'});
    });
  });

  describe('deleteRecoveryKey', () => {
    it('is idempotent when recovery key does not exist', async () => {
      const ctx = makeCtx({currentUserId: 'user_1'});

      mockKeyEntriesRepo.listForUser.mockResolvedValue([]);

      await expect(service.deleteRecoveryKey(ctx, 'user_1')).resolves.toBeUndefined();

      expect(ctx.verifySelfOrAdminOverUser).toHaveBeenCalledWith('user_1');
      expect(mockUsersRepo.updateWithId).toHaveBeenCalledWith('user_1', {recoveryKey: null});
      expect(mockKeyEntriesRepo.updateWithId).not.toHaveBeenCalled();
    });

    it('deletes recovery key and wrapped key when present', async () => {
      const ctx = makeCtx({currentUserId: 'user_1'});

      mockKeyEntriesRepo.listForUser.mockResolvedValue([
        {_id: 'ke_recovery', keyName: 'recovery', keyId: 'rk_1', deletedAt: null},
        {_id: 'ke_wrapped', unwrappingKeyId: 'rk_1', deletedAt: null},
      ]);

      await service.deleteRecoveryKey(ctx, 'user_1');

      expect(mockUsersRepo.updateWithId).toHaveBeenCalledWith('user_1', {recoveryKey: null});
      expect(mockKeyEntriesRepo.updateWithId).toHaveBeenCalledWith('ke_recovery', {deletedAt: expect.any(Date)});
      expect(mockKeyEntriesRepo.updateWithId).toHaveBeenCalledWith('ke_wrapped', {deletedAt: expect.any(Date)});
    });

    it('deletes recovery key even if wrapped key is missing', async () => {
      const ctx = makeCtx({currentUserId: 'user_1'});

      mockKeyEntriesRepo.listForUser.mockResolvedValue([
        {_id: 'ke_recovery', keyName: 'recovery', keyId: 'rk_1', deletedAt: null},
      ]);

      await service.deleteRecoveryKey(ctx, 'user_1');

      expect(mockUsersRepo.updateWithId).toHaveBeenCalledWith('user_1', {recoveryKey: null});
      expect(mockKeyEntriesRepo.updateWithId).toHaveBeenCalledWith('ke_recovery', {deletedAt: expect.any(Date)});
      expect(mockKeyEntriesRepo.updateWithId).toHaveBeenCalledTimes(1);
    });
  });
});
