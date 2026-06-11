import {SessionService} from '@/services/session.service';
import {UserSessionRepo} from '@/db/user_session.repo';
import {getRedisClient} from '@/base/redis_client';
import {redactTokens} from '@/utils/logger';

jest.mock('@/db/user_session.repo');
jest.mock('@/base/redis_client');

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  pipeline: jest.fn(() => ({set: jest.fn(), exec: jest.fn()})),
};

(getRedisClient as jest.Mock).mockReturnValue(mockRedis);

function makeService() {
  const repo = new UserSessionRepo() as jest.Mocked<UserSessionRepo>;
  return {service: new SessionService(repo), repo};
}

describe('SessionService.checkSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  test('lazily adopts unknown sessions and allows them', async () => {
    const {service, repo} = makeService();
    mockRedis.get.mockResolvedValue(null);
    repo.findById.mockResolvedValue(undefined);

    const result = await service.checkSession('sess1', 'u_1', {accountId: 'ac_1'});

    expect(result.ok).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({_id: 'sess1', userId: 'u_1'}));
    expect(mockRedis.set).toHaveBeenCalledWith('usess:sess1', 'ok', 'EX', expect.any(Number));
  });

  test('rejects revoked sessions', async () => {
    const {service, repo} = makeService();
    mockRedis.get.mockResolvedValue(null);
    repo.findById.mockResolvedValue({
      _id: 'sess2',
      userId: 'u_1',
      revokedAt: new Date(),
      revokedReason: 'password_changed',
    } as any);

    const result = await service.checkSession('sess2', 'u_1');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('password_changed');
  });

  test('uses redis cache without touching the DB', async () => {
    const {service, repo} = makeService();
    mockRedis.get.mockResolvedValue('ok');

    const result = await service.checkSession('sess3', 'u_1');

    expect(result.ok).toBe(true);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  test('cached revoked verdict rejects without DB', async () => {
    const {service, repo} = makeService();
    mockRedis.get.mockResolvedValue('revoked');

    const result = await service.checkSession('sess4', 'u_1');

    expect(result.ok).toBe(false);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  test('fails open when redis is down', async () => {
    const {service} = makeService();
    mockRedis.get.mockRejectedValue(new Error('redis down'));

    const result = await service.checkSession('sess5', 'u_1');

    expect(result.ok).toBe(true);
  });

  test('known active session is allowed and lastSeenAt touch is throttled', async () => {
    const {service, repo} = makeService();
    mockRedis.get.mockResolvedValue(null);
    repo.findById.mockResolvedValue({
      _id: 'sess6',
      userId: 'u_1',
      lastSeenAt: new Date(), // fresh — should NOT touch
      revokedAt: null,
    } as any);

    const result = await service.checkSession('sess6', 'u_1');

    expect(result.ok).toBe(true);
    expect(repo.touch).not.toHaveBeenCalled();

    repo.findById.mockResolvedValue({
      _id: 'sess6',
      userId: 'u_1',
      lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // stale — should touch
      revokedAt: null,
    } as any);
    repo.touch.mockResolvedValue(1 as any);

    await service.checkSession('sess6', 'u_1');
    expect(repo.touch).toHaveBeenCalledWith('sess6');
  });
});

describe('SessionService revocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  test('revokeAllForUser revokes and invalidates cache', async () => {
    const {service, repo} = makeService();
    repo.revokeAllForUser.mockResolvedValue([{_id: 'a'}, {_id: 'b'}] as any);
    const pipeline = {set: jest.fn(), exec: jest.fn()};
    mockRedis.pipeline.mockReturnValue(pipeline);

    const count = await service.revokeAllForUser('u_1', 'password_changed', 'keep-me');

    expect(count).toBe(2);
    expect(repo.revokeAllForUser).toHaveBeenCalledWith('u_1', 'password_changed', 'keep-me');
    expect(pipeline.set).toHaveBeenCalledTimes(2);
  });
});

