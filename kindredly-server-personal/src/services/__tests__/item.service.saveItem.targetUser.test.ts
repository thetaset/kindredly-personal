import {RequestContext} from '@/base/request_context';
import ItemService from '@/services/item.service';

describe('ItemService.saveItem target user routing', () => {
  let service: ItemService;

  beforeEach(() => {
    service = new ItemService();

    (service as any).itemRepo = {
      findById: jest.fn().mockResolvedValue({
        _id: 'item-1',
        userId: 'child-1',
      }),
    };

    (service as any).permissionService = {
      shareItemWithUsers: jest.fn().mockResolvedValue(undefined),
    };

    (service as any).feedbackService = {
      _getItemFeedbackForUser: jest.fn().mockResolvedValue(null),
    };

    jest.spyOn(service as any, '_createItem').mockResolvedValue('item-1');
    jest.spyOn(service, 'updateItem').mockResolvedValue(undefined);
    jest.spyOn(service, 'updateItemParents').mockResolvedValue(undefined);
    jest.spyOn(service, 'updateItemFeedbackValue').mockResolvedValue(undefined as never);
  });

  it('creates new targeted items as the child user instead of the acting parent', async () => {
    const ctx = new RequestContext({
      currentUserId: 'parent-1',
      authUserId: 'parent-1',
      accountId: 'acct-1',
      request: {headers: {}},
    });

    jest.spyOn(ctx, 'verifySelfOrAdmin').mockResolvedValue(undefined);

    await service.saveItem(ctx, {
      targetUserId: 'child-1',
      details: {
        name: 'Starter link',
        type: 'link',
        url: 'https://example.com/learn',
      } as any,
      isNew: true,
    });

    expect(ctx.verifySelfOrAdmin).toHaveBeenCalledWith('child-1');
    expect((service as any)._createItem).toHaveBeenCalledWith(
      expect.objectContaining({currentUserId: 'child-1', authUserId: 'parent-1'}),
      expect.objectContaining({name: 'Starter link'}),
      true,
    );
  });
});