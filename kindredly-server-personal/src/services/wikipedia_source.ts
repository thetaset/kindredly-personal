import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import * as cheerio from 'cheerio';
import {assertSafeExternalUrl, safeFetchConfig} from '@/utils/safe_fetch';
import {fetchPageBodyText} from '@/utils/fetch_helpers';
import type {AdminFeedGenResolvedSource, FeedGenerationSource} from 'tset-sharedlib/api/api-types';

/**
 * Source fetching for admin feed generation (see feed_generation.service.ts).
 *
 * Wikipedia is first-class: plaintext extract + live revision id + lead image
 * via the MediaWiki API. `gutenberg`/`url` kinds fall back to a safe generic
 * fetch. All fetches go through the SSRF-guarded agents in safe_fetch.
 */

const USER_AGENT = 'KindredlyContentBot/1.0 (admin feed generation)';
const MAX_SOURCE_TEXT_CHARS = 60_000;

export type FetchedFeedGenSource = {resolved: AdminFeedGenResolvedSource; text: string};

// Short-lived cache so the plan call and the following generatePosts batches
// don't re-fetch the same articles. Keyed by url; small and TTL-bounded.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 50;
const sourceCache = new Map<string, {at: number; value: FetchedFeedGenSource}>();

function cacheGet(url: string): FetchedFeedGenSource | null {
  const hit = sourceCache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    sourceCache.delete(url);
    return null;
  }
  return hit.value;
}

