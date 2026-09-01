import {
  extractMetadata,
  extractMetadataFromRedditJson,
  getRedditImageUrl,
  mergeMetadataBySourcePriority,
  sanitizeExtractedTitle,
} from '../src/extraction.utils';
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