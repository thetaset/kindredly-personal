/**
 * Media provider registry — the fixed set of services a saved media item can be
 * "played on". v1 builds a "search for this title" deep link per provider; exact
 * per-title links / availability APIs are a later upgrade.
 *
 * These are plain https search URLs (not custom schemes) so they resolve on the web
 * and are handed off to native apps by the OS — no per-platform branching needed.
 *
 * IMPORTANT: external providers are an explicit user choice only ("Find elsewhere" on
 * the item page). Nothing — no default, no fallback — may route an ordinary open to
 * them, because on iOS/macOS that handoff drops the user into a native podcast app.
 */

/** Playable media kinds. v1 only ships 'audio'; widen to 'video' | 'film' later. */
export type MediaKind = 'audio';

/** Sentinel provider id for in-app playback (uses the built-in audio player). */
export const IN_APP_PROVIDER_ID = 'in_app';

export interface MediaProvider {
  id: string;
  name: string;
  /** Reuses existing icon names from the shared icon set. */
  icon: string;
  mediaKinds: MediaKind[];
  kind: 'external' | 'in_app';
  /** Build a "search for this title" deep link. Absent for the in-app provider. */
  searchUrl?: (q: ProviderQuery) => string;
}

export interface ProviderQuery {
  title: string;
  author?: string;
}

function buildSearchTerms(q: ProviderQuery): string {
  return [q.title, q.author].filter(Boolean).join(' ').trim();
}

export const MEDIA_PROVIDERS: MediaProvider[] = [
  {
    id: IN_APP_PROVIDER_ID,
    name: 'In-app player',
    icon: 'play-circle',
    mediaKinds: ['audio'],
    kind: 'in_app',
  },
  {
    id: 'apple_podcasts',
    name: 'Apple Podcasts',
    icon: 'apple',
    mediaKinds: ['audio'],
    kind: 'external',
    searchUrl: (q) =>
      `https://podcasts.apple.com/us/search?term=${encodeURIComponent(buildSearchTerms(q))}`,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: 'spotify',
    mediaKinds: ['audio'],
    kind: 'external',
    searchUrl: (q) =>
      `https://open.spotify.com/search/${encodeURIComponent(buildSearchTerms(q))}`,
  },
  {
    id: 'amazon_music',
    name: 'Amazon Music',
    icon: 'amazon',
    mediaKinds: ['audio'],
    kind: 'external',
    searchUrl: (q) =>
      `https://music.amazon.com/search/${encodeURIComponent(buildSearchTerms(q))}`,
  },
];

const PROVIDERS_BY_ID: Record<string, MediaProvider> = MEDIA_PROVIDERS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<string, MediaProvider>,
);

export function getMediaProvider(providerId: string | null | undefined): MediaProvider | undefined {
  return providerId ? PROVIDERS_BY_ID[providerId] : undefined;
}

export function getProvidersForMediaKind(kind: MediaKind): MediaProvider[] {
  return MEDIA_PROVIDERS.filter((p) => p.mediaKinds.includes(kind));
}

/**
 * Build the external "search for this title" URL for a provider.
 * Returns null for the in-app provider (or unknown / search-less providers).
 */
export function buildProviderUrl(providerId: string, q: ProviderQuery): string | null {
  const provider = PROVIDERS_BY_ID[providerId];
  if (!provider || !provider.searchUrl) return null;
  if (!q.title || !q.title.trim()) return null;
  return provider.searchUrl(q);
}
