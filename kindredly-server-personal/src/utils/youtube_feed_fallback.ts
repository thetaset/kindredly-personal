import axios from 'axios';
import {safeFetchConfig} from '@/utils/safe_fetch';
import {buildDefaultBrowserHeaders} from '@/utils/fetch_helpers';
import {getYouTubeApiUploads, setYouTubeApiUploads, type YouTubeApiUploads} from '@/services/feed_cache.service';

/**
 * A YouTube channel's latest videos, written out as the Atom feed YouTube
 * itself serves, for when that feed fails.
 *
 * YouTube's own `feeds/videos.xml` answers 404 (now and then 500) for every
 * channel, for hours at a time — from any network, so nothing about our
 * request can fix it. It started late 2025 and was back in October 2026.
 * Two sources stand in for it, in order:
 *
 * 1. The channel's Videos page. It keeps working through those stretches and
 *    lists the same uploads, newest first. It says "10 days ago", not a date,
 *    so dates are estimated — except a video an earlier copy of the feed
 *    already holds, which keeps that copy's date. That keeps a video's date
 *    the same from one refresh to the next, and keeps YouTube's real date
 *    when the real feed was the earlier copy.
 * 2. The YouTube Data API, when the page can't be read (YouTube changed it, or
 *    showed a consent page). Exact dates, but it needs the server's key and
 *    has a daily quota, so its answer for a channel is kept a day.
 */

const CHANNEL_ID = /^UC[\w-]{22}$/;
const VIDEO_ID = /^[\w-]{11}$/;
/** YouTube's own feed holds the latest 15. */
const MAX_ENTRIES = 15;

const UNIT_MS: Record<string, number> = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

export type YouTubeFeedVideo = {
  videoId: string;
  title: string;
  description: string;
  /** The page's "10 days ago"; the API gives `publishedAt` instead. */
  publishedText?: string;
  /** Epoch ms, when the source gives a real date. */
  publishedAt?: number;
};

/**
 * The channel id behind a YouTube feed URL, or null for any other feed.
 * An uploads playlist is the channel id with UC swapped for UU (all uploads) or
 * UULF (long-form only, which is what the Videos page lists).
 */
export function youTubeFeedChannelId(feedUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(feedUrl);
  } catch {
    return null;
  }
  if (!/^(www\.|m\.)?youtube\.com$/i.test(parsed.hostname) || parsed.pathname !== '/feeds/videos.xml') {
    return null;
  }

  const channelId = parsed.searchParams.get('channel_id');
  if (channelId) return CHANNEL_ID.test(channelId) ? channelId : null;

  const uploads = (parsed.searchParams.get('playlist_id') || '').match(/^UU(?:LF)?([\w-]{22})$/);
  return uploads ? `UC${uploads[1]}` : null;
}

/** "10 days ago", "Streamed 3 hours ago" → epoch ms; null when the text names no age. */
export function estimatePublishedAt(text: string, now: number): number | null {
  const match = String(text || '')
    .toLowerCase()
    .match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!match) return null;
  return now - Number(match[1]) * UNIT_MS[match[2]];
}

function readInitialData(html: string): any | null {
  const match = html.match(/(?:var ytInitialData|window\["ytInitialData"\])\s*=\s*(\{.*?\});\s*<\/script>/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function runsText(value: any): string {
  if (!value) return '';
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.runs)) return value.runs.map((run: any) => run?.text || '').join('');
  return '';
}

