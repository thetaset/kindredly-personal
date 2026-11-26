/**
 * The kind of page an address is (CLS-10), for the weak spots grid: the classifier is weakest on
 * some kinds of page, and a recipe asks for synthetic pages of one kind. Decided from the address
 * alone, so a test page, a training page and a family's page are sorted the same way.
 */
export const PAGE_KINDS = [
  'YouTube channel',
  'YouTube video',
  'Search results',
  'Social site',
  'Home page',
  'Other page',
] as const;

export type PageKind = (typeof PAGE_KINDS)[number];

const SEARCH_HOST = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|startpage|kiddle)\.[a-z.]+$|^search\.brave\.com$/;
const SOCIAL_HOSTS = [
  'reddit.com',
  'pinterest.com',
  'tumblr.com',
  'tiktok.com',
  'instagram.com',
  'facebook.com',
  'x.com',
  'twitter.com',
  'threads.net',
  'discord.com',
  'snapchat.com',
];

export function isPageKind(value: unknown): value is PageKind {
  return typeof value === 'string' && (PAGE_KINDS as readonly string[]).includes(value);
}

export function pageKindForUrl(url: string | null | undefined): PageKind {
  let parsed: URL;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    return 'Other page';
  }
  const host = parsed.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const path = parsed.pathname || '/';
  if (host === 'youtube.com' || host === 'youtu.be') {
    if (host === 'youtu.be' || path.startsWith('/watch') || path.startsWith('/shorts/')) return 'YouTube video';
    if (/^\/(@|channel\/|c\/|user\/)/.test(path)) return 'YouTube channel';
  }
  if (SEARCH_HOST.test(host) && (/search/i.test(path) || parsed.searchParams.has('q'))) return 'Search results';
  if (SOCIAL_HOSTS.some((social) => host === social || host.endsWith(`.${social}`))) return 'Social site';
  if (path === '/' && !parsed.search) return 'Home page';
  return 'Other page';
}
