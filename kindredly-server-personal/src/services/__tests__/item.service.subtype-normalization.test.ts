import {RequestContext} from '@/base/request_context';
import {AuditLogService} from '@/services/audit_log.service';
import ItemService from '@/services/item.service';

describe('ItemService subtype normalization', () => {
  let service: ItemService;

  beforeEach(() => {
    service = new ItemService();
    (service as any).itemRepo = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).changeLog = {
      logLastUpdateForUsers: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(AuditLogService.instance, 'log').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeCtx() {
    return new RequestContext({
      currentUserId: 'user-1',
      authUserId: 'user-1',
      accountId: 'acct-1',
      request: {headers: {}},
    });
  }

  it('canonicalizes legacy info subtype to information on create', async () => {
    const ctx = makeCtx();

    await (service as any)._createItem(
      ctx,
      {
        type: 'thing',
        subType: 'info',
        name: 'Legacy info item',
      },
      false,
    );

    expect((service as any).itemRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'thing',
        subType: 'information',
      }),
    );
  });
});
