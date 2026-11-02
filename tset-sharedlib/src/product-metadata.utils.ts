/**
 * Reading a product off the page someone is looking at.
 *
 * Every field here comes from the open page, on the person's own device — never from a fetch our
 * server makes. Amazon blocks the server outright, and the server's page cache is shared by every
 * family for 30 days (`cache.types.ts` AMAZON_BOOK), so a price it fetched would be one family's
 * price shown to another, hours or weeks late.
 *
 * Most stores publish nothing we can read, so **every field is optional and a product with no
 * price is still a product** (shopping-cart.md decision 9). The one thing that is never optional
 * is `seenAt`: a price with no capture time is worthless a week later (decision 12).
 */

/** Where an identifier came from, best first: an ASIN matches the same product across Amazon links. */
export type ProductIdentifierKind = 'asin' | 'gtin' | 'sku' | 'mpn';

export interface ProductIdentifier {
  kind: ProductIdentifierKind;
  value: string;
}

export interface ProductMetadata {
  /** A number in the store's own currency, never a formatted string. */
  price?: number;
  /** ISO 4217 where the page gave one, e.g. "USD". */
  currency?: string;
  /** The shop's name as a person would say it: "Amazon", "Target". */
  store?: string;
  /**
   * What kind of thing this is — "headphones", "tumbler", "building set". Free text on purpose:
   * not an item type and not a taxonomy (decision 13). It is what the cart orders on.
   */
  productType?: string;
  identifier?: ProductIdentifier;
  /** schema.org availability, trimmed of its URL prefix: "InStock", "OutOfStock". */
  availability?: string;
  /** ISO timestamp of when the page was read. Always written with a price. */
  seenAt?: string;
}

/** One past price, newest first in `priceHistory`. */
export interface ProductPricePoint {
  price: number;
  currency?: string;
  seenAt: string;
}

const MAX_TEXT = 200;
const ASIN_RE = /^[A-Z0-9]{10}$/i;

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_TEXT ? trimmed.slice(0, MAX_TEXT).trim() : trimmed;
}

