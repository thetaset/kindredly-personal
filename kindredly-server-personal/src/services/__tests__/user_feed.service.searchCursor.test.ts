import {RequestContext} from '@/base/request_context';
import UserFeedService from '@/services/user_feed.service';

describe('UserFeedService.searchPostsByUserId', () => {
  let service: UserFeedService;

  function makeCtx() {
    return new RequestContext({
      currentUserId: 'user-1',
      authUserId: 'user-1',
      accountId: 'acct-1',
      request: {headers: {}},
    });
  }

  function makeQueryRecorder() {
    const nestedCursorInner = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
    };

    const nestedCursorQuery = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn((callback?: (query: typeof nestedCursorInner) => void) => {
        if (typeof callback === 'function') {
          callback(nestedCursorInner);
        }
        return nestedCursorQuery;
      }),
    };

    const query = {
      andWhere: jest.fn((...args: any[]) => {
        if (typeof args[0] === 'function') {
          args[0](nestedCursorQuery);
        }
        return query;
      }),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
    };

    return {
      query,
      nestedCursorQuery,
      nestedCursorInner,
    };
  }

  beforeEach(() => {
    service = new UserFeedService();
    (service as any).usersRepo = {
      findWhereIdIn: jest.fn().mockResolvedValue([]),
    };
    (service as any).commentsRepo = {
      query: jest.fn(),
    };
    (service as any).reactionsRepo = {
      query: jest.fn(),
    };
  });

  it('uses createdAfter, refTypes, and cursor filters without offset paging', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'verifySelfOrAdmin').mockResolvedValue(undefined as never);

    const recorder = makeQueryRecorder();
    jest.spyOn(service as any, '_feedQuery').mockReturnValue(recorder.query);

    await service.searchPostsByUserId(ctx, 'user-1', {
      limit: 51,
      includeComments: false,
      createdAfter: '2026-01-01T00:00:00.000Z',
      cursor: {
        createdAt: '2026-04-01T12:00:00.000Z',
        feedId: 'feed-50',
      },
    });

    expect(recorder.query.andWhere).toHaveBeenCalledWith('user_feed.refType', '=', 'post');
    expect(recorder.query.andWhere).toHaveBeenCalledWith('user_feed.createdAt', '>=', expect.any(Date));
    expect(recorder.query.offset).not.toHaveBeenCalled();
    expect(recorder.query.limit).toHaveBeenCalledWith(51);
    expect(recorder.query.orderBy).toHaveBeenNthCalledWith(1, 'user_feed.createdAt', 'desc');
    expect(recorder.query.orderBy).toHaveBeenNthCalledWith(2, 'user_feed._id', 'desc');

    expect(recorder.nestedCursorQuery.where).toHaveBeenCalledWith('user_feed.createdAt', '<', expect.any(Date));
    expect(recorder.nestedCursorInner.where).toHaveBeenCalledWith('user_feed.createdAt', '=', expect.any(Date));
    expect(recorder.nestedCursorInner.andWhere).toHaveBeenCalledWith('user_feed._id', '<', 'feed-50');
  });

  it('falls back to offset pagination when no cursor is supplied', async () => {
    const ctx = makeCtx();
    jest.spyOn(ctx, 'verifySelfOrAdmin').mockResolvedValue(undefined as never);

    const recorder = makeQueryRecorder();
    jest.spyOn(service as any, '_feedQuery').mockReturnValue(recorder.query);

    await service.searchPostsByUserId(ctx, 'user-1', {
      limit: 10,
      includeComments: false,
    });

    expect(recorder.query.offset).not.toHaveBeenCalled();
  });
});
