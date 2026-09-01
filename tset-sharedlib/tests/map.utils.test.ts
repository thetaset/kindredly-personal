import {
  MAP_EMBED_SCHEMA_ID,
  getMapEmbedSchemaV1,
  getMapDefaultName,
  getMapProviderLabel,
  isAllowedMapEmbedUrl,
  resolveMapFromEmbedSnippet,
  resolveMapFromShareUrl,
  setMapEmbedSchemaOnInfo,
  type MapEmbedSchemaV1,
} from '../src/map.utils';

describe('resolveMapFromShareUrl', () => {
  test('OpenStreetMap hash → coordinate (Leaflet) schema, no embedUrl', () => {
    const schema = resolveMapFromShareUrl('https://www.openstreetmap.org/#map=14/48.7328/-122.4437');
    expect(schema).not.toBeNull();
    expect(schema!.provider).toBe('openstreetmap');
    expect(schema!.embedUrl).toBeUndefined();
    expect(schema!.center).toEqual({ lat: 48.7328, lng: -122.4437 });
    expect(schema!.zoom).toBe(14);
    expect(schema!.source).toBe('share_url');
  });

  test('Google Maps @lat,lng,zoom → output=embed iframe URL + center', () => {
    const schema = resolveMapFromShareUrl('https://www.google.com/maps/@48.7328,-122.4437,15z');
    expect(schema).not.toBeNull();
    expect(schema!.provider).toBe('google_maps');
    expect(schema!.embedUrl).toBe('https://maps.google.com/maps?q=48.7328,-122.4437&z=15&output=embed');
    expect(schema!.center).toEqual({ lat: 48.7328, lng: -122.4437 });
    expect(isAllowedMapEmbedUrl(schema!.embedUrl!)).toBe(true);
  });

  test('Google Maps place with @coords resolves coords AND captures the place name as title', () => {
    const schema = resolveMapFromShareUrl('https://www.google.com/maps/place/Galbraith+Mountain/@48.73,-122.44,13z/data=abc');
    expect(schema!.center).toEqual({ lat: 48.73, lng: -122.44 });
    expect(schema!.title).toBe('Galbraith Mountain');
  });

  test('Google Maps ?q=lat,lng resolves', () => {
    const schema = resolveMapFromShareUrl('https://maps.google.com/?q=48.7,-122.4');
    expect(schema!.provider).toBe('google_maps');
    expect(schema!.center).toEqual({ lat: 48.7, lng: -122.4 });
  });

  test('Apple Maps ll → coordinate schema (Leaflet)', () => {
    const schema = resolveMapFromShareUrl('https://maps.apple.com/?ll=48.7,-122.4&z=15');
    expect(schema!.provider).toBe('apple_maps');
    expect(schema!.embedUrl).toBeUndefined();
    expect(schema!.center).toEqual({ lat: 48.7, lng: -122.4 });
  });

  test('non-map URL → null', () => {
    expect(resolveMapFromShareUrl('https://example.com/foo')).toBeNull();
  });

  test('non-maps google path → null (not every google.com URL is a map)', () => {
    expect(resolveMapFromShareUrl('https://www.google.com/search?q=hello')).toBeNull();
  });

  test('garbage / empty → null', () => {
    expect(resolveMapFromShareUrl('')).toBeNull();
    expect(resolveMapFromShareUrl('not a url')).toBeNull();
    expect(resolveMapFromShareUrl(null)).toBeNull();
  });
});

describe('resolveMapFromEmbedSnippet', () => {
  test('Trailforks iframe snippet → trailforks embed', () => {
    const schema = resolveMapFromEmbedSnippet('<iframe src="https://www.trailforks.com/widgets/map/?rid=12345" width="600"></iframe>');
    expect(schema).not.toBeNull();
    expect(schema!.provider).toBe('trailforks');
    expect(schema!.embedUrl).toBe('https://www.trailforks.com/widgets/map/?rid=12345');
    expect(schema!.source).toBe('embed_snippet');
  });

  test('Mapbox iframe snippet → mapbox embed', () => {
    const schema = resolveMapFromEmbedSnippet("<iframe src='https://api.mapbox.com/styles/v1/foo/bar.html?title=true'></iframe>");
    expect(schema!.provider).toBe('mapbox');
  });

  test('decodes &amp; in the src', () => {
    const schema = resolveMapFromEmbedSnippet('<iframe src="https://www.trailforks.com/widgets/map/?rid=1&amp;z=12"></iframe>');
    expect(schema!.embedUrl).toBe('https://www.trailforks.com/widgets/map/?rid=1&z=12');
  });

  test('bare allowlisted embed URL (no iframe wrapper) → resolves', () => {
    const schema = resolveMapFromEmbedSnippet('https://www.trailforks.com/widgets/map/?rid=1');
    expect(schema!.provider).toBe('trailforks');
  });

  test('javascript: / data: / non-https src → null', () => {
    expect(resolveMapFromEmbedSnippet('<iframe src="javascript:alert(1)"></iframe>')).toBeNull();
    expect(resolveMapFromEmbedSnippet('<iframe src="data:text/html,<b>x</b>"></iframe>')).toBeNull();
    expect(resolveMapFromEmbedSnippet('<iframe src="http://www.trailforks.com/widgets/map/?rid=1"></iframe>')).toBeNull();
  });

  test('non-allowlisted host → null', () => {
    expect(resolveMapFromEmbedSnippet('<iframe src="https://evil.com/map"></iframe>')).toBeNull();
  });
});

