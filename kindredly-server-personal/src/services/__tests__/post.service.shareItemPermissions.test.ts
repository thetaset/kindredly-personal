import {RequestContext} from '@/base/request_context';
import PostService from '@/services/post.service';
import {PermissionType, UserType} from 'tset-sharedlib/shared.types';

describe('PostService direct item share permissions', () => {
  let service: PostService;

  beforeEach(() => {
    service = new PostService();
    (service as any).posts = {
      create: jest.fn().mockResolvedValue(undefined),
      updateWithId: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
    };
    const mockUsers: Record<string, {_id: string; username: string; accountId: string; type: UserType}> = {
      'parent-1': {_id: 'parent-1', username: 'parent', accountId: 'acct-1', type: UserType.admin},
      'admin-2': {_id: 'admin-2', username: 'other-admin', accountId: 'acct-1', type: UserType.admin},
      'child-1': {_id: 'child-1', username: 'child', accountId: 'acct-1', type: UserType.restricted},
    };
    (service as any).users = {
      findById: jest.fn().mockImplementation(async (userId: string) => mockUsers[userId] || null),
      findWhereIdIn: jest.fn().mockImplementation(async (ids: string[]) =>
        (ids || []).map((id) => mockUsers[id]).filter(Boolean),
      ),
    };
    (service as any).userFeedService = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).notificationService = {
      addUserNotification: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).permissionService = {
      _hasSharePermissionDirectOrAsAdmin: jest.fn().mockResolvedValue(true),
      shareItemWithUsers: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(service as any, '_saveAttachmentsAndModifyAttachedItemsObject').mockResolvedValue(undefined);
  });

  function makeCtx() {
    const ctx = new RequestContext({
      currentUserId: 'parent-1',
      authUserId: 'parent-1',
      accountId: 'acct-1',
      request: {headers: {}},
    });

    jest.spyOn(ctx, 'verifyInNetwork').mockResolvedValue(undefined as never);
    jest.spyOn(ctx, 'getCurrentUser').mockResolvedValue({
      _id: 'parent-1',
      username: 'parent',
      accountId: 'acct-1',
      type: UserType.admin,
    } as any);
    jest.spyOn(ctx, 'isAdmin').mockResolvedValue(true);
    jest.spyOn(ctx, 'verifySelfOrAdminOverUser').mockResolvedValue(undefined as never);

    return ctx;
  }

  it('shares direct libItem attachments into same-account libraries during post creation', async () => {
    const ctx = makeCtx();

    await service.createPost(ctx, {
      data: {text: 'hello'},
      sharedWith: ['parent-1', 'admin-2', 'child-1'],
      attachedItems: [
        {
          type: 'libItem',
          itemId: 'item-1',
          data: {_id: 'item-1', type: 'link'},
        },
      ],
    } as any);

    expect((service as any).permissionService.shareItemWithUsers).toHaveBeenCalledWith(
      ctx,
      'item-1',
      ['admin-2'],
      PermissionType.editor,
      true,
      false,
      true,
      false,
      true,
    );
    expect((service as any).permissionService.shareItemWithUsers).toHaveBeenCalledWith(
      ctx,
      'item-1',
      ['child-1'],
      PermissionType.viewer,
      true,
      true,
      false,
      false,
      true,
    );
  });

  it('shares encrypted libItem attachments as viewer-only grants', async () => {
    const ctx = makeCtx();

    await service.createPost(ctx, {
      data: {text: 'hello'},
      sharedWith: ['parent-1', 'admin-2', 'child-1'],
      encInfo: {keys: [{id: 'k1'}]} as any,
      attachedItems: [
        {
          type: 'libItem',
          itemId: 'item-1',
          data: {_id: 'item-1', type: 'link'},
        },
      ],
    } as any);

    expect((service as any).permissionService.shareItemWithUsers).toHaveBeenCalledWith(
      ctx,
      'item-1',
      ['admin-2'],
      PermissionType.viewer,
      true,
      true,
      true,
      false,
      true,
    );
    expect((service as any).permissionService.shareItemWithUsers).toHaveBeenCalledWith(
      ctx,
      'item-1',
      ['child-1'],
      PermissionType.viewer,
      true,
      true,
      false,
      false,
      true,
    );
  });

  it('shares direct libItem attachments into same-account libraries when recipients are added later', async () => {
    const ctx = makeCtx();
    (service as any).posts.findById.mockResolvedValue({
      _id: 'post-1',
      userId: 'parent-1',
      sharedWith: ['parent-1'],
      attachedItems: [
        {
          type: 'libItem',
          itemId: 'item-1',
          data: {_id: 'item-1', type: 'link'},
        },
      ],
    });

    await service.updateSharedWith(ctx, 'post-1', ['parent-1', 'admin-2']);

    expect((service as any).permissionService.shareItemWithUsers).toHaveBeenCalledWith(
      ctx,
      'item-1',
      ['admin-2'],
      PermissionType.editor,
      true,
      false,
      true,
      false,
      true,
    );
  });

  it('rejects bundle attachments when the sharer cannot share the backing library item', async () => {
    const ctx = makeCtx();
    (service as any).permissionService._hasSharePermissionDirectOrAsAdmin.mockResolvedValue(false);

    await expect(service.createPost(ctx, {
      data: {text: 'hello'},
      sharedWith: ['parent-1', 'admin-2'],
      attachedItems: [
        {
          type: 'libItemBundle',
          bundleId: 'bundle-1',
          itemId: 'item-1',
          data: {item: {_id: 'item-1', type: 'link'}},
        },
      ],
    } as any)).rejects.toThrow("You don't have permission to share one or more attached library items");

    expect((service as any).posts.create).not.toHaveBeenCalled();
    expect((service as any).userFeedService.add).not.toHaveBeenCalled();
  });

  it('rejects newly added bundle recipients before updating sharedWith', async () => {
    const ctx = makeCtx();
    (service as any).permissionService._hasSharePermissionDirectOrAsAdmin.mockResolvedValue(false);
    (service as any).posts.findById.mockResolvedValue({
      _id: 'post-1',
      userId: 'parent-1',
      sharedWith: ['parent-1'],
      attachedItems: [
        {
          type: 'libItemBundle',
          bundleId: 'bundle-1',
          itemId: 'item-1',
          data: {item: {_id: 'item-1', type: 'link'}},
        },
      ],
    });

    await expect(service.updateSharedWith(ctx, 'post-1', ['parent-1', 'admin-2'])).rejects.toThrow(
      "You don't have permission to share one or more attached library items",
    );

    expect((service as any).posts.updateWithId).not.toHaveBeenCalled();
    expect((service as any).userFeedService.add).not.toHaveBeenCalled();
  });
});