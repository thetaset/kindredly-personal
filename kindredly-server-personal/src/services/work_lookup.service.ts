/**
 * Finds a book, film, TV series, album or song by name for Kinbot's addWork (HAT-794): the work's
 * own page (its Wikipedia article, or Open Library's for a book Wikipedia has no article on), its
 * picture, a sentence or two about it, and where it can be read, watched or heard as extra links.
 * A store or a streaming service is never the work's own page — the founder's words: "a novel
 * first, and then a product second".
 *
 * One Wikipedia search answers both which pages could be meant and which of them are works of the
 * kind asked for: it ranks well-known works first, and each page's short description ("2020 fantasy
 * novel by Susanna Clarke") says what it is. Wikidata (CC0, keyless) holds the ids the extra links
 * are built from, read only for the one work picked. Never throws: a source that fails gives fewer
 * results.
 */
import axios from 'axios';
import {safeFetchConfig} from '@/utils/safe_fetch';
// Wikimedia answers a burst with 429; read as "nothing found", it told a parent a book did not exist.
import {getWithRetry} from '@/services/wikipedia_source';
import type {FindWorkRequest, FindWorkResponse, FoundWork, WorkKind, WorkLink} from 'tset-sharedlib/types/work.types';

const HEADERS = {'User-Agent': 'Kindredly/3.1 (https://kindredly.ai)'};
const TIMEOUT_MS = 8000;
const MAX_CHOICES = 5;
const SEARCH_LIMIT = 10;
const MAX_SUMMARY = 400;
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

const KINDS: ReadonlySet<string> = new Set(['book', 'film', 'video_series', 'music', 'song']);

/** Added to a search when the plain title found nothing of the kind asked for. */
const KIND_SEARCH_WORD: Record<WorkKind, string> = {
  book: 'novel',
  film: 'film',
  video_series: 'TV series',
  music: 'album',
  song: 'song',
};

export function isWorkKind(value: unknown): value is WorkKind {
  return typeof value === 'string' && KINDS.has(value);
}

/**
 * What a Wikipedia short description, or a title's "(2021 film)", says the page is; null for
 * anything but one work. What a page is comes before who made it ("2006 film directed by…"), so
 * only that part is read: "Accolades received by American film" is not a film.
 */
export function kindFromDescription(description: string | null | undefined): WorkKind | null {
  const text = String(description || '').toLowerCase();
  const head = text.split(/\s(?:by|directed|starring|based on|featuring|written|created|adapted)\s/)[0];
  if (!head.trim()) return null;
  // Same-named episodes, seasons, games, characters and franchises are not the work itself.
  if (/\b(episodes?|season|franchise|characters?|video game|film series|trilogy|list)\b/.test(head)) return null;
  // Nor is a person or a company named in a work's field: "British film producer".
  const people =
    /\b(producer|director|actor|actress|author|writer|novelist|illustrator|poet|singer|songwriter|musician|composer|rapper|band|filmmaker|critic|journalist|company|publisher)s?\b|\bstudios?\b(?! album)/;
  if (people.test(head)) return null;
  // A franchise of films is not one work; a series of novels is books, never a TV series:
  // "Series of seven fantasy novels by C. S. Lewis", "Fantasy literature series".
  if (/\bseries of\b.*\b(films|movies)\b/.test(head)) return null;
  if (
    /\b(book|novel|comic|manga|literature|literary) series\b/.test(head) ||
    /\bseries of\b.*\b(novels?|novellas?|books?|comics?|manga|stories)\b/.test(head)
  ) {
    return 'book';
  }
  // "2026 film score" is music, not the film.
  if (/\b(score|soundtrack)\b/.test(head)) return 'music';
  if (/\b(series|miniseries|docuseries|sitcom|soap opera|(television|tv) (show|programme|program))\b/.test(head)) {
    return 'video_series';
  }
  if (/\b(film|movie)\b/.test(head)) return 'film';
  if (/\b(album|ep|mixtape)\b/.test(head)) return 'music';
  if (/\b(song|single)\b/.test(head)) return 'song';
  if (/\b(novels?|novella|novelette|book|memoir|short stor(y|ies)|comics?|manga|poems?|poetry)\b/.test(head)) {
    return 'book';
  }
  return null;
}

