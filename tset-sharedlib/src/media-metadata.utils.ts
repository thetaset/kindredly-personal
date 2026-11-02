/**
 * Pure recognition for public book, audiobook, podcast, music and video URLs.
 *
 * Keep this module free of network and Node-only dependencies: browser clients can
 * identify/canonicalize a provider locally, while the server uses the same result
 * as the stable key for its shared metadata cache.
 */

import type { ItemTypeSecondary } from "./content.types";

/**
 * The item types a recognized media URL can resolve to. They are ordinary item
 * subTypes, saved on a link: an Audible URL is `type: 'link'`, `subType: 'book'`.
 * An audiobook link is an `audiobook`, like an added audiobook file (HAT-939).
 */
export const MEDIA_ITEM_SUB_TYPES = [
  "book",
  "audiobook",
  "podcast",
  "music",
  "song",
  "film",
  "video_series",
  "video",
] as const satisfies readonly ItemTypeSecondary[];

export type MediaItemSubType = (typeof MEDIA_ITEM_SUB_TYPES)[number];

export function isMediaItemSubType(value: unknown): value is MediaItemSubType {
  return (
    typeof value === "string" &&
    (MEDIA_ITEM_SUB_TYPES as readonly string[]).includes(value)
  );
}

const FILM_HINT = /(^|[\s._-])(movie|film)([\s._-]|$)/;
const SERIES_HINT =
  /(^|[\s._-])(show|series|tv|television|episode|season)([\s._-]|$)/;
const SONG_HINT = /(^|[\s._-])(track|song)([\s._-]|$)/;

/**
 * Narrow a video or music item type with the provider's own item type: "movie"
 * is a film, "series"/"tv" a series, "track" a song. A provider API or catalog
 * match often knows more than the URL did (a Netflix /title/ link is either a
 * film or a series), so the server calls this again after resolving.
 */
export function refineMediaSubType(
  subType: MediaItemSubType | undefined,
  providerItemType: string | undefined,
): MediaItemSubType | undefined {
  const hint = (providerItemType || "").toLowerCase();
  if (subType === "video" || subType === "film" || subType === "video_series") {
    if (FILM_HINT.test(hint)) return "film";
    if (SERIES_HINT.test(hint)) return "video_series";
    return subType;
  }
  if (subType === "music" || subType === "song") {
    return SONG_HINT.test(hint) ? "song" : subType;
  }
  return subType;
}

export type MediaMetadataProvider =
  | "audible"
  | "amazon_books"
  | "amazon_music"
  | "libby"
  | "overdrive"
  | "spotify"
  | "apple_books"
  | "apple_music"
  | "apple_podcasts"
  | "google_books"
  | "kobo"
  | "barnes_noble"
  | "goodreads"
  | "storygraph"
  | "libro_fm"
  | "audiobooks_com"
  | "everand"
  | "hoopla"
  | "chirp"
  | "bookshop_org"
  | "google_play_books"
  | "soundcloud"
  | "deezer"
  | "tidal"
  | "bandcamp"
  | "pandora"
  | "qobuz"
  | "netflix"
  | "prime_video"
  | "disney_plus"
  | "hulu"
  | "max"
  | "apple_tv"
  | "paramount_plus"
  | "peacock"
  | "tubi"
  | "plex"
  | "imdb"
  | "tmdb"
  | "letterboxd"
  | "rotten_tomatoes"
  | "fandango_at_home"
  | "crunchyroll"
  | "mubi"
  | "criterion_channel"
  | "kanopy"
  | "roku_channel"
  | "google_tv"
  | "movies_anywhere";

export type MediaMetadataResourceType =
  | "AUDIBLE_BOOK"
  | "AMAZON_BOOK"
  | "AMAZON_MUSIC"
  | "LIBRARY_BOOK"
  | "SPOTIFY_ITEM"
  | "APPLE_MEDIA"
  | "GOOGLE_BOOK"
  | "BOOK_PROVIDER_ITEM"
  | "AUDIO_PROVIDER_ITEM"
  | "STREAMING_VIDEO"
  | "MOVIE_DATABASE_ITEM";

