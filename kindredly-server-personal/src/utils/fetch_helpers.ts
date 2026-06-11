import {config} from '@/config';
import {assertSafeExternalUrl, safeFetchConfig} from '@/utils/safe_fetch';
import axios from 'axios';
import {ItemResourceType} from 'tset-sharedlib/constants';
import {
  extractMetadata,
  extractMetadataFromOEmbed,
  extractMetadataFromRedditJson,
  convertRedditUrlToJson,
  getSocialOEmbedEndpoint,
  hasUsableMetadata,
  mergeMetadataPreferPrimary,
  type SocialOEmbedResponse,
} from 'tset-sharedlib/extraction.utils';
import {ItemMeta, ItemMetaExtracted} from 'tset-sharedlib/shared.types';
import {extractYTChannelInfo} from 'tset-sharedlib/text.utils';
import {
  getSocialMetadataProvider,
  isRootWebsiteURL,
  isYTURL,
  isYTChannelURL,
  extractYoutubeVideoId,
  isRedditURL,
  type SocialMetadataProvider,
} from 'tset-sharedlib/url.utils';
import type {AxiosRequestConfig, AxiosResponse} from 'axios';

/** Options for fetch operations */
export interface FetchOptions extends AxiosRequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
}

/** Options for YouTube API calls that can return raw data */
export interface YouTubeApiFetchOptions {
  raw?: boolean;
}

/** YouTube video info from the Data API */
export interface YouTubeVideoInfo {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    thumbnails: {
      default?: {url: string};
      medium?: {url: string};
      high?: {url: string};
    };
    categoryId?: string;
  };
  contentDetails?: {
    duration?: string;
    contentRating?: {
      ytRating?: string;
      [key: string]: any;
    };
  };
  status?: {
    madeForKids?: boolean;
    privacyStatus?: string;
  };
}

/** YouTube channel info from the Data API */
export interface YouTubeChannelInfo {
  id: string | {channelId: string};
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: {
      default?: {url: string};
      medium?: {url: string};
      high?: {url: string};
    };
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
  };
}

function buildDefaultBrowserHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    ...extraHeaders,
  };
}

export async function fetchSocialPageMetaDefault(url: string, options: FetchOptions = {}): Promise<ItemMeta> {
  const provider = getSocialMetadataProvider(url);
  if (!provider) {
    return fetchGenericHtmlMeta(url, options);
  }

  const defaultHeaders = buildDefaultBrowserHeaders(options.headers || {});
  let oembedMeta: ItemMeta | null = null;
  const oembedEndpoint = getSocialOEmbedEndpoint(url);

  if (oembedEndpoint) {
    try {
      const response = await axiosCall<SocialOEmbedResponse>(oembedEndpoint, {
        timeout: 18000,
        ...options,
        headers: defaultHeaders,
      });

      oembedMeta = extractMetadataFromOEmbed(url, provider, response.data || {});
    } catch (error) {
      console.error(`Error fetching social oEmbed metadata for URL: ${url}`, error);
    }
  }

  const htmlMeta = await fetchGenericHtmlMeta(url, {
    ...options,
    headers: defaultHeaders,
  });

  if (!oembedMeta) {
    return htmlMeta;
  }

  const mergedMeta = mergeMetadataPreferPrimary(oembedMeta, htmlMeta);
  if (hasUsableMetadata(mergedMeta)) {
    return mergedMeta;
  }

  return oembedMeta;
}

