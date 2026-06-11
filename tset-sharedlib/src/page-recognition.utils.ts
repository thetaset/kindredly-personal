import { ItemResourceType } from './constants';

export type RecognizedProvider = 'youtube' | 'reddit' | 'netflix' | 'generic';

/**
 * These are "recognized" resource types used for smarter behavior.
 *
 * - Includes ItemResourceType for backward compatibility
 * - Includes extra string types used for richer classification (e.g., Netflix)
 */
export type RecognizedResourceType =
  | ItemResourceType
  | 'REDDIT_POST'
  | 'REDDIT_SUBREDDIT'
  | 'NETFLIX_TITLE'
  | 'NETFLIX_SERIES'
  | 'NETFLIX_EPISODE'
  | 'GENERIC_SITE';

export type RecognizedContentKind =
  | 'website_root'
  | 'website_page'
  | 'video'
  | 'channel'
  | 'post'
  | 'subreddit'
  | 'movie'
  | 'series'
  | 'episode'
  | 'unknown';

export interface RecognizedPageInfo {
  provider: RecognizedProvider;
  resourceType: RecognizedResourceType;

  /**
   * A higher-level content kind, independent of provider.
   * Example: Netflix might be `movie|series|episode`.
   */
  contentKind?: RecognizedContentKind;

  /**
   * Stable, provider-specific identifier when available.
   * Example: YouTube videoId, Reddit post id, Netflix titleId.
   */
  externalId?: string;

  /** Optional parent id for hierarchical content (e.g., subreddit, series). */
  parentExternalId?: string | null;

  /** Canonical URL if one can be derived safely. */
  canonicalUrl?: string | null;

  /** Confidence score [0,1] for downstream heuristics (optional). */
  confidence?: number;

  /** Flexible extension point for provider-specific properties. */
  properties?: Record<string, unknown>;
}

export interface PageRecognitionInput {
  url: string;
  /**
   * Map of extracted meta tags. Existing extractor uses keys like `og:title`, `og:type`, `description`.
   */
  meta?: Record<string, unknown> | null;
  /** Optional DOM document (extension/content-script/Electron contexts). */
  document?: Document | null;
  /** Optional raw HTML (background fetch contexts). */
  html?: string | null;
}

export interface PageRecognizer {
  id: string;
  /** Higher numbers win (useful if multiple match). */
  priority?: number;
  matchUrl: (urlObj: URL) => boolean;
  recognize: (input: { urlObj: URL } & PageRecognitionInput) => RecognizedPageInfo | null;
}

function safeUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function getMetaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = meta?.[key];
  if (typeof v === 'string') return v;
  return null;
}

function getMetaStringAny(meta: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const v = getMetaString(meta, key);
    if (v) return v;
  }
  return null;
}

function parseJsonLdFromDocument(document: Document | null | undefined): unknown[] {
  if (!document) return [];
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  );

  const results: unknown[] = [];
  for (const s of scripts) {
    const text = s.textContent;
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch {
      // ignore invalid JSON-LD
    }
  }
  return results;
}

function parseJsonLdFromHtml(html: string | null | undefined): unknown[] {
  if (!html) return [];
  const results: unknown[] = [];

  // Lightweight extraction: grab contents of <script type="application/ld+json">...</script>
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1];
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch {
      // ignore invalid
    }
  }

  return results;
}

function extractJsonLdObjects(input: PageRecognitionInput): unknown[] {
  const fromDom = parseJsonLdFromDocument(input.document);
  if (fromDom.length > 0) return fromDom;
  return parseJsonLdFromHtml(input.html);
}

function isItemResourceType(v: string): v is ItemResourceType {
  return (Object.values(ItemResourceType) as string[]).includes(v);
}

export function recognizedToItemResourceType(recognized: RecognizedPageInfo): ItemResourceType {
  const rt = recognized.resourceType;
  if (typeof rt === 'string' && isItemResourceType(rt)) return rt;

  // Non-core recognized types should still be treated as SITE_ITEM in existing flows.
  if (recognized.resourceType === 'GENERIC_SITE') return ItemResourceType.SITE_ITEM;
  return ItemResourceType.SITE_ITEM;
}

/**
 * Default built-in recognizers.
 *
 * This is intentionally conservative: it enriches metadata without changing
 * current behavior unless `pageType` was previously null.
 */
