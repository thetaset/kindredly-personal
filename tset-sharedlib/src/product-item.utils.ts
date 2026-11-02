/**
 * Turning what a page said about a product into what a saved item carries.
 *
 * The fields live in `info.schemas['knd.subtype.product.v1']`, which sits inside the encrypted
 * `info` — the server stores it and cannot read it. The one plaintext part is `subType: 'product'`,
 * which is what lets a query keep products out of the library's New list.
 *
 * A product is saved as `type: 'link'`, the way every recognized media link already is: `parent` on
 * the type table is display data that nothing enforces (see `normalizeSubTypeForType`).
 */

import { appendPricePoint, type ProductMetadata, type ProductPricePoint } from './product-metadata.utils';

export const PRODUCT_SUB_TYPE = 'product';
export const PRODUCT_SCHEMA_ID = 'knd.subtype.product.v1';

/** What one product item stores. Every field is optional except what the page actually gave us. */
export interface ProductSchemaPayload {
  price?: number;
  currency?: string;
  /** ISO date of when that price was read off the page. */
  priceSeenAt?: string;
  productType?: string;
  store?: string;
  availability?: string;
  /** "asin:B09XS7JWHH" — kind and value in one string, because the form renders strings. */
  identifier?: string;
  /** Newest first, capped. Written by code only; no form renders it. */
  priceHistory?: ProductPricePoint[];
  /**
   * How many are wanted. Absent means one. On the product rather than on one cart's membership
   * of it — see `useProductFields` for why, and what that costs.
   */
  quantity?: number;
  /**
   * Marked bought and waiting to be cleared out of the cart. Kept here rather than on the
   * device so the other people on a shared cart see it, which is the point of sharing one.
   * Decision 3 keeps no history, so this is cleared as the product leaves.
   */
  bought?: boolean;
}

function asHistory(value: unknown): ProductPricePoint[] {
  return Array.isArray(value) ? (value as ProductPricePoint[]) : [];
}

/**
 * Merges a fresh reading into what the item already held.
 *
 * Keeps every earlier field the page did not mention this time, so re-saving a page that has since
 * hidden its price never erases the price we had. A new price appends to the history under
 * {@link appendPricePoint}'s rules — different price, or a day older.
 */
export function buildProductSchemaPayload(
  product: ProductMetadata | null | undefined,
  existing?: ProductSchemaPayload | null,
): ProductSchemaPayload {
  const previous: ProductSchemaPayload = existing && typeof existing === 'object' ? { ...existing } : {};
  if (!product) return previous;

  const next: ProductSchemaPayload = { ...previous };

  if (product.productType) next.productType = product.productType;
  if (product.store) next.store = product.store;
  if (product.availability) next.availability = product.availability;
  if (product.identifier) next.identifier = `${product.identifier.kind}:${product.identifier.value}`;

  if (typeof product.price === 'number') {
    const seenAt = product.seenAt || new Date().toISOString();
    next.price = product.price;
    next.currency = product.currency;
    next.priceSeenAt = seenAt;
    next.priceHistory = appendPricePoint(asHistory(previous.priceHistory), {
      price: product.price,
      currency: product.currency,
      seenAt,
    });
  }

  return next;
}

/**
 * Puts the product on item details being saved: the `product` subType, and the fields under the
 * schema id. Returns the same object it was given when there is nothing to add, so a caller can
 * apply it unconditionally.
 */
export function applyProductToItemDetails<T extends { type?: any; subType?: any; info?: any }>(
  details: T,
  product: ProductMetadata | null | undefined,
): T {
  if (!product) return details;

  const existingInfo = details.info && typeof details.info === 'object' ? details.info : {};
  const existingSchemas = existingInfo.schemas && typeof existingInfo.schemas === 'object' ? existingInfo.schemas : {};
  const payload = buildProductSchemaPayload(product, existingSchemas[PRODUCT_SCHEMA_ID]);

  return {
    ...details,
    // A product page is a link with a subType, never a `thing` — the same rule media links follow.
    type: details.type || 'link',
    subType: details.subType || PRODUCT_SUB_TYPE,
    info: {
      ...existingInfo,
      schemas: {
        ...existingSchemas,
        [PRODUCT_SCHEMA_ID]: payload,
      },
    },
  };
}

/** The product fields already on an item, if any. */
export function readProductSchemaPayload(source: {
  info?: any;
  details?: { info?: any } | null;
} | null | undefined): ProductSchemaPayload | null {
  const schemas = source?.info?.schemas || source?.details?.info?.schemas;
  const payload = schemas && typeof schemas === 'object' ? schemas[PRODUCT_SCHEMA_ID] : null;
  return payload && typeof payload === 'object' ? (payload as ProductSchemaPayload) : null;
}
