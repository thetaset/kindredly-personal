import { recognizePage } from '../src/page-recognition.utils';
import { ItemResourceType } from '../src/constants';

describe('page-recognition.utils', () => {
  test('recognizes YouTube video', () => {
    const r = recognizePage({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(r?.provider).toBe('youtube');
    expect(r?.resourceType).toBe(ItemResourceType.YT_VIDEO);
  });

  test('recognizes YouTube channel', () => {
    const r = recognizePage({ url: 'https://www.youtube.com/@veritasium' });
    expect(r?.provider).toBe('youtube');
    expect(r?.resourceType).toBe(ItemResourceType.YT_CHANNEL);
  });

  test('recognizes Reddit post', () => {
    const r = recognizePage({ url: 'https://www.reddit.com/r/typescript/comments/abcdef/some_post/' });
    expect(r?.provider).toBe('reddit');
    expect(r?.resourceType).toBe('REDDIT_POST');
    expect(r?.externalId).toBe('abcdef');
    expect(r?.parentExternalId).toBe('typescript');
  });

  test('recognizes Netflix title/watch url (basic)', () => {
    const r1 = recognizePage({ url: 'https://www.netflix.com/title/80057281' });
    expect(r1?.provider).toBe('netflix');
    expect(r1?.resourceType).toBe('NETFLIX_TITLE');
    expect(r1?.externalId).toBe('80057281');

    const r2 = recognizePage({ url: 'https://www.netflix.com/watch/80057281' });
    expect(r2?.provider).toBe('netflix');
    expect(r2?.resourceType).toBe('NETFLIX_TITLE');
    expect(r2?.externalId).toBe('80057281');
  });
});
