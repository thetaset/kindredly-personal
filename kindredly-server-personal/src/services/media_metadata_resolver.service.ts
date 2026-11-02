import axios from 'axios';
import {config} from '@/config';
import {fetchGenericHtmlMeta} from '@/utils/fetch_helpers';
import {safeFetchConfig} from '@/utils/safe_fetch';
import {ItemResourceType} from 'tset-sharedlib/constants';
import type {ExternalMetaExtendedInfo} from 'tset-sharedlib/types/cache.types';
import type {ItemMeta, ItemMetaExtracted} from 'tset-sharedlib/types/item.types';
import {
  type MediaItemSubType,
  type RecognizedMediaMetadataUrl,
  recognizeMediaMetadataUrl,
  refineMediaSubType,
} from 'tset-sharedlib/media-metadata.utils';

type ResolvedMediaDetails = {
  provider: string;
  /** The item type (Book, Film, Podcast…) the item is saved with; read by getSubTypeFromMeta. */
  subType?: MediaItemSubType;
  providerItemType?: string;
  externalId: string;
  canonicalUrl: string;
  title?: string;
  subtitle?: string;
  authors?: string[];
  narrators?: string[];
  artists?: string[];
  publisher?: string;
  publishedDate?: string;
  language?: string;
  durationMs?: number;
  album?: string;
  explicit?: boolean;
  runtimeMinutes?: number;
  releaseYear?: number;
  contentRating?: string;
  directors?: string[];
  cast?: string[];
  genres?: string[];
  subjects?: string[];
  identifiers?: Record<string, string[]>;
  sources: string[];
  matchConfidence?: number;
};

type AdapterResult = {
  meta: ItemMeta | null;
  details?: Partial<ResolvedMediaDetails>;
  sourceId?: string;
};

type CatalogCandidate = {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  imageSrc?: string;
  language?: string;
  subjects?: string[];
  identifiers?: Record<string, string[]>;
  source: string;
  confidence?: number;
  runtimeMinutes?: number;
  releaseYear?: number;
  contentRating?: string;
  directors?: string[];
  cast?: string[];
  genres?: string[];
  providerItemType?: string;
};

const VIDEO_SUB_TYPES = new Set<MediaItemSubType | undefined>(['video', 'film', 'video_series']);
const CATALOG_HEADERS = {'User-Agent': 'Kindredly/3.1 (https://kindredly.ai)'};

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return result.length ? [...new Set(result)] : undefined;
}

function nonempty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function largerArtwork(url: unknown): string | undefined {
  const value = nonempty(url);
  return value?.replace(/\/\d+x\d+(bb)?\.(jpg|png)$/i, '/1200x1200bb.$2');
}

const STREAMING_PROVIDERS = new Set([
  'netflix',
  'prime_video',
  'disney_plus',
  'hulu',
  'max',
  'apple_tv',
  'paramount_plus',
  'peacock',
  'tubi',
  'crunchyroll',
]);

