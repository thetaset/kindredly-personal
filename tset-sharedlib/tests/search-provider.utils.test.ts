import {
  buildLookupSearchUrl,
  buildSearchUrl,
  buildWikipediaSearchUrl,
  detectSearchProvider,
  getSearchProviderById,
  getSearchUrlTemplate,
  listLookupProviders,
  listSearchEngines,
  matchLookupProvider,
  type SearchProviderId,
} from '../src/search-provider.utils';

describe('search engine catalog', () => {
  test('lists all five engines', () => {
    const ids = listSearchEngines().map((engine) => engine.id);
    expect(ids).toEqual(
      expect.arrayContaining<SearchProviderId>(['google', 'bing', 'duckduckgo', 'brave', 'ecosia']),
    );
    expect(ids).toHaveLength(5);
  });

  test('every engine exposes the fields the UI needs', () => {
    for (const engine of listSearchEngines()) {
      expect(typeof engine.displayName).toBe('string');
      expect(engine.displayName.length).toBeGreaterThan(0);
      expect(engine.homepageUrl).toMatch(/^https:\/\//);
      expect(typeof engine.iconName).toBe('string');
    }
  });

  test('getSearchProviderById resolves new engines', () => {
    expect(getSearchProviderById('brave')?.displayName).toBe('Brave');
    expect(getSearchProviderById('ecosia')?.displayName).toBe('Ecosia');
    expect(getSearchProviderById('nope' as SearchProviderId)).toBeNull();
  });

  test('buildSearchUrl encodes the query into the q param', () => {
    expect(buildSearchUrl('google', 'a b')).toBe('https://www.google.com/search?q=a%20b');
    expect(buildSearchUrl('bing', 'a b')).toBe('https://www.bing.com/search?q=a%20b');
    expect(buildSearchUrl('brave', 'cats & dogs')).toBe('https://search.brave.com/search?q=cats%20%26%20dogs');
    expect(buildSearchUrl('nope' as SearchProviderId, 'x')).toBe('');
  });

  test('buildSearchUrl with an empty query yields the bare prefix', () => {
    expect(buildSearchUrl('google', '')).toBe('https://www.google.com/search?q=');
  });

  test('detectSearchProvider still recognizes existing engines (regression)', () => {
    expect(detectSearchProvider('https://www.google.com/search?q=hello')?.id).toBe('google');
    expect(detectSearchProvider('https://duckduckgo.com/?q=hello')?.id).toBe('duckduckgo');
    expect(detectSearchProvider('https://search.brave.com/search?q=hello')?.id).toBe('brave');
    expect(detectSearchProvider('https://www.ecosia.org/search?q=hello')?.query).toBe('hello');
    expect(detectSearchProvider('https://example.com')).toBeNull();
  });
});

describe('lookup providers', () => {
  test('the engines plus Wikipedia, and nothing else', () => {
    const providers = listLookupProviders();
    expect(providers.map((provider) => provider.id)).toEqual([
      'google',
      'duckduckgo',
      'bing',
      'brave',
      'ecosia',
      'wikipedia',
    ]);
    expect(providers.filter((provider) => provider.role === 'reference').map((p) => p.id)).toEqual([
      'wikipedia',
    ]);
  });

  test('each provider names the kind an item carries when it is that provider', () => {
    const byId = new Map(listLookupProviders().map((provider) => [provider.id, provider]));
    expect(byId.get('google')?.kindId).toBe('apps.search');
    expect(byId.get('wikipedia')?.kindId).toBe('apps.reference');
  });

  test('matches a library item URL to its provider', () => {
    expect(matchLookupProvider('https://www.google.com/')?.id).toBe('google');
    expect(matchLookupProvider('https://google.co.uk')?.id).toBe('google');
    expect(matchLookupProvider('https://duckduckgo.com')?.id).toBe('duckduckgo');
    expect(matchLookupProvider('https://simple.wikipedia.org/wiki/Volcano')?.id).toBe('wikipedia');
    expect(matchLookupProvider('https://example.com')).toBeNull();
    expect(matchLookupProvider('not a url')).toBeNull();
  });

  test('a saved Google Doc is not Google search', () => {
    // detectSearchProvider matches the whole google.* family on purpose (a search on any
    // country TLD); deciding an item IS the engine has to be stricter than that.
    expect(detectSearchProvider('https://docs.google.com/document/d/abc')?.id).toBe('google');
    expect(matchLookupProvider('https://docs.google.com/document/d/abc')).toBeNull();
    expect(matchLookupProvider('https://mail.google.com')).toBeNull();
  });

  test('searches on the origin the person actually has', () => {
    expect(buildLookupSearchUrl('wikipedia', 'volcano', { origin: 'https://simple.wikipedia.org' }))
      .toBe('https://simple.wikipedia.org/w/index.php?search=volcano');
    expect(buildLookupSearchUrl('google', 'cats', { origin: 'https://www.google.co.uk' }))
      .toBe('https://www.google.co.uk/search?q=cats');
  });

  test('an origin that is not this provider falls back to the canonical one', () => {
    expect(buildLookupSearchUrl('google', 'cats', { origin: 'https://evil.example' }))
      .toBe('https://www.google.com/search?q=cats');
    expect(buildLookupSearchUrl('wikipedia', 'volcano')).toBe(
      'https://en.wikipedia.org/w/index.php?search=volcano',
    );
  });

  test('the native address bar still gets an absolute template', () => {
    expect(getSearchUrlTemplate('google')).toBe('https://www.google.com/search?q={q}');
    expect(getSearchUrlTemplate('duckduckgo')).toBe('https://duckduckgo.com/?q={q}');
    expect(getSearchUrlTemplate('nope' as SearchProviderId)).toBe('');
  });

  test('an empty Wikipedia query lands on the homepage (regression)', () => {
    expect(buildWikipediaSearchUrl('')).toBe('https://en.wikipedia.org/');
  });
});
