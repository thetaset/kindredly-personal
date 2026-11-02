import { extractMetadata } from '../src/extraction.utils';
import {
  appendPricePoint,
  asinFromUrl,
  currencyFromPriceText,
  extractProductMetadata,
  looksLikeProductPage,
  parsePriceValue,
  parseOnScreenPriceValue,
  readProductFromJsonLd,
  readProductFromMetaTags,
  storeNameFromUrl,
} from '../src/product-metadata.utils';

describe('parsePriceValue', () => {
  it('reads the ways stores write a price', () => {
    expect(parsePriceValue('$348.00')).toBe(348);
    expect(parsePriceValue('348.00')).toBe(348);
    expect(parsePriceValue(348)).toBe(348);
    expect(parsePriceValue('1,234.56')).toBe(1234.56);
    expect(parsePriceValue('1.234,56 €')).toBe(1234.56);
    expect(parsePriceValue('USD 45')).toBe(45);
  });

  // A price never has three digits after its decimal point, so a lone separator followed by
  // exactly three is grouping. Amazon JP writes "￥1,299" with no minor units at all.
  it('reads a lone thousands separator as grouping, not as a decimal point', () => {
    expect(parseOnScreenPriceValue('￥1,299')).toBe(1299);
    expect(parseOnScreenPriceValue('$1,299')).toBe(1299);
    expect(parseOnScreenPriceValue('1.299 €')).toBe(1299);
    expect(parseOnScreenPriceValue('₹1,29,990')).toBe(129990);
    expect(parseOnScreenPriceValue('1.234.567')).toBe(1234567);
  });

  it('still reads two digits after a separator as the decimal part', () => {
    expect(parsePriceValue('$12.50')).toBe(12.5);
    expect(parsePriceValue('12,50 €')).toBe(12.5);
    expect(parsePriceValue('1,234.56')).toBe(1234.56);
    expect(parsePriceValue('1.234,56 €')).toBe(1234.56);
  });

  // The grouping rule went too far on its own: "0,750" is not how anyone writes 750, so a
  // leading zero means three decimal places, and reading it as grouping made 75 cents $750.
  it('reads a leading zero as a decimal point, not a thousands separator', () => {
    expect(parseOnScreenPriceValue('$0.750')).toBe(0.75);
    expect(parseOnScreenPriceValue('0,500 €')).toBe(0.5);
    expect(parseOnScreenPriceValue('$0.999')).toBe(0.999);
    expect(parseOnScreenPriceValue('$0.99')).toBe(0.99);
  });

  // schema.org and og:price both define the dot as the decimal separator with no grouping, so
  // guessing grouping on a PUBLISHED price turns a valid 45 into 45000. Only screen text guesses.
  it('never guesses grouping on a price the site published', () => {
    expect(parsePriceValue('45.000')).toBe(45);
    expect(parsePriceValue('1.299')).toBe(1.299);
    expect(parseOnScreenPriceValue('1.299')).toBe(1299);
  });

  // A range is two prices. Run together it produced a number that is on no page at all, in a
  // cart that adds prices up.
  it('takes the first price out of a range', () => {
    expect(parseOnScreenPriceValue('$10 - $20')).toBe(10);
    expect(parseOnScreenPriceValue('$10.00 - $20.00')).toBe(10);
    expect(parseOnScreenPriceValue('$1,299 - $1,499')).toBe(1299);
    expect(parseOnScreenPriceValue('1.299 € – 1.499 €')).toBe(1299);
  });

  // Prices that carry their own separators must survive the same pass.
  it('still reads a price written with spaces or apostrophes', () => {
    expect(parseOnScreenPriceValue('1 234,56 €')).toBe(1234.56);
    expect(parseOnScreenPriceValue("CHF 1'299.00")).toBe(1299);
    expect(parseOnScreenPriceValue("CHF 1'299.-")).toBe(1299);
    expect(parseOnScreenPriceValue('.99')).toBe(0.99);
  });

  it('refuses what is not a price', () => {
    expect(parsePriceValue('Free')).toBeUndefined();
    expect(parsePriceValue('')).toBeUndefined();
    expect(parsePriceValue(null)).toBeUndefined();
    expect(parsePriceValue(-5)).toBeUndefined();
  });
});