/** A grid tile in the current layout (`lockupViewModel`). */
function fromLockup(lockup: any): YouTubeFeedVideo | null {
  if (lockup?.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null;
  const meta = lockup.metadata?.lockupMetadataViewModel;
  const parts = (meta?.metadata?.contentMetadataViewModel?.metadataRows || []).flatMap(
    (row: any) => row?.metadataParts || [],
  );
  const age = parts
    .map((part: any) => part?.accessibilityLabel || part?.text?.content || '')
    .find((text: string) => /\bago\b/i.test(text));
  return {
    videoId: String(lockup.contentId || ''),
    title: runsText(meta?.title),
    publishedText: age || '',
    description: '',
  };
}

/** A grid tile in the layout before `lockupViewModel` (`videoRenderer`). */
function fromVideoRenderer(renderer: any): YouTubeFeedVideo {
  return {
    videoId: String(renderer?.videoId || ''),
    title: runsText(renderer?.title),
    publishedText: runsText(renderer?.publishedTimeText),
    description: runsText(renderer?.descriptionSnippet),
  };
}

function collectVideos(node: any, out: YouTubeFeedVideo[]): void {
  if (!node || typeof node !== 'object' || out.length >= MAX_ENTRIES) return;
  if (node.lockupViewModel) {
    const video = fromLockup(node.lockupViewModel);
    if (video) out.push(video);
    return;
  }
  if (node.videoRenderer) {
    out.push(fromVideoRenderer(node.videoRenderer));
    return;
  }
  for (const value of Array.isArray(node) ? node : Object.values(node)) collectVideos(value, out);
}

/** The channel's name and its newest videos, from a Videos page; null when the page has none. */
export function parseChannelVideosPage(html: string): {title: string; videos: YouTubeFeedVideo[]} | null {
  const data = readInitialData(html);
  if (!data) return null;

  // Only the open tab: the page also carries other tabs' headers and, on some
  // layouts, a featured video that is not the newest upload.
  const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const openTab = tabs.find((tab: any) => tab?.tabRenderer?.selected)?.tabRenderer?.content;

  const found: YouTubeFeedVideo[] = [];
  collectVideos(openTab || data.contents, found);

  const seen = new Set<string>();
  const videos = found.filter((video) => {
    if (!VIDEO_ID.test(video.videoId) || !video.title || seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });
  if (videos.length === 0) return null;

  const title = data.metadata?.channelMetadataRenderer?.title || data.header?.pageHeaderRenderer?.pageTitle;
  return {title: String(title || 'YouTube'), videos};
}

/** Each video's `<published>` in an earlier copy of the feed, by video id. */
export function readPublishedDates(feedXml: string | undefined | null): Map<string, number> {
  const dates = new Map<string, number>();
  const entries = String(feedXml || '').split('<entry>');
  for (const entry of entries.slice(1)) {
    const videoId = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    const published = Date.parse(entry.match(/<published>([^<]+)<\/published>/)?.[1] || '');
    if (videoId && !Number.isNaN(published)) dates.set(videoId, published);
  }
  return dates;
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'})[ch]!,
  );
}

export function buildYouTubeChannelFeed(input: {
  feedUrl: string;
  channelId: string;
  title: string;
  videos: YouTubeFeedVideo[];
  earlierDates?: Map<string, number>;
  now?: number;
}): string {
  const now = input.now ?? Date.now();
  const channelUrl = `https://www.youtube.com/channel/${input.channelId}`;
  const author = `<author><name>${escapeXml(input.title)}</name><uri>${channelUrl}</uri></author>`;

  // Newest first, as on the page. An estimate that would put a video after
  // the one above it (two "1 month ago"s, or a video with no age at all) is
  // set just before it, so sorting by date keeps YouTube's order.
  let previous = now + 1000;
  const entries = input.videos.map((video) => {
    let publishedAt =
      video.publishedAt ??
      input.earlierDates?.get(video.videoId) ??
      estimatePublishedAt(video.publishedText || '', now) ??
      previous - 1000;
    if (publishedAt >= previous) publishedAt = previous - 1000;
    previous = publishedAt;
    const published = new Date(publishedAt).toISOString();
    const description = video.description
      ? `<media:description>${escapeXml(video.description)}</media:description>`
      : '';

    return [
      '<entry>',
      `<id>yt:video:${video.videoId}</id>`,
      `<yt:videoId>${video.videoId}</yt:videoId>`,
      `<yt:channelId>${input.channelId}</yt:channelId>`,
      `<title>${escapeXml(video.title)}</title>`,
      `<link rel="alternate" href="https://www.youtube.com/watch?v=${video.videoId}"/>`,
      author,
      `<published>${published}</published>`,
      `<updated>${published}</updated>`,
      '<media:group>',
      `<media:title>${escapeXml(video.title)}</media:title>`,
      `<media:thumbnail url="https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg" width="480" height="360"/>`,
      description,
      '</media:group>',
      '</entry>',
    ].join('');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">',
    `<link rel="self" href="${escapeXml(input.feedUrl)}"/>`,
    `<id>yt:channel:${input.channelId}</id>`,
    `<yt:channelId>${input.channelId}</yt:channelId>`,
    `<title>${escapeXml(input.title)}</title>`,
    `<link rel="alternate" href="${channelUrl}"/>`,
    author,
    ...entries,
    '</feed>',
  ].join('\n');
}

/**
 * The feed for a YouTube feed URL, from the channel's Videos page or else the
 * YouTube Data API. Null for any other URL, or when neither can be read — the
 * caller then reports YouTube's own error as before. `source` is which one
 * answered, for the proxy's diagnostic header; the feed is the same either way.
 */
export async function fetchYouTubeFeedFallback(
  feedUrl: string,
  earlierFeedXml: string | null | undefined,
  options: {apiKey?: string} = {},
): Promise<{body: string; source: 'youtube-page' | 'youtube-api'} | null> {
  const channelId = youTubeFeedChannelId(feedUrl);
  if (!channelId) return null;

  const page = await readChannelVideosPage(channelId);
  if (page) {
    const earlierDates = readPublishedDates(earlierFeedXml);
    return {body: buildYouTubeChannelFeed({feedUrl, channelId, ...page, earlierDates}), source: 'youtube-page'};
  }

  const uploads = await readChannelUploadsFromApi(channelId, options.apiKey);
  if (uploads) {
    return {body: buildYouTubeChannelFeed({feedUrl, channelId, ...uploads}), source: 'youtube-api'};
  }

  return null;
}

async function readChannelVideosPage(channelId: string): Promise<{title: string; videos: YouTubeFeedVideo[]} | null> {
  try {
    // `hl=en` so the ages read "10 days ago" whatever country the request
    // appears to come from.
    const response = await axios.get(
      `https://www.youtube.com/channel/${channelId}/videos?hl=en`,
      safeFetchConfig({
        responseType: 'text',
        transformResponse: [(data: any) => data],
        validateStatus: () => true,
        headers: buildDefaultBrowserHeaders({Accept: 'text/html,application/xhtml+xml'}),
      }),
    );
    if (response.status !== 200 || typeof response.data !== 'string') {
      console.error('YouTube channel page fallback failed:', response.status, channelId);
      return null;
    }

    const page = parseChannelVideosPage(response.data);
    if (!page) console.error('YouTube channel page fallback found no videos:', channelId);
    return page;
  } catch (error: any) {
    console.error('YouTube channel page fallback failed:', error?.message, channelId);
    return null;
  }
}

/**
 * The channel's newest uploads from the YouTube Data API, kept a day per
 * channel. Null without a key, so a server with none skips this step.
 */
async function readChannelUploadsFromApi(channelId: string, apiKey?: string): Promise<YouTubeApiUploads | null> {
  if (!apiKey) return null;

  const kept = await getYouTubeApiUploads(channelId);
  if (kept) return kept;

  try {
    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/playlistItems',
      safeFetchConfig({
        // The uploads playlist is the channel id with UC swapped for UU. Reading
        // it costs one unit of the daily quota; a search would cost 100.
        params: {
          part: 'snippet,contentDetails',
          playlistId: `UU${channelId.slice(2)}`,
          maxResults: MAX_ENTRIES,
          key: apiKey,
        },
        validateStatus: () => true,
      }),
    );
    if (response.status !== 200) {
      // Never the URL: it carries the key.
      const reason = response.data?.error?.errors?.[0]?.reason || '';
      console.error('YouTube Data API fallback failed:', response.status, reason, channelId);
      return null;
    }

    const items: any[] = Array.isArray(response.data?.items) ? response.data.items : [];
    const videos = items
      .map((item) => ({
        videoId: String(item?.contentDetails?.videoId || ''),
        title: String(item?.snippet?.title || ''),
        description: String(item?.snippet?.description || ''),
        publishedAt: Date.parse(item?.contentDetails?.videoPublishedAt || ''),
      }))
      // A private or deleted video stays in the playlist, with no publish date.
      .filter((video) => VIDEO_ID.test(video.videoId) && video.title && !Number.isNaN(video.publishedAt))
      .sort((a, b) => b.publishedAt - a.publishedAt);
    if (videos.length === 0) {
      console.error('YouTube Data API fallback found no videos:', channelId);
      return null;
    }

    const uploads = {title: String(items[0]?.snippet?.channelTitle || 'YouTube'), videos};
    await setYouTubeApiUploads(channelId, uploads);
    return uploads;
  } catch (error: any) {
    console.error('YouTube Data API fallback failed:', error?.message, channelId);
    return null;
  }
}
