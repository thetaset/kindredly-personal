import {
  THING_TYPE_MAP,
  THING_EXTRACT_MAX,
  buildCanonicalKey,
  getThingCanonicalKey,
  isThingType,
  normalizeThingSlug,
  parseExtractedThings,
} from '../src/thing-extraction';

describe('normalizeThingSlug', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalizeThingSlug('Dune: Part Two')).toBe('dune-part-two');
    expect(normalizeThingSlug('  The   Matrix  ')).toBe('the-matrix');
    expect(normalizeThingSlug('WALL·E')).toBe('wall-e');
  });

  it('is name-only and stable across casing/punctuation variants', () => {
    expect(normalizeThingSlug('the matrix')).toBe(normalizeThingSlug('The Matrix!'));
  });

  it('drops apostrophes rather than splitting words', () => {
    expect(normalizeThingSlug("Schindler's List")).toBe('schindlers-list');
  });

  it('strips diacritics', () => {
    expect(normalizeThingSlug('Amélie')).toBe('amelie');
  });
});

describe('buildCanonicalKey', () => {
  it('namespaces by type prefix but keys identity on the name', () => {
    expect(buildCanonicalKey('movie', 'The Matrix')).toBe('film:the-matrix');
    expect(buildCanonicalKey('book', 'The Matrix')).toBe('book:the-matrix');
  });

  it('gives a film and a same-named show distinct keys (type namespaces)', () => {
    expect(buildCanonicalKey('movie', 'Fargo')).not.toBe(buildCanonicalKey('tv', 'Fargo'));
  });

  it('converges two phrasings of the same film to one key', () => {
    expect(buildCanonicalKey('movie', 'Dune: Part Two')).toBe(
      buildCanonicalKey('movie', 'dune part two'),
    );
  });
});

describe('THING_TYPE_MAP', () => {
  it('routes each type to an existing subType and a typed default list', () => {
    expect(THING_TYPE_MAP.movie.subType).toBe('film');
    expect(THING_TYPE_MAP.tv.subType).toBe('video_series');
    expect(THING_TYPE_MAP.book.subType).toBe('book');
    expect(THING_TYPE_MAP.movie.defaultListKey).toBe('list:films-to-watch');
  });
});

describe('isThingType', () => {
  it('accepts known types and rejects others', () => {
    expect(isThingType('movie')).toBe(true);
    expect(isThingType('person')).toBe(false);
    expect(isThingType(null)).toBe(false);
  });
});

describe('getThingCanonicalKey', () => {
  it('reads the canonical key from an item info payload', () => {
    const info = {
      schemas: {
        'kindredly.thing.v1': { ref: { kind: 'provisional', key: 'film:the-matrix', type: 'movie' } },
      },
    };
    expect(getThingCanonicalKey(info)).toBe('film:the-matrix');
    expect(getThingCanonicalKey(null)).toBeNull();
    expect(getThingCanonicalKey({ schemas: {} })).toBeNull();
  });
});

describe('parseExtractedThings', () => {
  it('parses an object response and keeps valid typed things', () => {
    const out = parseExtractedThings({
      things: [
        { name: 'The Matrix', type: 'movie', year: 1999, creator: 'The Wachowskis', confidence: 0.95 },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'The Matrix', kind: 'movie', year: 1999 });
  });

  it('parses a JSON string response', () => {
    const out = parseExtractedThings('{"things":[{"name":"Dune","type":"movie","confidence":0.9}]}');
    expect(out.map((t) => t.name)).toEqual(['Dune']);
  });

  it('drops low-confidence and invalid-type entries', () => {
    const out = parseExtractedThings({
      things: [
        { name: 'Solid Pick', type: 'book', confidence: 0.8 },
        { name: 'Too Unsure', type: 'movie', confidence: 0.2 },
        { name: 'Bad Type', type: 'person', confidence: 0.99 },
        { name: '', type: 'movie', confidence: 0.99 },
      ],
    });
    expect(out.map((t) => t.name)).toEqual(['Solid Pick']);
  });

  it('dedupes by canonical key, keeping the higher-confidence entry', () => {
    const out = parseExtractedThings({
      things: [
        { name: 'the matrix', type: 'movie', confidence: 0.7 },
        { name: 'The Matrix', type: 'movie', confidence: 0.95 },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].confidence).toBe(0.95);
  });

  it('caps at THING_EXTRACT_MAX, preferring highest confidence', () => {
    // AI-wire shape (field is `type`), fed to the parser.
    const things = Array.from({ length: 6 }, (_, i) => ({
      name: `Movie ${i}`,
      type: 'movie',
      confidence: 0.6 + i * 0.05,
    }));
    const out = parseExtractedThings({ things });
    expect(out).toHaveLength(THING_EXTRACT_MAX);
    // Highest-confidence titles survive (Movie 5, 4, 3).
    expect(out.map((t) => t.name)).toEqual(['Movie 5', 'Movie 4', 'Movie 3']);
  });

  it('returns [] for malformed input', () => {
    expect(parseExtractedThings('not json')).toEqual([]);
    expect(parseExtractedThings(null)).toEqual([]);
    expect(parseExtractedThings({ text: '' })).toEqual([]);
  });
});
