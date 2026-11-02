/**
 * A link's name when its page does not give one (HAT-619).
 *
 * A Claude share's page is titled "Claude" whatever the chat, and Reddit's challenge page "Reddit".
 * Saved under that name, the item reads like a link to the site's home page. These helpers say when
 * a title is only the site's name, and what to call the page instead from its address alone.
 *
 * No imports beyond `url.utils`: the popup, the background, content scripts and the server all use
 * this, and `extraction.utils.ts` pulls in cheerio.
 */
import type { ItemMeta } from './shared.types';
import { registrableHost } from './url.utils';

/** Kinds of page an address alone identifies. The `kind` is the name shown until a read finds a better one. */
const ADDRESS_KINDS: Array<{ id: string; kind: string; match: (host: string, path: string) => boolean }> = [
  { id: 'claude-share', kind: 'Shared Claude chat', match: (h, p) => h === 'claude.ai' && /^\/share\/[^/]+/.test(p) },
  { id: 'claude-artifact', kind: 'Claude artifact', match: (h, p) => h === 'claude.ai' && /^\/public\/artifacts\/[^/]+/.test(p) },
  {
    id: 'chatgpt-share',
    kind: 'Shared ChatGPT chat',
    match: (h, p) => (h === 'chatgpt.com' || h === 'chat.openai.com') && /^\/share\/[^/]+/.test(p),
  },
  {
    id: 'gemini-share',
    kind: 'Shared Gemini chat',
    match: (h, p) => (h === 'gemini.google.com' && /^\/share\/[^/]+/.test(p)) || (h === 'g.co' && /^\/gemini\/share\/[^/]+/.test(p)),
  },
  { id: 'google-doc', kind: 'Google Doc', match: (h, p) => h === 'docs.google.com' && /^\/document\//.test(p) },
  { id: 'google-sheet', kind: 'Google Sheet', match: (h, p) => h === 'docs.google.com' && /^\/spreadsheets\//.test(p) },
  { id: 'google-slides', kind: 'Google Slides', match: (h, p) => h === 'docs.google.com' && /^\/presentation\//.test(p) },
  { id: 'google-form', kind: 'Google Form', match: (h, p) => (h === 'docs.google.com' && /^\/forms\//.test(p)) || h === 'forms.gle' },
];

/**
 * Titles a site gives every page, beyond its plain name, keyed by registrable host. Measured
 * 2026-10-19 (Reddit's challenge page, Claude shares); `tools/link-read-check` adds to it.
 */
const SITE_WIDE_TITLES: Record<string, string[]> = {
  'claude.ai': ['claude'],
  'reddit.com': ['reddit', 'reddit - dive into anything', 'reddit - the heart of the internet'],
  // A shared chat's page, once drawn, says "Check out this chat" in its og:title whatever the chat;
  // its document title is the chat's name (local extension run, 2026-10-19).
  'chatgpt.com': ['chatgpt', 'check out this chat'],
  'openai.com': ['chatgpt', 'check out this chat'],
  'google.com': ['gemini', 'google gemini', 'gemini - direct access to google ai'],
  'spotify.com': ['spotify - web player', 'spotify – web player'],
  'tiktok.com': ['tiktok - make your day'],
};

function parseUrl(url: string | null | undefined): URL | null {
  if (!url || typeof url !== 'string') return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function hostOf(urlObj: URL): string {
  return urlObj.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

/** The site's own home page, where its name is the right name. Tracking parameters do not count. */
function isHomePage(urlObj: URL): boolean {
  if (urlObj.pathname.replace(/\/+$/, '') !== '') return false;
  const params = [...urlObj.searchParams.keys()].filter((key) => !/^(utm_|ref$|fbclid$|gclid$)/i.test(key));
  return params.length === 0;
}

function normalizeTitle(value: string): string {
  return value
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!:|\-–—]+$/, '')
    .replace(/\s*[–—]\s*/g, ' - ')
    .trim()
    .toLowerCase();
}

/**
 * The first title that names the page itself, skipping any that only name its site, so a page's
 * own heading wins over "Netflix" in its title tag. The first title when none does.
 *
 * A block, consent or error page keeps the site's name in its title too, and its heading is the
 * message ("You've been blocked by network security"). That heading never wins: the first title
 * stays, and `withNameFromAddress` names the page from its address.
 */
export function pickPageTitle(url: string, candidates: Array<string | null | undefined>, siteName?: string | null): string | undefined {
  const present = candidates.filter((value): value is string => typeof value === 'string' && !!value.trim());
  const first = present[0];
  if (first === undefined || !namesNoPage(url, first, siteName)) return first;
  return present.find((value) => !namesNoPage(url, value, siteName) && !isBlockedPageHeading(value)) ?? first;
}

function namesNoPage(url: string, title: string, siteName?: string | null): boolean {
  return isSiteNameOnlyTitle(url, title, siteName) || isErrorPageTitle(url, title, siteName);
}

/** What a block, consent, bot-check or error page says in its heading. Short headings only. */
const BLOCKED_PAGE_HEADINGS = [
  /\bblocked\b/,
  /access (is )?denied/,
  /access to this page/,
  /\bforbidden\b/,
  /not found/,
  /^(403|404|429|500|502|503)\b/,
  /^error\b/,
  /went wrong/,
  /(isn't|is not|not) available/,
  /\bunavailable\b/,
  /verify (you|that you)/,
  /are you (a robot|human)/,
  /robot or human/,
  /captcha/,
  /checking your browser/,
  /just a moment/,
  /before you continue/,
  /(we|site) uses? cookies/,
  /cookie (settings|preferences|consent)/,
  /your privacy/,
  /^(sign|log) ?in\b/,
  /enable javascript/,
  /javascript is (disabled|required)/,
  /unsupported browser/,
  /too many requests/,
  /security check/,
];

function isBlockedPageHeading(value: string): boolean {
  const normalized = normalizeTitle(value);
  return normalized.length <= 80 && BLOCKED_PAGE_HEADINGS.some((pattern) => pattern.test(normalized));
}

/** What the address alone says the page is, e.g. `{ id: 'claude-share', kind: 'Shared Claude chat' }`. */
export function getAddressKind(url: string | null | undefined): { id: string; kind: string } | null {
  const urlObj = parseUrl(url);
  if (!urlObj) return null;
  const host = hostOf(urlObj);
  const found = ADDRESS_KINDS.find((entry) => entry.match(host, urlObj.pathname));
  return found ? { id: found.id, kind: found.kind } : null;
}

/**
 * True when a title only names the site, on a page below its home page: "Claude" for a shared chat,
 * "Reddit" for a post. Such a title is never a page's name.
 */
export function isSiteNameOnlyTitle(url: string | null | undefined, title: string | null | undefined, siteName?: string | null): boolean {
  if (!title || typeof title !== 'string') return false;
  const urlObj = parseUrl(url);
  if (!urlObj || isHomePage(urlObj)) return false;

  const normalized = normalizeTitle(title);
  if (!normalized) return false;
  return siteNames(urlObj, siteName).has(normalized);
}

/** Every name a site goes by, normalized: its host, its domain, the domain's first word, its site-wide titles. */
function siteNames(urlObj: URL, siteName?: string | null): Set<string> {
  const host = hostOf(urlObj);
  const registrable = registrableHost(host);
  const label = registrable.split('.')[0];
  const names = new Set<string>([host, registrable, label, ...(SITE_WIDE_TITLES[registrable] || [])]);
  if (siteName && typeof siteName === 'string') names.add(normalizeTitle(siteName));
  names.delete('');
  return names;
}

const ERROR_PAGE_TITLES = new Set(['error', 'error page']);

/**
 * True for the page a site answers a read with when something went wrong: "Error" (Facebook),
 * "Error Page | eBay" (link-read-check, 2026-10-19). It never names the page, so the address does.
 * Not a bot check: elsewhere, a title of "Error" is left as it is.
 */
export function isErrorPageTitle(url: string | null | undefined, title: string | null | undefined, siteName?: string | null): boolean {
  if (!title || typeof title !== 'string') return false;
  const [head, ...rest] = normalizeTitle(title).split(/\s+[|·•-]\s+/);
  if (!ERROR_PAGE_TITLES.has(head)) return false;
  if (rest.length === 0) return true;
  const urlObj = parseUrl(url);
  return rest.length === 1 && !!urlObj && siteNames(urlObj, siteName).has(rest[0]);
}

function isRedditHost(host: string): boolean {
  return host === 'reddit.com' || host.endsWith('.reddit.com') || host === 'redd.it';
}

/**
 * A name from a Reddit address alone: r/<subreddit>, u/<name>, or the words of a post's address.
 * Null when the address has none (a share link, redd.it).
 */
export function getRedditTitleFromAddress(url: string): string | null {
  const urlObj = parseUrl(url);
  if (!urlObj || !isRedditHost(urlObj.hostname.toLowerCase())) return null;

  const path = urlObj.pathname;
  const slug = path.match(/^\/r\/[^/]+\/comments\/[a-z0-9]+\/([^/]+)/i)?.[1];
  if (slug) return wordsToTitle(safeDecode(slug).replace(/_/g, ' '));
  const subreddit = path.match(/^\/r\/([^/]+)\/?$/i)?.[1];
  if (subreddit) return `r/${subreddit}`;
  const user = path.match(/^\/(?:u|user)\/([^/]+)\/?$/i)?.[1];
  return user ? `u/${user}` : null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function wordsToTitle(value: string): string | null {
  const words = value.replace(/\s+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}

/**
 * The words of the address's last readable part, `/blog/how-to-start-a-garden` → "How to start a
 * garden". Null for an id (`a6f45553-2e42-…`, `1g3l2vb`) or a single word.
 */
function getAddressWords(urlObj: URL): string | null {
  // A word reads as one: lowercase, Capitalized, a short acronym, a number. Not an id like
  // "Cr8kRPgoTLSBbXUWtl48AQ" or "DZqsiiWjI", which slugs often end with.
  const isWord = (word: string) =>
    /^[a-z]{2,}'?[a-z]*$/.test(word) || /^[A-Z][a-z]+$/.test(word) || /^[A-Z]{2,5}$/.test(word) || /^\d{1,4}$/.test(word) || /^[ai]$/i.test(word);
  const segments = urlObj.pathname.split('/').filter(Boolean).map(safeDecode);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const words = segments[i].replace(/\.(html?|php|aspx?)$/i, '').split(/[-_+\s]+/).filter(Boolean);
    while (words.length && !isWord(words[words.length - 1])) words.pop();
    if (words.length < 2 || !words.every(isWord) || words.every((word) => /^\d+$/.test(word))) continue;
    return wordsToTitle(words.join(' '));
  }
  return null;
}

/**
 * What to call a page whose own title is only its site's name, or missing: what the address says it
 * is ("Shared Claude chat"), a Reddit name, the address's words, or "Page on claude.ai". Null for a
 * home page, whose site name is its name.
 */
export function getNameFromAddress(url: string | null | undefined): string | null {
  const urlObj = parseUrl(url);
  if (!urlObj || isHomePage(urlObj)) return null;
  return (
    getAddressKind(urlObj.href)?.kind ||
    getRedditTitleFromAddress(urlObj.href) ||
    getAddressWords(urlObj) ||
    `Page on ${hostOf(urlObj)}`
  );
}

/**
 * A read whose title is only its site's name, or its error page's, named from its address instead
 * and marked `nameFromAddress`, so a real name from any other read wins over it. A home page keeps
 * its title. A read with no title is left alone: later steps (a PDF's own title, the file name) fill it.
 */
export function withNameFromAddress<T extends ItemMeta>(meta: T): T {
  if (!meta?.url) return meta;
  const title = typeof meta.title === 'string' ? meta.title.trim() : '';
  if (!title || !namesNoPage(meta.url, title, meta.siteName)) return meta;
  const name = getNameFromAddress(meta.url);
  if (!name) return meta;
  return {
    ...meta,
    title: name,
    tsExtractedInfo: { ...(meta.tsExtractedInfo || { pageType: null }), nameFromAddress: true },
  };
}
