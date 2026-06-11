import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';
import type {AxiosRequestConfig} from 'axios';

/**
 * SSRF guard for fetching user-supplied URLs (proxy endpoints, metadata
 * lookups). Blocks requests that would land on private/internal addresses —
 * cloud metadata (169.254.169.254), localhost, VPC-internal services, etc.
 *
 * Defense is layered so DNS tricks can't bypass it:
 *  - assertSafeExternalUrl: protocol allowlist + literal-IP check up front
 *  - guarded agents: every DNS resolution (initial and redirect hops) is
 *    checked at connection time, so check-then-fetch races don't apply
 *  - beforeRedirect: re-checks protocol and literal-IP redirect targets,
 *    which skip DNS lookup entirely
 *
 * Personal/private servers that legitimately fetch from their own LAN can
 * opt out with ALLOW_PRIVATE_NETWORK_FETCH=true.
 */

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_RESPONSE_BYTES = 25 * 1024 * 1024;

function allowPrivateNetworkFetch(): boolean {
  return process.env.ALLOW_PRIVATE_NETWORK_FETCH === 'true';
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function inCidr(ipInt: number, cidrBase: string, bits: number): boolean {
  const shift = 32 - bits;
  return ipInt >>> shift === ipv4ToInt(cidrBase) >>> shift;
}

const FORBIDDEN_IPV4_CIDRS: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local + cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

function isForbiddenIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return FORBIDDEN_IPV4_CIDRS.some(([base, bits]) => inCidr(ipInt, base, bits));
}

function isForbiddenIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // IPv4-mapped/translated (::ffff:1.2.3.4, 64:ff9b::1.2.3.4) — check the embedded IPv4
  const v4Match = lower.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4Match && (lower.startsWith('::ffff:') || lower.startsWith('64:ff9b:'))) {
    return isForbiddenIpv4(v4Match[1]);
  }

  if (lower === '::' || lower === '::1') return true; // unspecified, loopback
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true; // link-local fe80::/10
  }
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local fc00::/7
  if (lower.startsWith('ff')) return true; // multicast
  if (lower.startsWith('2001:db8:')) return true; // documentation
  return false;
}

export function isForbiddenIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isForbiddenIpv4(ip);
  if (family === 6) return isForbiddenIpv6(ip);
  return true; // not an IP at all — treat as forbidden where an IP is expected
}

/**
 * Validates protocol and literal-IP hosts of a user-supplied URL. Hostnames
 * are validated at DNS-resolution time by the guarded agents.
 * Throws on invalid/forbidden URLs; returns the parsed URL otherwise.
 */
export function assertSafeExternalUrl(rawUrl: unknown): URL {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('A URL is required');
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`URL protocol not allowed: ${parsed.protocol}`);
  }
  if (allowPrivateNetworkFetch()) {
    return parsed;
  }
  // URL.hostname wraps IPv6 literals in brackets
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isForbiddenIp(host)) {
    throw new Error(`URL host not allowed: ${parsed.hostname}`);
  }
  return parsed;
}

// dns.lookup-compatible wrapper that rejects private/internal results. Used
// as the agent-level lookup so every connection (including redirect hops) is
// checked against the addresses actually being dialed.
function guardedLookup(hostname: string, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, {...options, all: true}, (err, addresses: any) => {
    if (err) {
      callback(err);
      return;
    }
    const list: Array<{address: string; family: number}> = Array.isArray(addresses) ? addresses : [addresses];
    if (!allowPrivateNetworkFetch()) {
      const blocked = list.find((entry) => isForbiddenIp(entry.address));
      if (blocked) {
        callback(new Error(`Blocked fetch: ${hostname} resolves to a private address`));
        return;
      }
    }
    if (options.all) {
      callback(null, list);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
}

// keepAlive matches Node >= 19's default global agent — without it these
// custom agents would silently disable connection reuse for every guarded
// fetch (fresh DNS + TCP + TLS per request to the same host).
const guardedHttpAgent = new http.Agent({lookup: guardedLookup, keepAlive: true} as http.AgentOptions);
const guardedHttpsAgent = new https.Agent({lookup: guardedLookup, keepAlive: true} as https.AgentOptions);

// Redirect targets with literal-IP hosts never hit DNS lookup, so the agent
// guard can't see them — validate each hop here.
function beforeRedirect(options: {protocol?: string; hostname?: string}) {
  if (options.protocol && options.protocol !== 'http:' && options.protocol !== 'https:') {
    throw new Error(`Blocked redirect to protocol: ${options.protocol}`);
  }
  if (allowPrivateNetworkFetch()) return;
  const host = String(options.hostname || '').replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isForbiddenIp(host)) {
    throw new Error(`Blocked redirect to private address: ${host}`);
  }
}

/**
 * Axios config that enforces the SSRF guard. Spread over any request that
 * fetches a user-supplied URL: axios.get(url, safeFetchConfig({...})).
 */
export function safeFetchConfig(extra: AxiosRequestConfig = {}): AxiosRequestConfig {
  return {
    timeout: DEFAULT_TIMEOUT_MS,
    maxRedirects: 5,
    // Bound buffered (non-stream) responses — without this, a user-supplied
    // URL serving unbounded content is held in memory until the timeout.
    // Streams are unaffected (callers cap those separately).
    maxContentLength: DEFAULT_MAX_RESPONSE_BYTES,
    maxBodyLength: DEFAULT_MAX_RESPONSE_BYTES,
    ...extra,
    httpAgent: guardedHttpAgent,
    httpsAgent: guardedHttpsAgent,
    beforeRedirect,
  } as AxiosRequestConfig;
}
