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
  getPageState: (url: URL, query: string | null) => SearchProviderPageState;
  queryParamNames: string[];
  // Search URL template with a {q} placeholder; the builder owns encoding.
  searchUrlTemplate: string;
  // Engine homepage, used for library/allowlist access checks.
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
    getPageState: (url, query) => {
      const pathname = (url.pathname || '').toLowerCase();
      if ((pathname === '/' || pathname === '/webhp') && !query) return 'homepage';
      if (pathname === '/search' || (!!query && pathname === '/')) return 'results';
      return 'other';
    },
    queryParamNames: ['q'],
    searchUrlTemplate: 'https://www.google.com/search?q={q}',
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
    searchUrlTemplate: 'https://duckduckgo.com/?q={q}',
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
    searchUrlTemplate: 'https://www.bing.com/search?q={q}',
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
    searchUrlTemplate: 'https://search.brave.com/search?q={q}',
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
    searchUrlTemplate: 'https://www.ecosia.org/search?q={q}',
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

export function buildSearchUrl(id: SearchProviderId, query: string): string {
  const provider = getSearchProviderById(id);
  if (!provider) return '';
  return provider.searchUrlTemplate.replace('{q}', encodeURIComponent(query || ''));
}

// Wikipedia isn't a general search engine (it never becomes the default engine,
// and we don't classify browsing to it as "searching"), but it is offered as a
// distinct "look it up" destination — the safe one to hand a kid.
export const WIKIPEDIA_HOMEPAGE_URL = 'https://en.wikipedia.org/';

export function buildWikipediaSearchUrl(query: string): string {
  const trimmed = (query || '').trim();
  if (!trimmed) return WIKIPEDIA_HOMEPAGE_URL;
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(trimmed)}`;
}

export function listSearchEngines(): SearchEngineOption[] {
  return SEARCH_PROVIDER_DEFINITIONS.map((definition) => ({
    id: definition.id,
    displayName: definition.displayName,
    iconName: definition.iconName,
    homepageUrl: definition.homepageUrl,
  }));
}