export interface RecognizedMediaMetadataUrl {
  provider: MediaMetadataProvider;
  resourceType: MediaMetadataResourceType;
  externalId: string;
  canonicalUrl: string;
  /** The item type this URL points at; absent when the URL alone cannot tell. */
  subType?: MediaItemSubType;
  providerItemType?: string;
  titleHint?: string;
  isbn?: string;
}

const AMAZON_HOST =
  /(^|\.)(amazon\.(com|ca|de|fr|it|es|in|com\.au|com\.br|com\.mx|co\.jp|co\.uk)|amazonaws\.cn)$/i;
const AUDIBLE_HOST =
  /(^|\.)audible\.(com|ca|de|fr|it|in|com\.au|co\.jp|co\.uk|es)$/i;

function cleanHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function normalizeProviderItemType(value: string): string {
  const normalized = value.toLowerCase();
  const plurals: Record<string, string> = {
    albums: "album",
    artists: "artist",
    movies: "movie",
    playlists: "playlist",
    podcasts: "podcast",
    shows: "show",
    tracks: "track",
  };
  return plurals[normalized] || normalized;
}

function pathParts(parsed: URL): string[] {
  return parsed.pathname
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch (_error) {
        return part;
      }
    });
}

function cleanTitleHint(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const clean = value
    .replace(/[-_]+/g, " ")
    .replace(
      /\b(audiobook|kindle|ebook|audio book|unabridged|edition)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return clean.length >= 2 ? clean : undefined;
}

function firstMatch(parts: string[], pattern: RegExp): string | undefined {
  return parts.find((part) => pattern.test(part));
}

function makeCanonical(host: string, path: string): string {
  return `https://${host}${path}`;
}

/** Return a stable provider id and tracking-free canonical URL, or null. */
export function recognizeMediaMetadataUrl(
  rawUrl: string,
): RecognizedMediaMetadataUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (_error) {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = cleanHost(parsed.hostname);
  const parts = pathParts(parsed);
  const path = parsed.pathname;

  if (AUDIBLE_HOST.test(host)) {
    const asin =
      firstMatch(parts.slice().reverse(), /^[A-Z0-9]{10}$/i) ||
      parsed.searchParams.get("asin") ||
      undefined;
    if (!asin) return null;
    const id = asin.toUpperCase();
    const idIndex = parts.findIndex((part) => part.toUpperCase() === id);
    return {
      provider: "audible",
      resourceType: "AUDIBLE_BOOK",
      externalId: id,
      canonicalUrl: makeCanonical(host, `/pd/${id}`),
      subType: "audiobook",
      providerItemType: "audiobook",
      titleHint: cleanTitleHint(parts[idIndex - 1]),
    };
  }

  if (host.startsWith("music.amazon.")) {
    const itemTypeIndex = parts.findIndex((part) =>
      /^(albums?|tracks?|podcasts?|playlists?|artists?)$/i.test(part),
    );
    const sharedTrackId = parsed.searchParams.get("trackAsin") || undefined;
    const itemType = sharedTrackId
      ? "tracks"
      : itemTypeIndex >= 0
        ? parts[itemTypeIndex].toLowerCase()
        : "item";
    const id =
      sharedTrackId ||
      (itemTypeIndex >= 0 ? parts[itemTypeIndex + 1] : undefined);
    if (!id) return null;
    return {
      provider: "amazon_music",
      resourceType: "AMAZON_MUSIC",
      externalId: `${itemType}:${id}`,
      canonicalUrl: makeCanonical(
        host,
        `/${itemType}/${encodeURIComponent(id)}`,
      ),
      subType: itemType.startsWith("podcast")
        ? "podcast"
        : refineMediaSubType("music", normalizeProviderItemType(itemType)),
      providerItemType: normalizeProviderItemType(itemType),
    };
  }

  if (
    host === "primevideo.com" ||
    host.endsWith(".primevideo.com") ||
    AMAZON_HOST.test(host)
  ) {
    const joined = parts.join("/");
    const primeMatch = joined.match(
      /(?:detail|video\/detail)\/([A-Z0-9]{8,20})/i,
    );
    if (primeMatch) {
      const id = primeMatch[1].toUpperCase();
      const idIndex = parts.findIndex((part) => part.toUpperCase() === id);
      return {
        provider: "prime_video",
        resourceType: "STREAMING_VIDEO",
        externalId: id,
        canonicalUrl: `https://www.primevideo.com/detail/${id}`,
        subType: "video",
        providerItemType: "video",
        titleHint: cleanTitleHint(parts[idIndex - 1]),
      };
    }
  }

  if (AMAZON_HOST.test(host)) {
    const marker = parts.findIndex((part) => /^(dp|product)$/i.test(part));
    const asin =
      (marker >= 0 ? parts[marker + 1] : undefined) ||
      parsed.searchParams.get("asin") ||
      undefined;
    if (!asin || !/^[A-Z0-9]{10}$/i.test(asin)) return null;
    const id = asin.toUpperCase();
    const slug = marker > 0 ? parts[marker - 1] : undefined;
    // Amazon sells everything, so a /dp/ link is a book only when it says so: an
    // ISBN-10 for its id, or an edition in its slug. For links with neither, the
    // server reads the page's store section ("Kindle Store", "Books").
    const isBook =
      /^\d{9}[\dX]$/.test(id) ||
      /(^|[-_])(ebook|kindle|paperback|hardcover|audiobook)([-_]|$)/i.test(
        slug || "",
      );
    return {
      provider: "amazon_books",
      resourceType: "AMAZON_BOOK",
      externalId: id,
      canonicalUrl: makeCanonical(host, `/dp/${id}`),
      subType: isBook ? "book" : undefined,
      providerItemType: isBook ? "book" : "product",
      titleHint: cleanTitleHint(slug),
    };
  }

  if (
    host === "share.libbyapp.com" ||
    host.endsWith(".libbyapp.com") ||
    host === "libbyapp.com"
  ) {
    const titleIndex = parts.findIndex((part) => part === "title");
    const id =
      (titleIndex >= 0 ? parts[titleIndex + 1] : undefined) ||
      firstMatch(parts.slice().reverse(), /^\d{3,}$/);
    if (!id) return null;
    return {
      provider: "libby",
      resourceType: "LIBRARY_BOOK",
      externalId: id,
      canonicalUrl: `https://share.libbyapp.com/title/${encodeURIComponent(id)}`,
      subType: "book",
      providerItemType: "library_title",
    };
  }

  if (host === "overdrive.com" || host.endsWith(".overdrive.com")) {
    const mediaIndex = parts.findIndex((part) => part === "media");
    const id = mediaIndex >= 0 ? parts[mediaIndex + 1] : undefined;
    if (!id) return null;
    return {
      provider: "overdrive",
      resourceType: "LIBRARY_BOOK",
      externalId: id,
      canonicalUrl: makeCanonical(host, `/media/${encodeURIComponent(id)}`),
      subType: "book",
      providerItemType: "library_title",
    };
  }

  if (
    host === "play.google.com" &&
    parts[0] === "store" &&
    parts[1] === "books" &&
    parsed.searchParams.get("id")
  ) {
    const id = parsed.searchParams.get("id")!;
    return {
      provider: "google_play_books",
      resourceType: "GOOGLE_BOOK",
      externalId: id,
      canonicalUrl: `https://play.google.com/store/books/details?id=${encodeURIComponent(id)}`,
      subType: "book",
      providerItemType: "book",
      titleHint: cleanTitleHint(parts[3]),
    };
  }

  if (host === "open.spotify.com" || host === "spotify.link") {
    if (host === "spotify.link" && parts[0]) {
      return {
        provider: "spotify",
        resourceType: "SPOTIFY_ITEM",
        externalId: `short:${parts[0]}`,
        canonicalUrl: `https://spotify.link/${encodeURIComponent(parts[0])}`,
        providerItemType: "short_link",
      };
    }
    const offset = /^intl-[a-z]{2}$/i.test(parts[0] || "") ? 1 : 0;
    const itemType = parts[offset];
    const id = parts[offset + 1];
    if (
      !itemType ||
      !id ||
      !/^(track|album|artist|playlist|show|episode|audiobook)$/i.test(itemType)
    )
      return null;
    return {
      provider: "spotify",
      resourceType: "SPOTIFY_ITEM",
      externalId: `${itemType}:${id}`,
      canonicalUrl: `https://open.spotify.com/${itemType}/${encodeURIComponent(id)}`,
      subType: /^(show|episode)$/i.test(itemType)
        ? "podcast"
        : itemType === "audiobook"
          ? "audiobook"
          : refineMediaSubType("music", itemType),
      providerItemType: itemType,
    };
  }

  const videoPatterns: Array<{
    hosts: RegExp;
    provider: MediaMetadataProvider;
    resourceType?: MediaMetadataResourceType;
    match: (
      parts: string[],
      path: string,
    ) => { id: string; type?: string; titleHint?: string } | null;
  }> = [
    {
      hosts: /(^|\.)netflix\.com$/i,
      provider: "netflix",
      match: (p) => {
        const index = p.findIndex((value) => value === "title");
        return index >= 0 && p[index + 1]
          ? { id: p[index + 1], type: "title" }
          : null;
      },
    },
    {
      hosts: /(^|\.)disneyplus\.com$/i,
      provider: "disney_plus",
      match: (p) => {
        const index = p.findIndex((value) =>
          /^(movies|series|video)$/i.test(value),
        );
        if (index < 0 || !p[index + 1]) return null;
        const id = p[index + 2] || p[index + 1];
        return {
          id,
          type: normalizeProviderItemType(p[index]),
          titleHint: p[index + 2] ? cleanTitleHint(p[index + 1]) : undefined,
        };
      },
    },
    {
      hosts: /(^|\.)hulu\.com$/i,
      provider: "hulu",
      match: (p) => {
        const index = p.findIndex((value) =>
          /^(movie|series|watch)$/i.test(value),
        );
        const tail = index >= 0 ? p[p.length - 1] : undefined;
        if (!tail) return null;
        const id =
          (tail.match(/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i) ||
            [])[1] || tail;
        return {
          id,
          type: p[index],
          titleHint: cleanTitleHint(tail.replace(id, "")),
        };
      },
    },
    {
      hosts: /(^|\.)(max|hbomax)\.com$/i,
      provider: "max",
      match: (p) => {
        const id =
          p.find((value) => /^urn:hbo:/i.test(value)) || p[p.length - 1];
        return id
          ? {
              id,
              type:
                p.find((value) => /^(movie|show|episode)$/i.test(value)) ||
                "video",
            }
          : null;
      },
    },
    {
      hosts: /^tv\.apple\.com$/i,
      provider: "apple_tv",
      match: (p) => {
        const id = p.find((value) => /^umc\.cmc\./i.test(value));
        const index = id ? p.indexOf(id) : -1;
        return id
          ? {
              id,
              type:
                p.find((value) => /^(movie|show|episode)$/i.test(value)) ||
                "video",
              titleHint: cleanTitleHint(p[index - 1]),
            }
          : null;
      },
    },
    {
      hosts: /(^|\.)paramountplus\.com$/i,
      provider: "paramount_plus",
      match: (p) => {
        const marker = p.findIndex((value) =>
          /^(movies|shows|video)$/i.test(value),
        );
        const id = p[marker + 2] || p[marker + 1];
        return marker >= 0 && id
          ? {
              id,
              type: normalizeProviderItemType(p[marker]),
              titleHint: cleanTitleHint(p[marker + 1]),
            }
          : null;
      },
    },
    {
      hosts: /(^|\.)peacocktv\.com$/i,
      provider: "peacock",
      match: (p) => {
        const id =
          p.find((value) =>
            /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value),
          ) || p[p.length - 1];
        return id ? { id, type: "video" } : null;
      },
    },
    {
      hosts: /(^|\.)tubitv\.com$/i,
      provider: "tubi",
      match: (p) => {
        const marker = p.findIndex((value) =>
          /^(movies|series)\/?$/i.test(value),
        );
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id
          ? {
              id,
              type: normalizeProviderItemType(p[marker]),
              titleHint: cleanTitleHint(p[marker + 2]),
            }
          : null;
      },
    },
    {
      hosts: /(^|\.)plex\.tv$/i,
      provider: "plex",
      match: (p) => {
        const marker = p.findIndex((value) =>
          /^(movie|show|episode)$/i.test(value),
        );
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id
          ? { id, type: p[marker], titleHint: cleanTitleHint(id) }
          : null;
      },
    },
    {
      hosts: /(^|\.)imdb\.com$/i,
      provider: "imdb",
      resourceType: "MOVIE_DATABASE_ITEM",
      match: (_p, fullPath) => {
        const id = (fullPath.match(/\/title\/(tt\d+)/i) || [])[1];
        return id ? { id, type: "title" } : null;
      },
    },
    {
      hosts: /(^|\.)themoviedb\.org$/i,
      provider: "tmdb",
      resourceType: "MOVIE_DATABASE_ITEM",
      match: (p) => {
        const marker = p.findIndex((value) => /^(movie|tv)$/i.test(value));
        const id =
          marker >= 0 ? (p[marker + 1] || "").match(/^\d+/)?.[0] : undefined;
        return id
          ? {
              id,
              type: p[marker],
              titleHint: cleanTitleHint(p[marker + 1].replace(/^\d+-?/, "")),
            }
          : null;
      },
    },
    {
      hosts: /(^|\.)letterboxd\.com$/i,
      provider: "letterboxd",
      resourceType: "MOVIE_DATABASE_ITEM",
      match: (p) => {
        const marker = p.findIndex((value) => value === "film");
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id ? { id, type: "movie", titleHint: cleanTitleHint(id) } : null;
      },
    },
    {
      hosts: /(^|\.)rottentomatoes\.com$/i,
      provider: "rotten_tomatoes",
      resourceType: "MOVIE_DATABASE_ITEM",
      match: (p) => {
        const marker = p.findIndex((value) => /^(m|tv)$/i.test(value));
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id
          ? {
              id,
              type: p[marker] === "m" ? "movie" : "show",
              titleHint: cleanTitleHint(id),
            }
          : null;
      },
    },
    {
      hosts: /(^|\.)(vudu|fandangoathome)\.com$/i,
      provider: "fandango_at_home",
      match: (p) => {
        const id = firstMatch(p.slice().reverse(), /^\d+$/) || p[p.length - 1];
        return id
          ? { id, type: "video", titleHint: cleanTitleHint(p[p.length - 2]) }
          : null;
      },
    },
    {
      hosts: /(^|\.)crunchyroll\.com$/i,
      provider: "crunchyroll",
      match: (p) => {
        const marker = p.findIndex((value) => /^(watch|series)$/i.test(value));
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id
          ? {
              id,
              type: p[marker] === "series" ? "series" : "episode",
              titleHint: cleanTitleHint(p[marker + 2]),
            }
          : null;
      },
    },
    {
      hosts: /(^|\.)mubi\.com$/i,
      provider: "mubi",
      match: (p) => {
        const marker = p.findIndex((value) => value === "films");
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id ? { id, type: "movie", titleHint: cleanTitleHint(id) } : null;
      },
    },
    {
      hosts: /(^|\.)criterionchannel\.com$/i,
      provider: "criterion_channel",
      match: (p) => {
        const marker = p.findIndex((value) => value === "videos");
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id ? { id, type: "movie", titleHint: cleanTitleHint(id) } : null;
      },
    },
    {
      hosts: /(^|\.)kanopy\.com$/i,
      provider: "kanopy",
      match: (p) => {
        const marker = p.findIndex((value) => value === "product");
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id ? { id, type: "video" } : null;
      },
    },
    {
      hosts: /(^|\.)therokuchannel\.roku\.com$/i,
      provider: "roku_channel",
      match: (p) => {
        const marker = p.findIndex((value) => value === "details");
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id
          ? { id, type: "video", titleHint: cleanTitleHint(p[marker + 2]) }
          : null;
      },
    },
    {
      hosts: /^play\.google\.com$/i,
      provider: "google_tv",
      match: (p) =>
        p[0] === "store" && p[1] === "movies" && parsed.searchParams.get("id")
          ? {
              id: parsed.searchParams.get("id")!,
              type: "movie",
              titleHint: cleanTitleHint(p[3]),
            }
          : null,
    },
    {
      hosts: /(^|\.)moviesanywhere\.com$/i,
      provider: "movies_anywhere",
      match: (p) => {
        const marker = p.findIndex((value) => value === "movie");
        const id = marker >= 0 ? p[marker + 1] : undefined;
        return id ? { id, type: "movie", titleHint: cleanTitleHint(id) } : null;
      },
    },
  ];
  for (const pattern of videoPatterns) {
    if (!pattern.hosts.test(host)) continue;
    const match = pattern.match(parts, path);
    if (!match) return null;
    return {
      provider: pattern.provider,
      resourceType: pattern.resourceType || "STREAMING_VIDEO",
      externalId: match.id,
      canonicalUrl: makeCanonical(host, path),
      subType: refineMediaSubType("video", match.type),
      providerItemType: match.type || "video",
      titleHint: match.titleHint,
    };
  }

  if (/^(books|music|podcasts)\.apple\.com$/i.test(host)) {
    // Books and Podcasts put "id" before the number (/book/project-hail-mary/id1501225936);
    // Music uses a bare number (/album/abbey-road/1474815798). The part before the slug
    // is the provider's own item type.
    const idIndex = parts.findIndex((part) => /^(id)?\d{5,}$/i.test(part));
    if (idIndex < 0) return null;
    const collectionId = parts[idIndex].replace(/^id/i, "");
    const provider = host.startsWith("books.")
      ? "apple_books"
      : host.startsWith("podcasts.")
        ? "apple_podcasts"
        : "apple_music";
    // `?i=` names one song on an album page; the iTunes lookup resolves it by that id.
    const songId =
      provider === "apple_music" && /^\d+$/.test(parsed.searchParams.get("i") || "")
        ? parsed.searchParams.get("i")!
        : undefined;
    const pathType = (parts[idIndex - 2] || "").toLowerCase();
    const providerItemType = songId ? "song" : pathType || provider.replace("apple_", "");
    const subType: MediaItemSubType | undefined =
      provider === "apple_books"
        ? "book"
        : provider === "apple_podcasts"
          ? "podcast"
          : refineMediaSubType("music", providerItemType);
    return {
      provider,
      resourceType: "APPLE_MEDIA",
      externalId: `${provider}:${songId || collectionId}`,
      canonicalUrl: makeCanonical(host, path) + (songId ? `?i=${songId}` : ""),
      subType,
      providerItemType,
      titleHint: cleanTitleHint(parts[idIndex - 1]),
    };
  }


  if (host === "books.google.com" || host.startsWith("books.google.")) {
    const id =
      parsed.searchParams.get("id") ||
      (parts[0] === "books" ? parsed.searchParams.get("vid") : null);
    if (!id) return null;
    return {
      provider: "google_books",
      resourceType: "GOOGLE_BOOK",
      externalId: id,
      canonicalUrl: `https://books.google.com/books?id=${encodeURIComponent(id)}`,
      subType: "book",
      providerItemType: "book",
    };
  }

  const bookPatterns: Array<{
    hosts: RegExp;
    provider: MediaMetadataProvider;
    id: (parts: string[], parsed: URL) => string | undefined;
    /** Absent when the store sells more than books (Hoopla also streams film and music). */
    subType?: MediaItemSubType;
    providerItemType: string;
  }> = [
    {
      hosts: /(^|\.)kobo\.com$/i,
      provider: "kobo",
      id: (p) => p[p.findIndex((v) => v === "ebook") + 1],
      subType: "book",
      providerItemType: "book",
    },
    {
      hosts: /(^|\.)barnesandnoble\.com$/i,
      provider: "barnes_noble",
      id: (p) => firstMatch(p.slice().reverse(), /^\d{10,13}$/),
      subType: "book",
      providerItemType: "book",
    },
    {
      hosts: /(^|\.)goodreads\.com$/i,
      provider: "goodreads",
      id: (p) => (p.join("/").match(/book\/show\/(\d+)/) || [])[1],
      subType: "book",
      providerItemType: "book",
    },
    {
      hosts: /(^|\.)thestorygraph\.com$/i,
      provider: "storygraph",
      id: (p) => (p.join("/").match(/books\/([^/]+)/) || [])[1],
      subType: "book",
      providerItemType: "book",
    },
    {
      hosts: /(^|\.)libro\.fm$/i,
      provider: "libro_fm",
      id: (p) => (p.join("/").match(/audiobooks\/([^/]+)/) || [])[1],
      subType: "audiobook",
      providerItemType: "audiobook",
    },
    {
      hosts: /(^|\.)audiobooks\.com$/i,
      provider: "audiobooks_com",
      id: (p) => (p.join("/").match(/audiobook\/[^/]+\/(\d+)/) || [])[1],
      subType: "audiobook",
      providerItemType: "audiobook",
    },
    {
      hosts: /(^|\.)(everand|scribd)\.com$/i,
      provider: "everand",
      id: (p) => (p.join("/").match(/(?:book|audiobook)\/(\d+)/) || [])[1],
      subType: "book",
      providerItemType: "book",
    },
    {
      hosts: /(^|\.)hoopladigital\.com$/i,
      provider: "hoopla",
      id: (p) => (p.join("/").match(/title\/(\d+)/) || [])[1],
      providerItemType: "library_title",
    },
    {
      hosts: /(^|\.)chirpbooks\.com$/i,
      provider: "chirp",
      id: (p) => (p.join("/").match(/audiobooks\/([^/]+)/) || [])[1],
      subType: "audiobook",
      providerItemType: "audiobook",
    },
    {
      hosts: /(^|\.)bookshop\.org$/i,
      provider: "bookshop_org",
      id: (p) =>
        firstMatch(p.slice().reverse(), /^97[89]\d{10}$/) || p[p.length - 1],
      subType: "book",
      providerItemType: "book",
    },
  ];
  for (const pattern of bookPatterns) {
    if (!pattern.hosts.test(host)) continue;
    const id = pattern.id(parts, parsed);
    if (!id) return null;
    const isbn = /^97[89]\d{10}$/.test(id) ? id : undefined;
    return {
      provider: pattern.provider,
      resourceType: "BOOK_PROVIDER_ITEM",
      externalId: id,
      canonicalUrl: makeCanonical(host, path),
      subType: pattern.subType,
      providerItemType: pattern.providerItemType,
      titleHint: cleanTitleHint(parts[parts.indexOf(id) - 1]),
      isbn,
    };
  }

  const audioPatterns: Array<{
    hosts: RegExp;
    provider: MediaMetadataProvider;
    marker?: string;
  }> = [
    { hosts: /(^|\.)soundcloud\.com$/i, provider: "soundcloud" },
    { hosts: /(^|\.)deezer\.com$/i, provider: "deezer" },
    { hosts: /(^|\.)tidal\.com$/i, provider: "tidal" },
    { hosts: /\.bandcamp\.com$/i, provider: "bandcamp" },
    { hosts: /(^|\.)pandora\.com$/i, provider: "pandora" },
    { hosts: /(^|\.)qobuz\.com$/i, provider: "qobuz" },
  ];
  for (const pattern of audioPatterns) {
    if (!pattern.hosts.test(host) || parts.length === 0) continue;
    const itemType =
      parts.find((part) => /^(track|album|artist|playlist)$/i.test(part)) ||
      "item";
    const marker = parts.indexOf(itemType);
    const id = marker >= 0 ? parts[marker + 1] : parts.slice(0, 2).join("/");
    if (!id) return null;
    return {
      provider: pattern.provider,
      resourceType: "AUDIO_PROVIDER_ITEM",
      externalId: `${itemType}:${id}`,
      canonicalUrl: makeCanonical(host, path),
      subType: refineMediaSubType("music", itemType),
      providerItemType: itemType,
      titleHint: cleanTitleHint(id),
    };
  }

  return null;
}
