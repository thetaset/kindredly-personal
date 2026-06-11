import { ItemResourceType } from "./constants";
import { ItemInfoView } from "./shared.types";

export const SOCIAL_MEDIA_DOMAINS = [
  'facebook.com',
  'twitter.com',
  'x.com',
  'bsky.app',
  'bsky.social',
  'instagram.com',
  'tiktok.com',
  'snapchat.com',
  'reddit.com',
  'redd.it',
  'tumblr.com',
  'pinterest.com',
  'linkedin.com',
  'whatsapp.com',
  'threads.net',
  'discord.com',
] as const;

export function urlToKey(url: string | null) {
  url = cleanURL(url);
  if (!url) return null;
  if (url.endsWith('/')) url = url.slice(0, -1);

  url = url.toLowerCase().replace('https://', '').replace('http://', '').replace('wwww.', '').trim();
  if (!url.startsWith('URI-')) url = 'URI-' + url;
  return url;
}


export function getDefaultPattern(url: string) {
  let pattern = url;
  if (url != undefined) {
    pattern = pattern.replace(/https?:\/\//, '').replace('www.', '');
    if (pattern.split('.').length == 2 && !pattern.startsWith('*')) {
      pattern = '*.' + pattern;
    }

    if (!pattern.includes('/')) {
      pattern = pattern + '/';
    }

    if (!pattern.endsWith('*')) {
      pattern = pattern + '*';
    }
  }
  return pattern;
}





export function isValidLink(link: string) {

  try {
    new URL(link);
    return true;
  } catch (err) {
    return false;
  }

}

export function getYTResourceTypeFromURL(url: string): ItemResourceType | null {
  if (isYTURL(url)) {
    if (isYTChannelURL(url)) {
      return ItemResourceType.YT_CHANNEL;
    } else if (isYTVideoURL(url)) {
      return ItemResourceType.YT_VIDEO;

    } else {
      return ItemResourceType.YT_PAGE;
    }
  }
  return null;
}


export function isRootWebsiteURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname === '/' || !urlObj.pathname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    return false;
  }
}
export function isYTURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) return false;
  try {
    const urlObj = new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export function isRedditURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.includes('reddit.com') && !url.includes('redd.it')) return false;
  try {
    const urlObj = new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export type SocialMetadataProvider = 'facebook' | 'instagram' | 'x' | 'bluesky' | 'tiktok';

function hostnameMatches(hostname: string, domains: string[]): boolean {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function getSocialMetadataProvider(url: string): SocialMetadataProvider | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostnameMatches(hostname, ['facebook.com', 'fb.com'])) {
      return 'facebook';
    }

    if (hostnameMatches(hostname, ['instagram.com'])) {
      return 'instagram';
    }

    if (hostnameMatches(hostname, ['x.com', 'twitter.com'])) {
      return 'x';
    }

    if (hostnameMatches(hostname, ['bsky.app', 'bsky.social'])) {
      return 'bluesky';
    }

    if (hostnameMatches(hostname, ['tiktok.com'])) {
      return 'tiktok';
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Known YouTube root paths that are NOT channel pages.
 * Used to detect vanity URLs (youtube.com/channelname without prefix).
 */
const YT_NON_CHANNEL_PATHS = new Set([
  'watch', 'shorts', 'playlist', 'feed', 'results', 'premium', 'gaming',
  'music', 'kids', 'tv', 'embed', 'v', 'live', 'clip', 'hashtag',
  'channel', 'c', 'user', // these are channel prefixes, handled separately
  'about', 'account', 'reporthistory', 'upload', 'subscription_manager',
  'paid_memberships', 'new', 'audiolibrary', 'creator', 'dashboard',
]);

/**
 * Checks if a single-segment YouTube path could be a vanity channel URL.
 * Vanity URLs are available to verified/popular channels (e.g., youtube.com/google).
 */
export function isYTVanityChannelPath(pathSegment: string): boolean {
  if (!pathSegment || pathSegment.length < 1) return false;
  const lowerPath = pathSegment.toLowerCase();
  return !YT_NON_CHANNEL_PATHS.has(lowerPath);
}

export function isYTChannelURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    if (!hostname.includes('youtube.com')) return false;

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 1) return false;

    const firstPart = pathParts[0];
    
    // Handle @handles
    if (firstPart.startsWith('@')) return true;
    
    // Handle explicit channel prefixes
    if (['channel', 'c', 'user'].includes(firstPart)) return true;
    
    // Handle vanity URLs (single segment, not a known non-channel path)
    // e.g., youtube.com/google, youtube.com/mkbhd
    if (pathParts.length === 1 && isYTVanityChannelPath(firstPart)) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

export function isYTVideoURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check youtu.be format
    if (hostname.includes('youtu.be')) {
      const videoId = urlObj.pathname.split('/')[1];
      return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
    }

    // Check youtube.com formats
    if (urlObj.searchParams.has('v')) {
      return /^[a-zA-Z0-9_-]{11}$/.test(urlObj.searchParams.get('v')!);
    }

    // Check embed and direct video path formats
    const match = urlObj.pathname.match(/^\/(embed|v)\/([a-zA-Z0-9_-]{11})/);
    return match !== null;
  } catch (e) {
    return false;
  }
}


