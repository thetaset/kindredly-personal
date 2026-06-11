import {assertSafeExternalUrl, isForbiddenIp, safeFetchConfig} from '@/utils/safe_fetch';
import http from 'http';

describe('isForbiddenIp', () => {
  test.each([
    '127.0.0.1',
    '127.255.255.254',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '100.64.0.1', // CGNAT
    '0.0.0.0',
    '255.255.255.255',
    '224.0.0.1',
    '::1',
    '::',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '64:ff9b::192.168.0.1',
  ])('blocks %s', (ip) => {
    expect(isForbiddenIp(ip)).toBe(true);
  });

  test.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '172.32.0.1', // just outside 172.16/12
    '11.0.0.1', // just outside 10/8
    '2606:4700:4700::1111',
    '::ffff:8.8.8.8',
  ])('allows %s', (ip) => {
    expect(isForbiddenIp(ip)).toBe(false);
  });

  test('treats non-IP input as forbidden', () => {
    expect(isForbiddenIp('not-an-ip')).toBe(true);
  });
});

describe('assertSafeExternalUrl', () => {
  test('allows normal public http/https URLs', () => {
    expect(assertSafeExternalUrl('https://example.com/image.png').hostname).toBe('example.com');
    expect(assertSafeExternalUrl('http://example.com/feed.xml').hostname).toBe('example.com');
  });

  test.each([
    'file:///etc/passwd',
    'gopher://example.com',
    'ftp://example.com/x',
    'javascript:alert(1)',
  ])('rejects non-http protocol %s', (url) => {
    expect(() => assertSafeExternalUrl(url)).toThrow(/protocol/i);
  });

  test.each([
    'http://127.0.0.1/admin',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]:8080/',
    'http://10.0.0.1/internal',
    'http://192.168.1.1/',
  ])('rejects literal private IP %s', (url) => {
    expect(() => assertSafeExternalUrl(url)).toThrow(/not allowed/i);
  });

  test.each(['', null, undefined, 42, 'not a url'])('rejects invalid input %p', (url) => {
    expect(() => assertSafeExternalUrl(url)).toThrow();
  });

  test('ALLOW_PRIVATE_NETWORK_FETCH=true permits private hosts', () => {
    process.env.ALLOW_PRIVATE_NETWORK_FETCH = 'true';
    try {
      expect(assertSafeExternalUrl('http://192.168.1.1/').hostname).toBe('192.168.1.1');
    } finally {
      delete process.env.ALLOW_PRIVATE_NETWORK_FETCH;
    }
  });
});

describe('guarded agent DNS lookup', () => {
  test('blocks connections to hostnames resolving to private addresses', async () => {
    // localhost resolves to 127.0.0.1/::1 — the agent-level guard must refuse
    // the connection even though the URL itself names no IP.
    const agent = safeFetchConfig().httpAgent as http.Agent;
    const err = await new Promise<Error>((resolve) => {
      const req = http.get({host: 'localhost', port: 65500, path: '/', agent}, () => {
        resolve(new Error('request unexpectedly succeeded'));
      });
      req.on('error', resolve);
      req.setTimeout(5000, () => {
        req.destroy(new Error('timeout'));
      });
    });
    expect(String(err.message)).toMatch(/private address/i);
  });
});
