/**
 * A shared Google Photos link (HAT-651): the album or photo someone shared with “anyone with the
 * link”, read from its public page as Reddit posts are, so a parent can save the pictures or the
 * video into the item while the item keeps the share link as its source.
 *
 * Google gives other apps no way to read a share link (its Photos API stopped serving them on
 * 2025-03-31), so this reads the page: it can break when Google changes it. What the page holds
 * (2026-10-20, a public album): `AF_initDataCallback` blocks of JSON, one listing the album's
 * items as `[key, [address, width, height, …, [bytes]], …]`, its next page as a string (empty when
 * there is none), and the album as `[key, title, …]`.
 *
 * A photo's address takes a size at its end: `=s0` is the full picture as a JPEG (the original
 * may be HEIF, which browsers cannot show), `=w2048-h2048` a smaller one. `=dv` is a video's MP4
 * and answers 404 for a photo, so one small request tells them apart.
 */
import { ItemResourceType } from './constants';
import type { PostMedia } from './reddit-media.utils';
import type { ItemMeta, ItemMetaExtracted } from './shared.types';

/** An album can hold hundreds of photos; a save keeps this many. */
export const GOOGLE_PHOTOS_MAX_PICTURES = 20;

export type GooglePhotosShare = {
  /** The album's name; null for a share with none. */
  title: string | null;
  items: Array<{ url: string; width: number; height: number; bytes: number | null }>;
  /** More items than the page lists. */
  more: boolean;
  /** The album's cover, without a size. */
  cover: string | null;
};

function parseUrl(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** `photos.app.goo.gl/<id>`, or `photos.google.com/share/…` (also under `/u/<n>/`). */
export function isGooglePhotosShareUrl(url: string | null | undefined): boolean {
  const parsed = parseUrl(url);
  if (!parsed || !/^https?:$/.test(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'photos.app.goo.gl') return /^\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname);
  if (host === 'photos.google.com') return /^(\/u\/\d+)?\/share\/[^/]+/.test(parsed.pathname);
  return false;
}

/**
 * The address to read. A short link answers a browser with a page that moves on by script; with
 * `_imcp=1` (the address that page names for a computer) it answers with a redirect to the album.
 */
export function googlePhotosFetchUrl(url: string): string {
  const parsed = parseUrl(url);
  if (parsed?.hostname.toLowerCase() === 'photos.app.goo.gl' && !parsed.searchParams.has('_imcp')) {
    parsed.searchParams.set('_imcp', '1');
    return parsed.toString();
  }
  return url;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** A photo's address without the size Google put on it. */
function baseAddress(url: string): string {
  return url.replace(/=[^/=]*$/, '');
}

function metaContent(html: string, property: string): string | null {
  const match = html.match(new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, 'i'));
  return match ? decodeEntities(match[1]) : null;
}

/** Each data block's JSON; a block that does not parse is left out. */
function dataBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(/AF_initDataCallback\(\{key: '[^']*'[\s\S]*?data:([\s\S]*?), sideChannel: \{\}\}\);/g)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Not JSON this time; the next block may be the one.
    }
  }
  return blocks;
}

function isItem(entry: unknown): entry is [string, [string, number, number, ...unknown[]], ...unknown[]] {
  if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !Array.isArray(entry[1])) return false;
  const detail = entry[1];
  return typeof detail[0] === 'string' && /^https:\/\/lh3\.googleusercontent\.com\//.test(detail[0]) && typeof detail[1] === 'number';
}

