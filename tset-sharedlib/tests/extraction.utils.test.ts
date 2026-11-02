import {
  extractMetadata,
  extractMetadataFromRedditJson,
  getRedditImageUrl,
  mergeMetadataBySourcePriority,
  sanitizeExtractedTitle,
} from '../src/extraction.utils';
import { readDeviceFeedLinks } from '../src/extraction.pure.utils';
import { ItemResourceType } from '../src/constants';
import { mergeOptions } from '../src/meta.utils';

describe('YouTube channel identifier extraction', () => {
  // Regression: a channel saved by its @handle must ALSO capture the canonical
  // UC channel id. Channel grants match by UC id, so a handle-only channel
  // can't be matched against a video that resolves to its UC id.
  test('captures the UC channel id even when a handle is present', async () => {
    const html = `
      <html><head><title>Kurzgesagt – In a Nutshell</title></head>
      <body>
        <script>var ytcfg = {"externalChannelId":"UCsXVk37bltHxD1rDPwtNM8Q"};</script>
      </body></html>`;

    const meta = await extractMetadata('https://www.youtube.com/@Kurzgesagt', html);
    const info = meta.tsExtractedInfo!;

    expect(info.pageType).toBe('YOUTUBE_CHANNEL');
    expect(info.handleId).toBe('kurzgesagt');
    expect(info.youtubeChannelIds).toContain('UCsXVk37bltHxD1rDPwtNM8Q');
    expect(info.channelId).toBe('UCsXVk37bltHxD1rDPwtNM8Q');
  });
});

describe('metadata extraction image precedence', () => {
  test('mergeOptions respects source order instead of string length', () => {
    expect(mergeOptions(['first', 'a much longer second value'])).toBe('first');
  });

  test('extractMetadata prefers og:image over apple-touch-icon', async () => {
    const html = `
      <html>
        <head>
          <title>Example</title>
          <meta property="og:image" content="https://cdn.example.com/article-hero.jpg" />
          <link rel="apple-touch-icon" href="https://cdn.example.com/very/long/path/to/site-icon-512x512.png" />
          <link rel="icon" href="https://cdn.example.com/favicon.ico" />
        </head>
      </html>
    `;

    const meta = await extractMetadata('https://example.com/article', html);

    expect(meta.imageSrc).toBe('https://cdn.example.com/article-hero.jpg');
    expect(meta.favicon).toBe('https://cdn.example.com/favicon.ico');
  });

  test('extractMetadata does not use apple-touch-icon as primary image fallback', async () => {
    const html = `
      <html>
        <head>
          <title>Example</title>
          <link rel="apple-touch-icon" href="https://cdn.example.com/site-icon-512x512.png" />
        </head>
      </html>
    `;

    const meta = await extractMetadata('https://example.com/article', html);

    expect(meta.imageSrc).toBe('');
    expect(meta.favicon).toBe('https://cdn.example.com/site-icon-512x512.png');
  });

  test('extractMetadata discovers RSS and Atom alternate links', async () => {
    const meta = await extractMetadata(
      'https://example.com/blog/post',
      `
        <html>
          <head>
            <title>Example Blog</title>
            <link rel="alternate" type="application/rss+xml" title="Main RSS Feed" href="/feed.xml" />
            <link rel="alternate" type="application/atom+xml" title="Atom Feed" href="https://example.com/atom.xml" />
          </head>
        </html>
      `,
    );

    expect(meta.tsExtractedInfo?.discoveredFeedLinks).toEqual([
      {
        url: 'https://example.com/feed.xml',
        title: 'Main RSS Feed',
        type: 'rss',
        source: 'head',
      },
      {
        url: 'https://example.com/atom.xml',
        title: 'Atom Feed',
        type: 'atom',
        source: 'head',
      },
    ]);
  });

  test('tags body anchor feeds as anchor and head declarations as head', async () => {
    const meta = await extractMetadata(
      'https://example.com/blog/post',
      `
        <html>
          <head>
            <title>Example Blog</title>
            <link rel="alternate" type="application/rss+xml" title="Main RSS Feed" href="/feed.xml" />
          </head>
          <body>
            <a href="https://example.com/sections/politics/rss" title="Politics RSS">Politics feed</a>
          </body>
        </html>
      `,
    );

    expect(meta.tsExtractedInfo?.discoveredFeedLinks).toEqual([
      {
        url: 'https://example.com/feed.xml',
        title: 'Main RSS Feed',
        type: 'rss',
        source: 'head',
      },
      {
        url: 'https://example.com/sections/politics/rss',
        title: 'Politics RSS',
        type: 'rss',
        source: 'anchor',
      },
    ]);
  });

  test('extractMetadata ignores unrelated alternate links', async () => {
    const meta = await extractMetadata(
      'https://example.com/blog/post',
      `
        <html>
          <head>
            <title>Example Blog</title>
            <link rel="alternate" hreflang="fr" href="https://example.com/fr/post" />
            <link rel="canonical" href="https://example.com/blog/post" />
          </head>
        </html>
      `,
    );

    expect(meta.tsExtractedInfo?.discoveredFeedLinks).toBeUndefined();
  });

  test('sanitizeExtractedTitle trims repeated indexed suffixes from concatenated DOM text', () => {
    expect(
      sanitizeExtractedTitle('Byrne’s EuclidProposition 47 figureProposition 7 figureProposition 21 figure 1Proposition 4 figure'),
    ).toBe('Byrne’s Euclid');
  });

  test('extractMetadata prefers the cleaned prefix for long og:title values', async () => {
    const meta = await extractMetadata(
      'https://www.c82.net/euclid/',
      `
        <html>
          <head>
            <meta property="og:title" content="Byrne’s EuclidProposition 47 figureProposition 7 figureProposition 21 figure 1Proposition 4 figure" />
          </head>
          <body>
            <main>
              <h1>Byrne’s Euclid</h1>
            </main>
          </body>
        </html>
      `,
    );

    expect(meta.title).toBe('Byrne’s Euclid');
  });

  test('extractMetadata trims concatenated heuristic h1 titles when structured titles are absent', async () => {
    const meta = await extractMetadata(
      'https://www.c82.net/euclid/',
      `
        <html>
          <body>
            <main>
              <h1>Byrne’s EuclidProposition 47 figureProposition 7 figureProposition 21 figure 1Proposition 4 figure</h1>
            </main>
          </body>
        </html>
      `,
    );

    expect(meta.title).toBe('Byrne’s Euclid');
  });
});

