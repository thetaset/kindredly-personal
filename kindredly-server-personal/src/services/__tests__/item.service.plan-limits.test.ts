import {RequestContext} from '@/base/request_context';
import {AuditLogService} from '@/services/audit_log.service';
import ItemService from '@/services/item.service';

describe('ItemService plan limits', () => {
  let service: ItemService;

  beforeEach(() => {
    service = new ItemService();
    (service as any).itemRepo = {
      create: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          whereNot: jest.fn().mockReturnValue({}),
        }),
      }),
      countFromQuery: jest.fn().mockResolvedValue(1000),
    };
    (service as any).changeLog = {
      logLastUpdateForUsers: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(AuditLogService.instance, 'log').mockResolvedValue(undefined as never);
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

  it('blocks new standard library items at the total item limit', async () => {
    const ctx = makeCtx('standard');

    await expect(
      (service as any)._createItem(
        ctx,
        {
          type: 'link',
          name: 'Too many items',
        },
        false,
      ),
    ).rejects.toThrow('maximum number (1000) of library items');

    expect((service as any).itemRepo.create).not.toHaveBeenCalled();
  });
});