function cacheSet(url: string, value: FetchedFeedGenSource): void {
  if (sourceCache.size >= CACHE_MAX) {
    const oldest = sourceCache.keys().next().value;
    if (oldest !== undefined) sourceCache.delete(oldest);
  }
  sourceCache.set(url, {at: Date.now(), value});
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- Politeness: Wikipedia rate-limits bursty clients (observed 429s on
// 4-concurrent discovery). All wikipedia.org API calls go through one queue
// with a minimum gap, and 429/503 responses retry with backoff.
const WIKI_MIN_GAP_MS = 300;
const RETRY_DELAYS_MS = [1000, 4000];
const RETRY_AFTER_CAP_MS = 15000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let wikiQueue: Promise<void> = Promise.resolve();
let lastWikiCallAt = 0;

function throttledWiki<T>(task: () => Promise<T>): Promise<T> {
  const run = wikiQueue.then(async () => {
    const wait = lastWikiCallAt + WIKI_MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastWikiCallAt = Date.now();
    return task();
  });
  wikiQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function getWithRetry<T = any>(url: string, config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await axios.get<T>(url, config);
    } catch (e: any) {
      const status = e?.response?.status;
      if ((status !== 429 && status !== 503) || attempt >= RETRY_DELAYS_MS.length) throw e;
      const retryAfterSec = Number(e?.response?.headers?.['retry-after']);
      const delay =
        Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.min(RETRY_AFTER_CAP_MS, retryAfterSec * 1000)
          : RETRY_DELAYS_MS[attempt];
      await sleep(delay);
    }
  }
}

export function isWikipediaUrl(rawUrl: string): boolean {
  try {
    return /(^|\.)wikipedia\.org$/i.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

export function isGutenbergUrl(rawUrl: string): boolean {
  try {
    return /(^|\.)gutenberg\.org$/i.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

export function isWikisourceUrl(rawUrl: string): boolean {
  try {
    return /(^|\.)wikisource\.org$/i.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

export function isWikiquoteUrl(rawUrl: string): boolean {
  try {
    return /(^|\.)wikiquote\.org$/i.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

export type FeedGenSourceCandidate = {
  url: string;
  kind: 'wikipedia' | 'wikisource' | 'wikiquote' | 'gutenberg' | 'url';
  title: string;
  snippet?: string;
};

function stripHtmlTags(text: string): string {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Search any English MediaWiki project (`list=search`) and return candidates for
 * the source picker / auto-discovery. Same API across Wikipedia / Wikisource /
 * Wikiquote — only the host and the candidate `kind` differ.
 */
async function searchMediaWiki(
  host: string,
  kind: 'wikipedia' | 'wikisource' | 'wikiquote',
  query: string,
  limit: number,
): Promise<FeedGenSourceCandidate[]> {
  const response = await throttledWiki(() =>
    getWithRetry(
      `https://${host}/w/api.php`,
      safeFetchConfig({
        timeout: 15000,
        headers: {'User-Agent': USER_AGENT},
        params: {
          action: 'query',
          format: 'json',
          list: 'search',
          srsearch: query,
          srlimit: Math.max(1, Math.min(20, limit)),
          srprop: 'snippet',
        },
      }),
    ),
  );
  const hits: any[] = response.data?.query?.search || [];
  return hits.map((hit) => ({
    url: `https://${host}/wiki/${encodeURIComponent(String(hit.title || '').replace(/ /g, '_'))}`,
    kind,
    title: String(hit.title || ''),
    snippet: stripHtmlTags(hit.snippet),
  }));
}

/** Search English Wikipedia; returns article candidates (encyclopedic — facts feeds). */
export function searchWikipedia(query: string, limit = 8): Promise<FeedGenSourceCandidate[]> {
  return searchMediaWiki('en.wikipedia.org', 'wikipedia', query, limit);
}

/** Search English Wikisource; returns full-text work candidates (poems, essays, documents — verse feeds). */
export function searchWikisource(query: string, limit = 8): Promise<FeedGenSourceCandidate[]> {
  return searchMediaWiki('en.wikisource.org', 'wikisource', query, limit);
}

/** Search English Wikiquote; returns quotation-page candidates (sourced quotes — passage feeds). */
export function searchWikiquote(query: string, limit = 8): Promise<FeedGenSourceCandidate[]> {
  return searchMediaWiki('en.wikiquote.org', 'wikiquote', query, limit);
}

/** Prefer a plain-text (non-zip) format URL from a Gutendex formats map. */
function pickGutenbergTextUrl(formats: Record<string, string> | undefined): string | null {
  for (const [mime, url] of Object.entries(formats || {})) {
    if (mime.startsWith('text/plain') && typeof url === 'string' && !url.endsWith('.zip')) return url;
  }
  return null;
}

/** Search Project Gutenberg (via the Gutendex API); candidates point at plain-text files. */
export async function searchGutenberg(query: string, limit = 8): Promise<FeedGenSourceCandidate[]> {
  const response = await getWithRetry(
    'https://gutendex.com/books',
    safeFetchConfig({timeout: 15000, headers: {'User-Agent': USER_AGENT}, params: {search: query}}),
  );
  const books: any[] = (response.data?.results || []).slice(0, Math.max(1, Math.min(20, limit)));
  return books
    .map((book): FeedGenSourceCandidate | null => {
      const textUrl = pickGutenbergTextUrl(book.formats);
      if (!textUrl) return null;
      const authors = (book.authors || [])
        .map((a: any) => a?.name)
        .filter(Boolean)
        .join(', ');
      return {
        url: textUrl,
        kind: 'gutenberg' as const,
        title: authors ? `${book.title} — ${authors}` : String(book.title || ''),
        snippet: (book.subjects || []).slice(0, 3).join(' · ') || undefined,
      };
    })
    .filter((c): c is FeedGenSourceCandidate => !!c);
}

function wikipediaTitleFromUrl(parsed: URL): string | null {
  const wikiMatch = parsed.pathname.match(/^\/wiki\/(.+)$/);
  if (wikiMatch) return decodeURIComponent(wikiMatch[1]).replace(/_/g, ' ');
  const titleParam = parsed.searchParams.get('title');
  if (titleParam) return titleParam.replace(/_/g, ' ');
  return null;
}

/**
 * Fetch plaintext from a MediaWiki project that has the TextExtracts extension
 * (Wikipedia, Wikiquote): lead+body plaintext, live revision id, lead image.
 * Wikisource does NOT have working extracts — it uses fetchWikisource instead.
 */
async function fetchMediaWikiExtract(
  src: FeedGenerationSource,
  parsed: URL,
  kind: 'wikipedia' | 'wikiquote',
): Promise<FetchedFeedGenSource> {
  const title = wikipediaTitleFromUrl(parsed);
  if (!title) throw new Error(`Cannot derive a ${kind} page title from ${src.url}`);

  const response = await throttledWiki(() =>
    getWithRetry(
      `${parsed.protocol}//${parsed.host}/w/api.php`,
      safeFetchConfig({
        timeout: 20000,
        headers: {'User-Agent': USER_AGENT},
        params: {
          action: 'query',
          format: 'json',
          redirects: 1,
          prop: 'extracts|revisions|pageimages',
          explaintext: 1,
          exsectionformat: 'plain',
          rvprop: 'ids',
          piprop: 'original',
          titles: title,
        },
      }),
    ),
  );

  const pages = response.data?.query?.pages || {};
  const page: any = Object.values(pages)[0];
  if (!page || page.missing !== undefined) {
    throw new Error(`${kind} page not found: ${title}`);
  }

  const text = String(page.extract || '').slice(0, MAX_SOURCE_TEXT_CHARS);
  // Provenance records the revision the text actually came from (the live one).
  // A caller-pinned revisionId that differs is surfaced as a plan warning.
  const liveRevisionId = Number(page.revisions?.[0]?.revid) || undefined;
  let bannerImageSrc: string | null =
    typeof page.original?.source === 'string' && page.original.source.startsWith('https://')
      ? page.original.source
      : null;
  // Wikiquote rarely has lead images; the same title on Wikipedia (usually a
  // person) has the portrait.
  if (!bannerImageSrc && kind === 'wikiquote') {
    bannerImageSrc = await fetchWikipediaLeadImage(typeof page.title === 'string' ? page.title : title);
  }

  return {
    resolved: {
      ...src,
      kind,
      title: typeof page.title === 'string' ? page.title : title,
      revisionId: liveRevisionId,
      retrievedAt: todayISODate(),
      bannerImageSrc,
      textLength: text.length,
    },
    text,
  };
}

/**
 * Best-effort lead image from English Wikipedia for a work or author title.
 * Wikisource/Wikiquote pages have no usable PageImages, but the corresponding
 * Wikipedia article usually does (manuscript scan or portrait). Never throws —
 * an image is a nice-to-have, not part of the sourced content.
 */
async function fetchWikipediaLeadImage(title: string): Promise<string | null> {
  try {
    const response = await throttledWiki(() =>
      getWithRetry(
        'https://en.wikipedia.org/w/api.php',
        safeFetchConfig({
          timeout: 15000,
          headers: {'User-Agent': USER_AGENT},
          params: {
            action: 'query',
            format: 'json',
            redirects: 1,
            prop: 'pageimages',
            piprop: 'original|thumbnail',
            pithumbsize: 1200,
            titles: title,
          },
        }),
      ),
    );
    const pages = response.data?.query?.pages || {};
    const page: any = Object.values(pages)[0];
    const src = page?.original?.source ?? page?.thumbnail?.source;
    return typeof src === 'string' && src.startsWith('https://') ? src : null;
  } catch {
    return null;
  }
}

/** Parse a single field out of a Wikisource {{header|...}} template (author/section/year). */
function parseWikisourceHeaderField(wikitext: string, field: string): string | null {
  // Match "| field = value" up to the next pipe/newline-pipe or the template close.
  const re = new RegExp(`\\|\\s*${field}\\s*=\\s*([^|}]*)`, 'i');
  const m = wikitext.match(re);
  if (!m) return null;
  // Strip wiki markup: [[a|b]]→b, [[a]]→a, '' '' emphasis, stray brackets.
  const value = m[1]
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/[{}]/g, '')
    .trim();
  return value || null;
}

const WORK_YEAR_RE = /\b(1[5-9]\d{2}|20\d{2})\b/; // 1500–2099, avoids matching include=98 etc.

/** Best-effort publication year: a 4-digit year in the scan filename, or a header year field. */
function parseWikisourceYear(wikitext: string): string | null {
  // e.g. index="New Hampshire (Frost, 1923).djvu" → 1923 (take the last year in the filename).
  const indexMatch = wikitext.match(/index\s*=\s*["']?([^\n>]*?\.djvu)/i);
  if (indexMatch) {
    const years = indexMatch[1].match(new RegExp(WORK_YEAR_RE.source, 'g'));
    if (years && years.length) return years[years.length - 1];
  }
  const fromField = parseWikisourceHeaderField(wikitext, 'year');
  const yr = fromField && fromField.match(WORK_YEAR_RE);
  return yr ? yr[1] : null;
}

/** Wikitext of a Wikisource page (for root-page header fallbacks). Never throws. */
async function fetchWikisourceWikitext(parsed: URL, page: string): Promise<string | null> {
  try {
    const response = await throttledWiki(() =>
      getWithRetry(
        `${parsed.protocol}//${parsed.host}/w/api.php`,
        safeFetchConfig({
          timeout: 15000,
          headers: {'User-Agent': USER_AGENT},
          params: {action: 'parse', format: 'json', redirects: 1, prop: 'wikitext', page},
        }),
      ),
    );
    const wikitext = response.data?.parse?.wikitext?.['*'];
    return typeof wikitext === 'string' ? wikitext : null;
  } catch {
    return null;
  }
}

/** Convert an HTML fragment (already chrome-free) to text, keeping line structure. */
function htmlFragmentToText(fragment: string): string {
  return (
    fragment
      // Newlines in HTML source are insignificant whitespace — real line breaks
      // come only from <br> and block-element boundaries.
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|blockquote|h[1-6])>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/[​­]/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Convert Wikisource rendered HTML to clean plaintext, preserving line breaks.
 * Strips page chrome first (TemplateStyles <style> blocks, the {{header}} nav
 * and page-number spans marked ws-noexport, sister-project boxes, audio
 * players), then prefers `<div class="poem">` block(s), then the transcluded
 * scan body (`.prp-pages-output` — verse without a poem tag, e.g.
 * {{block center}} works), then the whole cleaned page. `titleHints` drops a
 * leading line that just repeats the work's title (common in-work heading).
 */
export function wikisourceHtmlToText(html: string, titleHints: string[] = []): string {
  const $ = cheerio.load(html);
  $('style, link, script').remove();
  $('.ws-noexport, .wst-header, .plainSister, .mw-editsection, .noprint, .dablink').remove();
  $('.licenseContainer, .licenseBanner, .authority-control').remove();
  $('figure, audio, video, table, sup.reference').remove();

  const poem = $('.poem');
  const prp = $('.prp-pages-output');
  const fragments =
    poem.length > 0
      ? poem.toArray().map((el) => $(el).html() || '')
      : [(prp.length > 0 ? prp.html() : $.root().html()) || ''];

  const text = fragments.map(htmlFragmentToText).filter(Boolean).join('\n\n');

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const hints = titleHints.map(norm).filter(Boolean);
  const lines = text.split('\n');
  while (lines.length > 1 && (!lines[0].trim() || hints.includes(norm(lines[0])))) lines.shift();
  return lines.join('\n').trim();
}

/** One action=parse round-trip (rendered HTML + wikitext + revision). */
async function parseWikisourcePage(
  parsed: URL,
  page: string,
): Promise<{html: string; wikitext: string; parseTitle: string; revisionId: number | undefined}> {
  const response = await throttledWiki(() =>
    getWithRetry(
      `${parsed.protocol}//${parsed.host}/w/api.php`,
      safeFetchConfig({
        timeout: 20000,
        headers: {'User-Agent': USER_AGENT},
        params: {
          action: 'parse',
          format: 'json',
          redirects: 1,
          prop: 'text|wikitext|revid',
          page,
          disablelimitreport: 1,
        },
      }),
    ),
  );
  const parse: any = response.data?.parse;
  if (!parse || parse.text == null) throw new Error(`Wikisource page not found: ${page}`);
  return {
    html: String(parse.text?.['*'] || ''),
    wikitext: String(parse.wikitext?.['*'] || ''),
    parseTitle: typeof parse.title === 'string' ? parse.title : page,
    revisionId: Number(parse.revid) || undefined,
  };
}

/** First edition link on a {{versions}} disambiguation page, e.g. "* \"[[Mountain Interval/The Road Not Taken|…]]\", from …". */
function firstVersionLink(wikitext: string): string | null {
  const m = wikitext.match(/^\*[^\n]*?\[\[([^\]|#]+)/m);
  return m ? m[1].trim() : null;
}

/**
 * Fetch a Wikisource work. Wikisource transcludes verse from the Page: namespace
 * and has no working TextExtracts, so we render via action=parse and pull the
 * poem/body text from the HTML. Author/section/year come from the {{header}}
 * template; the text is public domain by Wikisource policy.
 */
async function fetchWikisource(src: FeedGenerationSource, parsed: URL): Promise<FetchedFeedGenSource> {
  const title = wikipediaTitleFromUrl(parsed);
  if (!title) throw new Error(`Cannot derive a Wikisource page title from ${src.url}`);

  let page = await parseWikisourcePage(parsed, title);
  let url = src.url;
  // Top-level poem titles are often {{versions}} disambiguation pages (a list
  // of editions, not the work) — follow the first listed edition.
  if (/\{\{\s*versions\b/i.test(page.wikitext)) {
    const edition = firstVersionLink(page.wikitext);
    if (!edition) throw new Error(`Wikisource page "${title}" is a versions list with no edition links`);
    page = await parseWikisourcePage(parsed, edition);
    url = `${parsed.protocol}//${parsed.host}/wiki/${encodeURI(page.parseTitle.replace(/ /g, '_'))}`;
  }
  const {html, wikitext, parseTitle} = page;

  const section = parseWikisourceHeaderField(wikitext, 'section');
  const workName = section || parseTitle.split('/').pop() || parseTitle;
  let author = parseWikisourceHeaderField(wikitext, 'author');
  // e.g. "The Works of the Late Edgar Allan Poe (1859)/Volume 2/…" → 1859.
  let workYear = parseWikisourceYear(wikitext) || parseTitle.match(WORK_YEAR_RE)?.[1] || null;

  // Collection subpages often leave author/year blank in their own header —
  // the work's root page carries them.
  if ((!author || !workYear) && parseTitle.includes('/')) {
    const rootWikitext = await fetchWikisourceWikitext(parsed, parseTitle.split('/')[0]);
    if (rootWikitext) {
      author = author || parseWikisourceHeaderField(rootWikitext, 'author');
      workYear = workYear || parseWikisourceYear(rootWikitext);
    }
  }

  const titleHints = [section, parseTitle.split('/').pop(), title.split('/').pop()].filter((h): h is string => !!h);
  const text = wikisourceHtmlToText(html, titleHints).slice(0, MAX_SOURCE_TEXT_CHARS);
  if (!text) throw new Error(`No readable text on Wikisource page: ${title}`);

  // Pair an image from Wikimedia: the header's own `wikipedia = <article>`
  // pointer, else the work's Wikipedia article (often the manuscript scan),
  // else the author's portrait.
  const imageCandidates = Array.from(
    new Set([parseWikisourceHeaderField(wikitext, 'wikipedia'), workName, author].filter((c): c is string => !!c)),
  );
  let bannerImageSrc: string | null = null;
  for (const candidate of imageCandidates) {
    bannerImageSrc = await fetchWikipediaLeadImage(candidate);
    if (bannerImageSrc) break;
  }

  return {
    resolved: {
      ...src,
      url, // the edition page when a versions list was followed
      kind: 'wikisource',
      title: section || parseTitle,
      author,
      workYear,
      revisionId: page.revisionId,
      retrievedAt: todayISODate(),
      bannerImageSrc,
      licenseNote: src.licenseNote || 'Public domain (Wikisource)',
      textLength: text.length,
    },
    text,
  };
}

async function fetchGeneric(src: FeedGenerationSource): Promise<FetchedFeedGenSource> {
  const text = (await fetchPageBodyText(src.url, MAX_SOURCE_TEXT_CHARS)) || '';
  if (!text) throw new Error(`No readable text at ${src.url}`);
  return {
    resolved: {
      ...src,
      title: null,
      retrievedAt: todayISODate(),
      bannerImageSrc: null,
      textLength: text.length,
    },
    text,
  };
}

/**
 * Gutenberg plain-text fetch. Strips the standard PG header/footer boilerplate
 * (*** START/END OF ... ***) so extraction works on the actual work; the title
 * is read from the "Title:" header line when present. PD by definition.
 */
async function fetchGutenberg(src: FeedGenerationSource): Promise<FetchedFeedGenSource> {
  const response = await getWithRetry<string>(
    src.url,
    safeFetchConfig({timeout: 20000, headers: {'User-Agent': USER_AGENT}, responseType: 'text'}),
  );
  const raw = typeof response.data === 'string' ? response.data : '';
  if (!raw.trim()) throw new Error(`No text at ${src.url}`);

  const titleMatch = raw.slice(0, 2000).match(/^Title:\s*(.+)$/m);
  const startMatch = raw.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\*\*\*/i);
  const endMatch = raw.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\*\*\*/i);
  const start = startMatch ? raw.indexOf(startMatch[0]) + startMatch[0].length : 0;
  const end = endMatch ? raw.indexOf(endMatch[0]) : raw.length;
  const text = raw.slice(start, end).trim().slice(0, MAX_SOURCE_TEXT_CHARS);

  return {
    resolved: {
      ...src,
      kind: 'gutenberg',
      title: titleMatch ? titleMatch[1].trim() : null,
      retrievedAt: todayISODate(),
      bannerImageSrc: null,
      licenseNote: src.licenseNote || 'Public domain (Project Gutenberg)',
      textLength: text.length,
    },
    text,
  };
}

/** Fetch one generation source (SSRF-guarded, cached). Throws on failure. */
export async function fetchFeedGenSource(src: FeedGenerationSource): Promise<FetchedFeedGenSource> {
  const cached = cacheGet(src.url);
  if (cached) return cached;

  const parsed = assertSafeExternalUrl(src.url);
  const result =
    src.kind === 'wikisource' || isWikisourceUrl(src.url)
      ? await fetchWikisource(src, parsed)
      : src.kind === 'wikiquote' || isWikiquoteUrl(src.url)
        ? await fetchMediaWikiExtract(src, parsed, 'wikiquote')
        : src.kind === 'wikipedia' || (src.kind !== 'gutenberg' && isWikipediaUrl(src.url))
          ? await fetchMediaWikiExtract(src, parsed, 'wikipedia')
          : src.kind === 'gutenberg' || isGutenbergUrl(src.url)
            ? await fetchGutenberg(src)
            : await fetchGeneric(src);

  cacheSet(src.url, result);
  return result;
}
