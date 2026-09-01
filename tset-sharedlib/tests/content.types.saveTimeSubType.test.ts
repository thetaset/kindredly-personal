import { SYSTEM_DERIVED_SUB_TYPES, deriveSaveTimeSubType } from '../src/content.types';

const audioFeed = { feeds: [{ feedURL: 'https://example.com/rss', mediaKind: 'audio' }] };
const plainFeed = { feeds: [{ feedURL: 'https://example.com/rss' }] };

describe('deriveSaveTimeSubType', () => {
  test('fills an empty subType on a link carrying an audio feed', () => {
    expect(deriveSaveTimeSubType({ type: 'link', subType: null, info: audioFeed })).toBe('podcast');
  });

  test('is a no-op when the item already claims podcast', () => {
    // shouldAutoDeriveSubType allows the write, but it changes nothing.
    expect(deriveSaveTimeSubType({ type: 'link', subType: 'podcast', info: audioFeed })).toBe('podcast');
  });

  test('replaces a system-derived subType', () => {
    // 'website' was assigned by metadata inference, so the system may revise it.
    expect(deriveSaveTimeSubType({ type: 'link', subType: 'website', info: audioFeed })).toBe('podcast');
  });

  test('never overwrites a subType the user chose', () => {
    expect(deriveSaveTimeSubType({ type: 'link', subType: 'ebook', info: audioFeed })).toBeNull();
    expect(deriveSaveTimeSubType({ type: 'link', subType: 'map', info: audioFeed })).toBeNull();
  });

  test('ignores feeds that are not audio', () => {
    expect(deriveSaveTimeSubType({ type: 'link', subType: null, info: plainFeed })).toBeNull();
  });

  test('ignores an audio feed with no feedURL', () => {
    expect(
      deriveSaveTimeSubType({ type: 'link', subType: null, info: { feeds: [{ mediaKind: 'audio' }] } }),
    ).toBeNull();
  });

  test('does nothing without feeds', () => {
    expect(deriveSaveTimeSubType({ type: 'link', subType: null })).toBeNull();
    expect(deriveSaveTimeSubType(null)).toBeNull();
  });

  test('does not apply to non-link primary types', () => {
    expect(deriveSaveTimeSubType({ type: 'note', subType: null, info: audioFeed })).toBeNull();
    expect(deriveSaveTimeSubType({ type: 'col', subType: null, info: audioFeed })).toBeNull();
  });

  // Membership of this list grants the system permission to OVERWRITE a value.
  // Adding 'podcast' would let a later metadata refresh replace an explicit user
  // choice of podcast with 'website'.
  test('podcast is deliberately not a system-derived subtype', () => {
    expect(SYSTEM_DERIVED_SUB_TYPES).not.toContain('podcast');
  });
});
