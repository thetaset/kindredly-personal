import { REFERENCE_SITE_KIND_ID, SEARCH_ENGINE_KIND_ID } from './kinds/kindRegistry';

export type SearchProviderId = 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';

export type SearchProviderPageState = 'homepage' | 'results' | 'other';

export interface SearchProviderMatch {
  id: SearchProviderId;
  displayName: string;
  hostname: string;
  pageState: SearchProviderPageState;
  query: string | null;
}

type SearchProviderDefinition = {
  id: SearchProviderId;
  displayName: string;
  matchesHostname: (hostname: string) => boolean;
  /**
   * Stricter test for "this URL IS the search engine", as opposed to "this URL is on one of
   * the company's domains". Google needs it: docs.google.com and drive.google.com match
   * matchesHostname, and a saved Google Doc must not read as having Google search.
   * Defaults to matchesHostname where the two are the same question.
   */
  matchesLookupHostname?: (hostname: string) => boolean;
  getPageState: (url: URL, query: string | null) => SearchProviderPageState;
  queryParamNames: string[];
  // Path + query on the provider's OWN origin, with a {q} placeholder; the builder owns
  // encoding. Kept origin-relative so a search can be run on whichever origin the person
  // actually has — google.co.uk, simple.wikipedia.org — rather than always the .com one.
  searchPath: string;
  // Engine homepage, used for library/allowlist access checks. No trailing slash.
  homepageUrl: string;
  // Bootstrap icon name. Neutral for now; brand SVGs are a cosmetic follow-up.
  iconName: string;
};

const SEARCH_PROVIDER_DEFINITIONS: SearchProviderDefinition[] = [
  {
    id: 'google',
    displayName: 'Google',
    // Google has many country TLDs (google.com, google.co.uk, google.de, ...);
    // match them all so non-.com searches aren't mislabeled as ordinary links.
    matchesHostname: (hostname) => /(^|\.)google\.[a-z.]{2,}$/.test(hostname),
    matchesLookupHostname: (hostname) => /^(www\.)?google\.[a-z.]{2,}$/.test(hostname),
    getPageState: (url, query) => {
      const pathname = (url.pathname || '').toLowerCase();
      if ((pathname === '/' || pathname === '/webhp') && !query) return 'homepage';
      if (pathname === '/search' || (!!query && pathname === '/')) return 'results';
      return 'other';
    },
    queryParamNames: ['q'],
    searchPath: '/search?q={q}',
    homepageUrl: 'https://www.google.com',
    iconName: 'globe',
  },
  {
    id: 'duckduckgo',
    displayName: 'DuckDuckGo',
    matchesHostname: (hostname) => {
      return hostname === 'duckduckgo.com' || hostname === 'www.duckduckgo.com' || hostname === 'ddg.gg';
    },
    getPageState: (url, query) => {
      const pathname = (url.pathname || '').toLowerCase();
      if ((pathname === '/' || pathname === '') && !query) return 'homepage';
      if (!!query) return 'results';
      return 'other';
    },
    queryParamNames: ['q'],
    searchPath: '/?q={q}',
    homepageUrl: 'https://duckduckgo.com',
    iconName: 'shield',
  },
  {
    id: 'bing',
    displayName: 'Bing',
    matchesHostname: (hostname) => {
      return hostname === 'bing.com' || hostname === 'www.bing.com';
    },
    getPageState: (url, query) => {
      const pathname = (url.pathname || '').toLowerCase();
      if ((pathname === '/' || pathname === '') && !query) return 'homepage';
      if (pathname === '/search' || !!query) return 'results';
      return 'other';
    },
    queryParamNames: ['q'],
    searchPath: '/search?q={q}',
    homepageUrl: 'https://www.bing.com',
    iconName: 'search',
  },
  {
    id: 'brave',
    displayName: 'Brave',
    matchesHostname: (hostname) => {
      return hostname === 'search.brave.com';
    },
    getPageState: (url, query) => {
      const pathname = (url.pathname || '').toLowerCase();
      if ((pathname === '/' || pathname === '') && !query) return 'homepage';
      if (pathname === '/search' || !!query) return 'results';
      return 'other';
    },
    queryParamNames: ['q'],
    searchPath: '/search?q={q}',
    homepageUrl: 'https://search.brave.com',
    iconName: 'shield-shaded',
  },
  {
    id: 'ecosia',
    displayName: 'Ecosia',
    matchesHostname: (hostname) => {
      return hostname === 'ecosia.org' || hostname === 'www.ecosia.org';
    },
    getPageState: (url, query) => {
      const pathname = (url.pathname || '').toLowerCase();
      if ((pathname === '/' || pathname === '') && !query) return 'homepage';
      if (pathname === '/search' || !!query) return 'results';
      return 'other';
    },
    queryParamNames: ['q'],
    searchPath: '/search?q={q}',
    homepageUrl: 'https://www.ecosia.org',
    iconName: 'tree',
  },
];