/** "Dune (2021 film)" → "Dune". */
export function baseTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim() || title.trim();
}

function disambiguator(title: string): string {
  return title.match(/\(([^)]*)\)\s*$/)?.[1] || '';
}

/** A title as compared: no accents, case, punctuation, or "&" for "and"; `loose` also drops a leading article. */
export function normalizedTitle(value: string, loose = false): string {
  const text = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return loose ? text.replace(/^(the|a|an) /, '') : text;
}

/**
 * Wikipedia gives the best-known work of a name the bare title ("Inside Out", the 2015 film) and
 * the rest a "(2011 film)". Among works of one kind, that one is the one meant.
 */
function isPrimaryTopic(work: FoundWork): boolean {
  return work.source === 'wikipedia' && !/\)$/.test(decodeURIComponent(work.url));
}

function yearIn(text: string): number | null {
  const match = text.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? Number(match[1]) : null;
}

/** "2019 American film by Greta Gerwig" → "Greta Gerwig". */
export function byFromDescription(description: string | null | undefined): string | null {
  const match = String(description || '').match(/\bby (.+)$/);
  if (!match) return null;
  const by = match[1].split(/,| featuring | and | starring | from | for /)[0].trim();
  return by || null;
}

function clean(value: unknown, max: number): string | null {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) return null;
  // A pronunciation stripped from plain text leaves "( )" or "(; )" behind.
  const tidy = text.replace(/\s*\([\s;,]*\)/g, '').trim();
  if (tidy.length <= max) return tidy;
  const cut = tidy.slice(0, max);
  const lastStop = cut.lastIndexOf('. ');
  return lastStop > max / 2 ? cut.slice(0, lastStop + 1) : `${cut.slice(0, max - 1)}…`;
}

function wikipediaUrl(title: string): string {
  const path = encodeURIComponent(title.replace(/ /g, '_'))
    .replace(/%2C/g, ',')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/');
  return `https://en.wikipedia.org/wiki/${path}`;
}