function cleanProviderTitle(title: string | undefined, provider?: string): string | undefined {
  if (!title) return undefined;
  // Apple prefixes its titles with an invisible left-to-right mark.
  let clean = title.replace(/[\u200e\u200f]/g, '');
  if (provider === 'libby') {
    clean = clean.match(/Cover Image:\s*(.+?)(?:\.\.\.|\s+Download\b|$)/i)?.[1] || clean;
  } else if (provider === 'audible') {
    clean = clean.replace(/\s+Audiobook\s+by\s+.+$/i, '');
  } else if (provider === 'goodreads') {
    // "Stand by Me by Stephen King | Goodreads": the byline is the last " by ".
    clean = clean.replace(/^(.*)\s+by\s+.+$/i, '$1');
  } else if (provider && STREAMING_PROVIDERS.has(provider)) {
    clean = clean.replace(/^\s*Watch\s+/i, '');
  }
  clean = clean
    .replace(
      /\s*[|–—-]\s*(Audible|Amazon(?:\.com)?|Spotify|Libby|OverDrive|Goodreads|Kobo|Netflix|Disney\+|Hulu|Max|Prime Video|Apple TV|Paramount\+|Peacock|Tubi|Plex|IMDb|Letterboxd|Rotten Tomatoes).*$/i,
      '',
    )
    .replace(/^Amazon\.com\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Apple TV: "Watch Severance - Show - Apple TV".
  if (provider === 'apple_tv') clean = clean.replace(/\s+-\s+(Show|Movie)$/i, '');
  return clean || undefined;
}

/**
 * Amazon's page title packs title, byline and store section together:
 * "Amazon.com: Project Hail Mary: A Novel eBook : Weir, Andy: Kindle Store" or
 * "Project Hail Mary: A Novel: Weir, Andy: 9780593135204: Amazon.com: Books".
 * The store section is also the only thing that says an Amazon product is a book.
 */
function splitAmazonTitle(raw: string | undefined): {title?: string; author?: string; isBook: boolean} {
  if (!raw) return {isBook: false};
  let rest = raw.replace(/^Amazon\.com\s*:\s*/i, '');
  const store = rest.match(
    /:\s*(?:[\dX-]{10,17}\s*:\s*)?(?:Amazon\.com\s*:\s*)?(Books|Kindle Store|Audible Books & Originals)\s*$/i,
  );
  if (store?.index != null) rest = rest.slice(0, store.index);

  let author: string | undefined;
  const byline = rest.match(/^(.*?)\s*(?:\be\s?Book\b|\bKindle Edition\b)?\s*:\s*([^:]+,[^:]+)$/i);
  if (byline) {
    rest = byline[1];
    const [last, first] = byline[2].split(',').map((part) => part.trim());
    author = first ? `${first} ${last}` : last;
  }
  const title = rest
    .replace(/\s*\b(e\s?Book|Kindle Edition)\s*$/i, '')
    .replace(/\s*:\s*A Novel$/i, '')
    .trim();
  return {title: title || undefined, author, isBook: !!store};
}

function normalizedTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*(edition|audiobook|unabridged)[^)]*\)/g, ' ')
    .replace(/\b(audiobook|unabridged|kindle|ebook|edition)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleScore(query: string, candidate: string): number {
  const left = normalizedTitle(query);
  const right = normalizedTitle(candidate);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const a = new Set(left.split(' '));
  const b = new Set(right.split(' '));
  const intersection = [...a].filter((token) => b.has(token)).length;
  const overlap = intersection / Math.max(a.size, b.size);
  if (left.startsWith(`${right} `) || right.startsWith(`${left} `))
    return Math.max(overlap, overlap >= 0.65 ? 0.9 : overlap);
  return overlap;
}

function catalogTitleScore(query: string, candidate: string, authors?: string[]): number {
  const base = titleScore(query, candidate);
  if (base >= 0.72 || !authors?.length) return base;
  const normalizedQuery = normalizedTitle(query);
  const authorTokens = new Set(normalizedTitle(authors.join(' ')).split(' ').filter(Boolean));
  const titleTokens = new Set(normalizedTitle(candidate).split(' ').filter(Boolean));
  const unexplained = normalizedQuery.split(' ').filter((token) => !titleTokens.has(token));
  return unexplained.length > 0 && unexplained.every((token) => authorTokens.has(token)) ? 0.95 : base;
}

function validIsbn(value: string): boolean {
  const isbn = value.replace(/[^0-9X]/gi, '').toUpperCase();
  if (/^\d{13}$/.test(isbn)) {
    const sum = isbn
      .slice(0, 12)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(isbn[12]);
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = isbn
      .split('')
      .reduce((total, digit, index) => total + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0);
    return sum % 11 === 0;
  }
  return false;
}

function extractIsbns(...values: Array<string | undefined>): string[] {
  const found = new Set<string>();
  for (const value of values) {
    for (const match of value?.match(/(?:97[89][-\s]?)?\d(?:[-\s]?\d){8,11}[\dX]/gi) || []) {
      const isbn = match.replace(/[^0-9X]/gi, '').toUpperCase();
      if (validIsbn(isbn)) found.add(isbn);
    }
  }
  return [...found];
}

function itemMeta(
  url: string,
  data: {title?: string; description?: string; imageSrc?: string; siteName?: string},
  sourceId: ItemMetaExtracted['sourceId'],
): ItemMeta {
  return {
    url,
    title: cleanProviderTitle(data.title),
    description: nonempty(data.description),
    imageSrc: nonempty(data.imageSrc),
    siteName: nonempty(data.siteName),
    tsExtractedInfo: {pageType: ItemResourceType.SITE_ITEM, sourceId},
  };
}

let spotifyToken: {value: string; expiresAt: number} | null = null;

async function getSpotifyToken(): Promise<string | null> {
  if (spotifyToken && spotifyToken.expiresAt > Date.now() + 30_000) return spotifyToken.value;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !secret) return null;
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      safeFetchConfig({
        timeout: 8000,
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );
    const token = nonempty(response.data?.access_token);
    if (!token) return null;
    spotifyToken = {value: token, expiresAt: Date.now() + Number(response.data?.expires_in || 3600) * 1000};
    return token;
  } catch (error) {
    console.warn('Spotify client-credentials metadata lookup failed', error);
    return null;
  }
}