function getSearchQuery(url: URL, queryParamNames: string[]): string | null {
  for (const queryParamName of queryParamNames) {
    const value = (url.searchParams.get(queryParamName) || '').trim();
    if (value) return value;
  }
  return null;
}

export function detectSearchProvider(urlString?: string | null): SearchProviderMatch | null {
  if (!urlString) return null;

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (_error) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const provider = SEARCH_PROVIDER_DEFINITIONS.find((definition) => definition.matchesHostname(hostname));
  if (!provider) return null;

  const query = getSearchQuery(parsed, provider.queryParamNames);

  return {
    id: provider.id,
    displayName: provider.displayName,
    hostname,
    pageState: provider.getPageState(parsed, query),
    query,
  };
}

export type SearchEngineOption = {
  id: SearchProviderId;
  displayName: string;
  iconName: string;
  homepageUrl: string;
};

export function getSearchProviderById(id: SearchProviderId): SearchProviderDefinition | null {
  return SEARCH_PROVIDER_DEFINITIONS.find((definition) => definition.id === id) || null;
}

/** Absolute "{q}" template for an engine, e.g. for the native browser's address bar. */
export function getSearchUrlTemplate(id: SearchProviderId): string {
  const provider = getSearchProviderById(id);
  if (!provider) return '';
  return `${provider.homepageUrl}${provider.searchPath}`;
}

export function buildSearchUrl(id: SearchProviderId, query: string): string {
  const provider = getSearchProviderById(id);
  if (!provider) return '';
  return applySearchPath(provider.homepageUrl, provider.searchPath, query);
}

export function listSearchEngines(): SearchEngineOption[] {
  return SEARCH_PROVIDER_DEFINITIONS.map((definition) => ({
    id: definition.id,
    displayName: definition.displayName,
    iconName: definition.iconName,
    homepageUrl: definition.homepageUrl,
  }));
}

// ---- Lookup providers ------------------------------------------------------
//
// "Where else could this query go?" — the engines above plus Wikipedia. Wikipedia is
// deliberately NOT a search provider: it never becomes the default engine and browsing to
// it is not "searching", so detectSearchProvider and listSearchEngines stay engines-only.
// It is a lookup provider because it answers the same question for a restricted kid, who
// often has it in their library when they have no engine at all.
//
// Each provider names the kind an item carries when it IS that provider, which is how a
// library is asked "do you have Google?" without the server learning the answer.

export type LookupProviderId = SearchProviderId | 'wikipedia';

export type LookupProviderRole = 'engine' | 'reference';

export type LookupProvider = {
  id: LookupProviderId;
  role: LookupProviderRole;
  displayName: string;
  iconName: string;
  /** Homepage, used for the library-membership check. No trailing slash. */
  homepageUrl: string;
  /** The kind an item carries when it is this provider. */
  kindId: string;
  matchesHostname: (hostname: string) => boolean;
  searchPath: string;
};