/** Wikipedia's image addresses carry tracking parameters for the API's own statistics. */
function imageWithoutTracking(url: unknown): string | null {
  if (typeof url !== 'string' || !/^https:\/\//.test(url)) return null;
  return url.replace(/\?utm_source=.*$/, '');
}

type WikiPage = {
  index?: number;
  title: string;
  description?: string;
  extract?: string;
  pageprops?: {wikibase_item?: string; disambiguation?: string};
  thumbnail?: {source?: string};
  missing?: boolean;
};

async function wikipediaPages(params: Record<string, string | number>): Promise<WikiPage[]> {
  try {
    const response = await getWithRetry(
      WIKIPEDIA_API,
      safeFetchConfig({
        timeout: TIMEOUT_MS,
        headers: HEADERS,
        params: {
          action: 'query',
          format: 'json',
          formatversion: 2,
          redirects: 1,
          prop: 'description|pageprops|pageimages|extracts',
          ppprop: 'wikibase_item|disambiguation',
          piprop: 'thumbnail',
          pithumbsize: 500,
          // A book's cover and a film's poster are not free images; a page's own picture is shown either way.
          pilicense: 'any',
          exintro: 1,
          explaintext: 1,
          exsentences: 2,
          exlimit: 'max',
          ...params,
        },
      }),
    );
    const pages: WikiPage[] = Array.isArray(response.data?.query?.pages) ? response.data.query.pages : [];
    return pages.filter((p) => !p.missing && p.title).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  } catch (error) {
    console.warn('[work_lookup] Wikipedia read failed', (error as any)?.message || error);
    return [];
  }
}

/** A Wikipedia page as a work, or null when it is not one (a person, a place, a list). */
export function workFromWikipediaPage(page: WikiPage): FoundWork | null {
  const workId = page.pageprops?.wikibase_item;
  if (!workId || page.pageprops?.disambiguation !== undefined) return null;
  if (/^list of /i.test(page.title)) return null;
  const about = page.description?.trim() || null;
  const kind = kindFromDescription(about) ?? kindFromDescription(disambiguator(page.title));
  if (!kind) return null;
  return {
    workId,
    title: baseTitle(page.title),
    kind,
    about,
    by: byFromDescription(about),
    year: yearIn(about || '') ?? yearIn(disambiguator(page.title)),
    url: wikipediaUrl(page.title),
    source: 'wikipedia',
    summary: clean(page.extract, MAX_SUMMARY),
    imageUrl: imageWithoutTracking(page.thumbnail?.source),
  };
}

async function searchWikipediaWorks(query: string): Promise<FoundWork[]> {
  const pages = await wikipediaPages({generator: 'search', gsrsearch: query, gsrlimit: SEARCH_LIMIT, gsrnamespace: 0});
  return pages.map(workFromWikipediaPage).filter((w): w is FoundWork => !!w);
}

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

function workFromOpenLibrary(doc: OpenLibraryDoc): FoundWork | null {
  const workId = doc.key?.match(/OL\d+W$/)?.[0];
  const title = doc.title?.trim();
  if (!workId || !title) return null;
  const by = doc.author_name?.[0]?.trim() || null;
  const year = Number.isFinite(doc.first_publish_year) ? Number(doc.first_publish_year) : null;
  return {
    workId,
    title,
    kind: 'book',
    about: [year, 'book', by ? `by ${by}` : ''].filter(Boolean).join(' '),
    by,
    year,
    url: `https://openlibrary.org/works/${workId}`,
    source: 'open_library',
    summary: null,
    imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
  };
}

async function searchOpenLibraryWorks(title: string, by?: string): Promise<FoundWork[]> {
  try {
    const response = await axios.get(
      'https://openlibrary.org/search.json',
      safeFetchConfig({
        timeout: TIMEOUT_MS,
        headers: HEADERS,
        params: {
          title,
          ...(by ? {author: by} : {}),
          limit: SEARCH_LIMIT,
          fields: 'key,title,author_name,first_publish_year,cover_i',
        },
      }),
    );
    const docs: OpenLibraryDoc[] = Array.isArray(response.data?.docs) ? response.data.docs : [];
    // Open Library often holds one book as several works; the first, best-ranked, stands for them.
    const seen = new Set<string>();
    return docs
      .map(workFromOpenLibrary)
      .filter((w): w is FoundWork => !!w)
      .filter((w) => {
        const key = `${normalizedTitle(w.title)}|${normalizedTitle(w.by || '')}`;
        return !seen.has(key) && !!seen.add(key);
      });
  } catch (error) {
    console.warn('[work_lookup] Open Library search failed', (error as any)?.message || error);
    return [];
  }
}

/** An Open Library work by id, with its description; its author's name is a second read. */
async function openLibraryWork(workId: string): Promise<FoundWork | null> {
  try {
    const response = await axios.get(
      `https://openlibrary.org/works/${workId}.json`,
      safeFetchConfig({timeout: TIMEOUT_MS, headers: HEADERS}),
    );
    const data = response.data || {};
    const authorKey: string | undefined = data.authors?.[0]?.author?.key;
    let by: string | null = null;
    if (authorKey && /^\/authors\/OL\d+A$/.test(authorKey)) {
      const author = await axios
        .get(`https://openlibrary.org${authorKey}.json`, safeFetchConfig({timeout: TIMEOUT_MS, headers: HEADERS}))
        .catch(() => null);
      by = typeof author?.data?.name === 'string' ? author.data.name.trim() || null : null;
    }
    const work = workFromOpenLibrary({
      key: workId,
      title: data.title,
      author_name: by ? [by] : undefined,
      cover_i: Array.isArray(data.covers)
        ? data.covers.find((c: unknown) => typeof c === 'number' && c > 0)
        : undefined,
      first_publish_year: yearIn(String(data.first_publish_date || '')) ?? undefined,
    });
    if (!work) return null;
    const description = typeof data.description === 'string' ? data.description : data.description?.value;
    // Open Library descriptions often end in a source note or a markdown link list.
    work.summary = clean(String(description || '').split(/\n\s*(?:-{3,}|\(\[source\]|\[source\])/i)[0], MAX_SUMMARY);
    return work;
  } catch (error) {
    console.warn('[work_lookup] Open Library work read failed', (error as any)?.message || error);
    return null;
  }
}

/** Wikidata's string ids for one item, by property: `{P345: ['tt1160419']}`. */
async function wikidataIds(wikidataId: string): Promise<{ids: Record<string, string[]>; enwikiTitle: string | null}> {
  try {
    const response = await getWithRetry(
      WIKIDATA_API,
      safeFetchConfig({
        timeout: TIMEOUT_MS,
        headers: HEADERS,
        params: {
          action: 'wbgetentities',
          ids: wikidataId,
          props: 'claims|sitelinks',
          sitefilter: 'enwiki',
          format: 'json',
        },
      }),
    );
    const entity = response.data?.entities?.[wikidataId];
    const ids: Record<string, string[]> = {};
    for (const [property, claims] of Object.entries<any[]>(entity?.claims || {})) {
      const values = (Array.isArray(claims) ? claims : [])
        .filter((c) => c?.rank !== 'deprecated')
        .map((c) => c?.mainsnak?.datavalue?.value)
        .filter((v): v is string => typeof v === 'string' && !!v.trim());
      if (values.length) ids[property] = values;
    }
    const enwikiTitle = typeof entity?.sitelinks?.enwiki?.title === 'string' ? entity.sitelinks.enwiki.title : null;
    return {ids, enwikiTitle};
  } catch (error) {
    console.warn('[work_lookup] Wikidata read failed', (error as any)?.message || error);
    return {ids: {}, enwikiTitle: null};
  }
}

const SAFE_ID = /^[A-Za-z0-9._\-/]{1,80}$/;

/**
 * Where a work can be read, watched or heard, from its Wikidata ids. Only services Wikidata says
 * carry it get a link of their own; a search link stands in where no id exists (a book in a store
 * or a library, a film's streaming services on JustWatch). Never the work's own page.
 */
export function workLinks(
  work: Pick<FoundWork, 'kind' | 'title' | 'by' | 'source'>,
  ids: Record<string, string[]>,
): WorkLink[] {
  const links: WorkLink[] = [];
  const first = (property: string) => {
    const value = ids[property]?.[0];
    return value && SAFE_ID.test(value) ? value : null;
  };
  const add = (title: string, use: WorkLink['use'], url: string | null) => {
    if (url) links.push({title, use, url});
  };
  const searchWords = encodeURIComponent([work.title, work.by].filter(Boolean).join(' '));

  if (work.kind === 'book') {
    const gutenberg = first('P2034');
    if (gutenberg && /^\d+$/.test(gutenberg))
      add('Project Gutenberg', 'read', `https://www.gutenberg.org/ebooks/${gutenberg}`);
    const openLibrary = first('P648');
    if (work.source !== 'open_library' && openLibrary && /^OL\d+W$/.test(openLibrary)) {
      // Open Library's record of the work is a reference page, as IMDb is for a film.
      add('Open Library', 'about', `https://openlibrary.org/works/${openLibrary}`);
    }
    // Libby's own links name the reader's library; OverDrive's catalog is the one behind it.
    add('OverDrive', 'read', `https://www.overdrive.com/search?q=${searchWords}`);
    add('Amazon', 'buy', `https://www.amazon.com/s?k=${searchWords}&i=stripbooks`);
    return links;
  }

  if (work.kind === 'film' || work.kind === 'video_series') {
    const film = work.kind === 'film';
    const imdb = first('P345');
    if (imdb && /^tt\d+$/.test(imdb)) add('IMDb', 'about', `https://www.imdb.com/title/${imdb}/`);
    add('JustWatch', 'watch', `https://www.justwatch.com/us/search?q=${encodeURIComponent(work.title)}`);
    const netflix = first('P1874');
    if (netflix && /^\d+$/.test(netflix)) add('Netflix', 'watch', `https://www.netflix.com/title/${netflix}`);
    const disney = first(film ? 'P7595' : 'P7596');
    if (disney) add('Disney+', 'watch', `https://www.disneyplus.com/${film ? 'movies/wd' : 'series/wp'}/${disney}`);
    const apple = first(film ? 'P9586' : 'P9751');
    if (apple) add('Apple TV', 'watch', `https://tv.apple.com/${film ? 'movie' : 'show'}/${apple}`);
    const prime = first('P8055');
    if (prime) add('Prime Video', 'watch', `https://www.amazon.com/gp/video/detail/${prime}`);
    const hulu = first(film ? 'P6466' : 'P6467');
    if (hulu) add('Hulu', 'watch', `https://www.hulu.com/${film ? 'movie' : 'series'}/${hulu}`);
    return links;
  }

  // An album or a song.
  const album = work.kind === 'music';
  const spotify = first(album ? 'P2205' : 'P2207');
  if (spotify) add('Spotify', 'listen', `https://open.spotify.com/${album ? 'album' : 'track'}/${spotify}`);
  const appleMusic = album ? first('P2281') : null;
  if (appleMusic && /^\d+$/.test(appleMusic))
    add('Apple Music', 'listen', `https://music.apple.com/album/${appleMusic}`);
  return links;
}

type Wanted = {kind?: WorkKind; by?: string; year?: number};

/** Keeps what fits the kind, author and year asked for. Never empties the list for an author or a year a description leaves out. */
function fitting(works: FoundWork[], want: Wanted): {works: FoundWork[]; narrowed: boolean} {
  let pool = want.kind ? works.filter((w) => w.kind === want.kind) : works;
  let narrowed = true;
  if (want.by) {
    const surname = normalizedTitle(want.by).split(' ').pop() || '';
    const byMatch = pool.filter((w) =>
      normalizedTitle(`${w.by || ''} ${w.about || ''} ${w.summary || ''}`)
        .split(' ')
        .includes(surname),
    );
    if (byMatch.length) pool = byMatch;
    else narrowed = false;
  }
  if (want.year) {
    const yearMatch = pool.filter((w) => w.year !== null && Math.abs(w.year - want.year!) <= 1);
    if (yearMatch.length) pool = yearMatch;
    else narrowed = false;
  }
  return {works: pool, narrowed};
}

function uniqueWorks(works: FoundWork[]): FoundWork[] {
  const seen = new Set<string>();
  return works.filter((w) => !seen.has(w.workId) && !!seen.add(w.workId));
}

/**
 * Which of the found works the person meant. Exactly one with their title is the answer; more than
 * one is a question for them; none with that title gives the nearest, for Kinbot to judge or ask.
 * An author or a year that matched nothing never picks one on its own.
 */
export function pickWorks(query: string, found: FoundWork[], want: Wanted): FindWorkResponse {
  const {works, narrowed} = fitting(uniqueWorks(found), want);
  // "Wonder" is the novel titled Wonder before "The Wonder"; a title without its article counts only when nothing has it exactly.
  const titled = (loose: boolean) =>
    works.filter((w) => normalizedTitle(w.title, loose) === normalizedTitle(query, loose));
  let exact = titled(false);
  if (!exact.length) exact = titled(true);
  const oneKind = exact.length > 1 && exact.every((w) => w.kind === exact[0].kind);
  const primary = oneKind ? exact.filter(isPrimaryTopic) : [];
  if (primary.length === 1) exact = primary;
  if (exact.length === 1 && narrowed) return {match: 'one', works: exact};
  if (exact.length > 1) return {match: 'several', works: exact.slice(0, MAX_CHOICES)};
  if (works.length) return {match: 'close', works: uniqueWorks([...exact, ...works]).slice(0, MAX_CHOICES)};
  return {match: 'none', works: []};
}

/**
 * The picked work with its links: Wikidata's ids for a Wikipedia work, a fuller read for an Open
 * Library one. `knownIds` are the work's Wikidata ids when they were already read.
 */
async function withLinks(work: FoundWork, knownIds?: Record<string, string[]>): Promise<FoundWork> {
  if (work.source === 'open_library') {
    const full = (await openLibraryWork(work.workId)) || work;
    const merged = {...work, summary: full.summary || work.summary, imageUrl: work.imageUrl || full.imageUrl};
    return {...merged, links: workLinks(merged, {})};
  }
  const ids = knownIds ?? (await wikidataIds(work.workId)).ids;
  return {...work, links: workLinks(work, ids)};
}

/**
 * The Wikipedia article title in an en.wikipedia.org address, or null. Only English Wikipedia: its
 * titles are what is looked up, and another language's title can name a different English article.
 */
function wikipediaTitleFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/^en\.(m\.)?wikipedia\.org$/i.test(parsed.hostname)) return null;
    const title = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''))
      .replace(/_/g, ' ')
      .trim();
    return title && !parsed.pathname.endsWith('/wiki/') ? title : null;
  } catch {
    return null;
  }
}

function openLibraryIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)openlibrary\.org$/i.test(parsed.hostname)) return null;
    return parsed.pathname.match(/\/works\/(OL\d+W)\b/)?.[1] || null;
  } catch {
    return null;
  }
}

/** One work, from a choice made earlier or the address of its own page. */
async function workById(request: {workId?: string; url?: string}): Promise<FoundWork | null> {
  const workId = String(request.workId || '').trim();
  const url = String(request.url || '').trim();
  const openLibraryId = /^OL\d+W$/.test(workId) ? workId : url ? openLibraryIdFromUrl(url) : null;
  if (openLibraryId) {
    const work = await openLibraryWork(openLibraryId);
    return work ? {...work, links: workLinks(work, {})} : null;
  }

  let title = url ? wikipediaTitleFromUrl(url) : null;
  // A choice's Wikidata ids are read once: for its article's title here, and for its links below.
  let known: {workId: string; ids: Record<string, string[]>} | null = null;
  if (!title && /^Q\d+$/.test(workId)) {
    const read = await wikidataIds(workId);
    title = read.enwikiTitle;
    known = {workId, ids: read.ids};
  }
  if (!title) return null;
  const [page] = await wikipediaPages({titles: title});
  const work = page ? workFromWikipediaPage(page) : null;
  return work ? withLinks(work, known?.workId === work.workId ? known.ids : undefined) : null;
}

