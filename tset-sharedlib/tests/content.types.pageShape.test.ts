import { getItemExperienceContract, getItemPageShape, typeNameList } from '../src/content.types';

describe('getItemPageShape (HAT-949)', () => {
  test('things you listen to or read through get the cover page', () => {
    for (const subType of ['audiobook', 'audio', 'podcast_episode', 'book', 'ebook', 'podcast', 'music', 'song']) {
      expect(getItemPageShape('thing', subType)).toBe('cover');
    }
    expect(getItemPageShape('link', 'podcast')).toBe('cover');
  });

  test('media and File(s) keep the shape they already had', () => {
    expect(getItemPageShape('thing', 'video')).toBe('hero');
    expect(getItemPageShape('link', 'yt_video')).toBe('hero');
    expect(getItemPageShape('file_group', '')).toBe('contents');
    expect(getItemPageShape('thing', 'file_group')).toBe('contents');
  });

  test('everything else places its picture by shape', () => {
    expect(getItemPageShape('link', 'website')).toBe('page');
    expect(getItemPageShape('note', '')).toBe('page');
    expect(getItemPageShape(null, null)).toBe('page');
  });

  // The shapes restate what each type is for, so they must agree with the type's own view mode.
  test('agrees with each type\'s view mode', () => {
    for (const { key } of typeNameList) {
      const shape = getItemPageShape('thing', key);
      const view = getItemExperienceContract('thing', key).defaultViewMode;
      if (view === 'audio') expect(shape).toBe('cover');
      if (view === 'gallery') expect(shape).toBe('contents');
      if (view === 'image' || view === 'video') expect(shape).toBe('hero');
    }
  });
});
