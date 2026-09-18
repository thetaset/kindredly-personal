/**
 * Extraction helpers with no HTML-parser dependency.
 *
 * `extraction.utils.ts` imports cheerio at module level, which cannot be
 * tree-shaken. Anything on a first-paint path (the Home page reaches
 * `resolveAbsoluteUrl` through ItemImage) must import from here instead, or the
 * whole parser family rides along into the entry bundle.
 */

export function normalizeTextSnippet(value?: string | null): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

export function resolveAbsoluteUrl(baseUrl: string, value?: string | null): string | undefined {
  const normalized = normalizeTextSnippet(value);
  if (!normalized) {
    return undefined;
  }

  try {
    return new URL(normalized, baseUrl).toString();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------------------------
// Moved here from extraction.utils.ts: title cleanup, image-URL normalisation and feed-URL
// recognition read no HTML, so they must not ride in with cheerio. `display.factory`, the
// userPrefs store and the item requirement resolvers import these at boot; importing them
// through extraction.utils put a 490KB parser in the iOS boot bundle.
// ---------------------------------------------------------------------------------------------
import type { ItemMeta, ItemMetaExtracted } from './shared.types';

export const MAX_EXTRACTED_TITLE_CHARS = 120;

export function addMissingTitleWordBreaks(value: string): string {
  return value
    .replace(/([a-z0-9\u2019])([A-Z][a-z])/g, '$1 $2')
    .replace(/([0-9])([A-Z][a-z])/g, '$1 $2');
}

export function trimRepeatedIndexedSuffix(value: string): string {
  const indexedLabelMatches = Array.from(value.matchAll(/\b([A-Z][a-z]{3,})\s+\d+\b/g));
  if (indexedLabelMatches.length < 2) {
    return value;
  }

  const labelCounts = indexedLabelMatches.reduce<Map<string, number>>((counts, match) => {
    const label = match[1]?.toLowerCase();
    if (!label) {
      return counts;
    }

    counts.set(label, (counts.get(label) || 0) + 1);
    return counts;
  }, new Map());

  const firstRepeatedMatch = indexedLabelMatches.find((match) => {
    const label = match[1]?.toLowerCase();
    return !!label && (labelCounts.get(label) || 0) >= 2;
  });

  if (!firstRepeatedMatch || typeof firstRepeatedMatch.index !== 'number' || firstRepeatedMatch.index < 12) {
    return value;
  }

  const prefix = normalizeTextSnippet(value.slice(0, firstRepeatedMatch.index));
  if (!prefix || prefix.split(/\s+/).length < 2) {
    return value;
  }

  return prefix;
}

export function truncateExtractedTitle(value: string): string {
  if (value.length <= MAX_EXTRACTED_TITLE_CHARS) {
    return value;
  }

  const candidate = value.slice(0, MAX_EXTRACTED_TITLE_CHARS + 1);
  const boundary = Math.max(
    candidate.lastIndexOf(' | '),
    candidate.lastIndexOf(' - '),
    candidate.lastIndexOf(' — '),
    candidate.lastIndexOf(' – '),
    candidate.lastIndexOf(': '),
    candidate.lastIndexOf('; '),
    candidate.lastIndexOf(', '),
    candidate.lastIndexOf(' '),
  );

  const cutIndex = boundary >= 60 ? boundary : MAX_EXTRACTED_TITLE_CHARS;
  return `${candidate.slice(0, cutIndex).trimEnd()}...`;
}

export function sanitizeExtractedTitle(value?: string | null): string | undefined {
  const normalized = normalizeTextSnippet(value);
  if (!normalized) {
    return undefined;
  }

  const withWordBreaks = normalizeTextSnippet(addMissingTitleWordBreaks(normalized));
  if (!withWordBreaks || isLikelyMetadataNoise(withWordBreaks)) {
    return undefined;
  }

  return truncateExtractedTitle(trimRepeatedIndexedSuffix(withWordBreaks));
}

/**
 * A title that belongs to a bot-protection interstitial rather than to the page.
 *
 * Worth its own function because the failure it prevents is specific and silent:
 * a server-side fetch that is answered by Imperva, Cloudflare or similar gets a
 * perfectly well-formed title — "Client Challenge" — and anything that trusts it
 * stores the interstitial's identity in place of the site's. The browser has
 * guarded this since the item editor was written; it moved here so the server can
 * use the same list, after an assistant-approved request wrote a library item
 * literally named "Client Challenge".
 *
 * Substring matches are capped at 50 characters on purpose. "Captcha" inside a
 * long title is usually a page *about* captchas; alone, it is the challenge page.
 */
export function isLikelyChallengeTitle(value?: string | null): boolean {
  const normalized = (typeof value === 'string' ? value : '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const exactMatches = new Set([
    'client challenge',
    'just a moment...',
    'just a moment',
    'attention required!',
    'attention required',
    'please wait...',
    'please wait',
    'access denied',
    'one more step',
    'are you human?',
    'are you human',
  ]);

  if (exactMatches.has(normalized)) {
    return true;
  }

  if (normalized.length <= 50) {
    if (normalized.includes('client challenge')) return true;
    if (normalized.includes('checking your browser')) return true;
    if (normalized.includes('verify you are human')) return true;
    if (normalized.includes('captcha')) return true;
  }

  return false;
}

export function isLikelyMetadataNoise(value?: string | null): boolean {
  const normalized = normalizeTextSnippet(value)?.toLowerCase();
  if (!normalized) {
    return true;
  }

  // Deferred to rather than duplicated: this filter already carried three of the
  // challenge titles and none of the rest, so the two lists disagreed about the
  // same page depending on which one you happened to call.
  if (isLikelyChallengeTitle(normalized)) {
    return true;
  }

  return (
    normalized.includes('this website uses cookies') ||
    normalized.includes('allow all cookies') ||
    normalized.includes('allow selected cookies') ||
    normalized.includes('use necessary cookies only') ||
    normalized.includes('cookie declaration') ||
    normalized.includes('enable javascript and cookies') ||
    normalized.includes('attention required') ||
    normalized.includes('access denied') ||
    normalized.includes('just a moment')
  );
}



export function normalizeItemMetaImageUrls(baseUrl: string | undefined, meta?: ItemMeta | null): ItemMeta | undefined {
  if (!meta) {
    return undefined;
  }

  const normalizedBaseUrl = normalizeTextSnippet(baseUrl || meta.url);
  if (!normalizedBaseUrl) {
    return meta;
  }

  const normalizedImageSrc =
    resolveAbsoluteUrl(normalizedBaseUrl, meta.imageSrc) ||
    normalizeTextSnippet(meta.imageSrc) ||
    (meta.imageSrc === '' ? '' : undefined);

  return {
    ...meta,
    url: resolveAbsoluteUrl(normalizedBaseUrl, meta.url) || normalizedBaseUrl,
    favicon: resolveAbsoluteUrl(normalizedBaseUrl, meta.favicon) || normalizeTextSnippet(meta.favicon),
    faviconSrcPath:
      resolveAbsoluteUrl(normalizedBaseUrl, meta.faviconSrcPath) ||
      normalizeTextSnippet(meta.faviconSrcPath),
    imageSrc: normalizedImageSrc,
    bannerImageSrcPath:
      resolveAbsoluteUrl(normalizedBaseUrl, meta.bannerImageSrcPath) ||
      normalizeTextSnippet(meta.bannerImageSrcPath),
  };
}

export function getFeedType(typeAttr?: string | null): 'rss' | 'atom' | 'json' | null {
  const normalized = normalizeTextSnippet(typeAttr)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('rss+xml')) return 'rss';
  if (normalized.includes('atom+xml')) return 'atom';
  if (normalized.includes('feed+json') || normalized.includes('json')) return 'json';
  return null;
}