async function fetchSpotify(url: string, recognized: RecognizedMediaMetadataUrl): Promise<AdapterResult> {
  const [itemType, id] = recognized.externalId.split(':', 2);
  const plural: Record<string, string> = {
    track: 'tracks',
    album: 'albums',
    artist: 'artists',
    playlist: 'playlists',
    show: 'shows',
    episode: 'episodes',
    audiobook: 'audiobooks',
  };
  const token = await getSpotifyToken();
  if (token && plural[itemType]) {
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/${plural[itemType]}/${encodeURIComponent(id)}`,
        safeFetchConfig({timeout: 8000, headers: {Authorization: `Bearer ${token}`}}),
      );
      const data = response.data || {};
      const artists = strings(data.artists?.map((artist: any) => artist?.name));
      const authors = strings(data.authors?.map((author: any) => author?.name));
      const image = data.images?.[0]?.url || data.album?.images?.[0]?.url;
      return {
        meta: itemMeta(
          url,
          {
            title: data.name,
            description: data.description || data.html_description,
            imageSrc: image,
            siteName: 'Spotify',
          },
          'provider_api',
        ),
        details: {
          artists,
          authors,
          album: nonempty(data.album?.name),
          durationMs: typeof data.duration_ms === 'number' ? data.duration_ms : undefined,
          explicit: typeof data.explicit === 'boolean' ? data.explicit : undefined,
          language: strings(data.languages)?.[0],
          publisher: nonempty(data.publisher),
        },
        sourceId: 'spotify_api',
      };
    } catch (error) {
      console.warn(`Spotify Web API metadata lookup failed for ${recognized.externalId}`, error);
    }
  }

  const response = await axios.get(
    'https://open.spotify.com/oembed',
    safeFetchConfig({timeout: 8000, params: {url: recognized.canonicalUrl}}),
  );
  return {
    meta: itemMeta(
      url,
      {title: response.data?.title, imageSrc: response.data?.thumbnail_url, siteName: 'Spotify'},
      'oembed',
    ),
    sourceId: 'spotify_oembed',
  };
}

async function fetchApple(url: string, recognized: RecognizedMediaMetadataUrl): Promise<AdapterResult> {
  const id = recognized.externalId.split(':').pop();
  const response = await axios.get('https://itunes.apple.com/lookup', safeFetchConfig({timeout: 8000, params: {id}}));
  const values: any[] = Array.isArray(response.data?.results) ? response.data.results : [];
  const data = values.find((entry) => entry.wrapperType !== 'collection') || values[0];
  if (!data) return {meta: null};
  const title = data.trackName || data.collectionName;
  return {
    meta: itemMeta(
      url,
      {
        title,
        description: data.description || data.longDescription,
        imageSrc: largerArtwork(data.artworkUrl600 || data.artworkUrl100),
        siteName:
          recognized.provider === 'apple_books'
            ? 'Apple Books'
            : recognized.provider === 'apple_podcasts'
              ? 'Apple Podcasts'
              : 'Apple Music',
      },
      'provider_api',
    ),
    details: {
      authors: recognized.provider === 'apple_books' ? strings([data.artistName]) : undefined,
      artists: recognized.provider !== 'apple_books' ? strings([data.artistName]) : undefined,
      album: nonempty(data.collectionName !== title ? data.collectionName : undefined),
      publisher: nonempty(data.sellerName),
      publishedDate: nonempty(data.releaseDate),
      durationMs: typeof data.trackTimeMillis === 'number' ? data.trackTimeMillis : undefined,
      explicit: typeof data.trackExplicitness === 'string' ? data.trackExplicitness !== 'notExplicit' : undefined,
      subjects: strings(data.genres || (data.primaryGenreName ? [data.primaryGenreName] : [])),
      identifiers: data.isbn ? {isbn: [String(data.isbn)]} : undefined,
    },
    sourceId: 'apple_lookup',
  };
}

function googleCandidate(data: any, source = 'google_books'): CatalogCandidate | null {
  const info = data?.volumeInfo;
  if (!info?.title) return null;
  const identifiers: Record<string, string[]> = {};
  for (const entry of info.industryIdentifiers || []) {
    if (entry?.type && entry?.identifier) identifiers[String(entry.type).toLowerCase()] = [String(entry.identifier)];
  }
  return {
    title: info.title,
    subtitle: nonempty(info.subtitle),
    authors: strings(info.authors),
    publisher: nonempty(info.publisher),
    publishedDate: nonempty(info.publishedDate),
    description: nonempty(info.description),
    imageSrc: largerArtwork(info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.thumbnail),
    language: nonempty(info.language),
    subjects: strings(info.categories),
    identifiers: Object.keys(identifiers).length ? identifiers : undefined,
    source,
  };
}

async function fetchGoogleVolume(url: string, recognized: RecognizedMediaMetadataUrl): Promise<AdapterResult> {
  if (!config.googleServiceApiKey) {
    const meta = await fetchGenericHtmlMeta(recognized.canonicalUrl);
    return {meta, sourceId: meta?.tsExtractedInfo?.sourceId || 'html_parser'};
  }
  const response = await axios.get(
    `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(recognized.externalId)}`,
    safeFetchConfig({timeout: 8000, params: {key: config.googleServiceApiKey}}),
  );
  const candidate = googleCandidate(response.data, 'google_books_volume');
  if (!candidate) return {meta: null};
  return {
    meta: itemMeta(url, candidate, 'provider_api'),
    details: candidate,
    sourceId: 'google_books',
  };
}

async function fetchDeezer(url: string, recognized: RecognizedMediaMetadataUrl): Promise<AdapterResult> {
  const [type, id] = recognized.externalId.split(':', 2);
  if (!/^(track|album|artist|playlist)$/.test(type) || !/^\d+$/.test(id)) return {meta: null};
  const response = await axios.get(`https://api.deezer.com/${type}/${id}`, safeFetchConfig({timeout: 8000}));
  const data = response.data || {};
  return {
    meta: itemMeta(
      url,
      {
        title: data.title || data.name,
        imageSrc: data.cover_xl || data.picture_xl || data.album?.cover_xl,
        siteName: 'Deezer',
      },
      'provider_api',
    ),
    details: {
      artists: strings([data.artist?.name || data.name]),
      album: nonempty(data.album?.title),
      durationMs: typeof data.duration === 'number' ? data.duration * 1000 : undefined,
      explicit: typeof data.explicit_lyrics === 'boolean' ? data.explicit_lyrics : undefined,
      publishedDate: nonempty(data.release_date),
    },
    sourceId: 'deezer_api',
  };
}

