/**
 * Outside services an app may call with no prompt, and the keys a guardian approves for any other
 * site (HAT-629, docs/trackers/app-outside-services-tracker.md).
 *
 * The host reads the list to decide where a call goes: a call on it is sent to our server
 * (`/data/appService`) instead of being made from the browser. The server checks every call
 * against the same list again before making it. That second check is the one that matters — it is
 * what keeps `/data/appService` from being a proxy to anywhere.
 */

export type CheckedServiceHost = {
  /** The host an app calls. */
  host: string;
  /** The paths an app may call on it, matched exactly. */
  paths: string[];
  /** The host the server calls instead once a paid key is set. */
  keyedHost: string;
  /** How long one answer is shared by everyone, in seconds. */
  cacheSeconds: number;
};

export type CheckedService = {
  id: string;
  /** What the app is using, in words a person reads. */
  name: string;
  /** The credit an app shows; the data licence requires it. */
  credit: string;
  /** The environment variable holding the paid key, when the service has one. */
  keyEnv?: string;
  hosts: CheckedServiceHost[];
};

export const CHECKED_SERVICES: CheckedService[] = [
  {
    id: 'open-meteo',
    name: 'Weather',
    credit: 'Weather data by Open-Meteo.com',
    keyEnv: 'OPEN_METEO_API_KEY',
    hosts: [
      {
        host: 'api.open-meteo.com',
        paths: ['/v1/forecast'],
        keyedHost: 'customer-api.open-meteo.com',
        cacheSeconds: 10 * 60,
      },
      {
        // Place search: a weather app that may not use location asks for a city instead.
        host: 'geocoding-api.open-meteo.com',
        paths: ['/v1/search'],
        keyedHost: 'customer-geocoding-api.open-meteo.com',
        cacheSeconds: 7 * 24 * 60 * 60,
      },
    ],
  },
];

/** Long enough for any real forecast query; bounds the cache key and what one call can carry. */
export const CHECKED_SERVICE_MAX_URL_LENGTH = 2000;

export type CheckedServiceMatch = {
  service: CheckedService;
  host: CheckedServiceHost;
  url: URL;
};

/**
 * The checked service a call is for, or null. GET over https only, to a listed host and path, with
 * no user name, password or port — anything else is not on the list.
 */
export function matchCheckedService(rawUrl: unknown, method: unknown = 'GET'): CheckedServiceMatch | null {
  if (String(method || 'GET').toUpperCase() !== 'GET') return null;

  const text = String(rawUrl || '').trim();
  if (!text || text.length > CHECKED_SERVICE_MAX_URL_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;

  const hostname = url.hostname.toLowerCase();
  for (const service of CHECKED_SERVICES) {
    for (const host of service.hosts) {
      if (host.host === hostname && host.paths.includes(url.pathname)) return {service, host, url};
    }
  }
  return null;
}

/**
 * A guardian's approval for one app to reach one site: `net.fetch.<host>` to get data from it,
 * `net.send.<host>` to send data to it. Kept apart so a yes to reading never becomes a yes to
 * sending.
 */
export type AppSiteGrantKey = `net.fetch.${string}` | `net.send.${string}`;

const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

export function appSiteGrantKey(kind: 'fetch' | 'send', hostname: string): AppSiteGrantKey {
  return `net.${kind}.${String(hostname || '').toLowerCase()}` as AppSiteGrantKey;
}

export function parseAppSiteGrantKey(key: unknown): {kind: 'fetch' | 'send'; host: string} | null {
  const match = /^net\.(fetch|send)\.(.+)$/.exec(String(key || ''));
  if (!match || !HOSTNAME.test(match[2])) return null;
  return {kind: match[1] as 'fetch' | 'send', host: match[2]};
}

export function isAppSiteGrantKey(key: unknown): key is AppSiteGrantKey {
  return parseAppSiteGrantKey(key) !== null;
}
