import * as cheerio from 'cheerio';
import { ItemResourceType } from './constants';
import { checkIfYTChannel, normalizeYouTubeChannelIdentifier, parseChannelIdFromString, parseYTVideoIdFromString, parseYTHandleIdFromString, mergeOptions } from './meta.utils';
import { ItemMeta, ItemMetaExtracted } from './shared.types';
import { getSocialMetadataProvider, isRootWebsiteURL, type SocialMetadataProvider } from './url.utils';
import { recognizePage, recognizedToItemResourceType } from './page-recognition.utils';
import { extractProductMetadata, looksLikeProductPage } from './product-metadata.utils';
import { pickPageImage } from './page-image.utils';
import { pickPageTitle, withNameFromAddress } from './link-name.utils';
// Moved to the parser-free module; re-exported so the server's import keeps working.
export { getRedditTitleFromAddress } from './link-name.utils';
import {
  normalizeTextSnippet,
  resolveAbsoluteUrl,
  getFeedTypeFromUrl,
  isLikelyMetadataNoise,
  looksLikeXmlFeed,
  normalizeItemMetaImageUrls,
  sanitizeExtractedTitle,
  extractFeedLinksFromEntries,
  extractFeedLinksFromAnchors,
} from './extraction.pure.utils';
// Re-exported so every existing importer of this module keeps resolving (server, background, fetchmeta).
export {
  sanitizeExtractedTitle,
  normalizeItemMetaImageUrls,
  getFeedTypeFromUrl,
  isLikelyFeedUrl,
  isFeedContentType,
  looksLikeXmlFeed,
  hasUsableMetadata,
  getMetadataSourcePriority,
  mergeMetadataBySourcePriority,
  mergeMetadataPreferPrimary,
  looksLikePdf,
  classifyFetchedContentKind,
  type FetchedContentKind,
} from './extraction.pure.utils';

// Re-exported so existing importers keep working; first-paint code should import
// from './extraction.pure.utils' directly (see that file).
export { resolveAbsoluteUrl };

export interface SocialOEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_url?: string;
  html?: string;
}

function decodeHtmlEntityString(value: string): string {
  return cheerio.load(`<textarea>${value}</textarea>`)(`textarea`).text().trim();
}

function extractTextFromHtmlFragment(html?: string): string | undefined {
  if (!html) {
    return undefined;
  }

  const text = cheerio.load(html).text().replace(/\s+/g, ' ').trim();
  return text || undefined;
}


function getHeuristicTitleFromDOM(document: Document): string | undefined {
  for (const selector of ['main h1', 'article h1', '[role="main"] h1', 'h1']) {
    const value = sanitizeExtractedTitle(document.querySelector(selector)?.textContent);
    if (value && !isLikelyMetadataNoise(value)) {
      return value;
    }
  }

  return undefined;
}

function getHeuristicDescriptionFromDOM(document: Document): string | undefined {
  for (const selector of ['article p', 'main p', '[role="main"] p', 'p']) {
    const elements = document.querySelectorAll(selector);
    for (const element of Array.from(elements)) {
      const value = normalizeTextSnippet(element.textContent);
      if (value && value.length >= 40 && !isLikelyMetadataNoise(value)) {
        return value;
      }
    }
  }

  return undefined;
}

function getHeuristicTitleFromHtml($: cheerio.CheerioAPI): string | undefined {
  for (const selector of ['main h1', 'article h1', '[role="main"] h1', 'h1']) {
    const value = sanitizeExtractedTitle($(selector).first().text());
    if (value && !isLikelyMetadataNoise(value)) {
      return value;
    }
  }

  return undefined;
}

function getHeuristicDescriptionFromHtml($: cheerio.CheerioAPI): string | undefined {
  for (const selector of ['article p', 'main p', '[role="main"] p', 'p']) {
    for (const el of $(selector).toArray()) {
      const value = normalizeTextSnippet($(el).text());
      if (value && value.length >= 40 && !isLikelyMetadataNoise(value)) {
        return value;
      }
    }
  }

  return undefined;
}

function normalizeRedditMediaUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const decoded = decodeHtmlEntityString(value);
  if (!decoded) {
    return undefined;
  }

  if (/^(self|default|nsfw|spoiler|image)$/i.test(decoded)) {
    return undefined;
  }

  if (decoded.startsWith('//')) {
    return `https:${decoded}`;
  }

  if (/^https?:\/\//i.test(decoded)) {
    return decoded;
  }

  return undefined;
}