async function fetchSoundCloud(url: string): Promise<AdapterResult> {
  const response = await axios.get(
    'https://soundcloud.com/oembed',
    safeFetchConfig({timeout: 8000, params: {format: 'json', url}}),
  );
  return {
    meta: itemMeta(
      url,
      {
        title: response.data?.title,
        description: response.data?.description,
        imageSrc: response.data?.thumbnail_url,
        siteName: 'SoundCloud',
      },
      'oembed',
    ),
    details: {artists: strings([response.data?.author_name])},
    sourceId: 'soundcloud_oembed',
  };
}

function tmdbRequestConfig(params: Record<string, unknown> = {}) {
  const bearer = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!bearer && !apiKey) return null;
  return safeFetchConfig({
    timeout: 8000,
    params: {...params, ...(apiKey ? {api_key: apiKey} : {})},
    headers: bearer ? {Authorization: `Bearer ${bearer}`} : undefined,
  });
}

function tmdbCandidate(data: any, type: 'movie' | 'tv', source: string): CatalogCandidate | null {
  const title = nonempty(data?.title || data?.name);
  if (!title) return null;
  const releaseDate = nonempty(data.release_date || data.first_air_date);
  const crew: any[] = Array.isArray(data.credits?.crew) ? data.credits.crew : [];
  return {
    title,
    description: nonempty(data.overview),
    imageSrc: data.poster_path ? `https://image.tmdb.org/t/p/original${data.poster_path}` : undefined,
    publishedDate: releaseDate,
    releaseYear: releaseDate ? Number(releaseDate.slice(0, 4)) || undefined : undefined,
    language: nonempty(data.original_language),
    subjects: strings(data.genres?.map((genre: any) => genre?.name) || data.genre_ids?.map(String)),
    genres: strings(data.genres?.map((genre: any) => genre?.name)),
    providerItemType: type,
    runtimeMinutes: typeof data.runtime === 'number' ? data.runtime : undefined,
    directors: strings(crew.filter((entry) => entry?.job === 'Director').map((entry) => entry?.name)),
    cast: strings(data.credits?.cast?.slice(0, 12).map((entry: any) => entry?.name)),
    identifiers: {
      tmdb: [String(data.id)],
      ...(data.imdb_id || data.external_ids?.imdb_id
        ? {imdb: [String(data.imdb_id || data.external_ids.imdb_id)]}
        : {}),
    },
    source,
  };
}

