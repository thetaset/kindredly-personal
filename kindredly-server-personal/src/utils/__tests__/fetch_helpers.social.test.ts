import {extractMetadataFromOEmbed, getSocialOEmbedEndpoint} from 'tset-sharedlib/extraction.utils';

describe('fetch_helpers social metadata helpers', () => {
  test('builds public oEmbed endpoints for supported providers', () => {
    expect(getSocialOEmbedEndpoint('https://x.com/kindredly/status/123')).toContain('publish.twitter.com/oembed');
    expect(getSocialOEmbedEndpoint('https://bsky.app/profile/example.com/post/3labcdef')).toContain(
      'embed.bsky.app/oembed',
    );
    expect(getSocialOEmbedEndpoint('https://www.tiktok.com/@kindredly/video/123456789')).toContain(
      'www.tiktok.com/oembed',
    );
    expect(getSocialOEmbedEndpoint('https://www.facebook.com/story.php?story_fbid=1&id=2')).toBeNull();
    expect(getSocialOEmbedEndpoint('https://www.instagram.com/p/ABC123/')).toBeNull();
  });

  test('extracts title and image from oEmbed payload', () => {
    const meta = extractMetadataFromOEmbed('https://www.tiktok.com/@kindredly/video/123456789', 'tiktok', {
      title: 'A useful TikTok post',
      author_name: 'kindredly',
      provider_name: 'TikTok',
      thumbnail_url: 'https://p16-sign.tiktokcdn.com/thumbnail.jpeg',
    });

    expect(meta.title).toBe('A useful TikTok post');
    expect(meta.description).toBe('kindredly');
    expect(meta.imageSrc).toBe('https://p16-sign.tiktokcdn.com/thumbnail.jpeg');
    expect(meta.siteName).toBe('TikTok');
    expect(meta.tsExtractedInfo?.sourceId).toBe('oembed');
  });

  test('falls back to text extracted from oEmbed html when title is missing', () => {
    const meta = extractMetadataFromOEmbed('https://x.com/kindredly/status/123', 'x', {
      provider_name: 'X',
      author_name: 'kindredly',
      html: '<blockquote><p>Hello from a social post</p></blockquote>',
    });

    expect(meta.title).toBe('Hello from a social post');
    expect(meta.description).toBe('Hello from a social post');
    expect(meta.siteName).toBe('X');
  });
});
