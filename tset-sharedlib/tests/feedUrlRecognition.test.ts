import {
  getFeedTypeFromUrl,
  isFeedContentType,
  isLikelyFeedUrl,
  looksLikeXmlFeed,
} from '../src/extraction.utils';

// `isLikelyFeedUrl` decides whether we hijack a navigation (native in-app browsers)
// or spend a background fetch (extension). A false positive steals a page load the
// person asked for, so the negative cases below matter more than the positive ones.
describe('isLikelyFeedUrl', () => {
  const feedUrls = [
    'https://example.com/feed',
    'https://example.com/feed/',
    'https://example.com/rss',
    'https://example.com/rss/',
    'https://example.com/blog/feed',
    'https://example.com/comments/feed/',
    'https://example.com/feed.xml',
    'https://example.com/rss.xml',
    'https://example.com/atom.xml',
    'https://example.com/index.xml',
    'https://example.com/feed.json',
    'https://example.com/podcast.rss',
    'https://example.com/podcast.xml',
    'https://example.com/show/episodes.xml',
    'https://feeds.npr.org/510355/podcast.xml',
    'https://feeds.example.com/show/podcast.rss',
    'https://rss.example.com/show.xml',
    'https://example.com/everything.atom',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q',
    'https://blogger-site.blogspot.com/feeds/posts/default',
    'https://example.com/?format=rss',
    'https://example.com/blog?feed=atom',
    'https://example.com/x?output=rss',
    'https://example.com/x?alt=json',
  ];

  test.each(feedUrls)('recognises %s', (url) => {
    expect(isLikelyFeedUrl(url)).toBe(true);
  });

  const nonFeedUrls = [
    // Ordinary reading — the case that made the old popup strip so noisy.
    'https://example.com/2026/08/03/some-article-slug',
    'https://example.com/',
    'https://news.example.com/world/politics/story-12345',
    // `.xml` alone is not a feed.
    'https://example.com/sitemap.xml',
    'https://example.com/sitemap_index.xml',
    'https://example.com/wp-content/uploads/data.xml',
    // A podcast *page* is not a podcast feed. `hasStrongFeedUrlCue` matches these;
    // that is exactly why it must not be used for interception.
    'https://example.com/podcasts/the-daily',
    'https://example.com/podcast/episode-4',
    'https://example.com/podcast.html',
    // A feed-hosting subdomain is only a cue when it serves a data file.
    'https://feeds.example.com/about',
    'https://feeds.example.com/',
    // Words that merely start with "feed".
    'https://example.com/feedback',
    'https://example.com/feedback/form',
    'https://example.com/feeding-schedule',
    // Query values that are not feed formats.
    'https://example.com/search?type=article',
    'https://example.com/x?format=pdf',
    // Non-http schemes and junk.
    'chrome-extension://abc/index.html#/feed',
    'not a url',
    '',
    null,
    undefined,
  ];

  test.each(nonFeedUrls)('rejects %s', (url) => {
    expect(isLikelyFeedUrl(url as string)).toBe(false);
  });
});

describe('isFeedContentType', () => {
  test.each([
    'application/rss+xml',
    'application/atom+xml',
    'application/rss+xml; charset=utf-8',
    'APPLICATION/ATOM+XML',
    'application/feed+json',
    'application/rdf+xml',
  ])('accepts %s', (value) => {
    expect(isFeedContentType(value)).toBe(true);
  });

  test.each([
    'text/html',
    'text/html; charset=utf-8',
    'application/xml',
    'text/xml',
    'application/json',
    '',
    null,
    undefined,
  ])('rejects %s', (value) => {
    expect(isFeedContentType(value as string)).toBe(false);
  });
});

// Body sniff used in the MV3 service worker, where `DOMParser` does not exist.
describe('looksLikeXmlFeed', () => {
  test('accepts an RSS body', () => {
    expect(looksLikeXmlFeed('<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>')).toBe(true);
  });

  test('accepts an Atom body', () => {
    expect(looksLikeXmlFeed('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>')).toBe(true);
  });

  test('rejects an HTML page', () => {
    expect(looksLikeXmlFeed('<!DOCTYPE html><html><head><title>x</title></head></html>')).toBe(false);
  });

  test('rejects an empty body', () => {
    expect(looksLikeXmlFeed('')).toBe(false);
  });
});

describe('getFeedTypeFromUrl', () => {
  test('classifies by extension and query', () => {
    expect(getFeedTypeFromUrl('https://example.com/everything.atom')).toBe('atom');
    expect(getFeedTypeFromUrl('https://example.com/feed.json')).toBe('json');
    expect(getFeedTypeFromUrl('https://example.com/feed')).toBe('rss');
    expect(getFeedTypeFromUrl('https://example.com/2026/08/article')).toBeNull();
  });
});