export const defaultPageRecognizers: PageRecognizer[] = [
  {
    id: 'youtube',
    priority: 100,
    matchUrl: (urlObj) => urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be',
    recognize: ({ url, urlObj }) => {
      const href = urlObj.toString();
      const isVideo = href.includes('youtube.com/watch') || href.includes('youtu.be/') || href.includes('youtube.com/embed/');
      const isChannel = href.includes('youtube.com/channel/') || href.includes('youtube.com/c/') || href.includes('youtube.com/@') || href.includes('youtube.com/user/');

      if (isVideo) {
        return {
          provider: 'youtube',
          resourceType: ItemResourceType.YT_VIDEO,
          contentKind: 'video',
          canonicalUrl: href,
          confidence: 0.95,
        };
      }

      if (isChannel) {
        return {
          provider: 'youtube',
          resourceType: ItemResourceType.YT_CHANNEL,
          contentKind: 'channel',
          canonicalUrl: href,
          confidence: 0.9,
        };
      }

      return {
        provider: 'youtube',
        resourceType: ItemResourceType.YT_PAGE,
        contentKind: 'website_page',
        canonicalUrl: href,
        confidence: 0.6,
      };
    },
  },
  {
    id: 'reddit',
    priority: 90,
    matchUrl: (urlObj) => urlObj.hostname.endsWith('reddit.com') || urlObj.hostname === 'redd.it',
    recognize: ({ urlObj }) => {
      const path = urlObj.pathname || '/';

      // /r/{subreddit}/comments/{postId}/...
      const postMatch = path.match(/^\/r\/([^\/]+)\/comments\/([^\/]+)\/?/i);
      if (postMatch) {
        const subreddit = postMatch[1];
        const postId = postMatch[2];
        return {
          provider: 'reddit',
          resourceType: 'REDDIT_POST',
          contentKind: 'post',
          externalId: postId,
          parentExternalId: subreddit,
          canonicalUrl: urlObj.toString(),
          confidence: 0.9,
        };
      }

      // /r/{subreddit}
      const subredditMatch = path.match(/^\/r\/([^\/]+)\/?$/i);
      if (subredditMatch) {
        const subreddit = subredditMatch[1];
        return {
          provider: 'reddit',
          resourceType: 'REDDIT_SUBREDDIT',
          contentKind: 'subreddit',
          externalId: subreddit,
          canonicalUrl: urlObj.toString(),
          confidence: 0.85,
        };
      }

      return null;
    },
  },
  {
    id: 'netflix',
    priority: 80,
    matchUrl: (urlObj) => urlObj.hostname.endsWith('netflix.com'),
    recognize: (input) => {
      const urlObj = input.urlObj;
      const path = urlObj.pathname || '/';

      // Netflix canonical-ish paths:
      // - /title/{numericId}
      // - /watch/{numericId}
      const titleMatch = path.match(/^\/(title|watch)\/(\d+)\/?/i);
      if (!titleMatch) return null;

      const kindFromPath = titleMatch[1].toLowerCase();
      const id = titleMatch[2];

      // Try to infer movie/series/episode using JSON-LD (when accessible) or OG type.
      const jsonldObjects = extractJsonLdObjects(input);
      let contentKind: RecognizedContentKind | undefined;
      for (const obj of jsonldObjects) {
        if (!obj || typeof obj !== 'object') continue;
        const t = (obj as any)['@type'];
        if (t === 'TVSeries') contentKind = 'series';
        else if (t === 'TVEpisode') contentKind = 'episode';
        else if (t === 'Movie') contentKind = 'movie';
        if (contentKind) break;
      }

      const ogType = getMetaStringAny(input.meta, ['og:type', 'twitter:card']);
      if (!contentKind && ogType) {
        // Extremely conservative: only assign if obvious.
        if (ogType.toLowerCase().includes('episode')) contentKind = 'episode';
        else if (ogType.toLowerCase().includes('series') || ogType.toLowerCase().includes('tv')) contentKind = 'series';
      }

      const resourceType: RecognizedResourceType =
        contentKind === 'series'
          ? 'NETFLIX_SERIES'
          : contentKind === 'episode'
            ? 'NETFLIX_EPISODE'
            : 'NETFLIX_TITLE';

      return {
        provider: 'netflix',
        resourceType,
        contentKind: contentKind ?? 'unknown',
        externalId: id,
        canonicalUrl: urlObj.toString(),
        confidence: kindFromPath === 'title' ? 0.85 : 0.75,
        properties: {
          netflixPathKind: kindFromPath,
        },
      };
    },
  },
  {
    id: 'site-root',
    priority: 10,
    matchUrl: () => true,
    recognize: ({ urlObj }) => {
      const path = urlObj.pathname || '/';
      if (path === '/' || path === '') {
        return {
          provider: 'generic',
          resourceType: ItemResourceType.SITE_ROOT,
          contentKind: 'website_root',
          canonicalUrl: urlObj.origin,
          confidence: 0.8,
        };
      }
      return {
        provider: 'generic',
        resourceType: ItemResourceType.SITE_ITEM,
        contentKind: 'website_page',
        canonicalUrl: urlObj.toString(),
        confidence: 0.4,
      };
    },
  },
];

export function recognizePage(
  input: PageRecognitionInput,
  recognizers: PageRecognizer[] = defaultPageRecognizers
): RecognizedPageInfo | null {
  const urlObj = safeUrl(input.url);
  if (!urlObj) return null;

  const candidates = recognizers
    .filter((r) => {
      try {
        return r.matchUrl(urlObj);
      } catch {
        return false;
      }
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const recognizer of candidates) {
    try {
      const result = recognizer.recognize({ ...input, urlObj });
      if (result) return result;
    } catch {
      // recognizer errors should not block saves; ignore
    }
  }

  return null;
}