export async function fetchRedditPageMetaDefault(url: string, options: FetchOptions = {}): Promise<ItemMeta> {
  const defaultHeaders = buildDefaultBrowserHeaders({
    Accept: 'application/json,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  });

  let redditMeta: ItemMeta | null = null;

  try {
    console.log('Fetching Reddit page metadata for URL:', url);

    // Convert to JSON URL using shared utility
    const jsonUrl = convertRedditUrlToJson(url);
    console.log('Fetching Reddit JSON from:', jsonUrl);

    const response = await axiosCall(jsonUrl, {
      timeout: 18000,
      ...options,
      headers: defaultHeaders,
    });
    const jsonData = response.data;

    // Use shared extraction logic
    redditMeta = extractMetadataFromRedditJson(url, jsonData);

    console.log('Extracted Reddit metadata:', {
      title: redditMeta.title,
      subreddit: redditMeta.tsExtractedInfo?.redditSubreddit,
      imageSrc: redditMeta.imageSrc,
    });
  } catch (error) {
    console.error(`Error fetching Reddit page metadata for URL: ${url}`, error);
  }

  if (hasUsableMetadata(redditMeta) && redditMeta?.imageSrc) {
    return redditMeta;
  }

  const htmlMeta = await fetchGenericHtmlMeta(url, {
    ...options,
    headers: defaultHeaders,
  });

  if (!redditMeta) {
    return htmlMeta;
  }

  const mergedMeta = mergeMetadataPreferPrimary(redditMeta, htmlMeta);
  if (hasUsableMetadata(mergedMeta)) {
    return mergedMeta;
  }

  return redditMeta;
}
export async function fetchYoutubeVideoMetaWithAPI(
  url: string,
  videoId: string,
  apiKey: string,
  options: YouTubeApiFetchOptions = {raw: false},
): Promise<ItemMeta | any | null> {
  const apiURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

  let meta: ItemMeta = {
    url: url,
    title: '',
    description: '',
  };
  try {
    const response = await axiosCall(apiURL, {timeout: 18000});

    if (response.data && response.data.items && response.data.items.length > 0) {
      if (options?.raw) {
        return response.data;
      }

      const channelId = response.data.items[0].snippet.channelId;
      meta.title = response.data.items[0].snippet.title;
      meta.description = response.data.items[0].snippet.description;
      meta.imageSrc = response.data.items[0].snippet.thumbnails.high.url;
      let tsExtractedInfo: ItemMetaExtracted = {
        youtubeChannelIds: [channelId],
        channelId: channelId,
        videoId: videoId,
        pageType: ItemResourceType.YT_VIDEO,
        sourceId: 'yt_api',
      };
      meta.tsExtractedInfo = tsExtractedInfo;
      console.log('Channel ID:', channelId);
      return meta;
    } else {
      console.log('No data found for the provided video ID.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching channel ID:', error.message);
    return null;
  }
}

export async function fetchYoutubeChannelMetaWithAPIById(
  channelId: string,
  apiKey: string,
  options: YouTubeApiFetchOptions = {raw: false},
): Promise<ItemMeta | any | null> {
  const apiURL = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings,contentOwnerDetails,status,topicDetails&id=${channelId}&key=${apiKey}`;

  try {
    const response = await axiosCall(apiURL, {timeout: 18000});

    if (response.data?.items?.length > 0) {
      if (options?.raw) {
        return response.data;
      }

      const channelData = response.data.items[0];

      let meta: ItemMeta = {
        url: `https://www.youtube.com/channel/${channelId}`,
        title: channelData.snippet.title,
        description: channelData.snippet.description,
        imageSrc: channelData.snippet.thumbnails.high.url,
        tsExtractedInfo: {
          youtubeChannelIds: [channelId],
          channelId: channelId,
          pageType: ItemResourceType.YT_CHANNEL,
          sourceId: 'yt_api',
        } as ItemMetaExtracted,
      };

      return meta;
    }
    return null;
  } catch (error) {
    console.error('Error fetching channel data:', error.message);
    return null;
  }
}

export async function fetchYoutubeChannelMetaWithAPIByHandle(
  handleId: string,
  apiKey: string,
  options: YouTubeApiFetchOptions = {raw: false},
): Promise<ItemMeta | any | null> {
  const apiURL = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&type=channel&q=${handleId}&key=${apiKey}`;

  try {
    const response = await axiosCall(apiURL, {timeout: 18000});

    if (response.data?.items?.length > 0) {
      if (options?.raw) {
        return response.data;
      }
      const channelData = response.data.items[0];

      const channelId = channelData?.id?.channelId;

      let meta: ItemMeta = {
        url: `https://www.youtube.com/channel/${channelId}`,
        title: channelData.snippet.title,
        description: channelData.snippet.description,
        imageSrc: channelData.snippet.thumbnails.high.url,
        tsExtractedInfo: {
          youtubeChannelIds: [channelId],
          channelId: channelId,
          handleId: handleId,
          pageType: ItemResourceType.YT_CHANNEL,
          sourceId: 'yt_api',
        } as ItemMetaExtracted,
      };

      return meta;
    }
    return null;
  } catch (error) {
    console.error('Error fetching channel data:', error.message);
    return null;
  }
}