async function fetchTmdbById(recognized: RecognizedMediaMetadataUrl): Promise<AdapterResult | null> {
  const requestConfig = tmdbRequestConfig({append_to_response: 'credits,external_ids'});
  if (!requestConfig || recognized.provider !== 'tmdb') return null;
  const type = recognized.providerItemType === 'tv' ? 'tv' : 'movie';
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/${type}/${encodeURIComponent(recognized.externalId)}`,
      requestConfig,
    );
    const candidate = tmdbCandidate(response.data, type, 'tmdb');
    if (!candidate) return null;
    return {
      meta: itemMeta(recognized.canonicalUrl, candidate, 'provider_api'),
      details: candidate,
      sourceId: 'tmdb_api',
    };
  } catch (error) {
    console.warn(`TMDB metadata lookup failed for ${recognized.externalId}`, error);
    return null;
  }
}

async function fetchOmdb(url: string, recognized: RecognizedMediaMetadataUrl): Promise<AdapterResult | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || recognized.provider !== 'imdb' || !/^tt\d+$/.test(recognized.externalId)) return null;
  try {
    const response = await axios.get(
      'https://www.omdbapi.com/',
      safeFetchConfig({
        timeout: 8000,
        params: {apikey: key, i: recognized.externalId, plot: 'full'},
      }),
    );
    const data = response.data || {};
    if (!data.Title || data.Response === 'False') return null;
    const runtime = Number(String(data.Runtime || '').match(/\d+/)?.[0]);
    const year = Number(String(data.Year || '').match(/\d{4}/)?.[0]);
    return {
      meta: itemMeta(
        url,
        {title: data.Title, description: data.Plot, imageSrc: data.Poster, siteName: 'IMDb'},
        'provider_api',
      ),
      details: {
        providerItemType: nonempty(data.Type)?.toLowerCase(),
        publishedDate: nonempty(data.Released),
        releaseYear: year || undefined,
        runtimeMinutes: runtime || undefined,
        contentRating: nonempty(data.Rated),
        directors: strings(String(data.Director || '').split(',')),
        cast: strings(String(data.Actors || '').split(',')),
        genres: strings(String(data.Genre || '').split(',')),
        language: nonempty(data.Language),
        identifiers: {imdb: [recognized.externalId]},
      },
      sourceId: 'omdb_api',
    };
  } catch (error) {
    console.warn(`OMDb metadata lookup failed for ${recognized.externalId}`, error);
    return null;
  }
}

async function searchTmdb(title: string, itemType?: string): Promise<CatalogCandidate[]> {
  const requestConfig = tmdbRequestConfig({query: title, include_adult: false});
  if (!requestConfig) return [];
  try {
    const explicitTv = /^(show|series|tv|episode)$/.test(itemType || '');
    const explicitMovie = /^(movie|film)$/.test(itemType || '');
    const searchType = explicitTv ? 'tv' : explicitMovie ? 'movie' : 'multi';
    const response = await axios.get(`https://api.themoviedb.org/3/search/${searchType}`, requestConfig);
    const results: any[] = Array.isArray(response.data?.results) ? response.data.results : [];
    return results
      .filter((data) => searchType !== 'multi' || data?.media_type === 'movie' || data?.media_type === 'tv')
      .slice(0, 5)
      .map((data) => {
        const candidate = tmdbCandidate(
          data,
          data?.media_type === 'tv' || searchType === 'tv' ? 'tv' : 'movie',
          'tmdb_search',
        );
        if (candidate) candidate.confidence = titleScore(title, candidate.title);
        return candidate;
      })
      .filter(
        (entry: CatalogCandidate | null): entry is CatalogCandidate => !!entry && (entry.confidence || 0) >= 0.72,
      );
  } catch (error) {
    console.warn('TMDB title search failed', error);
    return [];
  }
}

/**
 * IMDb answers servers with a challenge page, so its own title never arrives. Wikidata maps
 * IMDb ids (property P345) to the work, keyless: its label is the title and its description
 * says film or series.
 */
async function fetchWikidataByImdbId(
  url: string,
  recognized: RecognizedMediaMetadataUrl,
): Promise<AdapterResult | null> {
  if (recognized.provider !== 'imdb' || !/^tt\d+$/.test(recognized.externalId)) return null;
  try {
    const search = await axios.get(
      'https://www.wikidata.org/w/api.php',
      safeFetchConfig({
        timeout: 8000,
        params: {
          action: 'query',
          list: 'search',
          srsearch: `haswbstatement:P345=${recognized.externalId}`,
          srlimit: 1,
          format: 'json',
        },
        headers: CATALOG_HEADERS,
      }),
    );
    const wikidataId = nonempty(search.data?.query?.search?.[0]?.title);
    if (!wikidataId || !/^Q\d+$/.test(wikidataId)) return null;
    const response = await axios.get(
      'https://www.wikidata.org/w/api.php',
      safeFetchConfig({
        timeout: 8000,
        params: {
          action: 'wbgetentities',
          ids: wikidataId,
          props: 'labels|descriptions',
          languages: 'en',
          format: 'json',
        },
        headers: CATALOG_HEADERS,
      }),
    );
    const entity = response.data?.entities?.[wikidataId];
    const title = nonempty(entity?.labels?.en?.value);
    if (!title) return null;
    const subType = wikidataVideoSubType(nonempty(entity?.descriptions?.en?.value) || '');
    return {
      meta: itemMeta(url, {title, siteName: 'IMDb'}, 'provider_api'),
      details: {
        providerItemType: subType === 'film' ? 'movie' : subType === 'video_series' ? 'series' : undefined,
        identifiers: {imdb: [recognized.externalId], wikidata: [wikidataId]},
      },
      sourceId: 'wikidata',
    };
  } catch (error) {
    console.warn(`Wikidata IMDb lookup failed for ${recognized.externalId}`, error);
    return null;
  }
}