// Only used for a price read off the screen, where the page published no priceCurrency —
// Amazon being the case that forces it.
describe('currencyFromPriceText', () => {
  it('reads a written code before anything else', () => {
    expect(currencyFromPriceText('CAD 52.99')).toBe('CAD');
    expect(currencyFromPriceText('45.00 usd')).toBe('USD');
  });

  it('reads the common symbols', () => {
    expect(currencyFromPriceText('$348.00')).toBe('USD');
    expect(currencyFromPriceText('1.234,56 €')).toBe('EUR');
    expect(currencyFromPriceText('£19.99')).toBe('GBP');
    expect(currencyFromPriceText('¥2,400')).toBe('JPY');
  });

  it('knows the full-width yen Amazon JP uses', () => {
    expect(currencyFromPriceText('￥1,299')).toBe('JPY');
  });

  it('says nothing rather than guess', () => {
    expect(currencyFromPriceText('349 kr')).toBeUndefined();
    expect(currencyFromPriceText('45.00')).toBeUndefined();
    expect(currencyFromPriceText(45 as any)).toBeUndefined();
    expect(currencyFromPriceText(null)).toBeUndefined();
  });
});

describe('readProductFromJsonLd', () => {
  it('reads a plain Product block', () => {
    const result = readProductFromJsonLd([
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Soundcore Space Q45',
        category: 'Electronics > Audio > Headphones',
        gtin13: '0194644103606',
        offers: {
          '@type': 'Offer',
          price: '99.99',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
      },
    ]);

    expect(result.price).toBe(99.99);
    expect(result.currency).toBe('USD');
    expect(result.availability).toBe('InStock');
    expect(result.productType).toBe('Headphones');
    expect(result.identifier).toEqual({ kind: 'gtin', value: '0194644103606' });
  });

  it('finds a Product inside @graph, which the page parser never walked', () => {
    const result = readProductFromJsonLd([
      {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: 'Not the product' },
          { '@type': ['Product'], name: 'Stanley Quencher', offers: { price: 45, priceCurrency: 'USD' } },
        ],
      },
    ]);

    expect(result.price).toBe(45);
    expect(result.currency).toBe('USD');
  });

  it('takes the cheapest offer when a page lists several', () => {
    const result = readProductFromJsonLd([
      {
        '@type': 'Product',
        offers: [
          { price: '52.99', priceCurrency: 'USD' },
          { price: '45.00', priceCurrency: 'USD' },
        ],
      },
    ]);

    expect(result.price).toBe(45);
  });

  it('reads the offers inside an AggregateOffer', () => {
    const result = readProductFromJsonLd([
      {
        '@type': 'Product',
        offers: { '@type': 'AggregateOffer', offers: [{ price: '12.50', priceCurrency: 'GBP' }] },
      },
    ]);

    expect(result.price).toBe(12.5);
    expect(result.currency).toBe('GBP');
  });

  it('returns nothing for a page that is not a product', () => {
    expect(readProductFromJsonLd([{ '@type': 'NewsArticle', headline: 'A story' }])).toEqual({});
    expect(readProductFromJsonLd([])).toEqual({});
    expect(readProductFromJsonLd([null, 'not an object'])).toEqual({});
  });
});

describe('readProductFromMetaTags', () => {
  it('reads the price tags that are collected and discarded today', () => {
    const result = readProductFromMetaTags({
      'product:price:amount': '29.95',
      'product:price:currency': 'usd',
      'og:site_name': 'Target',
      'product:availability': 'in stock',
    });

    expect(result.price).toBe(29.95);
    expect(result.currency).toBe('USD');
    expect(result.store).toBe('Target');
    expect(result.availability).toBe('in stock');
  });

  it('falls back to the og: twins', () => {
    const result = readProductFromMetaTags({ 'og:price:amount': '10', 'og:price:currency': 'EUR' });
    expect(result.price).toBe(10);
    expect(result.currency).toBe('EUR');
  });

  it('is empty for a page with no price tags', () => {
    expect(readProductFromMetaTags({ 'og:title': 'An article' })).toEqual({});
    expect(readProductFromMetaTags(null)).toEqual({});
  });
});

