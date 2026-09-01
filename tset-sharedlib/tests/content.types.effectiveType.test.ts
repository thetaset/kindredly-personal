import { resolveDisplaySubType, resolveEffectiveItemType } from '../src/content.types';

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
    expect(resolveEffectiveItemType({ type: 'link', url: 'https://example.com' } as any)).toBe(
      'link',
    );
  });

  test('falls back to default for an unknown shape', () => {
    expect(resolveEffectiveItemType({})).toBe('default');
  });
});
