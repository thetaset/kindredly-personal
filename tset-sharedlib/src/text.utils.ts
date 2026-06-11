import { DynObj } from "./shared.types";

export function mergeOptions(srcList: string[]) {
  let value = '';
  for (let src of srcList) {
    if (src == undefined) {
      continue;
    }

    src = src.trim();
    if (src != undefined && src.length > value.length) {
      value = src;
    }
  }
  return value;
}

function sortDictsByStr(a: Record<string, any>, b: Record<string, any>, attr: string) {
  var nameA = a[attr]?.toUpperCase(); // ignore upper and lowercase
  var nameB = b[attr]?.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}

export function sortObjectsByTimestamp(objects: any[], attr: string) {
  objects.sort((a, b) => {
    const aTime = new Date(a[attr]).getTime();
    const bTime = new Date(b[attr]).getTime();
    return bTime - aTime;
  });
  return objects;
}







function attrFilterSingle(obj: DynObj, attrs: Set<string>): DynObj | null {
  if (!obj) return null;

  const entries = Object.entries(obj).filter(([attr]) => attrs.has(attr));
  return Object.fromEntries(entries);
}

export const cleanedUpUrl = (url: string) => url.replace(/(^\w+:|^)\/\/(www\.)?/, '').replace(/\/$/, '');

export const urlAreAboutTheSame = (a: string, b: string) => {
  // remove protocol prefix, www, and trailing slash
  return cleanedUpUrl(a) === cleanedUpUrl(b);
};



export function textTruncate(txt: string, size = 50, rev = false) {
  if (rev) {
    return textTruncateRev(txt, size);
  }

  if (txt && txt.length > size) txt = txt.slice(0, size) + '...';
  return txt;
}

export function textTruncateRev(txt: string, size = 50) {
  if (txt && txt.length > size) txt = '...' + txt.slice(-size);
  return txt;
}


export function JSONParseSafe(item: string, defVal = null) {
  try {
    return JSON.parse(item);
  } catch (e) {
    return defVal;
  }
}
export function extractYTVideoID(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Handle youtu.be URLs
    if (hostname.includes('youtu.be')) {
      const videoId = urlObj.pathname.split('/')[1];
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
      return null;
    }

    // Handle youtube.com URLs
    else if (hostname.includes('youtube.com')) {
      // Try to get video ID from query parameter
      if (urlObj.searchParams.has('v')) {
        const videoId = urlObj.searchParams.get('v');
        if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          return videoId;
        }
      }

      // Try to get video ID from embed or direct video path
      const match = urlObj.pathname.match(/^\/(embed|v)\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        return match[2];
      }
    }
  } catch (e) {
    if (!(e instanceof TypeError && e.message.includes('Invalid URL'))) {
      console.error('Error extracting video ID:', e);
    }
  }
  return null;
}

export type YTChannelIdType = 'channelId' | 'handle' | 'customName' | 'vanity';

export interface YTChannelInfo {
  id: string;
  type: YTChannelIdType;
}

/**
 * Extracts channel identifier from a YouTube channel URL.
 * Returns the identifier string (handle, channel ID, custom name, or vanity name).
 * 
 * For more detailed info including type, use extractYTChannelInfo().
 */
export function extractYTChannelID(url: string): string | null {
  const info = extractYTChannelInfo(url);
  return info?.id ?? null;
}

/**
 * Known YouTube root paths that are NOT channel pages.
 * Mirrors the list in url.utils.ts for vanity URL detection.
 */
const YT_NON_CHANNEL_PATHS = new Set([
  'watch', 'shorts', 'playlist', 'feed', 'results', 'premium', 'gaming',
  'music', 'kids', 'tv', 'embed', 'v', 'live', 'clip', 'hashtag',
  'channel', 'c', 'user',
  'about', 'account', 'reporthistory', 'upload', 'subscription_manager',
  'paid_memberships', 'new', 'audiolibrary', 'creator', 'dashboard',
]);

/**
 * Extracts channel info from a YouTube channel URL.
 * Returns both the identifier and its type for proper API lookup.
 * 
 * Types:
 * - 'channelId': Direct channel ID (UC...), use channels API with id param
 * - 'handle': @handle format, use channels API with forHandle param or search
 * - 'customName': Legacy /c/ or /user/ format, treat like handle
 * - 'vanity': Vanity URL (youtube.com/channelname), treat like handle
 */
export function extractYTChannelInfo(url: string): YTChannelInfo | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('youtube.com')) return null;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length < 1) return null;
    const firstPart = pathParts[0];
    
    // Handle @handles (e.g., youtube.com/@mkbhd)
    if (firstPart.startsWith('@')) {
      const handle = firstPart.substring(1);
      return handle ? { id: handle, type: 'handle' } : null;
    }
    
    // Handle explicit channel ID (e.g., youtube.com/channel/UC...)
    if (firstPart === 'channel' && pathParts.length > 1) {
      return { id: pathParts[1], type: 'channelId' };
    }
    
    // Handle legacy custom URLs (e.g., youtube.com/c/vsauce, youtube.com/user/pewdiepie)
    if ((firstPart === 'c' || firstPart === 'user') && pathParts.length > 1) {
      return { id: pathParts[1], type: 'customName' };
    }
    
    // Handle vanity URLs (e.g., youtube.com/google)
    // Single path segment that's not a known YouTube page
    if (pathParts.length === 1) {
      const lowerPath = firstPart.toLowerCase();
      if (!YT_NON_CHANNEL_PATHS.has(lowerPath)) {
        return { id: firstPart, type: 'vanity' };
      }
    }
    
    return null;
  } catch (e) {
    if (!(e instanceof TypeError && e.message.includes('Invalid URL'))) {
      console.error('Error extracting channel ID:', e);
    }
  }
  return null;
}

export { sortDictsByStr, attrFilterSingle}

// export url utils
export { 
  cleanURL,
  isYTURL, 
  isYTChannelURL, 
  isYTVideoURL,
  urlToKey,
  getDefaultPattern,
  isValidLink,
  keySimilarity,
  displayURL,
  toURL
} from './url.utils';
