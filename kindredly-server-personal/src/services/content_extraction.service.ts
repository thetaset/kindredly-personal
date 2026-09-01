import * as cheerio from 'cheerio';

const MIN_ARTICLE_WORDS = 120;
const MAX_TEXT_CHARS = 20000;
const MAX_LINKS = 100;

export interface ExtractedArticle {
  hasArticle: boolean;
  title: string | null;
  byline: string | null;
  publishedAt: string | null;
  text: string;
  wordCount: number;
  /** Absolute outbound links (different host than the page). */
  links: string[];
  /** Why hasArticle is false, when applicable (for diagnostics). */
  reason?: string | null;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function firstNonEmpty(...vals: Array<string | undefined | null>): string | null {
  for (const v of vals) {
    const t = (v || '').trim();
    if (t) return t;
  }
  return null;
}

function sameRegistrable(a: string, b: string): boolean {
  const tail = (h: string) => h.split('.').slice(-2).join('.');
  return tail(a) === tail(b);
}

/**
 * Backend article normalization. The CLIENT extracts the article from its live
 * rendered DOM and sends structured fields (text + byline + date + links); this
 * service analyzes them and NEVER fetches the page. An optional client-supplied
 * HTML blob is parsed as a passive fallback (still never fetched). Determines
 * whether the page actually has an article so callers can return "no article
 * information found" instead of mislabeling non-articles as untrustworthy.
 */
class ContentExtractionService {
  private static _instance: ContentExtractionService | null = null;
  static get instance(): ContentExtractionService {
    if (!this._instance) this._instance = new ContentExtractionService();
    return this._instance;
  }

  async extract(input: {
    url: string;
    title?: string;
    text?: string;
    byline?: string;
    publishedAt?: string;
    links?: string[];
    html?: string;
  }): Promise<ExtractedArticle> {
    // Primary path: client-extracted structured fields.
    if (input.text && input.text.trim()) {
      return this.fromClientFields(input);
    }

    // Passive fallback: client-supplied HTML (NOT fetched). Server never fetches.
    if (input.html && input.html.trim()) {
      return this.fromHtml(input.html, input.url, input.title);
    }

    // Nothing usable to analyze — never fetch.
    return this.empty('no-content', input.title || null);
  }

  private empty(reason: string, title: string | null): ExtractedArticle {
    return {hasArticle: false, title, byline: null, publishedAt: null, text: '', wordCount: 0, links: [], reason};
  }

  private fromClientFields(input: {
    title?: string;
    text?: string;
    byline?: string;
    publishedAt?: string;
    links?: string[];
  }): ExtractedArticle {
    const text = (input.text || '')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_TEXT_CHARS);
    const wordCount = countWords(text);
    const hasArticle = wordCount >= MIN_ARTICLE_WORDS;
    const links = Array.isArray(input.links)
      ? input.links.filter((l) => typeof l === 'string' && /^https?:\/\//i.test(l)).slice(0, MAX_LINKS)
      : [];
    return {
      hasArticle,
      title: firstNonEmpty(input.title),
      byline: firstNonEmpty(input.byline),
      publishedAt: firstNonEmpty(input.publishedAt),
      text,
      wordCount,
      links,
      reason: hasArticle ? null : 'too-short',
    };
  }

  private fromHtml(html: string, baseUrl: string, titleHint?: string): ExtractedArticle {
    let $: cheerio.CheerioAPI;
    try {
      $ = cheerio.load(html);
    } catch {
      return this.empty('parse-fail', titleHint || null);
    }

    const title = firstNonEmpty(
      $('meta[property="og:title"]').attr('content'),
      $('title').first().text(),
      $('h1').first().text(),
      titleHint,
    );

    const byline = firstNonEmpty(
      $('meta[name="author"]').attr('content'),
      $('meta[property="article:author"]').attr('content'),
      $('[itemprop="author"]').first().text(),
      $('[rel="author"]').first().text(),
      $('.byline, .author, .c-byline').first().text(),
    );

    const publishedAt = firstNonEmpty(
      $('meta[property="article:published_time"]').attr('content'),
      $('meta[itemprop="datePublished"]').attr('content'),
      $('meta[name="date"]').attr('content'),
      $('time[datetime]').first().attr('datetime'),
    );

    // Collect outbound links before stripping chrome (use the whole document).
    const links = this.collectOutboundLinks($, baseUrl);

    // Pick the main content subtree, then strip boilerplate nodes.
    const articleEl = $('article').first();
    const mainEl = $('[role="main"]').first().length ? $('[role="main"]').first() : $('main').first();
    const root = articleEl.length ? articleEl : mainEl.length ? mainEl : $('body');

    root.find('script, style, noscript, template, svg, iframe, nav, header, footer, aside, form, button').remove();

    const paragraphCount = root.find('p').length;
    const text = root
      .text()
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_TEXT_CHARS);

    const wordCount = countWords(text);
    const hasArticle =
      wordCount >= MIN_ARTICLE_WORDS && (articleEl.length > 0 || mainEl.length > 0 || paragraphCount >= 3);

    return {
      hasArticle,
      title,
      byline,
      publishedAt,
      text,
      wordCount,
      links,
      reason: hasArticle ? null : 'too-short',
    };
  }

  private collectOutboundLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    let baseHost = '';
    try {
      baseHost = new URL(baseUrl).hostname.replace(/^www\./, '');
    } catch {
      /* ignore */
    }
    const seen = new Set<string>();
    const out: string[] = [];
    $('a[href]').each((_i, el) => {
      if (out.length >= MAX_LINKS) return false;
      const href = $(el).attr('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
      let abs: URL;
      try {
        abs = new URL(href, baseUrl);
      } catch {
        return;
      }
      if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return;
      const host = abs.hostname.replace(/^www\./, '');
      if (baseHost && (host === baseHost || sameRegistrable(host, baseHost))) return; // outbound only
      const key = abs.origin + abs.pathname;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(abs.toString());
    });
    return out;
  }
}

export default ContentExtractionService;
export {ContentExtractionService};
