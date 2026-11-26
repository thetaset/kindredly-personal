import {
  DATE_EXTRACT_MAX,
  THING_TYPE_MAP,
  THING_EXTRACT_MAX,
  buildCanonicalKey,
  buildDateKey,
  getThingCanonicalKey,
  isCalendarDay,
  isThingType,
  localDayString,
  normalizeThingSlug,
  parseExtractedDates,
  parseExtractedThings,
  todayForExtraction,
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
    expect(isThingType('place')).toBe(true);
    expect(isThingType('product')).toBe(true);
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
    const things = Array.from({ length: THING_EXTRACT_MAX + 2 }, (_, i) => ({
      name: `Movie ${i}`,
      type: 'movie',
      confidence: 0.6 + i * 0.04,
    }));
    const out = parseExtractedThings({ things });
    expect(out).toHaveLength(THING_EXTRACT_MAX);
    // The two least certain (Movie 0, 1) are the ones dropped.
    expect(out.map((t) => t.name)).not.toContain('Movie 0');
    expect(out.map((t) => t.name)).not.toContain('Movie 1');
    expect(out[0].name).toBe(`Movie ${THING_EXTRACT_MAX + 1}`);
  });

  it('returns [] for malformed input', () => {
    expect(parseExtractedThings('not json')).toEqual([]);
    expect(parseExtractedThings(null)).toEqual([]);
    expect(parseExtractedThings({ text: '' })).toEqual([]);
  });
});