export function getFeedTypeFromText(value?: string | null): 'rss' | 'atom' | 'json' | null {
  const normalized = normalizeTextSnippet(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('atom')) return 'atom';
  if (normalized.includes('json feed') || normalized.includes('jsonfeed')) return 'json';
  if (normalized.includes('rss') || normalized.includes('podcast')) return 'rss';
  return null;
}

export function getFeedTypeFromUrl(value?: string | null): 'rss' | 'atom' | 'json' | null {
  const normalized = normalizeTextSnippet(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (/(?:^|\/)(?:atom)(?:[/?._]|$)/.test(normalized) || /(?:^|[?&])(format|output|feed)=atom(?:[&#]|$)/.test(normalized) || /\.atom(?:$|[?#])/.test(normalized)) return 'atom';
  if (normalized.includes('jsonfeed') || normalized.includes('feed.json') || /(?:^|[?&])(format|output|feed)=json(?:[&#]|$)/.test(normalized)) return 'json';
  if (
    /\.rss(?:$|[?#])/.test(normalized) ||
    /(?:^|\/)(?:rss|feed|feeds)(?:[/?._]|$)/.test(normalized) ||
    /(?:^|[?&])(format|output|feed)=rss(?:[&#]|$)/.test(normalized) ||
    /(?:^|\/)(?:podcast|podcasts)(?:[/?._-]|$)/.test(normalized)
  ) {
    return 'rss';
  }

  return null;
}

export function hasStrongFeedUrlCue(value?: string | null): boolean {
  const normalized = normalizeTextSnippet(value)?.toLowerCase();
  if (!normalized) {
    return false;
  }

  return /(?:^|\/)(?:feed|feeds|rss|atom)(?:[/?._]|$)/.test(normalized)
    || /(?:^|[?&])(format|output|feed)=(rss|atom|json)(?:[&#]|$)/.test(normalized)
    || /\.(rss|atom|xml|json)(?:$|[?#])/.test(normalized)
    || /(?:^|\/)(?:podcast|podcasts)(?:[/?._-]|$)/.test(normalized);
}

export const FEED_FILE_EXTENSION_RE = /\.(rss|atom)$/;
export const FEED_FILE_NAME_RE = /^(feed|feeds|rss|rss2|atom|index|podcast|episodes)\.(xml|rss|atom|json)$/;
export const FEED_DATA_EXTENSION_RE = /\.(xml|json|rss|atom)$/;
export const FEED_PATH_SEGMENTS = new Set(['feed', 'feeds', 'rss', 'atom']);
// `feeds.npr.org/510355/podcast.xml`, `rss.example.com/show.xml` — a feed-hosting
// subdomain plus a data file. The subdomain alone is not enough (`feeds.example.com/about`).
export const FEED_HOST_LABELS = new Set(['feed', 'feeds', 'rss', 'podcasts']);
// Podcast hosts that serve nothing but feeds, where a feed URL is an opaque id with no
// feed-shaped path (`feeds.simplecast.com/kwWc0lhf`, `feeds.megaphone.fm/sciencevs`).
// Exact hostnames, never a label match: each one 404s (or serves another feed) on a
// non-feed path, so any path on it is safe to act on. The bare root is not —
// `feeds.publicradio.org/` is an HTML page.
export const FEED_ONLY_HOSTS = new Set([
  'feeds.megaphone.fm',
  'feeds.simplecast.com',
  'feeds.acast.com',
  'rss.art19.com',
  'feeds.feedburner.com',
  'feeds.publicradio.org',
]);
export const FEED_FORMAT_QUERY_KEYS = ['format', 'output', 'feed', 'alt', 'type'];
export const FEED_FORMAT_QUERY_VALUE_RE = /^(rss|rss2|atom|feed|json)$/i;

/**
 * Strict "this URL is a feed" test, for deciding whether to *act* on a URL —
 * prefiltering navigations in the extension, and intercepting them in the native
 * in-app browsers. Deliberately much narrower than `hasStrongFeedUrlCue`, which is
 * tuned for scoring anchor candidates alongside a text cue and happily matches
 * `/podcasts/the-daily` or any `.xml`. Acting on those would hijack ordinary page
 * loads and sitemaps, so this requires a real feed filename, a feed path segment,
 * or an explicit feed format in the query string.
 */
export function isLikelyFeedUrl(value?: string | null): boolean {
  const normalized = normalizeTextSnippet(value);
  if (!normalized) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const segments = parsed.pathname.toLowerCase().split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || '';

  // `/whatever.rss`, `/whatever.atom` — the extension alone is conclusive.
  if (FEED_FILE_EXTENSION_RE.test(lastSegment)) {
    return true;
  }

  // `/feed.xml`, `/rss.xml`, `/atom.xml`, `/index.xml` (Hugo), `/feed.json`, `/podcast.xml`.
  if (FEED_FILE_NAME_RE.test(lastSegment)) {
    return true;
  }

  // `feeds.npr.org/510355/podcast.xml` — feed-hosting subdomain + a data file.
  const hostname = parsed.hostname.toLowerCase();
  const firstHostLabel = hostname.split('.')[0] || '';
  if (FEED_HOST_LABELS.has(firstHostLabel) && FEED_DATA_EXTENSION_RE.test(lastSegment)) {
    return true;
  }

  // `feeds.simplecast.com/kwWc0lhf` — a feed-only podcast host, any non-root path.
  if (segments.length > 0 && FEED_ONLY_HOSTS.has(hostname)) {
    return true;
  }

  // A `feed`/`feeds`/`rss`/`atom` path segment, but only when the URL also ends in
  // something feed-shaped: the segment itself (`/blog/feed`, `/rss/`), a data file
  // (`/feeds/videos.xml` on YouTube), or Blogger's `/feeds/posts/default`.
  if (segments.some((segment) => FEED_PATH_SEGMENTS.has(segment))) {
    if (
      FEED_PATH_SEGMENTS.has(lastSegment) ||
      FEED_DATA_EXTENSION_RE.test(lastSegment) ||
      lastSegment === 'default'
    ) {
      return true;
    }
  }

  // `?format=rss`, `?feed=atom`, `?alt=rss`, …
  for (const key of FEED_FORMAT_QUERY_KEYS) {
    const queryValue = parsed.searchParams.get(key);
    if (queryValue && FEED_FORMAT_QUERY_VALUE_RE.test(queryValue.trim())) {
      return true;
    }
  }

  return false;
}

export const FEED_CONTENT_TYPE_RE = /(rss\+xml|atom\+xml|feed\+json|rdf\+xml)/;

/**
 * True when a response `Content-Type` names a feed outright. This is the signal that
 * makes a browser download a feed link instead of rendering it, so it is also the
 * most reliable way to recognise one — no body parsing required.
 */
export function isFeedContentType(value?: string | null): boolean {
  const normalized = normalizeTextSnippet(value)?.toLowerCase();
  return !!normalized && FEED_CONTENT_TYPE_RE.test(normalized);
}

/**
 * Cheap sniff for an RSS/Atom feed body. Podcasts (and other feeds) store the
 * feed URL as their primary URL, so the generic HTML/og:image extractor never
 * sees the artwork (it lives in <itunes:image> / the channel <image>) and
 * mangles the title by concatenating every <title>. Detect feeds up front and
 * parse them properly instead.
 *
 * Regex-only on purpose — no `DOMParser`, no cheerio — so it also runs in the MV3
 * background service worker, where the extension sniffs feed responses.
 */
export function looksLikeXmlFeed(data: string): boolean {
  if (!data) return false;
  const head = data.slice(0, 1500).toLowerCase().trimStart();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
  return /<rss[\s>]/.test(head) || /<feed[\s>]/.test(head) || (head.startsWith('<?xml') && head.includes('<channel'));
}

// Metadata merge helpers. They compare and combine already-extracted `ItemMeta` records and
// never touch HTML, so the background's metadata service can use them without the parser.
export function hasUsableMetadata(meta?: ItemMeta | null): boolean {
  if (!meta) {
    return false;
  }

  return Boolean(meta.title?.trim() || meta.description?.trim() || meta.imageSrc?.trim());
}

const METADATA_SOURCE_PRIORITY: Record<string, number> = {
  published_curated: 100,
  published: 95,
  live_dom: 90,
  yt_api: 85,
  oembed: 80,
  html_parser: 70,
  parser_1: 60,
  parser_err: 10,
};

export function getMetadataSourcePriority(meta?: ItemMeta | null): number {
  const sourceId = meta?.tsExtractedInfo?.sourceId;
  if (!sourceId) {
    return 0;
  }

  return METADATA_SOURCE_PRIORITY[sourceId] ?? 0;
}

export function mergeMetadataBySourcePriority(existing: ItemMeta, incoming?: ItemMeta | null): ItemMeta {
  if (!incoming) {
    return existing;
  }

  const incomingWins = getMetadataSourcePriority(incoming) >= getMetadataSourcePriority(existing);
  return mergeMetadataPreferPrimary(incomingWins ? incoming : existing, incomingWins ? existing : incoming);
}

export function mergeMetadataPreferPrimary(primary: ItemMeta, fallback?: ItemMeta | null): ItemMeta {
  if (!fallback) {
    return normalizeItemMetaImageUrls(primary.url, primary) || primary;
  }

  const mergedExtractedInfo: ItemMetaExtracted | undefined = (primary.tsExtractedInfo || fallback.tsExtractedInfo)
    ? {
        pageType: primary.tsExtractedInfo?.pageType ?? fallback.tsExtractedInfo?.pageType ?? null,
        ...(fallback.tsExtractedInfo || {}),
        ...(primary.tsExtractedInfo || {}),
      }
    : undefined;

  const mergedMeta: ItemMeta = {
    ...fallback,
    ...primary,
    title: primary.title?.trim() || fallback.title,
    description: primary.description?.trim() || fallback.description,
    keywords: primary.keywords?.trim() || fallback.keywords,
    siteName: primary.siteName?.trim() || fallback.siteName,
    type: primary.type?.trim() || fallback.type,
    locale: primary.locale?.trim() || fallback.locale,
    favicon: primary.favicon?.trim() || fallback.favicon,
    faviconSrcPath: primary.faviconSrcPath?.trim() || fallback.faviconSrcPath,
    imageSrc: primary.imageSrc?.trim() || fallback.imageSrc,
    bannerImageSrcPath: primary.bannerImageSrcPath?.trim() || fallback.bannerImageSrcPath,
    tsExtractedInfo: mergedExtractedInfo,
  };

  return normalizeItemMetaImageUrls(primary.url || fallback.url, mergedMeta) || mergedMeta;
}
