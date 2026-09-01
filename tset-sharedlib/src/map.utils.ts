import type { ItemDetailsInfo } from './types/item.types';

// Map item embed support. A "map" item renders an inline interactive map. Two
// render strategies, chosen by the resolved data shape:
//   - `embedUrl` present  -> sandboxed <iframe> (provider rich widgets)
//   - `center`/`zoom` only -> Leaflet (coordinate maps; OSM tiles, no 3rd-party JS)
//   - neither             -> plain "open original" link fallback
//
// Security: only an ALLOWLIST of trusted map-provider hosts may be embedded as
// an iframe. `getMapEmbedSchemaV1` re-validates the allowlist on every read, so a
// tampered or non-allowlisted `embedUrl` falls back to Leaflet/link and never
// frames an untrusted origin.

export const MAP_EMBED_SCHEMA_ID = 'kindredly.mapEmbed.v1';

export type MapProviderId =
  | 'google_maps'
  | 'openstreetmap'
  | 'mapbox'
  | 'trailforks'
  | 'apple_maps'
  | 'bing_maps'
  | 'other';

export type MapCenter = { lat: number; lng: number };

export interface MapEmbedSchemaV1 {
  schemaVersion: 1;
  provider: MapProviderId;
  /** Iframe-ready URL for provider widgets. Omitted for coordinate-only (Leaflet) maps. */
  embedUrl?: string;
  /** The URL/snippet the user pasted or we extracted from. */
  originalUrl: string;
  title?: string;
  /** Render center for the Leaflet path. */
  center?: MapCenter | null;
  zoom?: number | null;
  source?: 'share_url' | 'embed_snippet' | 'page_extract';
}

type ResolvedMapData = {
  embedUrl?: string;
  center?: MapCenter | null;
  zoom?: number | null;
  title?: string;
};

interface MapProvider {
  id: MapProviderId;
  label: string;
  /** True when this URL is a share/page URL belonging to the provider. */
  match: (u: URL) => boolean;
  /** Hosts valid as an <iframe src> for this provider (empty = not iframe-embeddable). */
  embedHosts: string[];
  /** Best-effort: turn a normal/share URL into render data. */
  resolve?: (u: URL) => ResolvedMapData | null;
}

function hostMatches(host: string, domains: string[]): boolean {
  const h = host.toLowerCase();
  return domains.some((d) => h === d || h.endsWith(`.${d}`));
}