/** The first number in a price string, with the characters stores group digits with. */
const FIRST_PRICE_RUN = /\.?\d[\d.,'\u00a0\u202f ]*/;

/**
 * "$348.00" → 348, "1 234,56 €" → 1234.56, "Free" → undefined.
 *
 * For a price a site PUBLISHED — schema.org `offer.price`, `og:price:amount`. Both define the
 * dot as the decimal separator with no thousands grouping, so the rule is only which separator
 * comes last: "1.234,56" and "1,234.56" are the same number written by different countries.
 */
export function parsePriceValue(raw: unknown): number | undefined {
  return readPrice(raw, false);
}

/**
 * The same, for a price read off the page rather than published — a price tag, not a field.
 *
 * Screen text is where thousands grouping lives: "￥1,299" is 1299, and reading it as a decimal
 * put a ¥1.30 tumbler at the top of "Cheapest first". A published price is never written that
 * way, and guessing grouping there turns a valid "45.000" into 45000, so only this one guesses.
 */
export function parseOnScreenPriceValue(raw: unknown): number | undefined {
  return readPrice(raw, true);
}

function readPrice(raw: unknown, fromScreen: boolean): number | undefined {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : undefined;
  if (typeof raw !== 'string') return undefined;

  // Take the first number only. "$10 - $20" is a range, and running the whole string together
  // read it as 1020 — a number that is not on the page, in a cart that adds prices up.
  const run = raw.match(FIRST_PRICE_RUN);
  const digits = (run ? run[0] : '').replace(/[^0-9.,]/g, '');
  if (!digits) return undefined;

  const lastDot = digits.lastIndexOf('.');
  const lastComma = digits.lastIndexOf(',');
  let normalized: string;

  if (lastDot === -1 && lastComma === -1) {
    normalized = digits;
  } else if (fromScreen && isGroupedThousands(digits)) {
    // One separator, three digits after it, nothing before it that makes it a decimal point:
    // that is a thousands separator, whichever character it is.
    normalized = digits.replace(/[.,]/g, '');
  } else if (lastComma > lastDot) {
    // Comma is the decimal separator: strip dots, swap the comma.
    normalized = digits.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = digits.replace(/,/g, '');
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * The currency a price was written in — "$348.00" → USD, "1 234,56 €" → EUR.
 *
 * Only for a price read off the screen, where no `priceCurrency` was published beside it. The
 * ambiguous symbols are deliberately left unanswered: "$" is used by a dozen countries, so a
 * bare one is read as USD only because that is what the store's own English page usually means,
 * while "kr" and "£"-like glyphs that several currencies share return nothing rather than guess.
 */
export function currencyFromPriceText(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;

  const code = raw.toUpperCase().match(/\b(USD|EUR|GBP|CAD|AUD|JPY|CHF|SEK|NOK|DKK|INR|MXN|BRL|PLN)\b/);
  if (code) return code[1];

  if (raw.includes('€')) return 'EUR';
  if (raw.includes('£')) return 'GBP';
  // Amazon JP writes the full-width ￥ (U+FFE5), not the ¥ (U+00A5) everyone assumes.
  if (raw.includes('¥') || raw.includes('￥')) return 'JPY';
  if (raw.includes('₹')) return 'INR';
  if (raw.includes('$')) return 'USD';
  return undefined;
}

/**
 * Is every separator here grouping digits rather than marking a decimal?
 *
 * A price never has three digits after its decimal point, so a lone separator followed by
 * exactly three digits is grouping — and so is a run of them ("1,29,990" as India writes it,
 * "1.234.567" as Germany does). Two *different* separators mean the last one is the decimal,
 * which the caller already handles.
 */
function isGroupedThousands(digits: string): boolean {
  if (digits.includes('.') && digits.includes(',')) return false;
  const separator = digits.includes(',') ? ',' : '.';
  const parts = digits.split(separator);
  if (parts.length < 2) return false;
  // A leading group of 1-3 digits, then groups of exactly 3. India's 1,29,990 breaks the
  // "always three" rule in the middle, so only the LAST group has to be three.
  //
  // The leading group is never a zero: nobody writes 750 as "0,750", so a price that starts
  // that way is a decimal with three places -- "$0.750" is 75 cents, and reading it as grouping
  // made it $750.
  if (!/^[1-9]\d{0,2}$/.test(parts[0])) return false;
  return parts.slice(1).every((part) => /^\d{2,3}$/.test(part)) && /^\d{3}$/.test(parts[parts.length - 1]);
}

function cleanCurrency(raw: unknown): string | undefined {
  const text = cleanText(raw);
  if (!text) return undefined;
  const code = text.toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : undefined;
}

function cleanAvailability(raw: unknown): string | undefined {
  const text = cleanText(raw);
  if (!text) return undefined;
  // schema.org writes these as "https://schema.org/InStock".
  const tail = text.split('/').pop();
  return cleanText(tail);
}

/** The ASIN in an Amazon URL, which is the one identifier that matches across Amazon's own links. */
export function asinFromUrl(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (!/(^|\.)amazon\.[a-z.]{2,}$/i.test(parsed.hostname)) return undefined;

  const parts = parsed.pathname.split('/').filter(Boolean);
  const marker = parts.findIndex((part) => /^(dp|product)$/i.test(part));
  const candidate = (marker >= 0 ? parts[marker + 1] : undefined) || parsed.searchParams.get('asin') || undefined;
  return candidate && ASIN_RE.test(candidate) ? candidate.toUpperCase() : undefined;
}

/** The shop's name from its host: "www.target.com" → "Target". Used when the page names no site. */
export function storeNameFromUrl(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const host = parsed.hostname.replace(/^www\./i, '');
  const label = host.split('.')[0];
  if (!label) return undefined;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function typeNames(node: any): string[] {
  const raw = node?.['@type'];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string');
  return [];
}

function isProductNode(node: any): boolean {
  return typeNames(node).some((name) => /^(Product|ProductGroup|IndividualProduct|Vehicle)$/i.test(name));
}

/**
 * Walks JSON-LD the way stores actually write it: a bare object, an array, or `@graph` — which
 * the page metadata parser has never descended into, so a product inside one was invisible.
 */
function collectNodes(input: unknown, depth = 0): any[] {
  if (!input || depth > 4) return [];
  if (Array.isArray(input)) return input.flatMap((entry) => collectNodes(entry, depth + 1));
  if (typeof input !== 'object') return [];

  const node = input as Record<string, unknown>;
  const nested = Array.isArray(node['@graph']) ? collectNodes(node['@graph'], depth + 1) : [];
  return [node, ...nested];
}

function offersOf(node: any): any[] {
  const offers = node?.offers;
  if (!offers) return [];
  const list = Array.isArray(offers) ? offers : [offers];
  // An AggregateOffer carries the range instead of a price.
  return list.flatMap((offer: any) => {
    if (!offer || typeof offer !== 'object') return [];
    const inner = Array.isArray(offer.offers) ? offer.offers : [];
    return [offer, ...inner];
  });
}

function identifierOf(node: any): ProductIdentifier | undefined {
  const gtin = cleanText(node?.gtin13 || node?.gtin12 || node?.gtin8 || node?.gtin14 || node?.gtin);
  if (gtin) return { kind: 'gtin', value: gtin };
  const sku = cleanText(node?.sku);
  if (sku) return { kind: 'sku', value: sku };
  const mpn = cleanText(node?.mpn);
  if (mpn) return { kind: 'mpn', value: mpn };
  return undefined;
}

function categoryOf(node: any): string | undefined {
  const raw = node?.category;
  const text = cleanText(typeof raw === 'object' && raw ? (raw as any).name : raw);
  if (!text) return undefined;
  // "Electronics > Audio > Headphones" — the leaf is the useful half.
  const leaf = text.split(/\s*[>/|›]\s*/).filter(Boolean).pop();
  return cleanText(leaf) || text;
}

/** Reads the first `Product` in one or more JSON-LD blocks. Returns {} when there is none. */
export function readProductFromJsonLd(blocks: unknown[]): ProductMetadata {
  const nodes = (blocks || []).flatMap((block) => collectNodes(block));
  const product = nodes.find(isProductNode);
  if (!product) return {};

  const result: ProductMetadata = {};

  const productType = categoryOf(product);
  if (productType) result.productType = productType;

  const identifier = identifierOf(product);
  if (identifier) result.identifier = identifier;

  // The cheapest offer is the one a person would act on, and it is what the page leads with.
  let bestPrice: number | undefined;
  let bestCurrency: string | undefined;
  let availability: string | undefined;

  for (const offer of offersOf(product)) {
    const price = parsePriceValue(offer.price ?? offer.lowPrice ?? offer.highPrice);
    const currency = cleanCurrency(offer.priceCurrency);
    if (!availability) availability = cleanAvailability(offer.availability);
    if (price === undefined) continue;
    if (bestPrice === undefined || price < bestPrice) {
      bestPrice = price;
      bestCurrency = currency;
    }
  }

  if (bestPrice !== undefined) result.price = bestPrice;
  if (bestCurrency) result.currency = bestCurrency;
  if (availability) result.availability = availability;

  const seller = cleanText(offersOf(product).find((offer) => offer?.seller?.name)?.seller?.name);
  if (seller) result.store = seller;

  return result;
}

/**
 * The price tags every page metadata parser in this repo has collected and thrown away:
 * `og:price:amount`, `product:price:amount` and their currency twins.
 */
export function readProductFromMetaTags(metaTags: Record<string, unknown> | null | undefined): ProductMetadata {
  if (!metaTags) return {};
  const result: ProductMetadata = {};

  const price = parsePriceValue(metaTags['product:price:amount'] ?? metaTags['og:price:amount']);
  if (price !== undefined) result.price = price;

  const currency = cleanCurrency(metaTags['product:price:currency'] ?? metaTags['og:price:currency']);
  if (currency) result.currency = currency;

  const availability = cleanAvailability(metaTags['product:availability'] ?? metaTags['og:availability']);
  if (availability) result.availability = availability;

  const store = cleanText(metaTags['og:site_name']);
  if (store) result.store = store;

  const identifier = cleanText(metaTags['product:retailer_item_id']);
  if (identifier) result.identifier = { kind: 'sku', value: identifier };

  return result;
}

/**
 * Everything the open page says about the product, merged best-source-first:
 * JSON-LD, then the price meta tags, then what the URL itself tells us.
 */
export function extractProductMetadata(input: {
  url: string;
  jsonLd?: unknown[];
  metaTags?: Record<string, unknown> | null;
  siteName?: string | null;
  now?: Date;
}): ProductMetadata {
  const fromJsonLd = readProductFromJsonLd(input.jsonLd || []);
  const fromMeta = readProductFromMetaTags(input.metaTags);

  const result: ProductMetadata = {
    ...fromMeta,
    ...fromJsonLd,
  };

  // A currency belongs to the price it came with, so never mix one source's price with another's.
  if (fromJsonLd.price === undefined && fromMeta.price !== undefined) {
    result.price = fromMeta.price;
    result.currency = fromMeta.currency;
  }

  const asin = asinFromUrl(input.url);
  if (asin && !result.identifier) result.identifier = { kind: 'asin', value: asin };

  if (!result.store) {
    result.store = cleanText(input.siteName) || storeNameFromUrl(input.url);
  }

  if (result.price !== undefined) {
    result.seenAt = (input.now || new Date()).toISOString();
  }

  return result;
}

/**
 * Is this page a product? A price or a product identifier says yes on its own; an Amazon product
 * URL says yes even when the page gives neither, which is the usual case there.
 */
/**
 * Reads a product out of an already-parsed page.
 *
 * For a page fetched on the device and run through `DOMParser` — checking a cart's prices
 * without leaving the cart. The extension popup's own read cannot use this: its reader is
 * injected into the page and is serialized to get there, so no import reaches it. Both ask the
 * same questions of the page, and both end at `extractProductMetadata`.
 */
export function readProductFromDocument(doc: Document, url: string, now?: Date): ProductMetadata {
  const metaTags: Record<string, string> = {};
  const wanted = [
    'product:price:amount',
    'product:price:currency',
    'og:price:amount',
    'og:price:currency',
    'product:availability',
    'og:availability',
    'og:site_name',
    'og:type',
  ];
  for (const name of wanted) {
    const el =
      doc.querySelector(`meta[property="${name}"]`) || doc.querySelector(`meta[name="${name}"]`);
    const value = (el as HTMLMetaElement | null)?.content;
    if (value) metaTags[name] = value;
  }

  const jsonLd: unknown[] = [];
  const blocks = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).slice(0, 12);
  for (const block of blocks) {
    const text = block.textContent || '';
    if (!text || text.length > 200000) continue;
    try {
      jsonLd.push(JSON.parse(text));
    } catch {
      // One store's malformed block is not a reason to read nothing.
    }
  }

  const product = extractProductMetadata({ url, jsonLd, metaTags, siteName: metaTags['og:site_name'], now });

  // Amazon publishes neither a Product block nor price tags, so without this the store the
  // whole feature was built around could never have its price checked. Same selectors the
  // extension and iOS read in the live page; a published price always wins.
  if (product.price === undefined && isAmazonUrl(url)) {
    const onScreen = priceTextFromDocument(doc);
    const value = parseOnScreenPriceValue(onScreen);
    if (value !== undefined) {
      product.price = value;
      product.currency = product.currency || currencyFromPriceText(onScreen);
      product.seenAt = (now || new Date()).toISOString();
    }
  }

  return product;
}

/** The price Amazon only ever shows on screen, from its own accessibility markup. */
/**
 * Where Amazon keeps the price, most specific first. The one source of truth: the extension gets
 * this list passed into its injected function, and `AmazonPriceSelectors.test.ts` holds the iOS
 * copy to it, because that one cannot import.
 *
 * Amazon publishes no JSON-LD Product and no price meta tag, so reading the page is the only way.
 *
 * Every id here used to end in `_desktop_feature_div` or `_ourprice`, which is why the price never
 * appeared on a phone: Amazon's phone layout uses different containers, and the iOS bridge only
 * ever sees that layout. The `.a-price` fallbacks are last and deliberately narrow — they skip
 * `.a-text-price`, which is the struck-through "List:" price sitting right beside the real one.
 */
export const AMAZON_PRICE_SELECTORS = [
  '#corePrice_feature_div .a-offscreen',
  '#corePriceDisplay_desktop_feature_div .a-offscreen',
  '#corePriceDisplay_mobile_feature_div .a-offscreen',
  '#apex_desktop .a-offscreen',
  '#apex_offerDisplay_mobile_feature_div .a-offscreen',
  '#price_inside_buybox',
  '#priceblock_ourprice',
  '#priceblock_dealprice',
  '#ppd .a-price:not(.a-text-price) .a-offscreen',
  '#centerCol .a-price:not(.a-text-price) .a-offscreen',
];

/**
 * Where Amazon keeps the product picture, most specific first. Same contract as
 * `AMAZON_PRICE_SELECTORS`: passed into the extension's injected function, held to the iOS copy
 * by `AmazonSelectors.test.ts`.
 *
 * Amazon's `og:image` is the Amazon logo, not the product, so on Amazon the page beats the tag.
 */
export const AMAZON_IMAGE_SELECTORS = [
  '#landingImage',
  '#imgTagWrapperId img',
  '#main-image-container img',
  '#imgBlkFront',
  '#ebooksImgBlkFront',
  '#main-image',
];

/** The three attributes an Amazon product image can carry, read straight off the element. */
export interface RawPageImage {
  src?: string | null;
  /** `data-old-hires` — the full-size file, when Amazon has one. */
  oldHires?: string | null;
  /** `data-a-dynamic-image` — a JSON map of url to [width, height]. */
  dynamic?: string | null;
}

/**
 * The biggest picture the page offers.
 *
 * The page hands over raw attributes and the choosing happens here, so the injected function and
 * the iOS bridge only have to collect three strings -- neither can import, and logic copied into
 * both is what made the price selectors rot.
 */
export function pickAmazonImage(raw: RawPageImage | string | null | undefined): string | undefined {
  if (!raw) return undefined;

  // iOS sends it as one JSON string: a nested object does not survive the WKWebView bridge,
  // which is why `jsonLd` crosses the same way.
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as RawPageImage;
    } catch {
      return undefined;
    }
    if (!raw || typeof raw !== 'object') return undefined;
  }

  const hires = cleanText(raw.oldHires);
  if (hires) return hires;

  const dynamic = typeof raw.dynamic === 'string' ? raw.dynamic : '';
  if (dynamic) {
    try {
      const byUrl = JSON.parse(dynamic) as Record<string, unknown>;
      let best: string | undefined;
      let bestWidth = -1;
      for (const [url, size] of Object.entries(byUrl || {})) {
        // Amazon writes the size as an array on a product page and as a string of one on others.
        const pair = typeof size === 'string' ? JSON.parse(size) : size;
        const width = Array.isArray(pair) ? Number(pair[0]) : NaN;
        if (url && Number.isFinite(width) && width > bestWidth) {
          bestWidth = width;
          best = url;
        }
      }
      if (best) return best;
    } catch {
      // A shape we do not know is not a reason to lose the `src` below.
    }
  }

  return cleanText(raw.src);
}

/** The raw attributes off the first image selector that matches. */
export function rawImageFromDocument(doc: Document): RawPageImage | undefined {
  for (const selector of AMAZON_IMAGE_SELECTORS) {
    const el = doc.querySelector(selector);
    if (!el) continue;
    const raw: RawPageImage = {
      src: el.getAttribute('src'),
      oldHires: el.getAttribute('data-old-hires'),
      dynamic: el.getAttribute('data-a-dynamic-image'),
    };
    if (raw.src || raw.oldHires || raw.dynamic) return raw;
  }
  return undefined;
}

function priceTextFromDocument(doc: Document): string | undefined {
  for (const selector of AMAZON_PRICE_SELECTORS) {
    const text = (doc.querySelector(selector)?.textContent || '').trim();
    if (text) return text;
  }
  return undefined;
}

function isAmazonUrl(url: string): boolean {
  try {
    return /(^|\.)amazon\.[a-z.]{2,}$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function looksLikeProductPage(product: ProductMetadata | null | undefined, url: string): boolean {
  if (product?.price !== undefined) return true;
  if (product?.identifier) return true;
  return !!asinFromUrl(url);
}

const MAX_PRICE_HISTORY = 24;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Adds a price to the history, newest first.
 *
 * Only when it says something new — a different price, or a day has passed — and never more than
 * {@link MAX_PRICE_HISTORY} entries, because this rides inside the item's encrypted `info` and a
 * product someone checks every day would otherwise grow without limit.
 */
export function appendPricePoint(
  history: ProductPricePoint[] | null | undefined,
  point: ProductPricePoint,
): ProductPricePoint[] {
  const existing = Array.isArray(history) ? history.filter((entry) => typeof entry?.price === 'number' && !!entry?.seenAt) : [];
  const newest = existing[0];

  if (newest) {
    const samePrice = newest.price === point.price && (newest.currency || '') === (point.currency || '');
    const age = new Date(point.seenAt).getTime() - new Date(newest.seenAt).getTime();
    if (samePrice && Number.isFinite(age) && age < ONE_DAY_MS) return existing;
  }

  return [point, ...existing].slice(0, MAX_PRICE_HISTORY);
}