describe('extraction.utils Reddit helpers', () => {
  test('prefers preview image and decodes HTML entities', () => {
    const imageUrl = getRedditImageUrl({
      preview: {
        images: [
          {
            source: {
              url: 'https://preview.redd.it/example-image.jpg?width=1080&amp;format=pjpg&amp;auto=webp',
            },
          },
        ],
      },
    });

    expect(imageUrl).toBe('https://preview.redd.it/example-image.jpg?width=1080&format=pjpg&auto=webp');
  });

  test('falls back to gallery media when preview is missing', () => {
    const imageUrl = getRedditImageUrl({
      is_gallery: true,
      media_metadata: {
        abc123: {
          s: {
            u: 'https://i.redd.it/gallery-image.png?width=900&amp;format=png&amp;auto=webp',
          },
        },
      },
    });

    expect(imageUrl).toBe('https://i.redd.it/gallery-image.png?width=900&format=png&auto=webp');
  });

  test('uses direct external image links before thumbnail placeholders', () => {
    const imageUrl = getRedditImageUrl({
      url_overridden_by_dest: 'https://images.example.com/cover.webp',
      thumbnail: 'self',
    });

    expect(imageUrl).toBe('https://images.example.com/cover.webp');
  });

  test('extracts metadata from post listing payload', () => {
    const meta = extractMetadataFromRedditJson(
      'https://www.reddit.com/r/typescript/comments/abcdef/example_post/',
      [
        {
          data: {
            children: [
              {
                data: {
                  id: 'abcdef',
                  title: 'Example Reddit Post',
                  selftext: 'Post body',
                  subreddit: 'typescript',
                  author: 'kindredly_user',
                  score: 42,
                  num_comments: 7,
                  created_utc: 1710000000,
                  preview: {
                    images: [
                      {
                        source: {
                          url: 'https://preview.redd.it/example.jpg?width=1200&amp;format=pjpg&amp;auto=webp',
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      ],
    );

    expect(meta.title).toBe('Example Reddit Post');
    expect(meta.description).toBe('Post body');
    expect(meta.imageSrc).toBe('https://preview.redd.it/example.jpg?width=1200&format=pjpg&auto=webp');
    expect(meta.tsExtractedInfo?.redditSubreddit).toBe('typescript');
    expect(meta.tsExtractedInfo?.redditAuthor).toBe('kindredly_user');
  });

  test('keeps text posts valid when no preview image exists', () => {
    const meta = extractMetadataFromRedditJson(
      'https://www.reddit.com/r/typescript/comments/ghijkl/text_post/',
      {
        data: {
          children: [
            {
              data: {
                id: 'ghijkl',
                title: 'Text-only Reddit Post',
                selftext: 'Still useful without an image',
                subreddit: 'typescript',
                author: 'kindredly_user',
              },
            },
          ],
        },
      },
    );

    expect(meta.title).toBe('Text-only Reddit Post');
    expect(meta.description).toBe('Still useful without an image');
    expect(meta.imageSrc).toBeUndefined();
  });

  test('prefers live DOM metadata over weaker fetched metadata while still filling missing fields', () => {
    const merged = mergeMetadataBySourcePriority(
      {
        title: 'Live Title',
        description: 'Live Description',
        tsExtractedInfo: {
          pageType: null,
          sourceId: 'live_dom',
        },
      },
      {
        title: 'Fetched Title',
        imageSrc: 'https://example.com/image.png',
        tsExtractedInfo: {
          pageType: null,
          sourceId: 'parser_1',
        },
      },
    );

    expect(merged.title).toBe('Live Title');
    expect(merged.description).toBe('Live Description');
    expect(merged.imageSrc).toBe('https://example.com/image.png');
    expect(merged.tsExtractedInfo?.sourceId).toBe('live_dom');
  });

  test('falls back to article heading and paragraph when structured metadata is absent', async () => {
    const meta = await extractMetadata(
      'https://awards.acm.org/about/2025-turing',
      `
        <html>
          <head>
            <title>2025 ACM Turing Award</title>
          </head>
          <body>
            <div>This website uses cookies</div>
            <main>
              <h1>2025 ACM Turing Award</h1>
              <p>Charles H. Bennett and Gilles Brassard recognized for their essential role in establishing the foundations of quantum information science.</p>
            </main>
          </body>
        </html>
      `,
    );

    expect(meta.title).toBe('2025 ACM Turing Award');
    expect(meta.description).toContain('Charles H. Bennett and Gilles Brassard');
  });
});

// HAT-168: the device's read of the open page beats the server's cookieless read, except where the
// server knows more than the page does.
describe('which source wins (HAT-168)', () => {
  const live = {
    title: 'Quarterly plan - Google Docs',
    tsExtractedInfo: { pageType: null, sourceId: 'live_dom' as const },
  };

  test('the device read beats the server reading the same page without the person\'s sign-in', () => {
    const merged = mergeMetadataBySourcePriority(live, {
      title: 'Some other title',
      description: 'From the server',
      tsExtractedInfo: { pageType: ItemResourceType.SITE_ITEM, sourceId: 'parser_1' },
    });

    expect(merged.title).toBe('Quarterly plan - Google Docs');
    expect(merged.description).toBe('From the server');
    expect(merged.tsExtractedInfo?.sourceId).toBe('live_dom');
  });

  test("YouTube's own data beats the page, and keeps its channel ids", () => {
    const merged = mergeMetadataBySourcePriority(
      { title: 'The previous video', tsExtractedInfo: { pageType: null, sourceId: 'live_dom' } },
      {
        title: 'The video you are on',
        tsExtractedInfo: {
          pageType: ItemResourceType.YT_VIDEO,
          sourceId: 'yt_api',
          channelId: 'UC123',
          youtubeChannelIds: ['UC123'],
        },
      },
    );

    expect(merged.title).toBe('The video you are on');
    expect(merged.tsExtractedInfo?.pageType).toBe(ItemResourceType.YT_VIDEO);
    expect(merged.tsExtractedInfo?.youtubeChannelIds).toEqual(['UC123']);
  });

  test('a media lookup answer beats the page even when it kept the page reader\'s id', () => {
    const merged = mergeMetadataBySourcePriority(
      { title: 'Atomic Habits Audiobook | James Clear | Audible.com', tsExtractedInfo: { pageType: null, sourceId: 'live_dom' } },
      {
        title: 'Atomic Habits',
        tsManifest: { mediaMetadata: { provider: 'audible', subType: 'book' } },
        tsExtractedInfo: { pageType: ItemResourceType.SITE_ITEM, sourceId: 'parser_1' },
      },
    );

    expect(merged.title).toBe('Atomic Habits');
  });

  test('a title the media lookup made from the address loses to the page, but its details are kept', () => {
    const merged = mergeMetadataBySourcePriority(
      { title: 'Atomic Habits Audiobook', tsExtractedInfo: { pageType: null, sourceId: 'live_dom' } },
      {
        title: 'B07RFSSYBH',
        url: 'https://www.audible.com/pd/B07RFSSYBH',
        tsManifest: { mediaMetadata: { provider: 'audible' } },
        tsExtractedInfo: { pageType: ItemResourceType.SITE_ITEM, sourceId: 'provider_url' },
      },
    );

    expect(merged.title).toBe('Atomic Habits Audiobook');
    expect(merged.tsManifest?.mediaMetadata).toEqual({ provider: 'audible' });
  });

  test('a shared title beats the server\'s read, which still brings the picture', () => {
    const merged = mergeMetadataBySourcePriority(
      { title: 'Quarterly plan', tsExtractedInfo: { pageType: null, sourceId: 'shared_title' } },
      {
        title: 'Google Docs',
        imageSrc: 'https://example.com/docs.png',
        tsExtractedInfo: { pageType: ItemResourceType.SITE_ITEM, sourceId: 'parser_1' },
      },
    );

    expect(merged.title).toBe('Quarterly plan');
    expect(merged.imageSrc).toBe('https://example.com/docs.png');
  });

  test("a PDF's landing page beats a shared title, which beats the file name", () => {
    const landing = { title: 'A Study of Sleep', tsExtractedInfo: { pageType: null, sourceId: 'pdf_landing_page' as const } };
    const shared = { title: 'sleep.pdf from a friend', tsExtractedInfo: { pageType: null, sourceId: 'shared_title' as const } };
    const fileName = { title: 'Sleep', tsExtractedInfo: { pageType: null, sourceId: 'file_name' as const } };

    expect(mergeMetadataBySourcePriority(shared, landing).title).toBe('A Study of Sleep');
    expect(mergeMetadataBySourcePriority(shared, fileName).title).toBe('sleep.pdf from a friend');
  });

  test("the device read's empty page type no longer wipes the server's SITE_ROOT", () => {
    const merged = mergeMetadataBySourcePriority(
      { title: 'Example', tsExtractedInfo: { pageType: null, sourceId: 'live_dom' } },
      { title: 'Example Inc', tsExtractedInfo: { pageType: ItemResourceType.SITE_ROOT, sourceId: 'parser_1' } },
    );

    expect(merged.tsExtractedInfo?.pageType).toBe(ItemResourceType.SITE_ROOT);
    expect(merged.tsExtractedInfo?.sourceId).toBe('live_dom');
  });

  test('an empty list on the winner never wipes the other side\'s list', () => {
    const merged = mergeMetadataBySourcePriority(
      { title: 'A', tsExtractedInfo: { pageType: null, sourceId: 'live_dom', discoveredFeedLinks: [] } },
      {
        title: 'B',
        tsExtractedInfo: {
          pageType: null,
          sourceId: 'parser_1',
          discoveredFeedLinks: [{ url: 'https://example.com/feed.xml', type: 'rss', source: 'head' }],
        },
      },
    );

    expect(merged.tsExtractedInfo?.discoveredFeedLinks).toHaveLength(1);
  });
});

describe('readDeviceFeedLinks', () => {
  const raw = {
    head: [
      { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml', title: 'Main RSS Feed' },
      { rel: 'stylesheet', type: 'text/css', href: '/site.css', title: null },
    ],
    anchors: [
      { href: 'https://example.com/sections/politics/rss', type: null, title: 'Politics RSS', text: 'Politics feed' },
      { href: '/about', type: null, title: null, text: 'About us' },
    ],
  };

  test('reads head and anchor feeds the way the server parser does', () => {
    expect(readDeviceFeedLinks('https://example.com/blog/post', raw)).toEqual([
      { url: 'https://example.com/feed.xml', title: 'Main RSS Feed', type: 'rss', source: 'head' },
      { url: 'https://example.com/sections/politics/rss', title: 'Politics RSS', type: 'rss', source: 'anchor' },
    ]);
  });

  test('accepts the same object as a JSON string, as iOS sends it', () => {
    expect(readDeviceFeedLinks('https://example.com/blog/post', JSON.stringify(raw))).toHaveLength(2);
  });

  test('reads junk as no feeds', () => {
    expect(readDeviceFeedLinks('https://example.com/', '{ not json')).toEqual([]);
    expect(readDeviceFeedLinks('https://example.com/', 7)).toEqual([]);
    expect(readDeviceFeedLinks('https://example.com/', { head: 'nope', anchors: [null, 3] })).toEqual([]);
  });
});

// UX-081: a title keeps its own spelling unless the page ran text together.
describe('sanitizeExtractedTitle keeps brand names whole', () => {
  test.each([
    ['CrashCourse - YouTube'],
    ['GitHub - scratchfoundation/scratch-gui'],
    ['Error Page | eBay'],
    ['Apple AirPods Pro'],
    ['Project Hail Mary: A Novel eBook'],
  ])('%s', (title) => {
    expect(sanitizeExtractedTitle(title)).toBe(title);
  });
});