describe('isAllowedMapEmbedUrl', () => {
  test('allows known provider embed hosts', () => {
    expect(isAllowedMapEmbedUrl('https://maps.google.com/maps?output=embed')).toBe(true);
    expect(isAllowedMapEmbedUrl('https://www.openstreetmap.org/export/embed.html')).toBe(true);
    expect(isAllowedMapEmbedUrl('https://www.trailforks.com/widgets/map/?rid=1')).toBe(true);
    expect(isAllowedMapEmbedUrl('https://api.mapbox.com/styles/v1/x.html')).toBe(true);
    expect(isAllowedMapEmbedUrl('https://www.bing.com/maps/embed')).toBe(true);
  });

  test('rejects look-alike hosts and non-https', () => {
    expect(isAllowedMapEmbedUrl('https://google.com.evil.com/maps?output=embed')).toBe(false);
    expect(isAllowedMapEmbedUrl('https://notgoogle.com/maps')).toBe(false);
    expect(isAllowedMapEmbedUrl('http://maps.google.com/maps?output=embed')).toBe(false);
    expect(isAllowedMapEmbedUrl('')).toBe(false);
    expect(isAllowedMapEmbedUrl(null)).toBe(false);
  });
});

describe('getMapEmbedSchemaV1', () => {
  function withSchema(raw: unknown) {
    return { info: { schemas: { [MAP_EMBED_SCHEMA_ID]: raw } } };
  }

  test('reads a valid allowlisted embed schema', () => {
    const stored: MapEmbedSchemaV1 = {
      schemaVersion: 1,
      provider: 'trailforks',
      embedUrl: 'https://www.trailforks.com/widgets/map/?rid=1',
      originalUrl: 'https://www.trailforks.com/widgets/map/?rid=1',
      center: null,
      zoom: null,
    };
    expect(getMapEmbedSchemaV1(withSchema(stored))?.embedUrl).toBe(stored.embedUrl);
  });

  test('rejects wrong schemaVersion', () => {
    expect(getMapEmbedSchemaV1(withSchema({ schemaVersion: 2, embedUrl: 'https://maps.google.com/maps?output=embed' }))).toBeNull();
  });

  test('rejects a non-allowlisted embedUrl even if otherwise well-formed', () => {
    expect(
      getMapEmbedSchemaV1(withSchema({ schemaVersion: 1, provider: 'other', embedUrl: 'https://evil.com/x', originalUrl: 'x' })),
    ).toBeNull();
  });

  test('accepts a coordinate-only (Leaflet) schema with no embedUrl', () => {
    const out = getMapEmbedSchemaV1(withSchema({ schemaVersion: 1, provider: 'openstreetmap', originalUrl: 'x', center: { lat: 1, lng: 2 }, zoom: 12 }));
    expect(out?.center).toEqual({ lat: 1, lng: 2 });
    expect(out?.embedUrl).toBeUndefined();
  });

  test('null when neither a valid embedUrl nor center is present', () => {
    expect(getMapEmbedSchemaV1(withSchema({ schemaVersion: 1, provider: 'other', originalUrl: 'x' }))).toBeNull();
    expect(getMapEmbedSchemaV1(null)).toBeNull();
  });
});

describe('setMapEmbedSchemaOnInfo', () => {
  test('roundtrips through getMapEmbedSchemaV1 and preserves other info fields', () => {
    const schema = resolveMapFromShareUrl('https://www.openstreetmap.org/#map=12/40.0/-73.0')!;
    const info = setMapEmbedSchemaOnInfo({ value: 'keep-me' } as any, schema);
    expect((info as any).value).toBe('keep-me');
    expect(getMapEmbedSchemaV1({ info })?.center).toEqual({ lat: 40.0, lng: -73.0 });
  });
});

describe('getMapProviderLabel', () => {
  test('maps ids to labels with a sane fallback', () => {
    expect(getMapProviderLabel('google_maps')).toBe('Google Maps');
    expect(getMapProviderLabel('openstreetmap')).toBe('OpenStreetMap');
    expect(getMapProviderLabel('other')).toBe('map');
    expect(getMapProviderLabel(null)).toBe('map');
  });
});

describe('getMapDefaultName', () => {
  test('prefers an extracted title', () => {
    expect(getMapDefaultName({ schemaVersion: 1, provider: 'google_maps', originalUrl: 'x', title: 'Galbraith Mountain', center: { lat: 1, lng: 2 } })).toBe('Galbraith Mountain');
  });
  test('falls back to coordinates', () => {
    expect(getMapDefaultName({ schemaVersion: 1, provider: 'openstreetmap', originalUrl: 'x', center: { lat: 48.7328, lng: -122.4437 } })).toBe('Map (48.7328, -122.4437)');
  });
  test('falls back to a provider label for embed-only widgets', () => {
    expect(getMapDefaultName({ schemaVersion: 1, provider: 'trailforks', originalUrl: 'x', embedUrl: 'https://www.trailforks.com/widgets/map/?rid=1' })).toBe('Trailforks map');
  });
  test('handles null', () => {
    expect(getMapDefaultName(null)).toBe('Map');
  });
});
