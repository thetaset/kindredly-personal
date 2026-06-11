import {config} from '@/config';
import {rateLimitMiddleware, rateLimitMiddlewareAuth} from '../middlewares/ratelimiting.middleware';

function mockReq(ip: string, path = '/api/some/endpoint') {
  return {ip, path} as any;
}

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('rateLimitMiddleware', () => {
  const originalEnabled = config.rateLimitingEnabled;

  afterEach(() => {
    config.rateLimitingEnabled = originalEnabled;
  });

  test('bypasses limiting when disabled', async () => {
    config.rateLimitingEnabled = false;
    const res = mockRes();
    const next = jest.fn();
    for (let i = 0; i < config.rateLimiting.default.points + 10; i++) {
      await rateLimitMiddleware(mockReq('10.0.0.1'), res, next);
    }
    expect(next).toHaveBeenCalledTimes(config.rateLimiting.default.points + 10);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 429 after default points are exhausted', async () => {
    config.rateLimitingEnabled = true;
    const res = mockRes();
    const next = jest.fn();
    const points = config.rateLimiting.default.points;
    for (let i = 0; i < points; i++) {
      await rateLimitMiddleware(mockReq('10.0.0.2'), res, next);
    }
    expect(next).toHaveBeenCalledTimes(points);
    expect(res.status).not.toHaveBeenCalled();

    await rateLimitMiddleware(mockReq('10.0.0.2'), res, next);
    expect(next).toHaveBeenCalledTimes(points);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  test('buckets are per IP', async () => {
    config.rateLimitingEnabled = true;
    const res = mockRes();
    const next = jest.fn();
    const points = config.rateLimiting.default.points;
    for (let i = 0; i < points; i++) {
      await rateLimitMiddleware(mockReq('10.0.0.3'), res, next);
    }
    await rateLimitMiddleware(mockReq('10.0.0.3'), res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    const res2 = mockRes();
    await rateLimitMiddleware(mockReq('10.0.0.4'), res2, next);
    expect(res2.status).not.toHaveBeenCalled();
  });
});

describe('rateLimitMiddlewareAuth', () => {
  const originalEnabled = config.rateLimitingEnabled;

  afterEach(() => {
    config.rateLimitingEnabled = originalEnabled;
  });

  test('returns 429 after auth points are exhausted', async () => {
    config.rateLimitingEnabled = true;
    const res = mockRes();
    const next = jest.fn();
    const points = config.rateLimiting.auth.points;
    for (let i = 0; i < points; i++) {
      await rateLimitMiddlewareAuth(mockReq('10.0.1.1', '/api/auth/signin'), res, next);
    }
    expect(next).toHaveBeenCalledTimes(points);

    await rateLimitMiddlewareAuth(mockReq('10.0.1.1', '/api/auth/signin'), res, next);
    expect(next).toHaveBeenCalledTimes(points);
    expect(res.status).toHaveBeenCalledWith(429);
  });
});
