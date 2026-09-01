import {
  buildSearchUrl,
  detectSearchProvider,
  getSearchProviderById,
  listSearchEngines,
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