export async function findWork(request: FindWorkRequest): Promise<FindWorkResponse> {
  if (request.workId || request.url) {
    const work = await workById(request);
    return work ? {match: 'one', works: [work]} : {match: 'none', works: []};
  }

  const query = String(request.query || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  if (!query) return {match: 'none', works: []};
  const want: Wanted = {
    ...(isWorkKind(request.kind) ? {kind: request.kind} : {}),
    ...(typeof request.by === 'string' && request.by.trim() ? {by: request.by.trim().slice(0, 120)} : {}),
    ...(Number.isInteger(request.year) ? {year: request.year} : {}),
  };

  const found = await searchWikipediaWorks(want.by ? `${query} ${want.by}` : query);
  let answer = pickWorks(query, found, want);
  // A famous namesake can push the work off the first page: "Wonder" is a word before it is a novel.
  if (want.kind && answer.match !== 'one' && answer.match !== 'several') {
    found.push(...(await searchWikipediaWorks(`${query} ${KIND_SEARCH_WORD[want.kind]}`)));
    answer = pickWorks(query, found, want);
  }
  // A book Wikipedia has no article on still has a page at Open Library.
  if ((!want.kind || want.kind === 'book') && answer.match !== 'one' && answer.match !== 'several') {
    const library = pickWorks(query, await searchOpenLibraryWorks(query, want.by), {...want, kind: 'book'});
    if (library.match === 'one' || library.match === 'several') answer = library;
  }

  if (answer.match !== 'one') return answer;
  // A novel and its films share a title; picking one for the kind asked is right, but not silently.
  const chosen = answer.works[0];
  const others = uniqueWorks(found)
    .filter((w) => w.kind !== chosen.kind && normalizedTitle(w.title, true) === normalizedTitle(chosen.title, true))
    .slice(0, MAX_CHOICES);
  return {match: 'one', works: [await withLinks(chosen)], ...(others.length ? {others} : {})};
}
