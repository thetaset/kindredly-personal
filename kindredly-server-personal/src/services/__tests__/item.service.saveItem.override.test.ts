import {RequestContext} from '@/base/request_context';
import ItemService from '@/services/item.service';

describe('ItemService.saveItem override access-request flow', () => {
  let service: ItemService;

  beforeEach(() => {
    service = new ItemService();

    (service as any).itemRepo = {
      findById: jest.fn(),
    };

    (service as any).permissionService = {
      _hasEditPermissionDirectOrAsAdmin: jest.fn(),
      shareItemWithUsers: jest.fn().mockResolvedValue(undefined),
    };

    (service as any).accessRequestService = {
      _getAccessRequestById: jest.fn().mockResolvedValue({
        _id: 'req-1',
        accountId: 'acct-1',
        requesterId: 'child-1',
      }),
      processAccessRequest: jest.fn().mockResolvedValue(undefined),
    };

    (service as any).feedbackService = {
      _getItemFeedbackForUser: jest.fn().mockResolvedValue(null),
    };

    jest.spyOn(service as any, '_createItem').mockResolvedValue('item-1');
    jest.spyOn(service, 'updateItem').mockResolvedValue(undefined);
    jest.spyOn(service, 'updateItemParents').mockResolvedValue(undefined);
    jest.spyOn(service, 'updateItemFeedbackValue').mockResolvedValue(undefined as never);
  });

  function makeOverrideCtx() {
    const ctx = new RequestContext({
      currentUserId: 'parent-1',
      authUserId: 'child-1',
      accountId: 'acct-1',
      request: {headers: {}},
    });
    ctx.tempAuthUserId = 'parent-1';
    return ctx;
  }

  it('updates parent-owned matched items as the session user, then shares before child collection attach', async () => {
    const ctx = makeOverrideCtx();
    const permissionService = (service as any).permissionService;
    const getAccessRequestById = (service as any).accessRequestService._getAccessRequestById as jest.Mock;

    getAccessRequestById.mockResolvedValue({
      _id: 'req-1',
      accountId: 'acct-1',
      requesterId: 'child-1',
    });

    (service as any).itemRepo.findById.mockResolvedValue({
      _id: 'item-1',
      userId: 'parent-1',
    });

    permissionService._hasEditPermissionDirectOrAsAdmin.mockImplementation(
      async (candidateCtx: RequestContext, itemId: string) => {
        if (itemId === 'item-1') {
          return candidateCtx.currentUserId === 'parent-1';
        }
        if (itemId === 'col-child-1') {
          return candidateCtx.currentUserId === 'child-1';
        }
        return false;
      },
    );

    await service.saveItem(ctx, {
      itemId: 'item-1',
      details: {name: 'Updated item'} as any,
      collectionIds: ['col-child-1'],
      quickShareUserIds: ['child-1'],
      accessRequestId: 'req-1',
    });

    const updateItem = service.updateItem as jest.Mock;
    const updateItemParents = service.updateItemParents as jest.Mock;
    const shareItemWithUsers = permissionService.shareItemWithUsers as jest.Mock;
    const processAccessRequest = (service as any).accessRequestService.processAccessRequest as jest.Mock;

    expect(updateItem).toHaveBeenCalledWith(
      expect.objectContaining({currentUserId: 'parent-1'}),
      'item-1',
      expect.anything(),
    );
    expect(shareItemWithUsers).toHaveBeenCalledWith(expect.objectContaining({currentUserId: 'parent-1'}), 'item-1', [
      'child-1',
    ]);
    expect(updateItemParents).toHaveBeenCalledWith(
      expect.objectContaining({currentUserId: 'child-1'}),
      'item-1',
      ['col-child-1'],
      false,
    );
    expect(processAccessRequest).toHaveBeenCalledWith(
      expect.objectContaining({currentUserId: 'parent-1'}),
      'req-1',
      'approved',
      null,
    );

    expect(shareItemWithUsers.mock.invocationCallOrder[0]).toBeLessThan(updateItemParents.mock.invocationCallOrder[0]);
  });

  it('creates new override items as the child and skips redundant quick-share to the owner', async () => {
    const ctx = makeOverrideCtx();
    const permissionService = (service as any).permissionService;
    const getAccessRequestById = (service as any).accessRequestService._getAccessRequestById as jest.Mock;

    getAccessRequestById.mockResolvedValue({
      _id: 'req-2',
      accountId: 'acct-1',
      requesterId: 'child-1',
    });

    (service as any).itemRepo.findById.mockResolvedValue({
      _id: 'item-1',
      userId: 'child-1',
    });

    permissionService._hasEditPermissionDirectOrAsAdmin.mockResolvedValue(true);

    await service.saveItem(ctx, {
      details: {name: 'New child item', type: 'link'} as any,
      collectionIds: ['col-child-1'],
      quickShareUserIds: ['child-1'],
      accessRequestId: 'req-2',
    });

    const createItem = (service as any)._createItem as jest.Mock;
    const updateItemParents = service.updateItemParents as jest.Mock;
    const shareItemWithUsers = permissionService.shareItemWithUsers as jest.Mock;
    const processAccessRequest = (service as any).accessRequestService.processAccessRequest as jest.Mock;

    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({currentUserId: 'child-1'}),
      expect.anything(),
      false,
    );
    expect(updateItemParents).toHaveBeenCalledWith(
      expect.objectContaining({currentUserId: 'child-1'}),
      'item-1',
      ['col-child-1'],
      false,
    );
    expect(shareItemWithUsers).not.toHaveBeenCalled();
    expect(processAccessRequest).toHaveBeenCalledWith(
      expect.objectContaining({currentUserId: 'parent-1'}),
      'req-2',
      'approved',
      null,
    );
  });
});
