/**
 * A Reddit post's own picture, pictures or video, so a parent can save the media instead of the
 * link, under the post's name (HAT-635).
 *
 * Two places say what a post holds, and neither needs Reddit's page to be read by a script:
 * - The post's page when it is open: Reddit marks the post element with its type and media
 *   address (`shreddit-post`, `post-type`, `content-href`). `readRedditPostPage` reads it there.
 * - The post's embed page (`embed.reddit.com/r/<sub>/comments/<id>/`): one request, which Reddit
 *   answers without its "Prove your humanity" check. Its `shreddit-screenview-data` names the
 *   post's type and address, and its player carries a video's still. Reddit stopped answering
 *   the post's feed (`/comments/<id>/.rss`) on 2026-11-13, which this replaced (HAT-1260).
 *
 * Parser-free, so the device and the server can both use it.
 */
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

/**
 * The post's embed page, which Reddit renders for embedding without its humanity check. The bare
 * `/comments/<id>/` embed does not name the post, but any subreddit in the address finds it: a
 * `redd.it/<id>` or `/comments/<id>` link, which names none, asks under `r/all` (HAT-1269; checked
 * live 2026-11-21, `r/x` and `r/all` gave the same post as its own subreddit). redd.it's redirect
 * does not help: it leads to `/comments/<id>`, which Reddit refuses with a 403.
 */
export function getRedditPostEmbedUrl(url: string | null | undefined): string | null {
  const post = getRedditPostId(url);
  if (!post) return null;
  return `https://embed.reddit.com/r/${post.subreddit || 'all'}/comments/${post.id}/`;
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

/**
 * A gallery known to hold more than its `urls`: the count was read but not every address (an
 * embed page draws only the first slides), or only the first picture is known (`total: null`).
 * The popup then reads the open post or its full page for the rest (HAT-689, HAT-1269).
 */
export function galleryHasMore(media: PostMedia | null | undefined): boolean {
  if (media?.kind !== 'gallery' || media.total === undefined) return false;
  return media.total === null || media.total > media.urls.length;
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
 * What a post holds, from its embed page: `shreddit-screenview-data` names the post's type and
 * address (`i.redd.it`, `v.redd.it`, or the post's gallery), the player carries a video's still,
 * and a gallery's slides are the pictures it draws. Null when the page holds none or is not an
 * embed page.
 */
export function readRedditEmbedPostMedia(html: string | null | undefined): PostMedia | null {
  if (!html) return null;
  const raw = html.match(/<shreddit-screenview-data\b[^>]*\bdata="([^"]*)"/)?.[1];
  if (!raw) return null;
  let post: { type?: string | null; url?: string | null } | null = null;
  try {
    post = JSON.parse(decodeEntities(raw))?.post || null;
  } catch {
    return null;
  }
  const type = (post?.type || '').toLowerCase();
  const address = post?.url || null;

  if (type === 'image') {
    const url = originalRedditImageUrl(address);
    return url ? { kind: 'image', urls: [url] } : null;
  }
  if (type === 'video') {
    const url = videoAddress(address);
    if (!url) return null;
    const poster = decodeEntities(html.match(/<shreddit-player\b[^>]*\bposter="([^"]+)"/)?.[1] || '');
    return poster ? { kind: 'video', urls: [url], poster } : { kind: 'video', urls: [url] };
  }
  if (type === 'gallery') {
    const pictures = Array.from(html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g), (m) => decodeEntities(m[1]));
    const urls = originals(pictures);
    if (!urls.length) return null;
    // The slides the embed draws; a gallery with more pictures than it drew says how many it has.
    const slides = (html.match(/<li\b[^>]*\bslot="page-/g) || []).length;
    return slides > urls.length ? { kind: 'gallery', urls, total: slides } : { kind: 'gallery', urls };
  }
  return null;
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