const WIKIPEDIA_LOOKUP_PROVIDER: LookupProvider = {
  id: 'wikipedia',
  role: 'reference',
  displayName: 'Wikipedia',
  iconName: 'book',
  homepageUrl: 'https://en.wikipedia.org',
  kindId: REFERENCE_SITE_KIND_ID,
  // Any language edition: a family may have allowlisted simple.wikipedia.org and nothing else.
  matchesHostname: (hostname) => /(^|\.)wikipedia\.org$/.test(hostname),
  searchPath: '/w/index.php?search={q}',
};

const LOOKUP_PROVIDERS: LookupProvider[] = [
  ...SEARCH_PROVIDER_DEFINITIONS.map((definition) => ({
    id: definition.id as LookupProviderId,
    role: 'engine' as LookupProviderRole,
    displayName: definition.displayName,
    iconName: definition.iconName,
    homepageUrl: definition.homepageUrl,
    kindId: SEARCH_ENGINE_KIND_ID,
    matchesHostname: definition.matchesLookupHostname || definition.matchesHostname,
    searchPath: definition.searchPath,
  })),
  WIKIPEDIA_LOOKUP_PROVIDER,
];

/** Every place a query can be sent, engines first, in catalog order. */
export function listLookupProviders(): LookupProvider[] {
  return LOOKUP_PROVIDERS;
}

export function getLookupProviderById(id: LookupProviderId): LookupProvider | null {
  return LOOKUP_PROVIDERS.find((provider) => provider.id === id) || null;
}

/** The kinds that mark an item as somewhere you can search. */
export function listLookupProviderKindIds(): string[] {
  return [SEARCH_ENGINE_KIND_ID, REFERENCE_SITE_KIND_ID];
}

/** Which provider a URL belongs to, or null. Used to recognise a library item as an engine. */
export function matchLookupProvider(urlString?: string | null): LookupProvider | null {
  if (!urlString) return null;

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (_error) {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const hostname = parsed.hostname.toLowerCase();
  return LOOKUP_PROVIDERS.find((provider) => provider.matchesHostname(hostname)) || null;
}

/**
 * Runs a lookup provider's search on `origin` when that origin really is this provider
 * (the library item's own domain), and on its canonical homepage otherwise. A kid whose
 * library holds only simple.wikipedia.org must not be sent to en.wikipedia.org and blocked.
 */
export function buildLookupSearchUrl(
  id: LookupProviderId,
  query: string,
  opts: { origin?: string | null } = {},
): string {
  const provider = getLookupProviderById(id);
  if (!provider) return '';
  return applySearchPath(resolveProviderOrigin(provider, opts.origin), provider.searchPath, query);
}

function resolveProviderOrigin(provider: LookupProvider, origin?: string | null): string {
  if (!origin) return provider.homepageUrl;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return provider.homepageUrl;
    if (!provider.matchesHostname(parsed.hostname.toLowerCase())) return provider.homepageUrl;
    return parsed.origin;
  } catch (_error) {
    return provider.homepageUrl;
  }
}

function applySearchPath(origin: string, searchPath: string, query: string): string {
  return `${origin}${searchPath.replace('{q}', encodeURIComponent(query || ''))}`;
}

// ---- Wikipedia -------------------------------------------------------------
// Kept as named exports because the allowlist check and older callers use them directly.

export const WIKIPEDIA_HOMEPAGE_URL = `${WIKIPEDIA_LOOKUP_PROVIDER.homepageUrl}/`;

export function buildWikipediaSearchUrl(query: string, opts: { origin?: string | null } = {}): string {
  const trimmed = (query || '').trim();
  if (!trimmed) return WIKIPEDIA_HOMEPAGE_URL;
  return buildLookupSearchUrl('wikipedia', trimmed, opts);
}