describe('asinFromUrl and storeNameFromUrl', () => {
  it('finds an ASIN in the shapes Amazon uses', () => {
    expect(asinFromUrl('https://www.amazon.com/dp/B09XS7JWHH')).toBe('B09XS7JWHH');
    expect(asinFromUrl('https://www.amazon.co.uk/gp/product/B09XS7JWHH?ref=x')).toBe('B09XS7JWHH');
    expect(asinFromUrl('https://www.amazon.com/Sony-Headphones/dp/b09xs7jwhh/')).toBe('B09XS7JWHH');
    expect(asinFromUrl('https://www.amazon.com/s?asin=B09XS7JWHH')).toBe('B09XS7JWHH');
  });

  it('is undefined off Amazon, and for links that carry no ASIN', () => {
    expect(asinFromUrl('https://www.target.com/p/-/A-83887825')).toBeUndefined();
    expect(asinFromUrl('https://www.amazon.com/gp/cart/view.html')).toBeUndefined();
    expect(asinFromUrl('not a url')).toBeUndefined();
  });

  it('names the store from the host', () => {
    expect(storeNameFromUrl('https://www.target.com/p/thing')).toBe('Target');
    expect(storeNameFromUrl('https://shop.lego.com/x')).toBe('Shop');
    expect(storeNameFromUrl('nope')).toBeUndefined();
  });
});

describe('extractProductMetadata', () => {
  const now = new Date('2026-09-19T17:00:00.000Z');

  it('prefers JSON-LD over the meta tags, and keeps each price with its own currency', () => {
    const result = extractProductMetadata({
      url: 'https://www.target.com/p/stanley-quencher/-/A-83887825',
      jsonLd: [{ '@type': 'Product', offers: { price: '45.00', priceCurrency: 'USD' } }],
      metaTags: { 'product:price:amount': '52.99', 'product:price:currency': 'CAD', 'og:site_name': 'Target' },
      now,
    });

    expect(result.price).toBe(45);
    expect(result.currency).toBe('USD');
    expect(result.store).toBe('Target');
    expect(result.seenAt).toBe('2026-09-19T17:00:00.000Z');
  });

  it('uses the meta price, with its own currency, when JSON-LD has none', () => {
    const result = extractProductMetadata({
      url: 'https://example-shop.com/p/1',
      jsonLd: [{ '@type': 'Product', name: 'Thing' }],
      metaTags: { 'og:price:amount': '19.99', 'og:price:currency': 'GBP' },
      now,
    });

    expect(result.price).toBe(19.99);
    expect(result.currency).toBe('GBP');
  });

  it('keeps an Amazon product with no price at all, and still identifies it', () => {
    const result = extractProductMetadata({
      url: 'https://www.amazon.com/Sony-WH-1000XM5/dp/B09XS7JWHH',
      jsonLd: [],
      metaTags: {},
      now,
    });

    expect(result.price).toBeUndefined();
    expect(result.seenAt).toBeUndefined();
    expect(result.identifier).toEqual({ kind: 'asin', value: 'B09XS7JWHH' });
    expect(result.store).toBe('Amazon');
    expect(looksLikeProductPage(result, 'https://www.amazon.com/Sony-WH-1000XM5/dp/B09XS7JWHH')).toBe(true);
  });

  it('does not call an ordinary page a product', () => {
    const result = extractProductMetadata({
      url: 'https://www.bbc.com/news/article',
      jsonLd: [{ '@type': 'NewsArticle' }],
      metaTags: { 'og:site_name': 'BBC' },
      now,
    });

    expect(looksLikeProductPage(result, 'https://www.bbc.com/news/article')).toBe(false);
  });
});