function ensureHttps(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function toCoord(latStr: string, lngStr: string): MapCenter | null {
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function toZoom(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  if (!isFinite(n)) return null;
  return Math.min(20, Math.max(1, Math.round(n)));
}

function isValidCenter(value: unknown): value is MapCenter {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<MapCenter>;
  return (
    typeof c.lat === 'number' &&
    typeof c.lng === 'number' &&
    isFinite(c.lat) &&
    isFinite(c.lng) &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    c.lng >= -180 &&
    c.lng <= 180
  );
}

const LATLNG = /^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/;

function decodeGooglePlace(u: URL): string | null {
  const pm = u.pathname.match(/\/place\/([^/@]+)/);
  if (pm) {
    try {
      return decodeURIComponent(pm[1].replace(/\+/g, ' '));
    } catch {
      return pm[1].replace(/\+/g, ' ');
    }
  }
  return null;
}

function resolveGoogle(u: URL): ResolvedMapData | null {
  let center: MapCenter | null = null;
  let zoom: number | null = null;

  const at = u.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/);
  if (at) {
    center = toCoord(at[1], at[2]);
    zoom = toZoom(at[3]);
  }

  if (!center) {
    const raw = u.searchParams.get('ll') || u.searchParams.get('q') || u.searchParams.get('query') || '';
    const m = raw.match(LATLNG);
    if (m) center = toCoord(m[1], m[2]);
    if (!zoom) zoom = toZoom(u.searchParams.get('z'));
  }

  // A place name in the path (…/place/Name/…) is a good title even when we also
  // have coordinates from the `@lat,lng` segment.
  const placeName = decodeGooglePlace(u);

  if (center) {
    const z = zoom || 14;
    return {
      embedUrl: `https://maps.google.com/maps?q=${center.lat},${center.lng}&z=${z}&output=embed`,
      center,
      zoom: z,
      title: placeName ?? undefined,
    };
  }

  const place = placeName || u.searchParams.get('q');
  if (place && !LATLNG.test(place)) {
    return { embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`, title: place };
  }

  return null;
}

function resolveOpenStreetMap(u: URL): ResolvedMapData | null {
  const hashMatch = (u.hash || '').match(/map=(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  if (hashMatch) {
    const center = toCoord(hashMatch[2], hashMatch[3]);
    if (center) return { center, zoom: toZoom(hashMatch[1]) || 14 };
  }

  const mlat = u.searchParams.get('mlat');
  const mlon = u.searchParams.get('mlon');
  if (mlat && mlon) {
    const center = toCoord(mlat, mlon);
    if (center) return { center, zoom: 14 };
  }

  return null;
}

function resolveApple(u: URL): ResolvedMapData | null {
  const raw = u.searchParams.get('ll') || u.searchParams.get('sll') || '';
  const m = raw.match(LATLNG);
  if (m) {
    const center = toCoord(m[1], m[2]);
    if (center) return { center, zoom: toZoom(u.searchParams.get('z')) || 14 };
  }
  return null;
}

const mapProviders: MapProvider[] = [
  {
    id: 'google_maps',
    label: 'Google Maps',
    match: (u) =>
      hostMatches(u.host, ['maps.google.com', 'maps.app.goo.gl']) ||
      (hostMatches(u.host, ['google.com', 'goo.gl']) && /\/maps/.test(u.pathname)),
    embedHosts: ['google.com', 'maps.google.com'],
    resolve: resolveGoogle,
  },
  {
    id: 'openstreetmap',
    label: 'OpenStreetMap',
    match: (u) => hostMatches(u.host, ['openstreetmap.org']),
    embedHosts: ['openstreetmap.org'],
    resolve: resolveOpenStreetMap,
  },
  {
    id: 'apple_maps',
    label: 'Apple Maps',
    match: (u) => hostMatches(u.host, ['maps.apple.com']),
    embedHosts: [],
    resolve: resolveApple,
  },
  {
    id: 'trailforks',
    label: 'Trailforks',
    match: (u) => hostMatches(u.host, ['trailforks.com']),
    embedHosts: ['trailforks.com'],
    // Region pages load the widget via JS; no reliable URL->embed in v1. Use the
    // pasted embed snippet instead.
  },
  {
    id: 'mapbox',
    label: 'Mapbox',
    match: () => false,
    embedHosts: ['mapbox.com'],
  },
  {
    id: 'bing_maps',
    label: 'Bing Maps',
    match: () => false,
    embedHosts: ['bing.com'],
  },
];

/** Human-readable provider label, e.g. for an "added as Google Maps" hint. */
export function getMapProviderLabel(id: MapProviderId | null | undefined): string {
  const provider = mapProviders.find((p) => p.id === id);
  return provider ? provider.label : 'map';
}

/**
 * A sensible default name for a map item when none was provided. Prefers an
 * extracted title, then coordinates, then a provider-based label. Synchronous
 * (no network) — callers can override with a reverse-geocoded place name.
 */
export function getMapDefaultName(schema: MapEmbedSchemaV1 | null | undefined): string {
  if (!schema) return 'Map';
  if (schema.title && schema.title.trim()) return schema.title.trim();
  if (schema.center) {
    return `Map (${schema.center.lat.toFixed(4)}, ${schema.center.lng.toFixed(4)})`;
  }
  const label = getMapProviderLabel(schema.provider);
  return label === 'map' ? 'Map' : `${label} map`;
}

/** True only for an https URL whose host is an allowlisted provider embed host. */
export function isAllowedMapEmbedUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  return mapProviders.some((p) => p.embedHosts.length > 0 && hostMatches(u.host, p.embedHosts));
}

function providerIdForEmbedHost(host: string): MapProviderId {
  const provider = mapProviders.find((p) => p.embedHosts.length > 0 && hostMatches(host, p.embedHosts));
  return provider ? provider.id : 'other';
}

/**
 * Recognize a provider from a normal/share URL and produce a renderable map.
 * OSM/Apple yield coordinate-only schemas (Leaflet); Google yields an `output=embed`
 * iframe URL. Returns null when nothing renderable can be derived.
 */
export function resolveMapFromShareUrl(input: string | null | undefined): MapEmbedSchemaV1 | null {
  if (!input || typeof input !== 'string') return null;
  const original = input.trim();
  if (!original) return null;

  let u: URL;
  try {
    u = new URL(ensureHttps(original));
  } catch {
    return null;
  }

  const provider = mapProviders.find((p) => p.match(u));
  if (!provider || !provider.resolve) return null;

  const data = provider.resolve(u);
  if (!data || (!data.embedUrl && !data.center)) return null;
  if (data.embedUrl && !isAllowedMapEmbedUrl(data.embedUrl)) return null;

  return {
    schemaVersion: 1,
    provider: provider.id,
    embedUrl: data.embedUrl,
    originalUrl: original,
    title: data.title,
    center: data.center ?? null,
    zoom: data.zoom ?? null,
    source: 'share_url',
  };
}

/**
 * Extract and validate an embeddable map URL from a pasted `<iframe>` snippet, or
 * from a bare embed URL. Returns null unless the src is an allowlisted https host.
 */
export function resolveMapFromEmbedSnippet(input: string | null | undefined): MapEmbedSchemaV1 | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let src: string | null = null;
  const iframe = trimmed.match(/<iframe[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  if (iframe) {
    src = iframe[1];
  } else if (/^https?:\/\/\S+$/i.test(trimmed) && !/\s/.test(trimmed)) {
    src = trimmed;
  }
  if (!src) return null;

  src = src.replace(/&amp;/g, '&').trim();
  if (!isAllowedMapEmbedUrl(src)) return null;

  let host: string;
  try {
    host = new URL(src).host;
  } catch {
    return null;
  }

  return {
    schemaVersion: 1,
    provider: providerIdForEmbedHost(host),
    embedUrl: src,
    originalUrl: src,
    center: null,
    zoom: null,
    source: 'embed_snippet',
  };
}

/** Find every allowlisted map embed in a page's raw HTML (v1.1 auto-extract). */
export function findMapEmbedsInHtml(html: string | null | undefined): MapEmbedSchemaV1[] {
  if (!html || typeof html !== 'string') return [];
  const results: MapEmbedSchemaV1[] = [];
  const seen = new Set<string>();
  const re = /<iframe[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1].replace(/&amp;/g, '&').trim();
    if (seen.has(src) || !isAllowedMapEmbedUrl(src)) continue;
    seen.add(src);
    let host: string;
    try {
      host = new URL(src).host;
    } catch {
      continue;
    }
    results.push({
      schemaVersion: 1,
      provider: providerIdForEmbedHost(host),
      embedUrl: src,
      originalUrl: src,
      center: null,
      zoom: null,
      source: 'page_extract',
    });
  }
  return results;
}

/** Write a map embed schema into an item's `info.schemas`, mirroring setMediaRefSchemaOnInfo. */
export function setMapEmbedSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
  schema: MapEmbedSchemaV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas) ? info.schemas : {};

  return {
    ...(info || {}),
    schemas: {
      ...schemas,
      [MAP_EMBED_SCHEMA_ID]: schema,
    },
  };
}

/**
 * Read and validate a map embed schema. Re-checks the allowlist for any `embedUrl`
 * on every read (the security boundary); returns null when neither a valid embedUrl
 * nor a valid center is present.
 */
export function getMapEmbedSchemaV1(
  source:
    | {
        info?: ItemDetailsInfo | null;
        details?: { info?: ItemDetailsInfo | null } | null;
      }
    | null
    | undefined,
): MapEmbedSchemaV1 | null {
  const raw =
    source?.info?.schemas?.[MAP_EMBED_SCHEMA_ID] || source?.details?.info?.schemas?.[MAP_EMBED_SCHEMA_ID];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<MapEmbedSchemaV1>;
  if (schema.schemaVersion !== 1) return null;

  const embedUrl = typeof schema.embedUrl === 'string' && schema.embedUrl ? schema.embedUrl : undefined;
  if (embedUrl && !isAllowedMapEmbedUrl(embedUrl)) return null;

  const center = isValidCenter(schema.center) ? schema.center : null;
  if (!embedUrl && !center) return null;

  return {
    schemaVersion: 1,
    provider: (schema.provider as MapProviderId) || 'other',
    embedUrl,
    originalUrl: typeof schema.originalUrl === 'string' ? schema.originalUrl : '',
    title: typeof schema.title === 'string' ? schema.title : undefined,
    center,
    zoom: typeof schema.zoom === 'number' ? schema.zoom : null,
    source: schema.source,
  };
}
