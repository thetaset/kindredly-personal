/**
 * A Reddit post's own picture, pictures or video, so a parent can save the media instead of the
 * link, under the post's name (HAT-635).
 *
 * Two places say what a post holds, and neither needs Reddit's page to be read by a script:
 * - The post's page when it is open: Reddit marks the post element with its type and media
 *   address (`shreddit-post`, `post-type`, `content-href`). `readRedditPostPage` reads it there.
 * - The post's feed (`/comments/<id>/.rss`): one request, which Reddit answers without its
 *   "Prove your humanity" check but allows only a few of a minute (429 after three, 2026-10-19).
 *
 * Parser-free, so the device and the server can both use it.
 */
import { ItemResourceType } from './constants';
import type { ItemMeta, ItemMetaExtracted } from './shared.types';

export type PostMedia = {
  kind: 'image' | 'gallery' | 'video';
  /**
   * The files: `i.redd.it` pictures or the `v.redd.it` address of a Reddit video; a Google Photos
   * share's pictures or video file at the size to keep (`google-photos.utils.ts`).
   */
  urls: string[];
  /** A video's still picture, for the preview and the item's thumbnail. */
  poster?: string;
  /** Where it was shared; Reddit when absent. A Google Photos video is one file, not joined. */
  provider?: 'reddit' | 'google_photos';
  /** The video file's size, when known before it downloads. */
  sizeBytes?: number | null;
  /** An album holding more than `urls`: how many in all, or null when not known. */
  total?: number | null;
};

const REDDIT_HOSTS = new Set(['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com', 'np.reddit.com', 'm.reddit.com']);

function parseUrl(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** The post a Reddit address points at: `/r/<sub>/comments/<id>/…`, `/comments/<id>` or `redd.it/<id>`. */
export function getRedditPostId(url: string | null | undefined): { subreddit: string | null; id: string } | null {
  const urlObj = parseUrl(url);
  if (!urlObj) return null;
  const host = urlObj.hostname.toLowerCase();
  if (host === 'redd.it') {
    const id = urlObj.pathname.match(/^\/([a-z0-9]+)\/?$/i)?.[1];
    return id ? { subreddit: null, id: id.toLowerCase() } : null;
  }
  if (!REDDIT_HOSTS.has(host)) return null;
  const inSub = urlObj.pathname.match(/^\/r\/([^/]+)\/comments\/([a-z0-9]+)/i);
  if (inSub) return { subreddit: inSub[1], id: inSub[2].toLowerCase() };
  const bare = urlObj.pathname.match(/^\/comments\/([a-z0-9]+)/i);
  return bare ? { subreddit: null, id: bare[1].toLowerCase() } : null;
}

/** The post's feed, which lists the post's own media first. */
export function getRedditPostFeedUrl(url: string | null | undefined): string | null {
  const post = getRedditPostId(url);
  if (!post) return null;
  return post.subreddit
    ? `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}/.rss`
    : `https://www.reddit.com/comments/${post.id}/.rss`;
}

const IMAGE_FILE = /\.(jpe?g|png|gif|webp)$/i;

/**
 * The original of a Reddit picture: an `i.redd.it` address as it is, or the original behind a
 * resized `preview.redd.it` copy, which keeps the original's id after `-v0-` (or as its name).
 */
export function originalRedditImageUrl(url: string | null | undefined): string | null {
  const urlObj = parseUrl(url);
  if (!urlObj) return null;
  const host = urlObj.hostname.toLowerCase();
  const name = urlObj.pathname.split('/').pop() || '';
  if (!IMAGE_FILE.test(name)) return null;
  if (host === 'i.redd.it') return `https://i.redd.it/${name}`;
  if (host === 'preview.redd.it') {
    const original = name.includes('-v0-') ? name.slice(name.lastIndexOf('-v0-') + 4) : name;
    return /^[a-z0-9]+\.[a-z]+$/i.test(original) ? `https://i.redd.it/${original}` : null;
  }
  return null;
}

function videoAddress(url: string | null | undefined): string | null {
  const urlObj = parseUrl(url);
  if (!urlObj || urlObj.hostname.toLowerCase() !== 'v.redd.it') return null;
  const id = urlObj.pathname.match(/^\/([a-z0-9]+)/i)?.[1];
  return id ? `https://v.redd.it/${id}` : null;
}

function originals(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const url of urls) {
    const original = originalRedditImageUrl(url);
    if (original) seen.add(original);
  }
  return Array.from(seen);
}