/** Film or series from Wikidata's own description ("2010 film directed by…", "American sitcom"). */
function wikidataVideoSubType(description: string): 'film' | 'video_series' | undefined {
  const text = description.toLowerCase();
  // Same-named soundtracks, games, books, episodes and film franchises are not the title itself.
  if (/\b(soundtrack|album|song|video game|novel|book|franchise|film series|episode|season)\b/.test(text))
    return undefined;
  if (/\b(television|tv) film\b/.test(text)) return 'film';
  if (/\b(series|miniseries|docuseries|sitcom|soap opera|(television|tv) (show|program|programme))\b/.test(text)) {
    return 'video_series';
  }
  if (/\b(film|movie)\b/.test(text)) return 'film';
  return undefined;
}

/**
 * Decide Film vs Series when neither the URL nor the provider said (a Netflix /title/ link is
 * either). Wikidata is CC0 and keyless, so unlike TMDB it needs no commercial license. Takes the
 * first result whose label is this title and whose description names a film or a series;
 * Wikidata ranks well-known works first, so "Severance" is the 2022 series, not the 2006 film.
 */
async function fetchWikidataVideoSubType(
  title: string,
): Promise<{subType: 'film' | 'video_series'; wikidataId: string} | undefined> {
  try {
    const response = await axios.get(
      'https://www.wikidata.org/w/api.php',
      safeFetchConfig({
        timeout: 8000,
        params: {action: 'wbsearchentities', search: title, language: 'en', type: 'item', limit: 10, format: 'json'},
        headers: CATALOG_HEADERS,
      }),
    );
    const results: any[] = Array.isArray(response.data?.search) ? response.data.search : [];
    for (const entry of results) {
      const score = Math.max(
        titleScore(title, nonempty(entry?.label) || ''),
        titleScore(title, nonempty(entry?.match?.text) || ''),
      );
      if (score < 1) continue;
      const subType = wikidataVideoSubType(nonempty(entry?.description) || '');
      const wikidataId = nonempty(entry?.id);
      if (subType && wikidataId) return {subType, wikidataId};
    }
  } catch (error) {
    console.warn('Wikidata film/series lookup failed', error);
  }
  return undefined;
}

async function fetchProviderApi(url: string, recognized: RecognizedMediaMetadataUrl): Promise<AdapterResult | null> {
  if (recognized.provider === 'spotify') return fetchSpotify(url, recognized);
  if (
    recognized.provider === 'apple_books' ||
    recognized.provider === 'apple_music' ||
    recognized.provider === 'apple_podcasts'
  ) {
    return fetchApple(url, recognized);
  }
  if (recognized.provider === 'google_books') return fetchGoogleVolume(url, recognized);
  if (recognized.provider === 'deezer') return fetchDeezer(url, recognized);
  if (recognized.provider === 'soundcloud') return fetchSoundCloud(url);
  return (
    (await fetchTmdbById(recognized)) ||
    (await fetchOmdb(url, recognized)) ||
    (await fetchWikidataByImdbId(url, recognized))
  );
}

async function fetchProvider(url: string, recognized: RecognizedMediaMetadataUrl): Promise<AdapterResult> {
  try {
    const api = await fetchProviderApi(url, recognized);
    // An API that knows nothing about this id (an Apple Books id the lookup has no
    // record of) is no better than no API; the page itself may still name it.
    if (api?.meta?.title) return api;
  } catch (error) {
    console.warn(`Provider API metadata lookup failed for ${recognized.provider}`, error);
  }

  const meta = await fetchGenericHtmlMeta(recognized.canonicalUrl);
  return {meta, sourceId: meta?.tsExtractedInfo?.sourceId || 'html_parser'};
}

