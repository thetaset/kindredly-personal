import {RequestContext} from '@/base/request_context';
import {RefStateService} from '@/services/ref_state.service';

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    accountId: 'acct-1',
    getCurrentUserId: jest.fn(() => 'admin-1'),
    verifyInAccount: jest.fn().mockResolvedValue(undefined),
    isAdmin: jest.fn().mockResolvedValue(true),
    getManagedUserIds: jest.fn().mockResolvedValue(['admin-1', 'kid-1']),
    ...overrides,
  } as unknown as RequestContext;
}

describe('RefStateService task_assignment owner resolution', () => {
  let repo: {
    findById: jest.Mock;
    upsert: jest.Mock;
    deleteOne: jest.Mock;
  };
  let permissionService: {
    _hasAnyPermissionDirectOrAsAdmin: jest.Mock;
    _hasEditPermissionDirectOrAsAdmin: jest.Mock;
  };
  let service: RefStateService;

  beforeEach(() => {
    repo = {
      findById: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(async (input) => input),
      deleteOne: jest.fn().mockResolvedValue(1),
    };

    permissionService = {
      _hasAnyPermissionDirectOrAsAdmin: jest.fn().mockResolvedValue(true),
      _hasEditPermissionDirectOrAsAdmin: jest.fn().mockResolvedValue(true),
    };

    service = new RefStateService(repo as any, permissionService as any);
  });

  it('allows task_assignment upserts for another admin in the same account', async () => {
    const ctx = makeCtx() as any;

    const result = await service.upsert(ctx, 'user', {
      refType: 'item',
      refId: 'task-1',
      stateKey: 'task_assignment',
      stateSubKey: 'current',
      ownerId: 'admin-2',
      data: {assigned: true},
    });

    expect(ctx.verifyInAccount).toHaveBeenCalledWith('admin-2', 'Invalid ownerId for user-scoped ref_state');
    expect(ctx.getManagedUserIds).not.toHaveBeenCalled();
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'user',
        ownerId: 'admin-2',
        stateKey: 'task_assignment',
        stateSubKey: 'current',
      }),
    );
    expect((result as any).ownerId).toBe('admin-2');
  });

  it('allows task_assignment deletes for another admin in the same account', async () => {
    const ctx = makeCtx() as any;

    const result = await service.delete(ctx, 'user', {
      refType: 'item',
      refId: 'task-1',
      stateKey: 'task_assignment',
      stateSubKey: 'current',
      ownerId: 'admin-2',
    });

    expect(ctx.verifyInAccount).toHaveBeenCalledWith('admin-2', 'Invalid ownerId for user-scoped ref_state');
    expect(ctx.getManagedUserIds).not.toHaveBeenCalled();
    expect(repo.deleteOne).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'user',
        ownerId: 'admin-2',
        stateKey: 'task_assignment',
        stateSubKey: 'current',
      }),
    );
    expect(result).toEqual({deletedCount: 1});
  });

  it('still requires edit permission for task_assignment writes', async () => {
    const ctx = makeCtx() as any;
    permissionService._hasEditPermissionDirectOrAsAdmin.mockResolvedValue(false);

    await expect(
      service.upsert(ctx, 'user', {
        refType: 'item',
        refId: 'task-1',
        stateKey: 'task_assignment',
        stateSubKey: 'current',
        ownerId: 'admin-2',
        data: {assigned: true},
      }),
    ).rejects.toThrow('No permission to change task assignment');

    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('keeps generic user-scoped ref_state owner rules unchanged', async () => {
    const ctx = makeCtx() as any;

    await expect(
      service.upsert(ctx, 'user', {
        refType: 'item',
        refId: 'task-1',
        stateKey: 'task_completion',
        stateSubKey: 'current',
        ownerId: 'admin-2',
        data: {completed: true},
      }),
    ).rejects.toThrow('Invalid ownerId for user-scoped ref_state');

    expect(ctx.verifyInAccount).not.toHaveBeenCalled();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('allows app-global user-scoped ref_state without item permission checks', async () => {
    const ctx = makeCtx() as any;

    const result = await service.upsert(ctx, 'user', {
      refType: 'app_global',
      refId: 'global_audio_player',
      stateKey: 'artifact',
      stateSubKey: 'audio:history',
      data: {recent: []},
    });

    expect(permissionService._hasAnyPermissionDirectOrAsAdmin).not.toHaveBeenCalled();
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        refType: 'app_global',
        refId: 'global_audio_player',
        ownerType: 'user',
        ownerId: 'admin-1',
        stateKey: 'artifact',
        stateSubKey: 'audio:history',
      }),
    );
    expect((result as any).refType).toBe('app_global');
  });
});