export async function fetchYoutubeVideoInfo(videoId: string, apiKey: string): Promise<YouTubeVideoInfo | null> {
  const apiURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${videoId}&key=${apiKey}`;
  try {
    const response = await axiosCall(apiURL, {timeout: 18000});
    if (response.data?.items?.length > 0) {
      return response.data.items[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching video info:', error.message);
    return null;
  }
}

export async function fetchYoutubeChannelLatestVideos(
  channelId: string,
  apiKey: string,
  maxResults: number = 10,
): Promise<YouTubeVideoInfo[]> {
  const apiURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${apiKey}`;

  try {
    const response = await axiosCall(apiURL, {timeout: 18000});
    if (!response.data?.items) {
      return [];
    }
    console.log('Latest videos:', response.data.items);

    // Get video IDs from search results
    const videoIds = response.data.items.map((item) => item.id.videoId).join(',');

    // Fetch complete video details
    const videosDetailsURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${videoIds}&key=${apiKey}`;
    const videosResponse = await axiosCall(videosDetailsURL, {timeout: 18000});

    if (!videosResponse.data?.items) {
      return [];
    }

    // Return complete video data
    return videosResponse.data?.items;
  } catch (error) {
    console.error('Error fetching channel videos:', error.message);
    return [];
  }
}

export async function axiosCall<T = any>(url: string, options?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  assertSafeExternalUrl(url);
  try {
    return await axios.get<T>(url, safeFetchConfig(options));
  } catch (e: any) {
    const msg = `Failed to make call to ${url} ${e}`;
    // console.error(msg, e)
    throw new Error(msg);
  }
}

export async function getDefaultMetadata(url: string, message: string): Promise<ItemMeta> {
  let isRootURL = isRootWebsiteURL(url);
  return {
    url: url,
    tsExtractedInfo: {
      pageType: isRootURL ? ItemResourceType.SITE_ROOT : ItemResourceType.SITE_ITEM,
      message: message,
      sourceId: 'parser_err',
    } as ItemMetaExtracted,
  };
}
/**
 * Returns true when the fetched HTML is a bot-challenge / access-denied page
 * rather than the actual site content (Cloudflare, Akamai, generic 403, etc.).
 */
function isBotBlockPage(html: string): boolean {
  const lower = html.slice(0, 4000).toLowerCase();
  return (
    lower.includes('cf-browser-verification') ||
    lower.includes('cloudflare ray id') ||
    lower.includes('attention required! | cloudflare') ||
    lower.includes('enable javascript and cookies') ||
    lower.includes('challenge-platform') ||
    lower.includes('ddos-guard') ||
    /<title[^>]*>\s*attention required/i.test(html) ||
    /<title[^>]*>\s*access denied/i.test(html) ||
    /<title[^>]*>\s*403 forbidden/i.test(html) ||
    /<title[^>]*>\s*just a moment/i.test(html)
  );
}

/**
 * Fetch metadata by parsing HTML from a generic URL.
 * Does NOT perform URL-type detection - use this when you already know
 * the URL is not YouTube, Reddit, or other specialized type.
 *
 * For URL-routing that auto-detects type, use fetchRawMeta() instead.
 */
export async function fetchGenericHtmlMeta(url: string, options: FetchOptions = {}): Promise<ItemMeta> {
  try {
    console.log('Fetching generic HTML metadata for URL:', url);
    const defaultHeaders = buildDefaultBrowserHeaders();

    const response = await axiosCall<string>(url, {
      timeout: 18000,
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options as any)?.headers,
      },
    });
    const data = response.data;

    if (typeof data === 'string' && isBotBlockPage(data)) {
      console.warn(`Bot-challenge page detected for URL: ${url} — returning empty metadata`);
      return getDefaultMetadata(url, 'blocked');
    }

    const meta = await extractMetadata(url, data);
    return meta;
  } catch (error: any) {
    console.error(`Error fetching generic HTML metadata for URL: ${url}`, error);
    return getDefaultMetadata(url, error.message);
  }
}

export async function fetchYoutubeChannelMetaWithApiByURL(
  url: string,
  options: FetchOptions = {},
): Promise<ItemMeta | null> {
  const channelInfo = extractYTChannelInfo(url);
  if (!channelInfo) return null;

  // For direct channel IDs (UC...), use the ID-based API
  if (channelInfo.type === 'channelId') {
    return await fetchYoutubeChannelMetaWithAPIById(channelInfo.id, config.googleServiceApiKey);
  }

  // For handles, custom names, and vanity URLs, use handle-based search
  // These all resolve the same way - by searching for the name
  let meta = await fetchYoutubeChannelMetaWithAPIByHandle(channelInfo.id, config.googleServiceApiKey);

  // Fallback: try as channel ID in case it happens to be one
  if (!meta && channelInfo.type === 'customName') {
    meta = await fetchYoutubeChannelMetaWithAPIById(channelInfo.id, config.googleServiceApiKey);
  }

  return meta;
}

/**
 * URL router that auto-detects URL type and dispatches to specialized fetchers.
 *
 * For use when you don't know/care about URL type and just want metadata.
 * If you've already categorized the URL, prefer calling the specific fetcher directly:
 * - YouTube videos: fetchYoutubeVideoMetaWithAPI()
 * - YouTube channels: fetchYoutubeChannelMetaWithApiByURL()
 * - Reddit: fetchRedditPageMetaDefault()
 * - Generic HTML: fetchGenericHtmlMeta()
 */
export async function fetchRawMeta(url: string, options: FetchOptions = {}): Promise<ItemMeta | null> {
  if (url.includes('youtube.com/watch?v=') || url.includes('youtu.be/') || url.includes('youtube.com/embed/')) {
    const videoId = extractYoutubeVideoId(url);
    if (videoId) {
      let meta = await fetchYoutubeVideoMetaWithAPI(url, videoId, config.googleServiceApiKey);
      // console.log("YTMeta", meta);
      return meta;
    }
  } else if (isYTChannelURL(url)) {
    return await fetchYoutubeChannelMetaWithApiByURL(url, options);
  } else if (isRedditURL(url)) {
    return await fetchRedditPageMetaDefault(url, options);
  } else if (getSocialMetadataProvider(url)) {
    return await fetchSocialPageMetaDefault(url, options);
  } else {
    return await fetchGenericHtmlMeta(url, options);
  }
}