describe('appendPricePoint', () => {
  const day = 24 * 60 * 60 * 1000;
  const at = (ms: number) => new Date(ms).toISOString();

  it('records the first price', () => {
    const history = appendPricePoint(undefined, { price: 348, currency: 'USD', seenAt: at(0) });
    expect(history).toEqual([{ price: 348, currency: 'USD', seenAt: at(0) }]);
  });

  it('records a price that changed, newest first', () => {
    const first = appendPricePoint([], { price: 398, seenAt: at(0) });
    const second = appendPricePoint(first, { price: 348, seenAt: at(1000) });
    expect(second.map((p) => p.price)).toEqual([348, 398]);
  });

  it('does not record the same price twice in one day', () => {
    const first = appendPricePoint([], { price: 348, seenAt: at(0) });
    const again = appendPricePoint(first, { price: 348, seenAt: at(1000) });
    expect(again).toHaveLength(1);
  });

  it('records the same price once a day has passed', () => {
    const first = appendPricePoint([], { price: 348, seenAt: at(0) });
    const later = appendPricePoint(first, { price: 348, seenAt: at(day + 1) });
    expect(later).toHaveLength(2);
  });

  it('keeps at most 24 entries, so an often-checked product cannot grow forever', () => {
    let history = appendPricePoint([], { price: 1, seenAt: at(0) });
    for (let i = 1; i < 40; i++) {
      history = appendPricePoint(history, { price: i + 1, seenAt: at(i * 1000) });
    }
    expect(history).toHaveLength(24);
    expect(history[0].price).toBe(40);
  });

  it('drops malformed entries already in the history', () => {
    const history = appendPricePoint(
      [{ price: 'nope' as any, seenAt: at(0) }, { price: 10, seenAt: at(0) }],
      { price: 12, seenAt: at(day * 2) },
    );
    expect(history.map((p) => p.price)).toEqual([12, 10]);
  });
});

describe('extractMetadata reads the product off a real page', () => {
  const productHtml = `
    <html><head>
      <title>Stanley Quencher H2.0 FlowState Tumbler 40 oz</title>
      <meta property="og:site_name" content="Target" />
      <meta property="og:image" content="https://target.com/img/quencher.jpg" />
      <script type="application/ld+json">
        {"@context":"https://schema.org","@graph":[
          {"@type":"BreadcrumbList"},
          {"@type":"Product","name":"Stanley Quencher H2.0","category":"Home > Kitchen > Tumblers",
           "sku":"83887825","offers":{"@type":"Offer","price":"45.00","priceCurrency":"USD",
           "availability":"https://schema.org/InStock"}}]}
      </script>
    </head><body><h1>Stanley Quencher</h1></body></html>`;

  const articleHtml = `
    <html><head>
      <title>A news story</title>
      <meta property="og:site_name" content="BBC" />
      <script type="application/ld+json">{"@type":"NewsArticle","headline":"A news story"}</script>
    </head><body><p>Some reporting that is long enough to be a description of the page.</p></body></html>`;

  it('puts price, currency, store and kind on the extracted info', async () => {
    const meta = await extractMetadata('https://www.target.com/p/stanley-quencher/-/A-83887825', productHtml);
    const product = meta.tsExtractedInfo?.product;

    expect(product).toBeDefined();
    expect(product?.price).toBe(45);
    expect(product?.currency).toBe('USD');
    expect(product?.store).toBe('Target');
    expect(product?.productType).toBe('Tumblers');
    expect(product?.identifier).toEqual({ kind: 'sku', value: '83887825' });
    expect(typeof product?.seenAt).toBe('string');
  });

  it('leaves the product absent on a page that is not one', async () => {
    const meta = await extractMetadata('https://www.bbc.com/news/story', articleHtml);
    expect(meta.tsExtractedInfo?.product).toBeUndefined();
    expect(meta.title).toBe('A news story');
  });

  it('still marks an Amazon product page with no price as a product', async () => {
    const meta = await extractMetadata(
      'https://www.amazon.com/Sony-WH-1000XM5/dp/B09XS7JWHH',
      '<html><head><title>Sony WH-1000XM5</title></head><body></body></html>',
    );
    const product = meta.tsExtractedInfo?.product;

    expect(product?.identifier).toEqual({ kind: 'asin', value: 'B09XS7JWHH' });
    expect(product?.price).toBeUndefined();
  });
});
