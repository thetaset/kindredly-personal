/**
 * The one rule for the name a person sees for an item.
 *
 * An item's own name is often missing or a placeholder. A link saved before its page was read has
 * no name, and the add-item form used to store the word "Untitled" when the name was left blank.
 * The page's own title usually arrives later, in `meta.title`. Reading `details.name` alone
 * therefore showed "Untitled" for items whose title was known.
 *
 * Every surface that shows an item's name should get it here. The display factory does, so
 * anything built from a display item (cards, lists, the item page, search results) already does.
 *
 * Order: the collection's own name for the item, the item's name, the page title, the YouTube
 * channel name, the first line of the item's text, the file name, the address, "Untitled". A
 * placeholder ("Untitled", "Untitled document", "No title", "New Tab") counts as no name. A name that only repeats the address
 * loses to a real page title.
 */

import { isLikelyChallengeTitle } from './extraction.pure.utils';

const PLACEHOLDER_NAME = /^(untitled|untitled (item|page|link|note|document|doc)|no title|\(no title\)|new tab)$/i;

/**
 * One unbroken base64 run with `=` padding, optionally in literal quotes: leftover ciphertext
 * (for example a legacy double-encrypted field). Real names virtually never look like this.
 */
const CIPHERTEXT_LIKE = /^"?[A-Za-z0-9+/]{16,}={1,2}"?$/;

const MAX_DERIVED_LENGTH = 80;

export const ITEM_NAME_FALLBACK = 'Untitled';

/** The fields the rule reads. `ItemInfoView['details']` and the `Item` schema both satisfy it. */
export type ItemNameSource = {
  name?: string | null;
  url?: string | null;
  info?: unknown;
  meta?: {
    title?: string | null;
    fileInfo?: { filename?: string | null } | null;
    tsExtractedInfo?: { channelName?: string | null } | null;
  } | null;
};

/** True for a name that stands in for no name: blank, "Untitled", "No title". */
export function isPlaceholderItemName(value: unknown): boolean {
  const text = collapseWhitespace(value);
  return !text || PLACEHOLDER_NAME.test(text);
}

/** True for a string that is almost certainly leftover ciphertext, never a name. */
export function isCiphertextLike(value: unknown): boolean {
  return typeof value === 'string' && CIPHERTEXT_LIKE.test(value.trim());
}

/** The value as a usable name: whitespace collapsed, or '' when it is a placeholder or ciphertext. */
export function cleanItemName(value: unknown): string {
  const text = collapseWhitespace(value);
  if (!text || PLACEHOLDER_NAME.test(text) || CIPHERTEXT_LIKE.test(text)) return '';
  return text;
}

/**
 * True when a name only repeats the address it points at. Better than nothing, but it tells the
 * reader nothing the address does not, so a real page title wins over it.
 */
export function isUrlEchoName(name: unknown, url: unknown): boolean {
  const text = collapseWhitespace(name);
  const address = collapseWhitespace(url);
  if (!text || !address) return false;
  const bare = address.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return text === address || text === bare || text === bare.replace(/^www\./i, '');
}

/** Host and path of an address, for an item with nothing better: "example.com/recipes/soup". */
export function itemUrlLabel(url: unknown): string {
  const address = collapseWhitespace(url);
  if (!address) return '';
  try {
    const parsed = new URL(address);
    if (!parsed.hostname) return truncate(address);
    const path = parsed.pathname.replace(/\/+$/, '');
    return truncate(`${parsed.hostname.replace(/^www\./i, '')}${path}`);
  } catch {
    return truncate(address.replace(/^https?:\/\//i, ''));
  }
}

/** First non-empty line of an item's text, without Markdown heading, list or quote marks. */
export function itemTextFirstLine(info: unknown): string {
  const value = (info as { value?: unknown } | null | undefined)?.value;
  if (typeof value !== 'string') return '';
  for (const line of value.split(/\r?\n/)) {
    const text = collapseWhitespace(line.replace(/^\s*(#{1,6}\s+|[-*+]\s+|>\s*|\d+[.)]\s+)/, ''));
    if (text) return truncate(text);
  }
  return '';
}

/** The name a person should see for an item. Never empty. */
export function resolveItemDisplayName(
  details: ItemNameSource | null | undefined,
  options: { relationName?: string | null; fallback?: string } = {},
): string {
  return resolveItemName(details, options) || (options.fallback ?? ITEM_NAME_FALLBACK);
}

/**
 * Like `resolveItemDisplayName`, but '' when nothing names the item, for callers with their own
 * wording. The address counts as a name here, as a last resort.
 */
export function resolveItemName(
  details: ItemNameSource | null | undefined,
  options: { relationName?: string | null } = {},
): string {
  return resolveItemTitle(details, options) || itemUrlLabel(details?.url);
}

/**
 * What a person or the page called the item, never its address: '' when there is nothing but the
 * address. For surfaces that show the address on its own line, or match on the title.
 */
export function resolveItemTitle(
  details: ItemNameSource | null | undefined,
  options: { relationName?: string | null } = {},
): string {
  const url = details?.url;
  for (const candidate of [options.relationName, details?.name, details?.meta?.title]) {
    const name = cleanItemName(candidate);
    if (name && !isUrlEchoName(name, url)) return name;
  }
  return (
    cleanItemName(details?.meta?.tsExtractedInfo?.channelName) ||
    itemTextFirstLine(details?.info) ||
    cleanItemName(details?.meta?.fileInfo?.filename)
  );
}

/** Longer than any page title; a share that long is a message, not a name. */
const MAX_SHARED_TITLE_LENGTH = 300;

/**
 * The title a phone's share sheet or in-app browser passed along with a link, ready to be the
 * page's name (HAT-168): its first line, whitespace collapsed. Empty when it is only the address,
 * holds an address, is too long to be a title, is a placeholder, or is a sign-in or challenge
 * page's title.
 */
export function getSharedPageTitle(value: unknown, url?: unknown): string {
  if (typeof value !== 'string') return '';
  const firstLine = value.split(/\r?\n/).find((line) => line.trim()) || '';
  const text = collapseWhitespace(firstLine);
  if (!text || text.length > MAX_SHARED_TITLE_LENGTH || text.includes('://')) return '';
  if (isUrlEchoName(text, url) || isPlaceholderItemName(text) || isLikelyChallengeTitle(text)) return '';
  return text;
}

function collapseWhitespace(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncate(text: string): string {
  return text.length > MAX_DERIVED_LENGTH ? `${text.slice(0, MAX_DERIVED_LENGTH - 1).trimEnd()}…` : text;
}