async function fetchOpenLibrary(isbns: string[], title?: string, author?: string): Promise<CatalogCandidate[]> {
  try {
    if (isbns.length) {
      const bibkeys = isbns.map((isbn) => `ISBN:${isbn}`).join(',');
      const response = await axios.get(
        'https://openlibrary.org/api/books',
        safeFetchConfig({
          timeout: 8000,
          params: {bibkeys, jscmd: 'data', format: 'json'},
          headers: CATALOG_HEADERS,
        }),
      );
      return Object.values(response.data || {})
        .map((book: any) => ({
          title: book.title,
          subtitle: nonempty(book.subtitle),
          authors: strings(book.authors?.map((entry: any) => entry?.name)),
          publisher: nonempty(book.publishers?.[0]?.name),
          publishedDate: nonempty(book.publish_date),
          description: nonempty(book.notes || book.excerpts?.[0]?.text),
          imageSrc: nonempty(book.cover?.large || book.cover?.medium),
          subjects: strings(book.subjects?.map((entry: any) => entry?.name)),
          identifiers: book.identifiers,
          source: 'open_library_isbn',
          confidence: 1,
        }))
        .filter((entry: CatalogCandidate) => !!entry.title);
    }
    if (!title) return [];
    const response = await axios.get(
      'https://openlibrary.org/search.json',
      safeFetchConfig({
        timeout: 8000,
        params: {
          q: title,
          ...(author ? {author} : {}),
          limit: 5,
          fields: 'key,title,subtitle,author_name,first_publish_year,isbn,cover_i,publisher,language,subject',
        },
        headers: CATALOG_HEADERS,
      }),
    );
    return (Array.isArray(response.data?.docs) ? response.data.docs : [])
      .map((book: any) => ({
        title: book.title,
        subtitle: nonempty(book.subtitle),
        authors: strings(book.author_name),
        publisher: nonempty(book.publisher?.[0]),
        publishedDate: book.first_publish_year ? String(book.first_publish_year) : undefined,
        imageSrc: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : undefined,
        language: nonempty(book.language?.[0]),
        subjects: strings(book.subject?.slice(0, 30)),
        identifiers: book.isbn?.length ? {isbn: strings(book.isbn)} : undefined,
        source: 'open_library_search',
        confidence: catalogTitleScore(title, book.title || '', strings(book.author_name)),
      }))
      .filter((entry: CatalogCandidate) => !!entry.title && (entry.confidence || 0) >= 0.72);
  } catch (error) {
    console.warn('Open Library metadata lookup failed', error);
    return [];
  }
}

async function fetchGoogleBooks(isbns: string[], title?: string, author?: string): Promise<CatalogCandidate[]> {
  if (!config.googleServiceApiKey) return [];
  try {
    const q = isbns[0]
      ? `isbn:${isbns[0]}`
      : [title ? `intitle:${title}` : '', author ? `inauthor:${author}` : ''].filter(Boolean).join('+');
    if (!q) return [];
    const response = await axios.get(
      'https://www.googleapis.com/books/v1/volumes',
      safeFetchConfig({
        timeout: 8000,
        params: {q, maxResults: 5, projection: 'full', key: config.googleServiceApiKey},
      }),
    );
    return (Array.isArray(response.data?.items) ? response.data.items : [])
      .map((entry: any) => {
        const candidate = googleCandidate(entry);
        if (candidate && title) candidate.confidence = catalogTitleScore(title, candidate.title, candidate.authors);
        else if (candidate && isbns.length) candidate.confidence = 1;
        return candidate;
      })
      .filter(
        (entry: CatalogCandidate | null): entry is CatalogCandidate => !!entry && (entry.confidence || 0) >= 0.72,
      );
  } catch (error) {
    console.warn('Google Books metadata lookup failed', error);
    return [];
  }
}

function mergeDetails(target: ResolvedMediaDetails, values?: Partial<ResolvedMediaDetails>): void {
  if (!values) return;
  for (const key of ['title', 'subtitle', 'publisher', 'publishedDate', 'language', 'album'] as const) {
    if (!target[key] && values[key]) target[key] = values[key];
  }
  for (const key of ['authors', 'narrators', 'artists', 'subjects'] as const) {
    if ((!target[key] || target[key]?.length === 0) && values[key]?.length) target[key] = values[key];
  }
  if (target.durationMs == null && values.durationMs != null) target.durationMs = values.durationMs;
  if (target.explicit == null && values.explicit != null) target.explicit = values.explicit;
  if (target.runtimeMinutes == null && values.runtimeMinutes != null) target.runtimeMinutes = values.runtimeMinutes;
  if (target.releaseYear == null && values.releaseYear != null) target.releaseYear = values.releaseYear;
  if (!target.contentRating && values.contentRating) target.contentRating = values.contentRating;
  for (const key of ['directors', 'cast', 'genres'] as const) {
    if ((!target[key] || target[key]?.length === 0) && values[key]?.length) target[key] = values[key];
  }
  if (!target.identifiers && values.identifiers) target.identifiers = values.identifiers;
}