export function getRedditImageUrl(postData: any): string | undefined {
  const previewCandidates = [
    postData.preview?.images?.[0]?.source?.url,
    ...(postData.preview?.images?.[0]?.resolutions || []).map((resolution: any) => resolution?.url),
    postData.preview?.reddit_video_preview?.thumbnail_url,
  ];

  for (const candidate of previewCandidates) {
    const normalized = normalizeRedditMediaUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (postData.is_gallery && postData.media_metadata) {
    for (const imageId of Object.keys(postData.media_metadata)) {
      const normalized = normalizeRedditMediaUrl(
        postData.media_metadata[imageId]?.s?.u || postData.media_metadata[imageId]?.p?.[0]?.u,
      );
      if (normalized) {
        return normalized;
      }
    }
  }

  const externalLinkCandidates = [
    postData.url_overridden_by_dest,
    postData.url,
  ];

  for (const candidate of externalLinkCandidates) {
    const normalized = normalizeRedditMediaUrl(candidate);
    if (normalized && normalized.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
      return normalized;
    }
  }

  const thumbnailCandidates = [
    postData.thumbnail,
    postData.thumbnail_src,
  ];

  for (const candidate of thumbnailCandidates) {
    const normalized = normalizeRedditMediaUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

export function extractMetadataFromRedditJson(url: string, jsonData: any): ItemMeta {
  // Reddit JSON structure: array with [listing, comments] or just listing
  let postData = null;
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    // Post page: first element is the post listing
    postData = jsonData[0]?.data?.children?.[0]?.data;
  } else if (jsonData?.data?.children) {
    // Listing page: take first post
    postData = jsonData.data.children[0]?.data;
  }
  
  if (!postData) {
    throw new Error('No post data found in Reddit JSON response');
  }
  
  // Extract metadata from Reddit JSON
  const meta: ItemMeta = {
    url: url,
    title: postData.title || '',
    description: postData.selftext || postData.url_overridden_by_dest || postData.url || '',
    imageSrc: getRedditImageUrl(postData),
    tsExtractedInfo: {
      pageType: ItemResourceType.SITE_ITEM,
      sourceId: 'parser_1',
      redditScore: postData.score,
      redditComments: postData.num_comments,
      redditSubreddit: postData.subreddit,
      redditAuthor: postData.author,
      redditCreated: postData.created_utc,
      recognized: {
        provider: 'reddit',
        resourceType: 'REDDIT_POST',
        contentKind: 'post',
        externalId: typeof postData.id === 'string' ? postData.id : undefined,
        parentExternalId: typeof postData.subreddit === 'string' ? postData.subreddit : null,
        canonicalUrl: url,
        confidence: 0.95,
      },
    } as ItemMetaExtracted
  };

  return meta;
}

export function getSocialOEmbedEndpoint(url: string): string | null {
  const provider = getSocialMetadataProvider(url);

  switch (provider) {
    case 'x':
      return `https://publish.twitter.com/oembed?omit_script=1&dnt=1&url=${encodeURIComponent(url)}`;
    case 'bluesky':
      return `https://embed.bsky.app/oembed?url=${encodeURIComponent(url)}`;
    case 'tiktok':
      return `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    default:
      return null;
  }
}

export function extractMetadataFromOEmbed(
  url: string,
  provider: SocialMetadataProvider,
  payload: SocialOEmbedResponse,
): ItemMeta {
  const htmlText = extractTextFromHtmlFragment(payload.html);
  const providerName = payload.provider_name || provider;
  const title = payload.title?.trim() || htmlText || `${providerName} post${payload.author_name ? ` by ${payload.author_name}` : ''}`;
  const description = htmlText || payload.author_name || providerName;

  return {
    url,
    title,
    description,
    imageSrc: payload.thumbnail_url,
    siteName: providerName,
    tsExtractedInfo: {
      pageType: ItemResourceType.SITE_ITEM,
      sourceId: 'oembed',
    } as ItemMetaExtracted,
  };
}

export function convertRedditUrlToJson(url: string): string {
  // Convert Reddit URL to JSON API endpoint by appending .json
  let jsonUrl = url;
  if (url.includes('?')) {
    // If URL has query params, insert .json before them
    jsonUrl = url.replace('?', '.json?');
  } else {
    // Simple case: just append .json
    jsonUrl = url.endsWith('/') ? url + '.json' : url + '.json';
  }
  return jsonUrl;
}

function isRedditHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'reddit.com' || host.endsWith('.reddit.com') || host === 'redd.it';
}

/**
 * Reddit's oEmbed is the one Reddit read that still answers without an account: `.json` returns
 * 403 and a page read gets a script challenge titled "Reddit" (HAT-619). It answers a post or
 * comment address only, /r/<subreddit>/comments/<id>/, and ignores which subreddit is named, so a
 * redd.it link or a bare /comments/<id> is given that form. Null for anything else.
 */
export function getRedditOEmbedEndpoint(url: string): string | null {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return null;
  }
  if (!isRedditHost(urlObj.hostname)) return null;

  const path = urlObj.pathname;
  let postUrl: string | null = null;
  if (/^\/r\/[^/]+\/comments\/[a-z0-9]+/i.test(path)) {
    postUrl = url;
  } else {
    const id = urlObj.hostname.toLowerCase() === 'redd.it'
      ? path.match(/^\/([a-z0-9]+)\/?$/i)?.[1]
      : path.match(/^\/comments\/([a-z0-9]+)/i)?.[1];
    if (id) postUrl = `https://www.reddit.com/r/all/comments/${id}/`;
  }

  return postUrl ? `https://www.reddit.com/oembed?url=${encodeURIComponent(postUrl)}` : null;
}

/** A link from Reddit's phone share button, /r/<subreddit>/s/<code>. It redirects to the post. */
export function isRedditShareLink(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return isRedditHost(urlObj.hostname) && /^\/r\/[^/]+\/s\/[^/]+\/?$/i.test(urlObj.pathname);
  } catch {
    return false;
  }
}

export function extractMetadataFromRedditOEmbed(url: string, payload: SocialOEmbedResponse): ItemMeta | null {
  const title = payload?.title ? decodeHtmlEntityString(payload.title) : '';
  if (!title) return null;

  // The embed's link to the post carries its real subreddit and id.
  const postHref = payload.html ? cheerio.load(payload.html)('a[href*="/comments/"]').first().attr('href') : undefined;
  const postMatch = postHref?.match(/\/r\/([^/]+)\/comments\/([a-z0-9]+)/i);

  return {
    url,
    title,
    siteName: 'Reddit',
    tsExtractedInfo: {
      pageType: ItemResourceType.SITE_ITEM,
      sourceId: 'oembed',
      redditSubreddit: postMatch?.[1],
      redditAuthor: payload.author_name,
      ...(postMatch && postHref
        ? {
            recognized: {
              provider: 'reddit',
              resourceType: 'REDDIT_POST',
              contentKind: 'post',
              externalId: postMatch[2],
              parentExternalId: postMatch[1],
              canonicalUrl: postHref,
              confidence: 0.9,
            },
          }
        : {}),
    } as ItemMetaExtracted,
  };
}

/** Reddit's script challenge, served instead of the page to a read that does not run JavaScript. */
export function isRedditChallengePage(html: string): boolean {
  return /<input[^>]*name=["']?js_challenge/i.test(html);
}


/** Text of a namespaced channel-level tag (e.g. "itunes:summary"), direct children only. */
function feedNsText(root: any, tag: string): string {
  return root.children(tag.replace(':', '\\:')).first().text().trim();
}

/** Attribute of a namespaced channel-level tag (e.g. "itunes:image" href), direct children only. */
function feedNsAttr(root: any, tag: string, attr: string): string | undefined {
  return root.children(tag.replace(':', '\\:')).first().attr(attr) || undefined;
}

/**
 * Channel-level metadata from an RSS/Atom feed: title, description, artwork,
 * author. Mirrors the importer's feed parser (content_source.service.parseFeed)
 * so a podcast/feed URL resolves its real cover image and title — which is what
 * makes admin "refresh from source" work for podcasts.
 */
export function extractFeedChannelMeta(url: string, data: string): ItemMeta {
  const $ = cheerio.load(data, { xmlMode: true });
  const channel = $('channel').first();
  const isAtom = channel.length === 0 && $('feed').first().length > 0;
  const root = isAtom ? $('feed').first() : channel;

  const pick = (sel: string) => root.children(sel).first().text().trim();
  // Atom: prefer the human page (rel="alternate" / no rel) over the feed's own rel="self".
  const atomLink = (): string => {
    let alt = '', noRel = '', other = '';
    root.children('link').each((_i: number, el: any) => {
      const rel = String($(el).attr('rel') || '').toLowerCase();
      const href = $(el).attr('href') || '';
      if (!href) return;
      if (rel === 'alternate' && !alt) alt = href;
      else if (!rel && !noRel) noRel = href;
      else if (rel !== 'self' && !other) other = href;
    });
    return alt || noRel || other || root.children('link').first().attr('href') || '';
  };

  const title = pick('title') || $('title').first().text().trim();
  const link = (isAtom ? atomLink() : pick('link')) || url;
  const description = pick('description') || feedNsText(root, 'itunes:summary') || feedNsText(root, 'subtitle');
  const imageSrc =
    root.children('image').children('url').first().text().trim() ||
    feedNsAttr(root, 'itunes:image', 'href') ||
    feedNsAttr(root, 'logo', 'href') ||
    '';

  const meta: ItemMeta = {
    url,
    title: title || undefined,
    description: description || undefined,
    siteName: feedNsText(root, 'itunes:author') || pick('managingEditor') || undefined,
    imageSrc: imageSrc || '',
    tsManifest: { version: 2.0 },
  };
  return normalizeItemMetaImageUrls(link, meta) || meta;
}

export async function extractMetadata(url: string, data: string) {
  // Feeds (podcasts especially) need feed-aware parsing — the HTML extractor
  // below would return no image and a garbled, concatenated title.
  if (looksLikeXmlFeed(data)) {
    return extractFeedChannelMeta(url, data);
  }

  const metaOrig = await parseAllMetadata(url, data);

  let meta: ItemMeta = {};
  meta['url'] = url;

  // The first title that names the page, not only its site (HAT-619).
  meta.title = pickPageTitle(
    url,
    [
      sanitizeExtractedTitle(metaOrig['title']),
      sanitizeExtractedTitle(metaOrig['og:title']),
      sanitizeExtractedTitle(metaOrig['twitter:title']),
      sanitizeExtractedTitle(metaOrig['schema:title']),
      sanitizeExtractedTitle(metaOrig['heuristic:title']),
      sanitizeExtractedTitle(metaOrig['og:site_name']),
    ],
    metaOrig['og:site_name'],
  );
  meta.description = mergeOptions([metaOrig['description'], metaOrig['og:description'], metaOrig['twitter:description'], metaOrig['schema:description'], metaOrig['heuristic:description']]);
  meta.keywords = mergeOptions([metaOrig['keywords'], metaOrig['og:keywords']]);
  meta.siteName = mergeOptions([metaOrig['og:site_name']]);
  meta.type = mergeOptions([metaOrig['og:type']]);
  meta.locale = mergeOptions([metaOrig['og:locale']]);
  // The shared rule the popup uses too: a YouTube video's own thumbnail, and the site's logo
  // only when the page offers nothing else (HAT-323).
  meta.imageSrc = pickPageImage({
    pageUrl: url,
    tagged: [metaOrig['og:image'], metaOrig['twitter:image'], metaOrig['twitter:image:src'], metaOrig['image']],
    structured: [metaOrig['schema:image']],
    icons: [metaOrig['shortcut icon'], metaOrig['icon'], metaOrig['apple-touch-icon'], metaOrig['apple-touch-icon-precomposed']],
  }) || '';

  //favicon
  meta.favicon = mergeOptions([
    metaOrig['shortcut icon'],
    metaOrig['icon'],
    metaOrig['apple-touch-icon'],
    metaOrig['apple-touch-icon-precomposed'],
  ]);

  meta.tsManifest = {
    version: 2.0,
  };
  meta.tsExtractedInfo = metaOrig['tsExtractedInfo'];

  // A title that only names the site ("Claude" on every shared chat) is not this page's name (HAT-619).
  return withNameFromAddress(normalizeItemMetaImageUrls(url, meta) || meta);
}

export async function extractMetadataFromDOM(url: string, document: Document) {
  const metaOrig = await parseAllMetadataFromDOM(url, document);

  let meta: ItemMeta = {};
  meta['url'] = url;

  // The first title that names the page, not only its site (HAT-619).
  meta.title = pickPageTitle(
    url,
    [
      sanitizeExtractedTitle(metaOrig['title']),
      sanitizeExtractedTitle(metaOrig['og:title']),
      sanitizeExtractedTitle(metaOrig['twitter:title']),
      sanitizeExtractedTitle(metaOrig['schema:title']),
      sanitizeExtractedTitle(metaOrig['heuristic:title']),
      sanitizeExtractedTitle(metaOrig['og:site_name']),
    ],
    metaOrig['og:site_name'],
  );
  meta.description = mergeOptions([metaOrig['description'], metaOrig['og:description'], metaOrig['twitter:description'], metaOrig['schema:description'], metaOrig['heuristic:description']]);
  meta.keywords = mergeOptions([metaOrig['keywords'], metaOrig['og:keywords']]);
  meta.siteName = mergeOptions([metaOrig['og:site_name']]);
  meta.type = mergeOptions([metaOrig['og:type']]);
  meta.locale = mergeOptions([metaOrig['og:locale']]);
  // The shared rule the popup uses too: a YouTube video's own thumbnail, and the site's logo
  // only when the page offers nothing else (HAT-323).
  meta.imageSrc = pickPageImage({
    pageUrl: url,
    tagged: [metaOrig['og:image'], metaOrig['twitter:image'], metaOrig['twitter:image:src'], metaOrig['image']],
    structured: [metaOrig['schema:image']],
    icons: [metaOrig['shortcut icon'], metaOrig['icon'], metaOrig['apple-touch-icon'], metaOrig['apple-touch-icon-precomposed']],
  }) || '';

  //favicon
  meta.favicon = mergeOptions([
    metaOrig['shortcut icon'],
    metaOrig['icon'],
    metaOrig['apple-touch-icon'],
    metaOrig['apple-touch-icon-precomposed'],
  ]);

  meta.tsManifest = {
    version: 2.0,
  };
  meta.tsExtractedInfo = metaOrig['tsExtractedInfo'];

  return withNameFromAddress(normalizeItemMetaImageUrls(url, meta) || meta);
}

async function parseAllMetadataFromDOM(url: string, document: Document) {
  const metaOrig: Record<string, any> = {};
  const tsExtractedInfo: ItemMetaExtracted = {
    pageType: null,
    youtubeChannelIds: [],
    sourceId: 'parser_1',
  };

  try {
    const standardFeedLinks = extractFeedLinksFromEntries(
      url,
      Array.from(document.querySelectorAll('link[rel][href]')).map(el => ({
        rel: el.getAttribute('rel'),
        type: el.getAttribute('type'),
        href: el.getAttribute('href'),
        title: el.getAttribute('title'),
      }))
    );
    const feedLinks = extractFeedLinksFromAnchors(
      url,
      Array.from(document.querySelectorAll('a[href]')).map(el => ({
        href: el.getAttribute('href'),
        type: el.getAttribute('type'),
        title: el.getAttribute('title'),
        text: el.textContent,
      })),
      standardFeedLinks,
    );
    if (feedLinks.length > 0) {
      tsExtractedInfo.discoveredFeedLinks = feedLinks;
    }

    // Get all meta and link elements with relevant attributes
    const elements = document.querySelectorAll('meta[itemProp], meta[name], meta[property], link[href]');
    
    elements.forEach(el => {
      const contentAttr = el.getAttribute('content');
      if (contentAttr) {
        let attrName = null;
        if (el.getAttribute('itemprop')) {
          attrName = el.getAttribute('itemprop');
        } else if (el.getAttribute('name')) {
          attrName = el.getAttribute('name');
        } else if (el.getAttribute('property')) {
          attrName = el.getAttribute('property');
        }

        if (attrName) {
          metaOrig[attrName] = contentAttr;
        }
      }
    });

    // Extract link[rel] href values (favicons, canonical — these use href not content)
    document.querySelectorAll('link[rel][href]').forEach(el => {
      const rel = (el.getAttribute('rel') || '').toLowerCase().trim();
      const href = el.getAttribute('href');
      if (rel && href && !metaOrig[rel]) {
        metaOrig[rel] = href;
      }
    });

    // Extract JSON-LD structured data as additional fallback sources
    const jsonLdBlocks: any[] = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
      try {
        const text = el.textContent;
        if (!text) return;
        const jsonLd = JSON.parse(text);
        jsonLdBlocks.push(jsonLd);
        const schemas: any[] = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
        for (const schema of schemas) {
          if (!metaOrig['og:image'] && !metaOrig['twitter:image'] && !metaOrig['schema:image']) {
            const img = schema.image || schema.thumbnailUrl || schema.logo;
            const imgUrl = typeof img === 'string' ? img : (img?.url || img?.contentUrl);
            if (imgUrl && typeof imgUrl === 'string') {
              metaOrig['schema:image'] = imgUrl;
            }
          }
          if (!metaOrig.title && !metaOrig['schema:title']) {
            const schemaTitle = schema.name || schema.headline;
            if (schemaTitle && typeof schemaTitle === 'string') {
              metaOrig['schema:title'] = schemaTitle;
            }
          }
          if (!metaOrig.description && !metaOrig['schema:description']) {
            if (schema.description && typeof schema.description === 'string') {
              metaOrig['schema:description'] = schema.description;
            }
          }
        }
      } catch { /* malformed JSON-LD — skip */ }
    });

    // Get title
    const titleElement = document.querySelector('title');
    const titleText = sanitizeExtractedTitle(titleElement?.textContent || '');
    metaOrig.title = isLikelyMetadataNoise(titleText) ? '' : titleText || '';
    metaOrig['heuristic:title'] = getHeuristicTitleFromDOM(document);
    metaOrig['heuristic:description'] = getHeuristicDescriptionFromDOM(document);

    if (isRootWebsiteURL(url)) {
      tsExtractedInfo.pageType = ItemResourceType.SITE_ROOT;
    }

    // does url contain youtube.com
    else if (url.includes('youtube.com')) {
      await extractYTPageInfoFromDOM(document, url, tsExtractedInfo);
    }
    else {
      let urlObj = new URL(url);
      if (urlObj.pathname === '/' || !urlObj.pathname) {
        tsExtractedInfo.pageType = ItemResourceType.SITE_ROOT;
      }
    }

    // Additive recognition (does not override existing pageType unless pageType is null)
    const recognized = recognizePage({ url, meta: metaOrig, document });
    if (recognized) {
      tsExtractedInfo.recognized = recognized;
      if (!tsExtractedInfo.pageType) {
        tsExtractedInfo.pageType = recognizedToItemResourceType(recognized);
      }
    }

    // Same product read as the HTML parser above — the two must never drift.
    const product = extractProductMetadata({ url, jsonLd: jsonLdBlocks, metaTags: metaOrig, siteName: metaOrig['og:site_name'] });
    if (looksLikeProductPage(product, url)) {
      tsExtractedInfo.product = product;
    }
  } catch (err) {
    tsExtractedInfo.message = 'ERROR: ' + err;
  }

  metaOrig.tsExtractedInfo = tsExtractedInfo;
  return metaOrig;
}

