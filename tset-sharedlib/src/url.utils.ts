import { ItemResourceType } from "./constants";
import { ItemInfoView } from "./shared.types";
import { AdditionalLink, UrlScopeKind } from "./types/item.types";

/**
 * Public suffixes that take two labels, so `registrableHost` doesn't read `co.uk`
 * as the registrable domain. Not a full PSL — this covers the prevalent cases, and
 * the fallback (last two labels) is right for everything else.
 */
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'co.jp', 'co.in', 'co.nz', 'co.za', 'co.kr',
  'com.au', 'com.br', 'com.mx', 'com.cn', 'com.tr', 'com.sg', 'com.hk', 'com.tw',
]);

/**
 * Hosts where the *path*, not the hostname, says whose content this is. Allowing
 * `sites.google.com/*` would hand a child every Google Site on the web, so a link
 * on one of these stays pinned to its own page instead of taking the host.
 */
export const PATH_TENANT_HOSTS = new Set([
  'sites.google.com',
  'docs.google.com',
  'drive.google.com',
  'groups.google.com',
  'medium.com',
  'notion.so',
  'padlet.com',
  'linktr.ee',
]);

/** Registrable ("eTLD+1") domain for a bare hostname. Lowercased, `www.` stripped. */
export function registrableHost(hostname: string): string {
  const host = (hostname || '').toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  const parts = host.split('.');
  if (parts.length <= 2) return host;

  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_SUFFIXES.has(lastTwo)) return parts.slice(-3).join('.');
  return lastTwo;
}

/** Lowercased hostname for a URL that may or may not carry a scheme. `www.` stripped. */
function hostnameOf(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url.trim()}`;
    const hostname = new URL(withScheme).hostname.toLowerCase();
    return hostname ? hostname.replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

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


/**
 * The pattern a bare URL claims by default: its host (with subdomains when the host
 * is the registrable domain) and everything under its path.
 *
 * Note the `*.` prefix does not widen access on its own — `URLIndexer.getLookupHostnames`
 * generates the bare and the `*.`-prefixed form of every ancestor, so `example.com/*`
 * and `*.example.com/*` match identically under `getMatches`. It decides exact-vs-parent
 * classification and `getExactMatches` on a `www.` host.
 */