/** What an open post's page says it holds; see `readRedditPostPage`. */
export function postMediaFromRedditPage(page: {
  postType?: string | null;
  contentHref?: string | null;
  galleryUrls?: Array<string | null | undefined> | null;
  /** How many pictures the gallery shows, when the page says. */
  galleryCount?: number | null;
  poster?: string | null;
} | null | undefined): PostMedia | null {
  if (!page) return null;
  const type = (page.postType || '').toLowerCase();
  if (type === 'image') {
    const url = originalRedditImageUrl(page.contentHref);
    return url ? { kind: 'image', urls: [url] } : null;
  }
  if (type === 'gallery') {
    const urls = originals(page.galleryUrls || []);
    if (!urls.length) return null;
    // Pictures the page shows but did not give an address for are counted, so the saving says so.
    const count = page.galleryCount || 0;
    return count > urls.length ? { kind: 'gallery', urls, total: count } : { kind: 'gallery', urls };
  }
  if (type === 'video') {
    const url = videoAddress(page.contentHref);
    if (!url) return null;
    return page.poster ? { kind: 'video', urls: [url], poster: page.poster } : { kind: 'video', urls: [url] };
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&');
}

/**
 * What a post holds, from its feed: the first entry is the post, and its `[link]` points at the
 * media (`i.redd.it`, `v.redd.it`, or the post's gallery). A gallery's feed shows its first
 * picture only, as a resized copy, so its count is unknown (`total: null`) until the post's page
 * is read (HAT-689).
 */
export function readRedditFeedPostMedia(xml: string | null | undefined): PostMedia | null {
  if (!xml) return null;
  const start = xml.indexOf('<entry>');
  const end = xml.indexOf('</entry>', start);
  if (start < 0 || end < 0) return null;
  const entry = xml.slice(start, end);
  const content = decodeEntities(entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || '');
  const link = decodeEntities(content.match(/<a href="([^"]+)">\s*\[link\]\s*<\/a>/)?.[1] || '');

  const image = originalRedditImageUrl(link);
  if (image) return { kind: 'image', urls: [image] };
  const video = videoAddress(link);
  if (video) {
    const poster = decodeEntities(entry.match(/<media:thumbnail url="([^"]+)"/)?.[1] || '');
    return poster ? { kind: 'video', urls: [video], poster } : { kind: 'video', urls: [video] };
  }

  if (/^https:\/\/(www\.)?reddit\.com\/gallery\//i.test(link)) {
    const pictures = [
      ...Array.from(content.matchAll(/<img src="([^"]+)"/g), (m) => decodeEntities(m[1])),
      ...Array.from(entry.matchAll(/<media:thumbnail url="([^"]+)"/g), (m) => decodeEntities(m[1])),
    ];
    const urls = originals(pictures);
    return urls.length ? { kind: 'gallery', urls, total: null } : null;
  }
  return null;
}

/**
 * A post named by its feed, the one request that gives its title, author, subreddit, address and
 * media together. Reddit allows a device very few requests at a time, so this replaces the reads
 * that each asked for part of it (HAT-635). Null when the feed has no post.
 */
export function redditFeedToItemMeta(url: string, xml: string | null | undefined): ItemMeta | null {
  if (!xml) return null;
  const start = xml.indexOf('<entry>');
  const end = xml.indexOf('</entry>', start);
  if (start < 0 || end < 0) return null;
  const entry = xml.slice(start, end);
  const title = decodeEntities(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim();
  if (!title) return null;

  const author = decodeEntities(entry.match(/<author>\s*<name>([^<]+)<\/name>/)?.[1] || '').replace(/^\/?u\//, '').trim();
  const subreddit = decodeEntities(entry.match(/<category term="([^"]+)"/)?.[1] || '').trim();
  const postUrl = decodeEntities(entry.match(/<link href="([^"]+)"/)?.[1] || '');
  const post = getRedditPostId(postUrl);
  const media = readRedditFeedPostMedia(xml);
  const picture = media?.kind === 'video' ? media.poster : media?.urls[0];

  const extracted: ItemMetaExtracted = {
    pageType: ItemResourceType.SITE_ITEM,
    sourceId: 'provider_api',
    ...(subreddit ? { redditSubreddit: subreddit } : {}),
    ...(author ? { redditAuthor: author } : {}),
    ...(media ? { postMedia: media } : {}),
    ...(post && postUrl
      ? {
          recognized: {
            provider: 'reddit',
            resourceType: 'REDDIT_POST',
            contentKind: 'post',
            externalId: post.id,
            parentExternalId: post.subreddit || subreddit || undefined,
            canonicalUrl: postUrl,
            confidence: 0.9,
          } as ItemMetaExtracted['recognized'],
        }
      : {}),
  };
  return {
    url,
    title,
    siteName: 'Reddit',
    ...(picture ? { imageSrc: picture } : {}),
    tsExtractedInfo: extracted,
  };
}

/** The type of picture file at a Reddit original's address, for saving it. */
export function imageContentType(url: string): string {
  const ext = (url.match(/\.([a-z]+)(?:$|\?)/i)?.[1] || '').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Runs in an open Reddit post's page (the extension injects it, and Read full page runs it beside
 * its own read), so it is self-contained: no imports reach it. Returns what Reddit marks the post
 * with; `postMediaFromRedditPage` reads it. Null on any other page.
 *
 * A gallery draws only the picture in view: the others carry their address in `data-lazy-src` or
 * `data-lazy-srcset` until they are scrolled to, so every one of those is read too (HAT-689).
 */
export function readRedditPostPage(): {
  postType: string | null;
  contentHref: string | null;
  galleryUrls: string[];
  galleryCount: number | null;
  poster: string | null;
} | null {
  const post = document.querySelector('shreddit-post');
  if (!post) return null;
  const images = Array.from(post.querySelectorAll('gallery-carousel img, [slot="gallery"] img')) as HTMLImageElement[];
  const firstOfSet = (value: string | null) => (value || '').trim().split(/\s+/)[0] || '';
  const galleryUrls = images
    .flatMap((img) => [
      img.getAttribute('src'),
      img.getAttribute('data-lazy-src'),
      firstOfSet(img.getAttribute('srcset')),
      firstOfSet(img.getAttribute('data-lazy-srcset')),
      img.currentSrc,
    ])
    .filter((url): url is string => !!url && !url.startsWith('data:'));
  const slides = post.querySelectorAll('gallery-carousel li[slot^="page-"]').length;
  const player = post.querySelector('shreddit-player-2, shreddit-player');
  return {
    postType: post.getAttribute('post-type'),
    contentHref: post.getAttribute('content-href'),
    galleryUrls,
    galleryCount: slides || null,
    poster: player?.getAttribute('poster') || null,
  };
}

/**
 * The files to save a Reddit video from, by its playlist (`v.redd.it/<id>/DASHPlaylist.mpd`):
 * Reddit keeps picture and sound apart (`CMAF_720.mp4`, `CMAF_AUDIO_128.mp4`), each in sizes.
 * The largest picture that fits `maxBytes` with the best sound; `tooLarge` when even the smallest
 * does not. Sizes are estimated from each file's bitrate and the length kept: the whole video, or
 * `keepSeconds` of it when only part is saved. Whole files are downloaded either way, so a picture
 * whose whole file would pass `maxDownloadBytes` is passed over too.
 */
export function pickRedditVideoFiles(
  videoUrl: string,
  mpdXml: string | null | undefined,
  maxBytes: number,
  options: { keepSeconds?: number | null; maxDownloadBytes?: number } = {},
):
  | { video: string; audio: string | null; estimatedBytes: number; quality: number | null; seconds: number }
  /** `download`: even the smallest whole file is over `maxDownloadBytes`, so no part can be kept either. */
  | { tooLarge: true; reason: 'size' | 'download'; estimatedBytes: number; seconds: number }
  | null {
  const base = videoAddress(videoUrl);
  if (!base || !mpdXml) return null;
  const seconds = isoDurationSeconds(mpdXml.match(/mediaPresentationDuration="([^"]+)"/)?.[1]);
  if (!seconds) return null;
  const kept = options.keepSeconds && options.keepSeconds > 0 ? Math.min(options.keepSeconds, seconds) : seconds;

  const videos: Array<{ url: string; bandwidth: number; quality: number | null }> = [];
  const audios: Array<{ url: string; bandwidth: number }> = [];
  for (const set of mpdXml.split(/<AdaptationSet\b/).slice(1)) {
    const setTag = set.slice(0, set.indexOf('>'));
    for (const rep of set.split(/<Representation\b/).slice(1)) {
      const repTag = rep.slice(0, rep.indexOf('>'));
      const file = rep.match(/<BaseURL>([^<]+)<\/BaseURL>/)?.[1]?.trim();
      const bandwidth = Number(repTag.match(/\bbandwidth="(\d+)"/)?.[1] || 0);
      if (!file || !bandwidth || /[/:]/.test(file)) continue;
      const isAudio = /(contentType|mimeType)="audio/.test(setTag) || /mimeType="audio/.test(repTag);
      if (isAudio) {
        audios.push({ url: `${base}/${file}`, bandwidth });
        continue;
      }
      // "720p" names the short side: a phone's upright video is 720 wide and 1280 high.
      const sides = [repTag.match(/\bwidth="(\d+)"/)?.[1], repTag.match(/\bheight="(\d+)"/)?.[1]].map(Number).filter(Boolean);
      videos.push({ url: `${base}/${file}`, bandwidth, quality: sides.length ? Math.min(...sides) : null });
    }
  }
  if (!videos.length) return null;

  const audio = audios.sort((a, b) => b.bandwidth - a.bandwidth)[0] || null;
  const bytesFor = (videoBandwidth: number, length: number) =>
    Math.ceil(((videoBandwidth + (audio?.bandwidth || 0)) * length) / 8 * 1.05);
  const bySize = videos.sort((a, b) => b.bandwidth - a.bandwidth);
  const downloadable = bySize.filter(
    (v) => !options.maxDownloadBytes || bytesFor(v.bandwidth, seconds) <= options.maxDownloadBytes,
  );
  const smallest = (downloadable.length ? downloadable : bySize)[(downloadable.length ? downloadable : bySize).length - 1];
  if (!downloadable.length) {
    return { tooLarge: true, reason: 'download', estimatedBytes: bytesFor(smallest.bandwidth, kept), seconds };
  }
  const fits = downloadable.find((v) => bytesFor(v.bandwidth, kept) <= maxBytes);
  if (!fits) return { tooLarge: true, reason: 'size', estimatedBytes: bytesFor(smallest.bandwidth, kept), seconds };
  return {
    video: fits.url,
    audio: audio?.url || null,
    estimatedBytes: bytesFor(fits.bandwidth, kept),
    quality: fits.quality,
    seconds,
  };
}

/** Seconds in an ISO 8601 length such as `PT1M1.046665S`. */
function isoDurationSeconds(value: string | null | undefined): number {
  const m = value?.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}
