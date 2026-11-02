import {resolveAbsoluteUrl} from './extraction.pure.utils';

/**
 * Where the picture families see on an item comes from. `saved`: a picture stored with the
 * item (`imageFilename`). `page`: the page's own picture, either the server's copy of it
 * (`meta.bannerImagePath`) or the link the page declares. `icon`: only the site's icon.
 */
export type ItemPictureKind = 'saved' | 'page' | 'icon';

export type ItemPictureCandidate = {src: string; kind: ItemPictureKind};

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  // Feed payloads sometimes carry these as strings.
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
  return trimmed;
}

/**
 * The meta fields a picture can come from, best first, with duplicates removed. Values that are
 * not links (`bannerImagePath`, `faviconPath`) are names in the server's image store.
 */
export function metaPictureCandidates(meta: unknown, baseUrl?: string): ItemPictureCandidate[] {
  if (!meta || typeof meta !== 'object') return [];
  const m = meta as Record<string, unknown>;
  const base = baseUrl || nonEmpty(m.url);
  const link = (value: unknown) => {
    const src = nonEmpty(value);
    if (!src || !base) return src;
    return resolveAbsoluteUrl(base, src) || src;
  };
  const candidates: [string | undefined, ItemPictureKind][] = [
    [nonEmpty(m.bannerImagePath), 'page'],
    [link(m.imageSrc), 'page'],
    [link(m.bannerImageSrc), 'page'],
    [link(m.bannerImageSrcPath), 'page'],
    [link(m.faviconSrcPath), 'icon'],
    [link(m.favicon), 'icon'],
    [nonEmpty(m.faviconPath), 'icon'],
  ];
  const seen = new Set<string>();
  const out: ItemPictureCandidate[] = [];
  for (const [src, kind] of candidates) {
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push({src, kind});
  }
  return out;
}

/**
 * Every picture a published item could show, in the order the app tries them: the saved
 * picture, then the page's. The first is the one families see while it loads.
 */
export function publishedPictureCandidates(item: unknown): ItemPictureCandidate[] {
  if (!item || typeof item !== 'object') return [];
  const row = item as Record<string, any>;
  const saved = nonEmpty(row.imageFilename);
  const meta = row.meta;
  const baseUrl = nonEmpty(row.data?.url) || nonEmpty(row.url) || nonEmpty(meta?.url);
  const fromMeta = metaPictureCandidates(meta, baseUrl);
  return saved ? [{src: saved, kind: 'saved'}, ...fromMeta] : fromMeta;
}

/** The picture families see on a published item, or null when it has none. */
export function publishedPicture(item: unknown): ItemPictureCandidate | null {
  return publishedPictureCandidates(item)[0] ?? null;
}

/** The meta fields that hold a picture of the page rather than its icon. */
export const META_PAGE_PICTURE_FIELDS = ['bannerImagePath', 'imageSrc', 'bannerImageSrc', 'bannerImageSrcPath'] as const;