export function getDefaultPattern(url: string) {
  if (url == undefined) return url;

  // Anchored: an unanchored replace ate a "www." anywhere in the path.
  let pattern = url.replace(/https?:\/\//, '').replace(/^www\./i, '');

  // The wildcard test belongs to the hostname. Reading it off the whole string made
  // a dot in the path ("example.com/file.pdf") look like a third label, so the
  // subdomain wildcard silently disappeared for those URLs and for every ccTLD.
  const slashAt = pattern.indexOf('/');
  const host = slashAt === -1 ? pattern : pattern.slice(0, slashAt);
  const rest = slashAt === -1 ? '' : pattern.slice(slashAt);

  if (host && host.includes('.') && !host.startsWith('*') && host === registrableHost(host)) {
    pattern = '*.' + host + rest;
  }

  if (!pattern.includes('/')) {
    pattern = pattern + '/';
  }

  if (!pattern.endsWith('*')) {
    pattern = pattern + '*';
  }

  return pattern;
}

/** The three scope values, or undefined for anything else. */
function normalizeScope(value: unknown): UrlScopeKind | undefined {
  return value === 'specific' || value === 'site' || value === 'domain' ? value : undefined;
}

/**
 * The patterns one URL claims at a given scope. Both the URL index and the scope
 * picker derive through this, so what a parent is shown is what gets indexed.
 */
export function buildPatternsForUrlScope(scope: UrlScopeKind, url: string): string[] {
  if (typeof url !== 'string' || !url.trim()) return [];

  const normalized = toURL(url.trim()) || url.trim();
  let parsed: URL | null = null;
  try {
    parsed = new URL(normalized);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    const fallback = getDefaultPattern(normalized);
    return fallback ? [fallback] : [];
  }

  const host = parsed.hostname.toLowerCase();

  if (scope === 'domain') {
    const pattern = getDefaultPattern(registrableHost(host));
    return pattern ? [pattern] : [];
  }

  if (scope === 'site') {
    const pattern = getDefaultPattern(host);
    return pattern ? [pattern] : [];
  }

  // 'specific'. A root URL has no path to pin to, so it falls back to the default.
  if (isRootWebsiteURL(normalized)) {
    const pattern = getDefaultPattern(normalized);
    return pattern ? [pattern] : [];
  }

  // No trailing '*': the lookup already generates `path`, `path*` and `path/*` from
  // the visited URL, and this is the shape the access-request flow has always stored.
  const pathWithQuery = `${parsed.pathname}${parsed.search}`.replace(/^\//, '');
  return pathWithQuery ? [`${host}/${pathWithQuery}`] : [host];
}

/**
 * How much of a link's address the item should claim, when nobody has said.
 *
 * A link grants access to whatever it matches, so the bias is toward the smallest
 * scope that makes the link useful: the host. `domain` is only inferred where the
 * item has already shown the whole domain belongs to it.
 */
export function inferLinkScope(
  linkUrl: string,
  item?: { url?: string | null; info?: { additionalLinks?: AdditionalLink[] | null } | null } | null,
): UrlScopeKind {
  const host = hostnameOf(linkUrl);
  if (!host) return 'specific';

  // Shared hosts where the host says nothing about whose content this is.
  if (PATH_TENANT_HOSTS.has(host)) return 'specific';

  const domain = registrableHost(host);

  // The item's own site, reached at another address.
  const itemHost = hostnameOf(item?.url);
  if (itemHost && registrableHost(itemHost) === domain) return 'domain';

  // A bare domain was given, so the domain is what was meant.
  if (host === domain) return 'domain';

  // A second address on a domain this item already claims is the evidence that the
  // whole platform belongs to it — a sign-in that hops clients.* to brandedweb.*
  // lands here on the second link rather than being guessed on the first.
  for (const link of item?.info?.additionalLinks || []) {
    const otherHost = hostnameOf(link?.url);
    if (!otherHost || otherHost === host) continue;
    if (registrableHost(otherHost) === domain) return 'domain';
  }

  return 'site';
}

/**
 * How wide a grant the assistant is allowed to write, given what it asked for.
 *
 * The model proposes and this decides. It proposes because only the model knows
 * whether the child asked for a site or for one article on it; this decides
 * because a model that could widen its own grant is a model that can be argued
 * into one. Four caps, in order of how much they matter:
 *
 * - **Never `domain`.** The broadest scope stays a human answer. It is not even
 *   offered to the model, so this is a floor rather than a rejection.
 * - **Never a whole site on a path-tenant host.** `PATH_TENANT_HOSTS` is shared
 *   with `inferLinkScope` rather than re-listed, because two copies of "whose
 *   content is this?" is how one of them goes stale. Note this outranks an
 *   explicit `site` proposal: on `sites.google.com` the host is not the site.
 * - **Never wider than proposed.** A `page` proposal cannot become a site.
 * - **Silence means narrow**, except for a bare address, which has no page to be
 *   narrow about — that keeps the pre-existing behaviour and matches what the
 *   parent's own picker recommends by default.
 *
 * Returns a `UrlScopeKind` so it can be handed straight to
 * `buildPatternsForUrlScope`.
 */
export type AssistantGrantScope = Exclude<UrlScopeKind, 'domain'>;

export function resolveAssistantScope(proposed: unknown, url: string): AssistantGrantScope {
  const host = hostnameOf(url);

  if (host && PATH_TENANT_HOSTS.has(host)) return 'specific';

  if (proposed === 'site') return 'site';
  if (proposed === 'page') return 'specific';

  return isRootWebsiteURL(url) ? 'site' : 'specific';
}





/**
 * Every URL pattern an item claims: its explicit `patterns[]`, the default pattern
 * for each `info.additionalLinks[].url`, and the default pattern for its own `url`.
 *
 * This is the single definition of "which URLs belong to this item". Both the
 * write-side index (`URLDetailsStore.update`) and the read-side matcher
 * (`URLIndexer.getItemLookupInstance`) call it, so a URL that resolves to an item
 * on lookup is the same set that got indexed. They used to derive this separately
 * and had drifted — additionalLinks were matched but never indexed.
 *
 * `accessScopeKind: 'specific'` with explicit patterns suppresses the derived
 * pattern for the item's own url — the patterns are the deliberate narrower scope.
 * Additional links are always included: each one was added by hand.
 */
/**
 * Explicit `patterns[]`, keeping only non-blank strings. A number or a whitespace
 * string reaching `URLIndexer.add` throws on `value.replace`, and one bad entry
 * would cost the item every other pattern it has.
 */
function normalizeExplicitPatterns(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0);
}

export function getItemDetailPatterns(details: any): string[] {
  if (!details || typeof details !== 'object') return [];

  const patternSet = new Set<string>();

  const explicitPatterns = normalizeExplicitPatterns(details.patterns);
  for (const pattern of explicitPatterns) {
    patternSet.add(pattern);
  }

  // One malformed link must not cost the item its other patterns.
  const addDerived = (url: unknown) => {
    if (typeof url !== 'string' || url.trim().length === 0) return;
    try {
      const pattern = getDefaultPattern(url);
      if (pattern) patternSet.add(pattern);
    } catch (e) {
      console.warn('getItemDetailPatterns: failed to derive pattern for', url, e);
    }
  };

  for (const link of details?.info?.additionalLinks || []) {
    addLinkPatterns(link, details, patternSet);
  }

  const suppressDerivedUrlPattern =
    details?.info?.accessScopeKind === 'specific' && explicitPatterns.length > 0;
  if (!suppressDerivedUrlPattern) {
    addDerived(details.url);
  }

  return Array.from(patternSet);
}

/**
 * The patterns for one additional link. A link saved before scopes existed carries no
 * `scope`, so it resolves through `inferLinkScope` — that is what fixes an already-saved
 * sign-in link without anyone re-editing it.
 */
function addLinkPatterns(link: any, details: any, patternSet: Set<string>): void {
  const url = link?.url;
  if (typeof url !== 'string' || url.trim().length === 0) return;

  try {
    const scope = normalizeScope(link?.scope) || inferLinkScope(url, details);
    for (const pattern of buildPatternsForUrlScope(scope, url)) {
      if (pattern) patternSet.add(pattern);
    }
  } catch (e) {
    console.warn('getItemDetailPatterns: failed to derive pattern for', url, e);
  }
}

/**
 * The URLs this item *deliberately claims* beyond its own address: hand-written
 * patterns and scoped additional links.
 *
 * Used to answer "am I on this saved item?" rather than "is this allowed?". The
 * item's own url-derived pattern is excluded on purpose — an item saved for
 * `school.com` should not swallow `school.com/blog/whatever` and stop you saving it
 * separately.
 *
 * Explicit patterns that merely restate the url are dropped for the same reason:
 * `updatePatterns()` writes `getDefaultPattern(url)` straight into `patterns[]` on
 * every url edit and on every new item, so for most items `patterns[]` is a copy of
 * the url rather than a claim on anything else.
 */
export function getItemClaimedPatterns(details: any): string[] {
  if (!details || typeof details !== 'object') return [];

  const patternSet = new Set<string>();

  let urlPattern: string | null = null;
  if (typeof details.url === 'string' && details.url.trim().length > 0) {
    try {
      urlPattern = getDefaultPattern(details.url) || null;
    } catch {
      urlPattern = null;
    }
  }

  for (const pattern of normalizeExplicitPatterns(details.patterns)) {
    if (pattern === urlPattern) continue;
    patternSet.add(pattern);
  }

  for (const link of details?.info?.additionalLinks || []) {
    addLinkPatterns(link, details, patternSet);
  }

  return Array.from(patternSet);
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
 *
 * Delegates to `registrableHost`, which reads a known multi-part-suffix list. The old
 * "penultimate label ≤ 3 chars" heuristic got `bbc.co.uk` right but also read
 * `foo.abc.com` as its own registrable domain.
 */
export function getRegistrableDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (!hostname || hostname === 'localhost') return hostname || null
    if (!hostname.includes('.')) return null
    return registrableHost(hostname)
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