describe('parseExtractedThings: places and products (HAT-1055)', () => {
  it('keeps a place address and a product price, only on those kinds', () => {
    const out = parseExtractedThings({
      things: [
        { name: 'Exploratorium', type: 'place', address: 'Pier 15, San Francisco', price: 40, confidence: 0.9 },
        { name: 'LEGO Botanical Set', type: 'product', price: 59.99, currency: 'usd', address: 'x', confidence: 0.85 },
        { name: 'Paddington', type: 'movie', price: 12, address: 'London', confidence: 0.8 },
      ],
    });
    expect(out[0]).toEqual({ name: 'Exploratorium', kind: 'place', address: 'Pier 15, San Francisco', confidence: 0.9 });
    expect(out[1]).toEqual({ name: 'LEGO Botanical Set', kind: 'product', price: 59.99, currency: 'USD', confidence: 0.85 });
    expect(out[2]).toEqual({ name: 'Paddington', kind: 'movie', confidence: 0.8 });
  });

  it('routes every kind to an existing subType and its own list', () => {
    expect(THING_TYPE_MAP.place.subType).toBe('location');
    expect(THING_TYPE_MAP.product.subType).toBe('product');
    const keys = Object.values(THING_TYPE_MAP).map((info) => info.defaultListKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('isCalendarDay', () => {
  it('accepts real days only', () => {
    expect(isCalendarDay('2026-11-14')).toBe(true);
    expect(isCalendarDay('2028-02-29')).toBe(true);
    expect(isCalendarDay('2026-02-30')).toBe(false);
    expect(isCalendarDay('2026-11-14T19:00')).toBe(false);
    expect(isCalendarDay('Nov 14')).toBe(false);
    expect(isCalendarDay(null)).toBe(false);
  });
});

describe('localDayString / todayForExtraction', () => {
  it('names the local day and its weekday', () => {
    const now = new Date(2026, 10, 8, 23, 30);
    expect(localDayString(now)).toBe('2026-11-08');
    expect(todayForExtraction(now)).toBe('2026-11-08 (Sunday)');
  });
});

describe('parseExtractedDates', () => {
  const today = '2026-11-08';

  it('keeps events and deadlines with their time, end and place, in calendar order', () => {
    const out = parseExtractedDates(
      {
        dates: [
          { title: 'Spring concert', type: 'event', date: '2026-12-02', time: '19:00', endTime: '21:00', place: 'Lincoln Hall', confidence: 0.9 },
          { title: 'Camp sign-up closes', type: 'deadline', date: '2026-11-20', confidence: 0.8 },
        ],
      },
      today,
    );
    expect(out).toEqual([
      { title: 'Camp sign-up closes', kind: 'deadline', date: '2026-11-20', confidence: 0.8 },
      { title: 'Spring concert', kind: 'event', date: '2026-12-02', time: '19:00', endTime: '21:00', place: 'Lincoln Hall', confidence: 0.9 },
    ]);
  });

  it('drops past dates but keeps something still running today', () => {
    const out = parseExtractedDates(
      {
        dates: [
          { title: 'Last week', type: 'event', date: '2026-11-01', confidence: 0.9 },
          { title: 'Book fair', type: 'event', date: '2026-11-06', endDate: '2026-11-09', confidence: 0.9 },
          { title: 'Today', type: 'event', date: today, confidence: 0.9 },
        ],
      },
      today,
    );
    expect(out.map((d) => d.title)).toEqual(['Book fair', 'Today']);
  });

  it('drops impossible days, unknown types and unsure entries', () => {
    const out = parseExtractedDates(
      {
        dates: [
          { title: 'Bad day', type: 'event', date: '2026-02-30', confidence: 0.9 },
          { title: 'Loose words', type: 'event', date: 'next Friday', confidence: 0.9 },
          { title: 'Birthday', type: 'birthday', date: '2026-12-01', confidence: 0.9 },
          { title: 'Maybe', type: 'event', date: '2026-12-01', confidence: 0.3 },
          { title: '', type: 'event', date: '2026-12-01', confidence: 0.9 },
          { title: 'Kept', type: 'event', date: '2026-12-01', confidence: 0.9 },
        ],
      },
      today,
    );
    expect(out.map((d) => d.title)).toEqual(['Kept']);
  });

  it('cleans times: pads an hour, drops a bad time, and an end time before its start', () => {
    const out = parseExtractedDates(
      {
        dates: [
          { title: 'Practice', type: 'event', date: '2026-12-01', time: '7:05', endTime: '6:00', confidence: 0.9 },
          { title: 'Recital', type: 'event', date: '2026-12-02', time: '25:00', confidence: 0.9 },
          { title: 'Trip', type: 'event', date: '2026-12-03', endDate: '2026-12-01', confidence: 0.9 },
        ],
      },
      today,
    );
    expect(out[0]).toEqual({ title: 'Practice', kind: 'event', date: '2026-12-01', time: '07:05', confidence: 0.9 });
    expect(out[1]).toEqual({ title: 'Recital', kind: 'event', date: '2026-12-02', confidence: 0.9 });
    expect(out[2]).toEqual({ title: 'Trip', kind: 'event', date: '2026-12-03', confidence: 0.9 });
  });

  it('dedupes by day and title, and caps at DATE_EXTRACT_MAX by confidence', () => {
    const dates = Array.from({ length: DATE_EXTRACT_MAX + 2 }, (_, i) => ({
      title: `Game ${i}`,
      type: 'event',
      date: `2026-12-${String(i + 1).padStart(2, '0')}`,
      confidence: 0.6 + i * 0.04,
    }));
    dates.push({ title: 'game 7', type: 'event', date: '2026-12-08', confidence: 0.61 });
    const out = parseExtractedDates({ dates }, today);
    expect(out).toHaveLength(DATE_EXTRACT_MAX);
    expect(out.map((d) => d.title)).not.toContain('Game 0');
    expect(out.filter((d) => d.date === '2026-12-08')).toHaveLength(1);
    expect(buildDateKey(out[0])).toBe('date:2026-12-03:game-2');
  });

  it('reads a JSON string, and nothing from malformed input', () => {
    expect(parseExtractedDates('{"dates":[{"title":"Fair","type":"event","date":"2026-12-01","confidence":0.9}]}', today)).toHaveLength(1);
    expect(parseExtractedDates('not json', today)).toEqual([]);
    expect(parseExtractedDates({ things: [] }, today)).toEqual([]);
  });
});
