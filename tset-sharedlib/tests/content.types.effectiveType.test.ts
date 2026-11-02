import {
  getSubTypeFromAddress,
  getSubTypeFromMeta,
  resolveDisplaySubType,
  resolveEffectiveItemType,
} from '../src/content.types';

const audioFeed = { feeds: [{ feedURL: 'https://example.com/rss', mediaKind: 'audio' }] };

describe('resolveDisplaySubType', () => {
  test('keeps a subType that is already stamped', () => {
    expect(resolveDisplaySubType({ type: 'link', subType: 'website' })).toBe('website');
  });

  test('derives a subType from page metadata', () => {
    expect(
      resolveDisplaySubType({
        type: 'link',
        subType: null,
        meta: { tsExtractedInfo: { pageType: 'YOUTUBE_CHANNEL' } },
      }),
    ).toBe('yt_channel');
  });

  test.each(['book', 'podcast', 'song', 'music', 'film', 'video_series', 'video'])(
    'reads the resolved %s item type from media metadata',
    (subType) => {
      expect(getSubTypeFromMeta({tsManifest: {mediaMetadata: {subType}}})).toBe(subType);
    },
  );

  test('falls back to the URL when the server never resolved it', () => {
    expect(getSubTypeFromMeta({title: 'Project Hail Mary'} as any, 'https://www.audible.com/pd/B08G9PRS1K')).toBe(
      'audiobook',
    );
    expect(getSubTypeFromMeta({url: 'https://open.spotify.com/episode/abc123'})).toBe('podcast');
  });

  test("prefers the server's refined item type over the URL's", () => {
    expect(
      getSubTypeFromMeta({tsManifest: {mediaMetadata: {subType: 'film'}}}, 'https://www.netflix.com/title/81257180'),
    ).toBe('film');
  });

  test('labels an old Website item from its URL without a metadata refresh', () => {
    expect(
      resolveDisplaySubType({type: 'link', subType: 'website', url: 'https://share.libbyapp.com/title/6037516'}),
    ).toBe('book');
    expect(resolveDisplaySubType({type: 'link', subType: 'website', url: 'https://example.com/'})).toBe('website');
  });

  test('ignores an item type the media resolver never produces', () => {
    // Metadata can come from a page; it must not be able to make a link run as an app.
    expect(getSubTypeFromMeta({tsManifest: {mediaMetadata: {subType: 'kin_app'}}})).toBeNull();
  });

  test('uses resolved media metadata instead of a stale system-derived website label', () => {
    expect(
      resolveDisplaySubType({
        type: 'link',
        subType: 'website',
        meta: {tsManifest: {mediaMetadata: {subType: 'video_series'}}},
      }),
    ).toBe('video_series');
  });

  // The derivation that is NOT applied at save time, and so has to happen on read.
  test('derives podcast from an audio feed', () => {
    expect(resolveDisplaySubType({ type: 'link', subType: null, info: audioFeed })).toBe(
      'podcast',
    );
  });

  test('prefers page metadata over the feed when both are present', () => {
    expect(
      resolveDisplaySubType({
        type: 'link',
        subType: null,
        meta: { tsExtractedInfo: { pageType: 'SITE_ROOT' } },
        info: audioFeed,
      }),
    ).toBe('website');
  });

  test('only derives for links', () => {
    expect(resolveDisplaySubType({ type: 'note', subType: null, info: audioFeed })).toBeNull();
  });

  test('drops the legacy content_feed subType so a feed is not its own type', () => {
    expect(resolveDisplaySubType({ type: 'link', subType: 'content_feed' })).toBeNull();
  });

  test('handles missing details', () => {
    expect(resolveDisplaySubType(null)).toBeNull();
    expect(resolveDisplaySubType({})).toBeNull();
  });
});

describe('resolveEffectiveItemType', () => {
  test('returns the primary type when nothing more specific resolves', () => {
    expect(resolveEffectiveItemType({ type: 'note' })).toBe('note');
    expect(resolveEffectiveItemType({ type: 'col' })).toBe('col');
  });

  test('an entity resolves to its subType', () => {
    expect(resolveEffectiveItemType({ type: 'thing', subType: 'film' })).toBe('film');
  });

  test('a bare entity falls back to information', () => {
    expect(resolveEffectiveItemType({ type: 'thing' })).toBe('information');
  });

  test('a feed-derived podcast resolves to podcast, not link', () => {
    expect(resolveEffectiveItemType({ type: 'link', info: audioFeed })).toBe('podcast');
  });

  test('a plain link stays a link', () => {
    expect(resolveEffectiveItemType({ type: 'link', url: 'https://example.com/a-page' } as any)).toBe(
      'link',
    );
  });

  test("a link to a site's home page is a website (HAT-918)", () => {
    expect(resolveEffectiveItemType({ type: 'link', url: 'https://example.com' } as any)).toBe('website');
  });

  test('falls back to default for an unknown shape', () => {
    expect(resolveEffectiveItemType({})).toBe('default');
  });
});

/** HAT-918: links that should be websites, worked out from the address on the device. */
describe('website from the address', () => {
  test.each([
    ['https://example.com', 'website'],
    ['https://example.com/', 'website'],
    ['https://www.example.com/?ref=newsletter', 'website'],
    ['https://example.com/#about', 'website'],
    ['https://example.com/blog', null],
    ['https://example.com/blog/', null],
    ['ftp://example.com/', null],
    ['file:///', null],
    ['not a url', null],
    ['', null],
    [null, null],
  ])('%s → %s', (url, expected) => {
    expect(getSubTypeFromAddress(url)).toBe(expected);
  });

  test('a link saved without a page read shows as a website', () => {
    expect(resolveDisplaySubType({ type: 'link', subType: null, url: 'https://pbskids.org/' })).toBe('website');
  });

  test('a type a person picked is kept', () => {
    expect(resolveDisplaySubType({ type: 'link', subType: 'article', url: 'https://pbskids.org/' })).toBe('article');
  });

  test("the page read's answer comes first", () => {
    expect(
      resolveDisplaySubType({
        type: 'link',
        subType: null,
        url: 'https://www.youtube.com/',
        meta: { tsExtractedInfo: { pageType: 'YOUTUBE_CHANNEL' } },
      }),
    ).toBe('yt_channel');
  });

  test('an audio feed still makes it a podcast', () => {
    expect(resolveDisplaySubType({ type: 'link', url: 'https://serialpodcast.org/', info: audioFeed })).toBe('podcast');
  });

  test('only for links', () => {
    expect(resolveDisplaySubType({ type: 'note', url: 'https://example.com/' })).toBeNull();
  });

  test('the published catalog asks without it, as its SQL filter cannot see the address', () => {
    expect(resolveDisplaySubType({ type: 'link', url: 'https://example.com/' }, { fromAddress: false })).toBeNull();
    expect(resolveEffectiveItemType({ type: 'link', url: 'https://example.com/' } as any, { fromAddress: false })).toBe(
      'link',
    );
  });
});
