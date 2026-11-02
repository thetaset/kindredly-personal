/**
 * Which picture a saved page gets, and when a page's own tags can be trusted to describe it.
 *
 * One rule for the popup's read of the open page and the server's read of an address:
 * `pickPageImage`. Two things went wrong with taking og:image as it came (HAT-323):
 *
 * - **Tags left over from another page.** A site that changes pages in place (YouTube, X, Reddit)
 *   keeps the first page's head tags. Saving a video opened from YouTube's home page showed the
 *   YouTube logo. Only the device can tell: it knows the address the page was loaded at.
 * - **The site's logo as the picture.** Amazon's og:image is the Amazon logo, and many sites tag
 *   one share picture on every page. A logo is used only when nothing better is offered.
 *
 * A YouTube video's picture comes from its address: every public video has a thumbnail at a fixed
 * address, the same one YouTube's API returns, so it needs neither the API's key nor the server.
 * The API lookup still runs for what only it knows, such as the channel.
 */
import { extractYTVideoID } from './text.utils';
import { isYTVideoURL } from './url.utils';

/** A picture in view on the device, with the size it is shown at. */
export type ShownImage = { src: string; width: number; height: number };

/** What a read collected for choosing the page's picture. Every list is in order of preference. */
export type PageImageRead = {
  pageUrl: string | null | undefined;
  /** og:image, twitter:image and the like. */
  tagged?: Array<string | null | undefined>;
  /** Pictures named in the page's structured data (JSON-LD `image`, `thumbnailUrl`). */
  structured?: Array<string | null | undefined>;
  /** A video's poster picture. */
  poster?: string | null;
  /** The biggest pictures in view; only a read on the device has these. */
  shown?: ShownImage[] | null;
  /** The site's icons. A tagged picture that is one of them is the site's logo. */
  icons?: Array<string | null | undefined>;
  /** The head tags describe another page (`headTagsDescribeAnotherPage`): skip what they name. */
  tagsAreStale?: boolean;
};

/** A picture shown smaller than this is an icon, a button or an avatar, not the page's picture. */
const MIN_SHOWN_SIDE = 150;
/** Wider or taller than this is a banner, a divider or a strip of thumbnails. */
const MAX_SHOWN_RATIO = 4;

/** File names a site gives its logo or its one picture for every page. */
const SITE_IMAGE_NAME = /(^|[^a-z0-9])(logo|logos|favicon|apple-touch-icon|placeholder|default|fallback)([^a-z0-9]|$)/;

/** The video's id when `url` is a YouTube video, otherwise null. */
function youTubeVideoId(url: string | null | undefined): string | null {
  return url && isYTVideoURL(url) ? extractYTVideoID(url) : null;
}

/** The thumbnail YouTube keeps for every public video (480×360, `thumbnails.high` in its API). */
export function youTubeThumbnailUrl(url: string | null | undefined): string | undefined {
  const videoId = youTubeVideoId(url);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
}

function parse(url: string | null | undefined, base?: string | null): URL | null {
  if (!url) return null;
  try {
    return base ? new URL(url, base) : new URL(url);
  } catch {
    return null;
  }
}

/** Same host (with or without www) and same path (with or without a trailing slash). */
function isSamePage(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return false;
  const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '');
  const path = (url: URL) => url.pathname.replace(/\/+$/, '') || '/';
  return host(left) === host(right) && path(left) === path(right);
}

/**
 * True when the page's og tags describe a page other than `pageUrl`.
 *
 * A YouTube video page's tags are this video's only when og:url names it. They can name the
 * previous video, or — on arriving from the home page — no video at all, with the YouTube logo
 * as the picture and "YouTube" as the title.
 *
 * Elsewhere only a page that changed address after it loaded can carry another page's tags:
 * `loadedUrl` is the address the document was loaded at. Its tags still count when og:url names
 * the page now shown, as a site that updates them does. Without `loadedUrl` (the server, a
 * phone's share) the tags are trusted.
 */
export function headTagsDescribeAnotherPage(
  pageUrl: string | null | undefined,
  ogUrl: string | null | undefined,
  loadedUrl?: string | null,
): boolean {
  const videoId = youTubeVideoId(pageUrl);
  if (videoId) return youTubeVideoId(ogUrl) !== videoId;
  if (!pageUrl || !loadedUrl || isSamePage(loadedUrl, pageUrl)) return false;
  return !isSamePage(ogUrl, pageUrl);
}

/** True for a picture that is the site's icon, or whose file name says it is a logo or a default. */
export function isLikelySiteImage(
  src: string,
  pageUrl: string | null | undefined,
  icons: Array<string | null | undefined> = [],
): boolean {
  const url = parse(src, pageUrl);
  if (!url) return false;
  const withoutQuery = (value: URL) => `${value.origin}${value.pathname}`;
  for (const icon of icons) {
    const iconUrl = parse(icon, pageUrl);
    if (iconUrl && withoutQuery(iconUrl) === withoutQuery(url)) return true;
  }
  let fileName = url.pathname.split('/').pop() || '';
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    // A malformed escape is still a name to test.
  }
  return SITE_IMAGE_NAME.test(fileName.toLowerCase());
}

/**
 * The page's picture. In order: a YouTube video's own thumbnail; then the first that is not the
 * site's logo among the tagged pictures, the structured data's, a video's poster, and the biggest
 * picture in view; then the site's logo, when it is all the page offers, or the page is the
 * site's home page.
 */
export function pickPageImage(read: PageImageRead): string | undefined {
  const youTube = youTubeThumbnailUrl(read.pageUrl);
  if (youTube) return youTube;

  const shown = (read.shown || [])
    .filter((image) => {
      const shortSide = Math.min(image.width, image.height);
      const longSide = Math.max(image.width, image.height);
      return !!image.src && shortSide >= MIN_SHOWN_SIDE && longSide / shortSide <= MAX_SHOWN_RATIO;
    })
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .map((image) => image.src);

  const fromTags = read.tagsAreStale ? [] : [...(read.tagged || []), ...(read.structured || [])];
  const candidates = [...fromTags, read.poster, ...shown]
    .map((src) => (typeof src === 'string' ? src.trim() : ''))
    .filter((src) => src && !src.startsWith('data:'));

  // A site's home page is the site, so its own picture is the right one there.
  const path = parse(read.pageUrl)?.pathname || '/';
  if (path === '/') return candidates[0];
  return candidates.find((src) => !isLikelySiteImage(src, read.pageUrl, read.icons)) || candidates[0];
}

/** Picture addresses named in JSON-LD blocks: `image` and `thumbnailUrl`, never `logo`. */
export function jsonLdImageUrls(blocks: unknown[] | null | undefined): string[] {
  const found: string[] = [];
  const add = (value: unknown) => {
    if (found.length >= 5 || !value) return;
    if (typeof value === 'string') {
      if (!found.includes(value)) found.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(add);
    } else if (typeof value === 'object') {
      const image = value as { url?: unknown; contentUrl?: unknown };
      add(image.url || image.contentUrl);
    }
  };
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== 'object' || depth > 3) return;
    if (Array.isArray(node)) {
      node.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    const entry = node as { image?: unknown; thumbnailUrl?: unknown; '@graph'?: unknown };
    add(entry.image);
    add(entry.thumbnailUrl);
    visit(entry['@graph'], depth + 1);
  };
  visit(blocks, 0);
  return found;
}