/** The photo a link names inside an album (`/share/<album>/photo/<photo>`), or null. */
function linkedPhotoKey(url: string | null | undefined): string | null {
  return parseUrl(url)?.pathname.match(/\/share\/[^/]+\/photo\/([^/?#]+)/)?.[1] || null;
}

function itemOf(entry: [string, unknown[], ...unknown[]]): GooglePhotosShare['items'][number] {
  const detail = entry[1];
  const size = Array.isArray(detail[9]) && typeof detail[9][0] === 'number' ? (detail[9][0] as number) : null;
  return { url: baseAddress(detail[0] as string), width: detail[1] as number, height: detail[2] as number, bytes: size };
}

/**
 * What a share's page lists: its name, its photos and videos, and its cover; for a link to one
 * photo in an album (`url`), that photo alone. Null for any other page.
 */
export function readGooglePhotosSharePage(html: string | null | undefined, url?: string | null): GooglePhotosShare | null {
  if (!html) return null;
  const blocks = dataBlocks(html);
  const ogImage = metaContent(html, 'og:image');
  const ogTitle = metaContent(html, 'og:title');

  // One photo's page lists that photo first in a block of its own.
  const photoKey = linkedPhotoKey(url);
  if (photoKey) {
    const photo = blocks.find((data): data is unknown[] => Array.isArray(data) && isItem(data[0]) && data[0][0] === photoKey);
    if (photo) {
      const item = itemOf(photo[0] as [string, unknown[]]);
      return { title: ogTitle?.trim() || null, items: [item], more: false, cover: item.url };
    }
  }

  // The list holds the album's photos and videos; anything else in it (a card of text or a map,
  // a shape not seen yet) is passed over rather than costing the whole album.
  const list = blocks.find(
    (data): data is unknown[] => Array.isArray(data) && Array.isArray(data[1]) && data[1].some(isItem),
  );
  if (!list) {
    // One photo's page reached by an address that does not name the photo (a short link, or read
    // through our proxy, which does not say where it was sent): the photo leads a block of its own.
    const photo = blocks.find((data): data is unknown[] => Array.isArray(data) && isItem(data[0]));
    if (!photo) return null;
    const item = itemOf(photo[0] as [string, unknown[]]);
    return { title: ogTitle?.trim() || null, items: [item], more: false, cover: item.url };
  }

  const items = (list[1] as unknown[]).filter(isItem).map(itemOf);
  const album = Array.isArray(list[3]) ? list[3] : null;
  const title = (typeof album?.[1] === 'string' && album[1].trim()) || ogTitle?.trim() || null;

  return {
    title,
    items,
    more: typeof list[2] === 'string' && list[2] !== '',
    cover: ogImage ? baseAddress(ogImage) : items[0]?.url || null,
  };
}

/** The one request that tells a single shared item's video from a photo: `=dv` answers 404 for a photo. */
export function googlePhotosVideoProbeUrl(share: GooglePhotosShare | null): string | null {
  return share?.items.length === 1 ? `${share.items[0].url}=dv` : null;
}

/**
 * A video, and its size, from the answer to the probe (asked for its first byte): a video file, or
 * null when the item is a photo.
 */
export function readGooglePhotosVideoProbe(answer: {
  status: number;
  contentType?: string | null;
  contentRange?: string | null;
  contentLength?: string | null;
}): { sizeBytes: number | null } | null {
  if (answer.status !== 200 && answer.status !== 206) return null;
  if (!/^video\//i.test(answer.contentType || '')) return null;
  const whole = Number(answer.contentRange?.match(/\/(\d+)\s*$/)?.[1]);
  const length = Number(answer.contentLength);
  const sizeBytes = whole > 0 ? whole : answer.status === 200 && length > 0 ? length : null;
  return { sizeBytes };
}

/**
 * What can be saved from the share: a video, a picture, or an album's first pictures, each at a
 * size to keep. A video in an album is kept as its still picture.
 */
export function googlePhotosPostMedia(
  share: GooglePhotosShare | null,
  video?: { sizeBytes: number | null } | null,
): PostMedia | null {
  const items = share?.items || [];
  if (!items.length) return null;
  if (items.length === 1 && video) {
    return {
      kind: 'video',
      urls: [`${items[0].url}=dv`],
      poster: `${items[0].url}=w1024-h1024`,
      provider: 'google_photos',
      sizeBytes: video.sizeBytes,
    };
  }
  if (items.length === 1) return { kind: 'image', urls: [`${items[0].url}=s0`], provider: 'google_photos' };
  const kept = items.slice(0, GOOGLE_PHOTOS_MAX_PICTURES);
  return {
    kind: 'gallery',
    urls: kept.map((item) => `${item.url}=w2048-h2048`),
    provider: 'google_photos',
    // More than were kept, or more than the page listed.
    ...(items.length > kept.length || share!.more ? { total: share!.more ? null : items.length } : {}),
  };
}

/**
 * The item a share is saved as: its name, its cover, and what can be saved from it. `cover: false`
 * leaves the cover out, for a reader whose result is kept where others can read it (our server's
 * link cache): the cover is one of the family's photos.
 */
export function googlePhotosToItemMeta(
  url: string,
  share: GooglePhotosShare,
  media: PostMedia | null,
  options: { cover?: boolean } = {},
): ItemMeta {
  // Read without its media (on the server, which keeps no photo addresses), it is named for its count.
  const kind = media?.kind ?? (share.items.length === 1 ? 'image' : 'gallery');
  const extracted: ItemMetaExtracted = {
    pageType: ItemResourceType.SITE_ITEM,
    sourceId: 'provider_api',
    ...(media ? { postMedia: media } : {}),
    recognized: {
      provider: 'google_photos',
      resourceType: 'GOOGLE_PHOTOS_SHARE',
      contentKind: kind === 'video' ? 'video' : kind === 'image' ? 'photo' : 'album',
      canonicalUrl: url,
      confidence: 0.9,
    },
  };
  const picture = options.cover !== false && share.cover ? `${share.cover}=w1024-h1024` : null;
  return {
    url,
    title: share.title || (kind === 'video' ? 'Shared video' : kind === 'image' ? 'Shared photo' : 'Shared album'),
    siteName: 'Google Photos',
    ...(picture ? { imageSrc: picture } : {}),
    tsExtractedInfo: extracted,
  };
}