export function extractYoutubeVideoId(url: string) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);

    // Handle different YouTube URL formats
    if (urlObj.hostname.includes("youtu.be")) {
      // youtu.be/VIDEO_ID format
      return urlObj.pathname.substring(1);
    } else if (urlObj.pathname.includes("/watch")) {
      // youtube.com/watch?v=VIDEO_ID format
      return urlObj.searchParams.get("v");
    } else if (urlObj.pathname.includes("/embed/")) {
      // youtube.com/embed/VIDEO_ID format
      return urlObj.pathname.split("/embed/")[1];
    } else if (urlObj.pathname.includes("/shorts/")) {
      // youtube.com/shorts/VIDEO_ID format
      return urlObj.pathname.split("/shorts/")[1];
    }

    // Fallback to original logic
    return urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
  } catch (e) {
    console.error("Error parsing YouTube URL", e);
    return null;
  }
}


// TODO: improve cleaning, create cleaners for other types of urls (not just youtube and google)
export function cleanURL(val: string | null) {

  if (!val) return val;
  const urlVal = val;
  if (val.startsWith('internal:')) {
    return val; // do not clean internal links
  }

  const explicitSchemeMatch = val.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  const explicitScheme = explicitSchemeMatch?.[1]?.toLowerCase() || null;
  if (explicitScheme && explicitScheme !== 'http' && explicitScheme !== 'https') {
    return val.trim();
  }
  
  // Check for special URL schemes that should not be modified
  const specialSchemes = ['about:', 'chrome:', 'chrome-extension:', 'moz-extension:', 'safari-web-extension:', 'file:', 'data:', 'blob:', 'javascript:', 'capacitor:'];
  if (specialSchemes.some(scheme => urlVal.startsWith(scheme))) {
    return val; // do not clean special scheme URLs
  }
  
  // Also catch already-corrupted special schemes (e.g., "https://about:blank").
  // Keep the trailing colon in the match token so normal hosts like
  // "https://chromewebstore.google.com" are not falsely treated as corrupted.
  if (specialSchemes.some(scheme => urlVal.includes('://' + scheme))) {
    return null; // invalid URL, return null
  }
  
  if (!val.startsWith('http')) {
    val = 'https://' + val;
  }

  try {
    // if 
    if (val.includes("google.com/?")) {
      val = val.split("?")[0];
    }
    // extract v parameter from youtube url and reconstruct url
    else if (val.includes('youtube.com/watch?')) {
      const urlObj = new URL(val);
      const v = urlObj.searchParams.get('v');
      val = 'https://youtube.com/watch?v=' + v;
    }
    else if (val.includes('youtu.be/')) {
      val = val.split('/')[3];
      val = val.split('?')[0];
      val = 'https://youtube.com/watch?v=' + val;
    }
    else if (val.includes('youtube.com/embed/')) {
      let parts = val.split('/');
      val = val.split('/')[4];
      val = val.split('?')[0];
      val = 'https://youtube.com/watch?v=' + val;
    }


    if (val.includes('m.youtube.com')) {
      val = val.replace('m.youtube.com', 'youtube.com');
    }

    const urlObj = new URL(val);
    urlObj.hostname = urlObj.hostname.toLowerCase();
    val = urlObj.toString();
    
    // remove trailing slash if ends with hostname
    if (val.endsWith(urlObj.hostname + '/')) {
      val = val.slice(0, -1);
    }

  } catch (e) {
    console.error('Error cleaning url:', e);
  }

  return val.trim();
}
export function keySimilarity(key1: string | null, key2: string | null, options = { normalize: false }) {
  if (!key1 || !key2) {
    return 0;
  }

  if (options.normalize) {
    key1 = urlToKey(key1);
    key2 = urlToKey(key2);
  }
  if (key1 == key2) return 1;
  else return 0;
}

export function displayURL(val: string) {
  if (!val.includes('http')) {
    return 'https://' + val;
  }
  return val;
}

/**
 * Returns a normalized hostname "site key" for a URL, e.g. https://www.Mail.Google.com/x
 * → mail.google.com. Leading "www." is stripped so www and apex collapse together, but
 * other subdomains stay distinct (mail.google.com ≠ drive.google.com). Used by Flow Mode
 * to treat each site/subdomain as its own "app". Returns null for non-host URLs.
 */
export function getSiteKey(
  url: string,
  granularity: 'hostname' | 'registrable' = 'hostname',
): string | null {
  if (granularity === 'registrable') {
    return getRegistrableDomain(url);
  }
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (!hostname) return null;
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    return null;
  }
}

/**
 * Returns the registrable domain (eTLD+1) for a URL, e.g. mail.google.com → google.com.
 * Uses a heuristic: if the penultimate label is ≤ 3 chars (e.g. "co", "com", "net"),
 * assume a ccTLD+SLD pattern and take 3 labels; otherwise take 2.
 */
export function getRegistrableDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (!hostname || hostname === 'localhost') return hostname || null
    const parts = hostname.split('.')
    if (parts.length < 2) return null
    if (parts.length >= 3 && parts[parts.length - 2].length <= 3) {
      return parts.slice(-3).join('.')
    }
    return parts.slice(-2).join('.')
  } catch {
    return null
  }
}

export function toURL(val: string | null, throwError = false) {
  if (!val) return val;
  
  if (!val.includes('http')) {
    val = 'https://' + val;
  }
  
  try {
    const urlObj = new URL(val);
    urlObj.hostname = urlObj.hostname.toLowerCase();
    val = urlObj.toString();
  } catch (err) {
    console.log('error parsing url', val);
    if (throwError) {
      throw new Error('Invalid URL');
    }
  }

  return val;
}