describe('SSE tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  test('create stores a random ticket and consume is single-use', async () => {
    const {service} = makeService();
    mockRedis.set.mockResolvedValue('OK');

    const ticket = await service.createSseTicket({userId: 'u_1', accountId: 'ac_1', sessionId: 's_1'});
    expect(ticket.length).toBeGreaterThanOrEqual(24);
    expect(mockRedis.set).toHaveBeenCalledWith(`sset:${ticket}`, expect.any(String), 'EX', expect.any(Number));

    mockRedis.get.mockResolvedValue(JSON.stringify({userId: 'u_1', accountId: 'ac_1', sessionId: 's_1'}));
    mockRedis.del.mockResolvedValue(1);
    const authInfo = await service.consumeSseTicket(ticket);
    expect(authInfo).toEqual({userId: 'u_1', accountId: 'ac_1', sessionId: 's_1'});
    expect(mockRedis.del).toHaveBeenCalledWith(`sset:${ticket}`);

    mockRedis.get.mockResolvedValue(null);
    expect(await service.consumeSseTicket(ticket)).toBeNull();
  });

  test('concurrent consumption loses the DEL race and is rejected', async () => {
    const {service} = makeService();
    mockRedis.get.mockResolvedValue(JSON.stringify({userId: 'u_1', sessionId: 's_1'}));
    mockRedis.del.mockResolvedValue(0); // another consumer already deleted it

    expect(await service.consumeSseTicket('race-ticket')).toBeNull();
  });

  test('consume rejects junk input', async () => {
    const {service} = makeService();
    expect(await service.consumeSseTicket(null)).toBeNull();
    expect(await service.consumeSseTicket(42)).toBeNull();
    expect(await service.consumeSseTicket('')).toBeNull();
  });
});

describe('verifyAuthInfoSession (shared chokepoint)', () => {
  const {config} = require('@/config');
  const originalMode = config.sessionEnforcement;

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  afterEach(() => {
    config.sessionEnforcement = originalMode;
  });

  test('enforce mode rejects revoked sessions', async () => {
    config.sessionEnforcement = 'enforce';
    const {service} = makeService();
    mockRedis.get.mockResolvedValue('revoked');

    const result = await service.verifyAuthInfoSession({sessionId: 's_1', userId: 'u_1'});
    expect(result.ok).toBe(false);
  });

  test('log mode allows revoked sessions', async () => {
    config.sessionEnforcement = 'log';
    const {service} = makeService();
    mockRedis.get.mockResolvedValue('revoked');

    const result = await service.verifyAuthInfoSession({sessionId: 's_1', userId: 'u_1'});
    expect(result.ok).toBe(true);
  });

  test('off mode skips the check entirely', async () => {
    config.sessionEnforcement = 'off';
    const {service, repo} = makeService();

    const result = await service.verifyAuthInfoSession({sessionId: 's_1', userId: 'u_1'});
    expect(result.ok).toBe(true);
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(repo.findById).not.toHaveBeenCalled();
  });

  test('tokens without sessionId/userId pass through (admin/legacy shapes)', async () => {
    config.sessionEnforcement = 'enforce';
    const {service} = makeService();

    expect((await service.verifyAuthInfoSession({sessionId: 's_only'} as any)).ok).toBe(true);
    expect((await service.verifyAuthInfoSession(undefined)).ok).toBe(true);
  });
});

describe('redactTokens', () => {
  test('masks token and ticket query params', () => {
    expect(redactTokens('GET /v3.0/sync/events?token=eyJhbGciOi.abc.def&clientId=CLID_x 200')).toBe(
      'GET /v3.0/sync/events?token=[REDACTED]&clientId=CLID_x 200',
    );
    expect(redactTokens('GET /x?ticket=abc123 200')).toBe('GET /x?ticket=[REDACTED] 200');
    expect(redactTokens('GET /x?a=1&Token=zzz 200')).toBe('GET /x?a=1&Token=[REDACTED] 200');
  });

  test('leaves other params alone', () => {
    expect(redactTokens('GET /x?clientId=abc&type=image 200')).toBe('GET /x?clientId=abc&type=image 200');
  });
});