async function extractYTPageInfoFromMeta(meta: Record<string, any>, $: any, url: string, tsExtractedInfo: Record<string, any>) {
  try {
    const isYTChannel = checkIfYTChannel(url);
    const isYTVideo = url.includes('youtube.com/watch') || url.includes('youtu.be/');
    let pageType = ItemResourceType.YT_PAGE;
    if (isYTChannel) {
      pageType = ItemResourceType.YT_CHANNEL;
    } else if (isYTVideo) {
      pageType = ItemResourceType.YT_VIDEO;
    }

    tsExtractedInfo.pageType = pageType;
    tsExtractedInfo.youtubeChannelIds = tsExtractedInfo.youtubeChannelIds || [];

    const directChannelId = parseChannelIdFromString(url);
    if (directChannelId && !tsExtractedInfo.youtubeChannelIds.includes(directChannelId)) {
      tsExtractedInfo.youtubeChannelIds.push(directChannelId);
      tsExtractedInfo.channelId = tsExtractedInfo.channelId || directChannelId;
    }

    const directHandleId = parseYTHandleIdFromString(url);
    if (directHandleId) {
      tsExtractedInfo.handleId = tsExtractedInfo.handleId || directHandleId;
    }

    const youtubeChannelUrl = $('span[itemprop="author"] link[itemprop="url"]').attr('href');
    const youtubeChannelId = youtubeChannelUrl != undefined ? parseChannelIdFromString(youtubeChannelUrl) : null;
    const youtubeHandleIdFromAuthor = youtubeChannelUrl != undefined ? parseYTHandleIdFromString(youtubeChannelUrl) : null;


    if (youtubeChannelId && !tsExtractedInfo.youtubeChannelIds.includes(youtubeChannelId)) {
      tsExtractedInfo.youtubeChannelIds.push(youtubeChannelId);
      tsExtractedInfo.channelId = youtubeChannelId;
    }

    if (youtubeHandleIdFromAuthor) {
      tsExtractedInfo.handleId = tsExtractedInfo.handleId || youtubeHandleIdFromAuthor;
    }

    const youtubeChannelName = ($('span[itemprop="author"] link[itemprop="name"]').attr('content') || '').trim();
    if (youtubeChannelName && (youtubeChannelId || youtubeHandleIdFromAuthor)) {
      tsExtractedInfo.channelName = youtubeChannelName;
    }

    const externalChannelIds = await findVariableURLs($, 'externalChannelId');

    // Capture the canonical UC channel id even when a handle is already known.
    // Channel grants match by UC id, so a handle-only channel can't be matched
    // against a video that resolves to its UC id.
    if (externalChannelIds.length == 1 && !!externalChannelIds[0]) {
      const normalizedExternalChannelId = normalizeYouTubeChannelIdentifier(externalChannelIds[0]);
      if (normalizedExternalChannelId) {
        if (!tsExtractedInfo.youtubeChannelIds.includes(normalizedExternalChannelId)) {
          tsExtractedInfo.youtubeChannelIds.push(normalizedExternalChannelId);
        }
        tsExtractedInfo.channelId = normalizedExternalChannelId;
      }
    }

    if (isYTVideo) {
      const videoId = parseYTVideoIdFromString(url);
      if (videoId) {
        tsExtractedInfo.videoId = videoId;
      } else {
        console.warn("Could not extract video ID from URL", url);
      }
    }

    // if youtube channel
    else if (isYTChannel) {
      const datamatch = $('link[rel="alternate"][media="handheld"]');
      if (datamatch.length > 0) {
        console.error("Multiple matches for link[rel='alternate'][media='handheld']");
      }

      const youtubeChannelURLFromHref = datamatch.attr('href');

      if (youtubeChannelURLFromHref) {

        if (!tsExtractedInfo.channelId) {
          const youtubeChannelIdOtherURL = parseChannelIdFromString(youtubeChannelURLFromHref);
          if (youtubeChannelIdOtherURL && !tsExtractedInfo.youtubeChannelIds.includes(youtubeChannelIdOtherURL)) {
            tsExtractedInfo.youtubeChannelIds.push(youtubeChannelIdOtherURL);
          }
        }

        const youtubeHandleId = parseYTHandleIdFromString(youtubeChannelURLFromHref);
        if (youtubeHandleId) tsExtractedInfo.handleId = youtubeHandleId;

      }
    }
  }
  catch (err) {
    console.error('Error extracting page info:', err);
  }
  return tsExtractedInfo;
}