/** Resolve a recognized media URL through provider APIs/pages and public catalogs. */
export async function resolveMediaMetadata(url: string): Promise<{
  recognized: RecognizedMediaMetadataUrl;
  meta: ItemMeta;
  extendedInfo: ExternalMetaExtendedInfo;
} | null> {
  const recognized = recognizeMediaMetadataUrl(url);
  if (!recognized) return null;

  const providerResult = await fetchProvider(url, recognized);
  const providerMeta = providerResult.meta || {};
  const amazon = recognized.provider === 'amazon_books' ? splitAmazonTitle(providerMeta.title) : undefined;
  const title =
    (amazon ? amazon.title : cleanProviderTitle(providerMeta.title, recognized.provider)) || recognized.titleHint;
  const isbns = extractIsbns(recognized.isbn, providerMeta.description, providerMeta.title, recognized.canonicalUrl);
  const providerAuthors = providerResult.details?.authors || (amazon?.author ? [amazon.author] : undefined);
  const knownSubType = recognized.subType ?? (amazon?.isBook ? 'book' : undefined);

  // Hoopla titles can be books, film or music; a confident book-catalog match is what makes one a Book.
  const searchesBookCatalogs =
    knownSubType === 'book' || knownSubType === 'audiobook' || recognized.providerItemType === 'library_title';
  const isVideo = VIDEO_SUB_TYPES.has(recognized.subType);

  let catalog: CatalogCandidate | undefined;
  if (searchesBookCatalogs && (isbns.length || title)) {
    const author = providerAuthors?.[0];
    const [google, openLibrary] = await Promise.all([
      fetchGoogleBooks(isbns, title, author),
      fetchOpenLibrary(isbns, title, author),
    ]);
    catalog = [...google, ...openLibrary].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
  } else if (isVideo && title) {
    catalog = (await searchTmdb(title, recognized.providerItemType))[0];
  }

  const providerItemType =
    providerResult.details?.providerItemType ||
    catalog?.providerItemType ||
    (amazon?.isBook ? 'book' : recognized.providerItemType);
  const details: ResolvedMediaDetails = {
    provider: recognized.provider,
    subType: refineMediaSubType(
      knownSubType ?? (searchesBookCatalogs && catalog ? 'book' : undefined),
      providerItemType,
    ),
    providerItemType,
    externalId: recognized.externalId,
    canonicalUrl: recognized.canonicalUrl,
    title: title || catalog?.title,
    sources: [providerResult.sourceId || 'provider_url'],
  };
  mergeDetails(details, {...providerResult.details, authors: providerAuthors});
  if (catalog) {
    mergeDetails(details, catalog);
    details.sources.push(catalog.source);
    details.matchConfidence = catalog.confidence;
  }
  if (details.subType === 'video' && details.title) {
    const wikidata = await fetchWikidataVideoSubType(details.title);
    if (wikidata) {
      details.subType = wikidata.subType;
      details.identifiers = {...details.identifiers, wikidata: [wikidata.wikidataId]};
      details.sources.push('wikidata');
    }
  }
  if (isbns.length) {
    details.identifiers = {
      ...details.identifiers,
      isbn: [...new Set([...(details.identifiers?.isbn || []), ...isbns])],
    };
  }

  const meta: ItemMeta = {
    ...providerMeta,
    url: recognized.canonicalUrl,
    title: title || catalog?.title || recognized.titleHint,
    description: providerMeta.description || catalog?.description,
    imageSrc: providerMeta.imageSrc || catalog?.imageSrc,
    siteName: providerMeta.siteName || recognized.provider,
    tsManifest: {
      version: providerMeta.tsManifest?.version || 2.0,
      ...(providerMeta.tsManifest || {}),
      mediaMetadata: details,
    },
    tsExtractedInfo: {
      ...(providerMeta.tsExtractedInfo || {}),
      pageType: ItemResourceType.SITE_ITEM,
      sourceId:
        !providerMeta.tsExtractedInfo?.sourceId || providerMeta.tsExtractedInfo.sourceId === 'parser_err'
          ? catalog
            ? isVideo
              ? 'provider_api'
              : 'book_catalog'
            : 'provider_url'
          : providerMeta.tsExtractedInfo.sourceId,
    },
    resolved: !!(title || catalog?.title),
  };

  return {
    recognized,
    meta,
    extendedInfo: {source: recognized.provider, rawData: {mediaMetadata: details}},
  };
}
