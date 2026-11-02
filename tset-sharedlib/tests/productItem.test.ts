import {
  applyProductToItemDetails,
  buildProductSchemaPayload,
  PRODUCT_SCHEMA_ID,
  readProductSchemaPayload,
} from '../src/product-item.utils';
import type { ProductMetadata } from '../src/product-metadata.utils';

const seen = (iso: string) => iso;

describe('buildProductSchemaPayload', () => {
  const product: ProductMetadata = {
    price: 348,
    currency: 'USD',
    store: 'Amazon',
    productType: 'Headphones',
    identifier: { kind: 'asin', value: 'B09XS7JWHH' },
    seenAt: seen('2026-09-19T17:00:00.000Z'),
  };

  it('writes the fields and starts the price history', () => {
    const payload = buildProductSchemaPayload(product);

    expect(payload.price).toBe(348);
    expect(payload.currency).toBe('USD');
    expect(payload.priceSeenAt).toBe('2026-09-19T17:00:00.000Z');
    expect(payload.productType).toBe('Headphones');
    expect(payload.identifier).toBe('asin:B09XS7JWHH');
    expect(payload.priceHistory).toEqual([
      { price: 348, currency: 'USD', seenAt: '2026-09-19T17:00:00.000Z' },
    ]);
  });

  it('keeps what an earlier read found when the page stops saying it', () => {
    const first = buildProductSchemaPayload(product);
    const later = buildProductSchemaPayload({ store: 'Amazon' }, first);

    expect(later.price).toBe(348);
    expect(later.productType).toBe('Headphones');
    expect(later.priceHistory).toHaveLength(1);
  });

  it('records a changed price as a second history entry, newest first', () => {
    const first = buildProductSchemaPayload(product);
    const later = buildProductSchemaPayload(
      { ...product, price: 298, seenAt: seen('2026-09-21T17:00:00.000Z') },
      first,
    );

    expect(later.price).toBe(298);
    expect(later.priceHistory?.map((p) => p.price)).toEqual([298, 348]);
  });

  it('returns what was there when the page said nothing at all', () => {
    const existing = { price: 10, priceHistory: [] };
    expect(buildProductSchemaPayload(null, existing)).toEqual(existing);
  });
});

describe('applyProductToItemDetails', () => {
  it('saves a product as a link with the product subType, fields under the schema id', () => {
    const details = applyProductToItemDetails(
      { url: 'https://www.target.com/p/x' } as any,
      { price: 45, currency: 'USD', store: 'Target', seenAt: seen('2026-09-19T17:00:00.000Z') },
    );

    expect(details.type).toBe('link');
    expect(details.subType).toBe('product');
    expect(details.info.schemas[PRODUCT_SCHEMA_ID].price).toBe(45);
  });

  it('leaves a type or subType the caller already chose', () => {
    const details = applyProductToItemDetails(
      { type: 'link', subType: 'book' } as any,
      { price: 20, seenAt: seen('2026-09-19T17:00:00.000Z') },
    );

    expect(details.subType).toBe('book');
  });

  it('keeps other schema payloads on the item', () => {
    const details = applyProductToItemDetails(
      { info: { schemas: { 'kindredly.note.v1': { text: 'hi' } }, hasFeeds: true } } as any,
      { price: 5, seenAt: seen('2026-09-19T17:00:00.000Z') },
    );

    expect(details.info.schemas['kindredly.note.v1']).toEqual({ text: 'hi' });
    expect(details.info.hasFeeds).toBe(true);
  });

  it('changes nothing when the page was not a product', () => {
    const original = { url: 'https://example.com' } as any;
    expect(applyProductToItemDetails(original, null)).toBe(original);
  });
});

describe('readProductSchemaPayload', () => {
  it('reads from an item and from a row with details', () => {
    const payload = { price: 12 };
    expect(readProductSchemaPayload({ info: { schemas: { [PRODUCT_SCHEMA_ID]: payload } } })).toEqual(payload);
    expect(readProductSchemaPayload({ details: { info: { schemas: { [PRODUCT_SCHEMA_ID]: payload } } } })).toEqual(payload);
    expect(readProductSchemaPayload({ info: {} })).toBeNull();
    expect(readProductSchemaPayload(null)).toBeNull();
  });
});
