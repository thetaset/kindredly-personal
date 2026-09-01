import { createDisplayItem } from '../src/display.factory';
import { ItemTypeEnum } from '../src/shared.types';

describe('display.factory decryption handling', () => {
  test('does not mark decryption failed when decrypted flag is missing', () => {
    const result = createDisplayItem({
      details: {
        _id: 'col-1',
        type: ItemTypeEnum.collection,
        name: 'My Collection',
        description: 'Readable description',
        encrypted: true,
        encInfo: {
          keys: [{ id: 'k1' }],
        },
      } as any,
    } as any);

    expect(result.decryptionFailed).toBe(false);
    expect(result.name).toBe('My Collection');
    expect(result.description).toBe('Readable description');
  });

  test('marks decryption failed when explicitly decrypted false', () => {
    const result = createDisplayItem({
      details: {
        _id: 'col-2',
        type: ItemTypeEnum.collection,
        name: 'Encrypted Name Blob',
        description: 'Encrypted Description Blob',
        encrypted: true,
        decrypted: false,
        encInfo: {
          keys: [{ id: 'k1' }],
        },
      } as any,
    } as any);

    expect(result.decryptionFailed).toBe(true);
    expect(result.name).toBe('[Decryption failed] - check encryption settings');
    expect(result.description).toBe('[Decryption failed] - check encryption settings');
  });

});

describe('display.factory feed subType derivation', () => {
  test('does not change type for a (non-audio) feed link — a feed is a subscribable source, not a type', () => {
    const result = createDisplayItem({
      details: {
        _id: 'feed-1',
        type: 'link',
        name: 'Example Blog',
        url: 'https://example.com/blog',
        info: { hasFeeds: true, feeds: [{ feedId: 'main', feedURL: 'https://example.com/feed.xml' }] },
      } as any,
    } as any);

    expect(result.subType).toBeFalsy();
  });

  test('derives podcast for an audio feed', () => {
    const result = createDisplayItem({
      details: {
        _id: 'feed-2',
        type: 'link',
        name: 'Example Podcast',
        url: 'https://example.com/podcast',
        info: { hasFeeds: true, feeds: [{ feedId: 'main', feedURL: 'https://example.com/feed.xml', mediaKind: 'audio' }] },
      } as any,
    } as any);

    expect(result.subType).toBe('podcast');
  });

  test('demotes a legacy explicit content_feed subType to a plain link', () => {
    const result = createDisplayItem({
      details: {
        _id: 'feed-3',
        type: 'link',
        subType: 'content_feed',
        url: 'https://example.com/blog',
        info: { hasFeeds: true, feeds: [{ feedId: 'main', feedURL: 'https://example.com/feed.xml' }] },
      } as any,
    } as any);

    // 'content_feed' is no longer a distinct type; legacy items read as a plain link.
    expect(result.subType).toBeFalsy();
    expect(result.typeName).toBe('Link');
  });

  test('does not classify a plain link with only a hasFeeds hint as a feed', () => {
    const result = createDisplayItem({
      details: {
        _id: 'article-1',
        type: 'link',
        name: 'An Article',
        url: 'https://example.com/articles/hello',
        info: { hasFeeds: true, feeds: [] },
      } as any,
    } as any);

    expect(result.subType).toBeUndefined();
  });

  test('leaves a bare link as "Link" with no subType (no website floor)', () => {
    const result = createDisplayItem({
      details: {
        _id: 'link-1',
        type: 'link',
        name: 'Some Page',
        url: 'https://example.com/articles/hello',
      } as any,
    } as any);

    expect(result.subType).toBeUndefined();
    expect(result.typeName).toBe('Link');
    expect(result.experienceKind).toBe('generic-link');
  });

  test('populates experienceKind from the contract for each web type', () => {
    const make = (type: string, subType?: string) =>
      createDisplayItem({
        details: { _id: 'x', type, subType, url: 'https://example.com/x' } as any,
      } as any);

    expect(make('link', 'website').experienceKind).toBe('generic-link');
    // 'content_feed' is demoted to a plain link (a feed no longer changes the type).
    expect(make('link', 'content_feed').experienceKind).toBe('generic-link');
    expect(make('link', 'podcast').experienceKind).toBe('audio');
    expect(make('link', 'yt_video').experienceKind).toBe('video');
    expect(make('link', 'yt_channel').experienceKind).toBe('channel');
  });
});