async function extractYTPageInfoFromDOM(document: Document, url: string, tsExtractedInfo: Record<string, any>) {
  try {
    const isYTChannel = checkIfYTChannel(url);
    const isYTVideo = url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/embed/');
    let pageType = ItemResourceType.YT_PAGE;
    if (isYTChannel) {
      pageType = ItemResourceType.YT_CHANNEL;
    } else if (isYTVideo) {
      pageType = ItemResourceType.YT_VIDEO;
    }

    tsExtractedInfo.pageType = pageType;
    tsExtractedInfo.youtubeChannelIds = tsExtractedInfo.youtubeChannelIds || [];

    const directChannelId = parseChannelIdFromString(url);
    if (directChannelId && !tsExtractedInfo.youtubeChannelIds.includes(directChannelId)) {
      tsExtractedInfo.youtubeChannelIds.push(directChannelId);
      tsExtractedInfo.channelId = tsExtractedInfo.channelId || directChannelId;
    }

    const directHandleId = parseYTHandleIdFromString(url);
    if (directHandleId) {
      tsExtractedInfo.handleId = tsExtractedInfo.handleId || directHandleId;
    }

    // Find YouTube channel URL from structured data
    const authorSpan = document.querySelector('span[itemprop="author"] link[itemprop="url"]');
    const youtubeChannelUrl = authorSpan?.getAttribute('href');
    const youtubeChannelId = youtubeChannelUrl ? parseChannelIdFromString(youtubeChannelUrl) : null;
    const youtubeHandleIdFromAuthor = youtubeChannelUrl ? parseYTHandleIdFromString(youtubeChannelUrl) : null;

    // The name is a sibling `<link itemprop="name" content>`, not the url link's text.
    const youtubeChannelName = (
      document.querySelector('span[itemprop="author"] link[itemprop="name"]')?.getAttribute('content') || ''
    ).trim();

    if (youtubeChannelId && !tsExtractedInfo.youtubeChannelIds.includes(youtubeChannelId)) {
      tsExtractedInfo.youtubeChannelIds.push(youtubeChannelId);
      tsExtractedInfo.channelId = youtubeChannelId;
    }

    if (youtubeHandleIdFromAuthor) {
      tsExtractedInfo.handleId = tsExtractedInfo.handleId || youtubeHandleIdFromAuthor;
    }

    if (youtubeChannelName && (youtubeChannelId || youtubeHandleIdFromAuthor)) {
      tsExtractedInfo.channelName = youtubeChannelName;
    }

    const externalChannelIds = await findVariableURLsInDOM(document, 'externalChannelId');

    if (externalChannelIds.length == 1 && !tsExtractedInfo.handleId && !!externalChannelIds[0]) {
      const normalizedExternalChannelId = normalizeYouTubeChannelIdentifier(externalChannelIds[0]);
      if (normalizedExternalChannelId && !tsExtractedInfo.youtubeChannelIds.includes(normalizedExternalChannelId)) {
        tsExtractedInfo.youtubeChannelIds.push(normalizedExternalChannelId);
      }
      tsExtractedInfo.channelId = normalizedExternalChannelId;
    }

    if (isYTVideo) {
      const videoId = parseYTVideoIdFromString(url);
      if (videoId) {
        tsExtractedInfo.videoId = videoId;
      } else {
        console.warn("Could not extract video ID from URL", url);
      }
    }

    // if youtube channel
    else if (isYTChannel) {
      const datamatch = document.querySelectorAll('link[rel="alternate"][media="handheld"]');
      if (datamatch.length > 1) {
        console.error("Multiple matches for link[rel='alternate'][media='handheld']");
      }

      const youtubeChannelURLFromHref = datamatch[0]?.getAttribute('href');

      if (youtubeChannelURLFromHref) {
        if (!tsExtractedInfo.channelId) {
          const youtubeChannelIdOtherURL = parseChannelIdFromString(youtubeChannelURLFromHref);
          if (youtubeChannelIdOtherURL && !tsExtractedInfo.youtubeChannelIds.includes(youtubeChannelIdOtherURL)) {
            tsExtractedInfo.youtubeChannelIds.push(youtubeChannelIdOtherURL);
          }
        }

        const youtubeHandleId = parseYTHandleIdFromString(youtubeChannelURLFromHref);
        if (youtubeHandleId) tsExtractedInfo.handleId = youtubeHandleId;
      }
    }
  }
  catch (err) {
    console.error('Error extracting page info:', err);
  }
  return tsExtractedInfo;
}

