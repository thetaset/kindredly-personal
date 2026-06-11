import { getSocialMetadataProvider } from '../src/url.utils';

describe('url.utils social metadata provider detection', () => {
  test('detects requested social providers from public URLs', () => {
    expect(getSocialMetadataProvider('https://www.facebook.com/story.php?story_fbid=1&id=2')).toBe('facebook');
    expect(getSocialMetadataProvider('https://www.instagram.com/p/ABC123/')).toBe('instagram');
    expect(getSocialMetadataProvider('https://x.com/kindredly/status/123')).toBe('x');
    expect(getSocialMetadataProvider('https://twitter.com/kindredly/status/123')).toBe('x');
    expect(getSocialMetadataProvider('https://bsky.app/profile/example.com/post/3labcdef')).toBe('bluesky');
    expect(getSocialMetadataProvider('https://www.tiktok.com/@kindredly/video/123456789')).toBe('tiktok');
  });

  test('returns null for unrelated URLs', () => {
    expect(getSocialMetadataProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(getSocialMetadataProvider('https://example.com/post/123')).toBeNull();
    expect(getSocialMetadataProvider('not-a-url')).toBeNull();
  });
});