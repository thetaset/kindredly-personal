export type SearchProviderId = 'google' | 'duckduckgo' | 'bing';

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
};

const SEARCH_PROVIDER_DEFINITIONS: SearchProviderDefinition[] = [
  {
    id: 'google',
    displayName: 'Google',
    matchesHostname: (hostname) => {
      return hostname === 'google.com' || hostname === 'www.google.com' || hostname.endsWith('.google.com');
    },
    getPageState: (url, query) => {
      const pathname = (url.pathname || '').toLowerCase();
      if ((pathname === '/' || pathname === '/webhp') && !query) return 'homepage';
      if (pathname === '/search' || (!!query && pathname === '/')) return 'results';
      return 'other';
    },
    queryParamNames: ['q'],
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