async function findVariableURLsInDOM(document: Document, variable: string = 'canonicalBaseUrl') {
  const results: Set<string> = new Set();
  const regex = new RegExp(`"${variable}":"(.*?)"`, 'g');
  
  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    const scriptContent = script.innerHTML;
    if (!scriptContent) {
      return;
    }

    let match;
    while ((match = regex.exec(scriptContent)) !== null) {
      results.add(match[1]);
    }
  });

  return Array.from(results);
}

//TODO: rename some of this

async function parseAllMetadata(url: string, data: any) {
  const metaOrig: Record<string, any> = {};
  const tsExtractedInfo: ItemMetaExtracted = {
    pageType: null,
    youtubeChannelIds: [],

    sourceId: 'parser_1',
  };

  try {
    const $ = cheerio.load(data);
    const standardFeedLinks = extractFeedLinksFromEntries(
      url,
      $('link[rel][href]').toArray().map((el) => ({
        rel: el.attribs['rel'],
        type: el.attribs['type'],
        href: el.attribs['href'],
        title: el.attribs['title'],
      }))
    );
    const feedLinks = extractFeedLinksFromAnchors(
      url,
      $('a[href]').toArray().map((el) => ({
        href: el.attribs['href'],
        type: el.attribs['type'],
        title: el.attribs['title'],
        text: $(el).text(),
      })),
      standardFeedLinks,
    );
    if (feedLinks.length > 0) {
      tsExtractedInfo.discoveredFeedLinks = feedLinks;
    }

    //get everything, not just meta//
    const els = $('meta[itemProp],meta[name],meta[property],link[href]').toArray();
    //
    //   const els = $("*").toArray();
    for (const el of els) {
      if ('content' in el.attribs) {
        let attrName = null;
        if (el.attribs['itemprop']) {
          attrName = el.attribs['itemprop'];
        } else if (el.attribs['name']) {
          attrName = el.attribs['name'];
        } else if (el.attribs['property']) {
          attrName = el.attribs['property'];
        }

        if (attrName) {
          metaOrig[attrName] = el.attribs['content'];
        }
      }
    }

    // Extract link[rel] href values (favicons, canonical — these use href not content)
    $('link[rel][href]').each((_, el) => {
      const rel = (el.attribs['rel'] || '').toLowerCase().trim();
      const href = el.attribs['href'];
      if (rel && href && !metaOrig[rel]) {
        metaOrig[rel] = href;
      }
    });

    // Extract JSON-LD structured data as additional fallback sources
    const jsonLdBlocks: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html();
        if (!text) return;
        const jsonLd = JSON.parse(text);
        jsonLdBlocks.push(jsonLd);
        const schemas: any[] = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
        for (const schema of schemas) {
          if (!metaOrig['og:image'] && !metaOrig['twitter:image'] && !metaOrig['schema:image']) {
            const img = schema.image || schema.thumbnailUrl || schema.logo;
            const imgUrl = typeof img === 'string' ? img : (img?.url || img?.contentUrl);
            if (imgUrl && typeof imgUrl === 'string') {
              metaOrig['schema:image'] = imgUrl;
            }
          }
          if (!metaOrig.title && !metaOrig['schema:title']) {
            const schemaTitle = schema.name || schema.headline;
            if (schemaTitle && typeof schemaTitle === 'string') {
              metaOrig['schema:title'] = schemaTitle;
            }
          }
          if (!metaOrig.description && !metaOrig['schema:description']) {
            if (schema.description && typeof schema.description === 'string') {
              metaOrig['schema:description'] = schema.description;
            }
          }
        }
      } catch { /* malformed JSON-LD — skip */ }
    });

    const titleText = sanitizeExtractedTitle($('title').text());
    metaOrig.title = isLikelyMetadataNoise(titleText) ? '' : titleText || '';
    metaOrig['heuristic:title'] = getHeuristicTitleFromHtml($);
    metaOrig['heuristic:description'] = getHeuristicDescriptionFromHtml($);


    if (isRootWebsiteURL(url)) {
      tsExtractedInfo.pageType = ItemResourceType.SITE_ROOT;
    }

    // does url container youtube.com
    else if (url.includes('youtube.com')) {
      await extractYTPageInfoFromMeta(metaOrig, $, url, tsExtractedInfo);
    }
    else {
      let urlObj = new URL(url);
      if (urlObj.pathname === '/' || !urlObj.pathname) {
        tsExtractedInfo.pageType = ItemResourceType.SITE_ROOT;
      }
    }

    // Additive recognition (does not override existing pageType unless pageType is null)
    const recognized = recognizePage({ url, meta: metaOrig, html: typeof data === 'string' ? data : null });
    if (recognized) {
      tsExtractedInfo.recognized = recognized;
      if (!tsExtractedInfo.pageType) {
        tsExtractedInfo.pageType = recognizedToItemResourceType(recognized);
      }
    }

    // What the page says about the product on it, if it is one. Additive: a page that is not a
    // product leaves this absent, and a product page with no readable price still says so.
    const product = extractProductMetadata({ url, jsonLd: jsonLdBlocks, metaTags: metaOrig, siteName: metaOrig['og:site_name'] });
    if (looksLikeProductPage(product, url)) {
      tsExtractedInfo.product = product;
    }
  } catch (err) {
    tsExtractedInfo.message = 'ERROR: ' + err;
  }

  metaOrig.tsExtractedInfo = tsExtractedInfo;
  return metaOrig;
}


async function findVariableURLs($: cheerio.CheerioAPI, variable: string = 'canonicalBaseUrl') {
  const results: Set<string> = new Set();
  const regex = new RegExp(`"${variable}":"(.*?)"`, 'g');
  $('script').each(function () {
    const scriptContent = $(this).html();
    if (!scriptContent) {
      return;
    }

    let match;
    while ((match = regex.exec(scriptContent)) !== null) {
      results.add(match[1]);
    }
  });

  return Array.from(results);
}
