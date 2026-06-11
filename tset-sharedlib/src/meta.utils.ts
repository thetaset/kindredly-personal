import { ItemResourceType } from './constants';
import { Item } from './shared.types';



export function mergeOptions(srcList: Array<string | null | undefined>) {
  for (const src of srcList) {
    if (typeof src !== 'string') {
      continue;
    }

    const trimmed = src.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return '';
}

export function checkIfYTChannel(url: string) {
  return (
    url.includes('youtube.com/c/') ||
    url.includes('youtube.com/channel/') ||
    url.includes('youtube.com/@') ||
    url.includes('youtube.com/user/')
  );
}

const channelFromUrlRegex = /\/(channel|c|user)\/?([^\/?#]+)(?:[/?#].*)?/i;

const channelFromUrlAtRegex = /\/@([^\/?#]+)(?:[/?#].*)?/i;

export function normalizeYouTubeChannelIdentifier(value: string | null | undefined) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('@')) {
    return trimmed.slice(1).toLowerCase();
  }

  if (trimmed.startsWith('UC')) {
    return trimmed;
  }

  return trimmed.toLowerCase();
}

export function parseChannelIdFromString(url: string) {
  const match = url.match(channelFromUrlRegex);
  const channelId = match ? normalizeYouTubeChannelIdentifier(match[2]) : null;
  return channelId;
}

export function parseYTVideoIdFromString(url: string) {
  const videoIdRegex = /(?:v=|\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(videoIdRegex);
  return match ? match[1] : null;
}

export function parseYTHandleIdFromString(url: string) {
  const match = url.match(channelFromUrlAtRegex);
  return match ? normalizeYouTubeChannelIdentifier(match[1]) : null;
}

export function getYouTubeChannelIdentifiersFromUrl(url: string | null | undefined): string[] {
  if (!url) {
    return [];
  }

  const identifiers = new Set<string>();
  const channelId = parseChannelIdFromString(url);
  const handleId = parseYTHandleIdFromString(url);

  if (channelId) {
    identifiers.add(channelId);
  }

  if (handleId) {
    identifiers.add(handleId);
  }

  return Array.from(identifiers);
}


export function getMetaImagePaths(url: string, meta: Record<string, any>) {
  const urlObj = new URL(url);

  let bannerImageSrcPath = meta.imageSrc;

  let faviconSrcPath = meta.favicon && meta.favicon > 0 ? meta.favicon : `${urlObj.origin}/favicon.ico`;

  let googleFaviconSrcPath: string | null = `https://www.google.com/s2/favicons?sz=256&domain_url=${urlObj.hostname}`;

  return { bannerImageSrcPath, faviconSrcPath, googleFaviconSrcPath };
}

export async function fetchImagesFromURL(url: string, meta: Record<string, any>, 
  getImageFromURL: Function) {
  console.log('Fetching banner and favicon images', url);

  let bannerImageSrcPath = meta.imageSrc;

  const urlObj = new URL(url);
  let bannerImageObj = null;
  if (bannerImageSrcPath) {
    bannerImageObj = await getImageFromURL(bannerImageSrcPath);
  }

  //get favicon
  let faviconObj = null;
  let faviconSrcPath: string | null = `https://www.google.com/s2/favicons?sz=256&domain_url=${urlObj.hostname}`;
  faviconObj = await getImageFromURL(faviconSrcPath);

  if (!faviconObj) {
    faviconSrcPath = meta.favicon && meta.favicon > 0 ? meta.favicon : `${urlObj.origin}/favicon.ico`;
    faviconObj = await getImageFromURL(faviconSrcPath);
  }

  if (!bannerImageObj && faviconObj) {
    bannerImageSrcPath = faviconSrcPath;
    bannerImageObj = faviconObj;
  }

  if (!bannerImageObj) {
    bannerImageSrcPath = null;
  }
  if (!faviconObj) {
    faviconSrcPath = null;
  }

  return { bannerImageObj, bannerImageSrcPath, faviconObj, faviconSrcPath };
}

export function itemSchemaUpdater(item: Partial<Item>) {


  let hasFeeds = false
  if (item?.meta?.tsExtractedInfo?.pageType == ItemResourceType.YT_CHANNEL) {
    hasFeeds = true
  }
  else if (item?.info?.feeds && item?.info.feeds.length > 0) {
    hasFeeds = true
  }
  else if (item.type == "col") {
    hasFeeds = true

  }

  if (!item?.sysInfo) {
    item.sysInfo = {}
  }

  item.sysInfo.hasFeeds = hasFeeds;
  item.sysInfo.v = 1.0;
  item.sysInfo.updatedAt = new Date();

  return item;
}