import {RequestContext} from '@/base/request_context';
import UserService from '@/services/user.service';
import {UserType} from 'tset-sharedlib/shared.types';

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    accountId: 'acct-1',
    currentUserId: 'admin-1',
    verifyAdminPermissions: jest.fn().mockResolvedValue(undefined),
    verifySelfOrAdmin: jest.fn().mockResolvedValue(undefined),
    verifyInAccount: jest.fn().mockResolvedValue(undefined),
    getUserById: jest.fn(),
    ...overrides,
  } as unknown as RequestContext;
}

describe('UserService.copyUserSettings', () => {
  let service: UserService;
  let tx: {commit: jest.Mock; rollback: jest.Mock};
  let txUserRepo: {where: jest.Mock};
  let txUserPrefRepo: {save: jest.Mock};
  let updateUserRepo: {update: jest.Mock};

  beforeEach(() => {
    service = new UserService();

    tx = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    txUserRepo = {
      where: jest.fn().mockReturnValue({update: jest.fn().mockResolvedValue(undefined)}),
    };

    txUserPrefRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    updateUserRepo = {
      update: jest.fn().mockResolvedValue(undefined),
    };

    (service as any).userRepo = {
      createTransaction: jest.fn().mockResolvedValue(tx),
      withTransaction: jest.fn().mockReturnValue(txUserRepo),
      where: jest.fn().mockReturnValue(updateUserRepo),
    };
    (service as any).userPref = {
      prefId: jest.fn((userId: string, key: string) => `${userId}-${key}`),
      withTransaction: jest.fn().mockReturnValue(txUserPrefRepo),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).sseManager = {
      broadcastToUser: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(service as any, 'getUserPrefs').mockResolvedValue({
      youtubeHideSearch: true,
      youtubeHideComments: true,
      youtubeHideRecommendations: true,
      youtubeHideOtherDistractions: true,
      redditHideSearch: true,
      redditHideComments: true,
      redditHideOtherDistractions: true,
      'filters.strictnessPresetId': 'moderate',
      'filters.contentFilters': {
        blockSocialMedia: false,
      },
      'filters.blockedUrlPatterns': [],
      'filters.serverDeepLookupEnabled': false,
      'filters.autoApprovalSettings': null,
    });
  });

  it('builds the applied snapshot from current source prefs instead of trusting a client snapshot', async () => {
    const ctx = makeCtx({
      getUserById: jest.fn(async (userId: string) => {
        if (userId === 'source-1') {
          return {
            _id: 'source-1',
            accountId: 'acct-1',
            type: UserType.restricted,
            deleted: false,
            options: {},
          };
        }

        return {
          _id: 'target-1',
          accountId: 'acct-1',
          type: UserType.restricted,
          deleted: false,
          options: {},
        };
      }),
    });

    const result = await service.copyUserSettings(ctx, {
      sourceUserId: 'source-1',
      targetUserId: 'target-1',
      groups: ['websiteSettings'],
    });

    expect(result.appliedSnapshot.websiteSettings?.preferenceUpdates).toMatchObject({
      youtubeHideSearch: true,
      youtubeHideComments: true,
      youtubeHideRecommendations: true,
      youtubeHideOtherDistractions: true,
      redditHideSearch: true,
      redditHideComments: true,
      redditHideOtherDistractions: true,
    });
    expect(txUserPrefRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'target-1',
        key: 'youtubeHideSearch',
        value: true,
      }),
    );
    expect((service as any).sseManager.broadcastToUser).toHaveBeenCalledWith('target-1', 'userOptionsUpdate', {
      refreshCurrentUser: false,
      refreshUserPrefs: true,
      source: 'settings-copy',
    });
    expect(tx.commit).toHaveBeenCalled();
  });

  it('broadcasts a signal-only refresh after updating user options', async () => {
    const ctx = makeCtx({
      getUserById: jest.fn().mockResolvedValue({
        _id: 'target-1',
        accountId: 'acct-1',
        type: UserType.restricted,
        deleted: false,
        dob: null,
        options: {
          contentFilteringEnabled: false,
        },
      }),
    });

    await service.setUserOptions(ctx, 'target-1', {
      contentFilteringEnabled: true,
    });

    expect(updateUserRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          contentFilteringEnabled: true,
        }),
      }),
    );
    expect((service as any).sseManager.broadcastToUser).toHaveBeenCalledWith('target-1', 'userOptionsUpdate', {
      refreshCurrentUser: true,
      refreshUserPrefs: false,
      source: 'options-update',
    });
  });

  it('broadcasts a prefs refresh after updating user prefs directly', async () => {
    const ctx = makeCtx();

    await service.updateUserPrefs(ctx, 'target-1', {
      youtubeHideComments: true,
    });

    expect((service as any).userPref.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'target-1',
        key: 'youtubeHideComments',
        value: true,
      }),
    );
    expect((service as any).sseManager.broadcastToUser).toHaveBeenCalledWith('target-1', 'userOptionsUpdate', {
      refreshCurrentUser: false,
      refreshUserPrefs: true,
      source: 'prefs-update',
    });
  });

  it('rolls back the transaction when a later write fails', async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    txUserRepo.where.mockReturnValue({update: updateMock});
    txUserPrefRepo.save.mockRejectedValueOnce(new Error('pref write failed'));

    const ctx = makeCtx({
      getUserById: jest.fn(async (userId: string) => {
        if (userId === 'source-1') {
          return {
            _id: 'source-1',
            accountId: 'acct-1',
            type: UserType.restricted,
            deleted: false,
            dob: null,
            options: {
              contentFilteringEnabled: true,
              whitelistingEnabled: false,
            },
          };
        }

        return {
          _id: 'target-1',
          accountId: 'acct-1',
          type: UserType.restricted,
          deleted: false,
          dob: null,
          options: {},
        };
      }),
    });

    await expect(
      service.copyUserSettings(ctx, {
        sourceUserId: 'source-1',
        targetUserId: 'target-1',
        groups: ['contentFiltering', 'websiteSettings'],
      }),
    ).rejects.toThrow('pref write failed');

    expect(updateMock).toHaveBeenCalled();
    expect(tx.rollback).toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
    expect((service as any).sseManager.broadcastToUser).not.toHaveBeenCalled();
  });
});
