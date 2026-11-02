import {
  TRACK_ITEM_SCHEMA_ID,
  composeTrackItemMarkdown,
  countMarkdownWords,
  getTrackItemV1,
  isTrackItemBodyCurrent,
  parseTrackItemV1,
  setTrackItemOnInfo,
  trackLicenseWarnings,
  validateTrackItem,
  type TrackItemV1,
} from '../src/track-item';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

function item(overrides: Partial<TrackItemV1> = {}): TrackItemV1 {
  return parseTrackItemV1({
    kind: 'page',
    body: words(300),
    image: {
      src: 'https://upload.wikimedia.org/a.jpg',
      credit: 'Punch, 1855',
      license: 'Public domain',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:A.jpg',
    },
    sources: [{ title: 'Great Stink', url: 'https://en.wikipedia.org/wiki/Great_Stink', revisionId: '1375018319', license: 'CC BY-SA 4.0' }],
    ...overrides,
  })!;
}

describe('validateTrackItem, per kind', () => {
  it('passes a Page of 250–450 words with a licensed image and a source', () => {
    const v = validateTrackItem(item());
    expect(v.ok).toBe(true);
    expect(v.issues).toEqual([]);
    expect(v.words).toBe(300);
  });

  it('warns about a Page outside its length and without an image, but still saves it', () => {
    const v = validateTrackItem(item({ body: words(600), image: undefined }));
    expect(v.ok).toBe(true);
    expect(v.issues.map((i) => i.code).sort()).toEqual(['image_missing', 'length']);
  });

  it('refuses a Reading without its passage, and one whose passage names no source', () => {
    expect(validateTrackItem(item({ kind: 'reading', body: words(150) })).issues.map((i) => i.code)).toContain(
      'passage_missing',
    );
    const noSource = item({ kind: 'reading', body: words(150), passage: { text: 'It was a dark night.', source: '' } });
    expect(validateTrackItem(noSource).ok).toBe(false);
    expect(validateTrackItem(noSource).issues.map((i) => i.code)).toContain('passage_source_missing');
  });

  it('keeps a passage exactly as written, spacing and all', () => {
    const text = '  My father’s family name being Pirrip,\n\nand my Christian name Philip,  ';
    const parsed = parseTrackItemV1({ kind: 'reading', body: words(150), passage: { text, source: 'Dickens' }, sources: [] });
    expect(parsed!.passage!.text).toBe(text);
  });

  it('refuses a Visual without an image, and any image without a license', () => {
    expect(validateTrackItem(item({ kind: 'visual', body: words(200), image: undefined })).ok).toBe(false);
    const unlicensed = item({ image: { src: 'https://example.com/a.jpg', credit: 'Someone', license: '' } });
    expect(validateTrackItem(unlicensed).issues.map((i) => i.code)).toContain('image_license_missing');
    expect(validateTrackItem(unlicensed).ok).toBe(false);
  });

  it('refuses an Exercise without its answer', () => {
    const v = validateTrackItem(item({ kind: 'exercise', body: words(60), image: undefined }));
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain('answer_missing');
    expect(validateTrackItem(item({ kind: 'exercise', body: words(60), image: undefined, answer: '42' })).ok).toBe(true);
  });

  it('needs a source unless the item was pasted', () => {
    expect(validateTrackItem(item({ sources: [] })).ok).toBe(false);
    expect(validateTrackItem(item({ sources: [], pasted: true })).ok).toBe(true);
  });

  it('asks a course item after the first for a recap, and a theme item for none', () => {
    expect(validateTrackItem(item(), { trackKind: 'course', position: 0 }).issues).toEqual([]);
    expect(validateTrackItem(item(), { trackKind: 'course', position: 3 }).issues.map((i) => i.code)).toEqual([
      'recap_missing',
    ]);
    expect(
      validateTrackItem(item({ recap: 'Last time, the river.' }), { trackKind: 'theme' }).issues.map((i) => i.code),
    ).toEqual(['recap_in_theme']);
  });
});

describe('parseTrackItemV1', () => {
  it('allows at most one check, and only multiple choice or true/false', () => {
    const tf = { key: 'check', type: 'true_false', prompt: 'The smell spread cholera.', correct: false };
    expect(parseTrackItemV1({ kind: 'page', body: 'x', sources: [], check: tf })!.check?.type).toBe('true_false');
    expect(parseTrackItemV1({ kind: 'page', body: 'x', sources: [], check: [tf, tf] })!.check).toBeUndefined();
    const short = { key: 'check', type: 'short_answer', prompt: 'Who?', acceptableAnswers: ['Snow'] };
    expect(parseTrackItemV1({ kind: 'page', body: 'x', sources: [], check: short })!.check).toBeUndefined();
  });

  it('drops sources and images that are not web addresses, and refuses an unknown kind', () => {
    const parsed = parseTrackItemV1({
      kind: 'page',
      body: 'x',
      image: { src: 'javascript:alert(1)', credit: 'a', license: 'b' },
      sources: [{ title: 'Bad', url: 'javascript:alert(1)' }, { title: 'Good', url: 'https://example.com' }],
    });
    expect(parsed!.image).toBeUndefined();
    expect(parsed!.sources.map((s) => s.title)).toEqual(['Good']);
    expect(parseTrackItemV1({ kind: 'podcast', body: 'x' })).toBeNull();
  });

  it("keeps a family's own source without a link, and an image known only by its credit", () => {
    const parsed = parseTrackItemV1({
      kind: 'page',
      body: 'x',
      image: { credit: 'Photo: A. Author', license: 'CC BY 4.0' },
      sources: [{ title: 'Our field notes.pdf' }, { url: '' }],
    });
    expect(parsed!.image).toEqual({ credit: 'Photo: A. Author', license: 'CC BY 4.0' });
    expect(parsed!.sources).toEqual([{ title: 'Our field notes.pdf' }]);
    expect(composeTrackItemMarkdown(parsed!)).toContain('- Our field notes.pdf');
  });
});

describe('storage', () => {
  it('reads the item from a library item and from a published item', () => {
    const it0 = item();
    const info = setTrackItemOnInfo({ value: 'old' } as any, it0);
    expect(info.schemas?.[TRACK_ITEM_SCHEMA_ID]).toEqual(it0);
    expect(getTrackItemV1({ info })).toEqual(it0);
    expect(getTrackItemV1({ data: { trackItem: it0 } })).toEqual(it0);
  });

  it('writes the recap, credit, passage, answer and sources into the body for other clients', () => {
    const md = composeTrackItemMarkdown(
      item({
        kind: 'reading',
        recap: 'Yesterday: the river.',
        passage: { text: 'Line one\n\nLine two', source: 'Michael Faraday', locator: 'The Times, 1855' },
        answer: 'Dirty water.',
      }),
    );
    expect(md).toContain('*Yesterday: the river.*');
    expect(md).toContain('Punch, 1855 · Public domain');
    expect(md).toContain('> Line one\n>\n> Line two');
    expect(md).toContain('— Michael Faraday, The Times, 1855');
    expect(md).toContain('<details><summary>Show answer</summary>');
    expect(md).toContain('[Great Stink](https://en.wikipedia.org/wiki/Great_Stink) (CC BY-SA 4.0)');
  });

  it('notices when the body was edited elsewhere', () => {
    const it0 = item();
    const info = setTrackItemOnInfo(null, it0);
    expect(isTrackItemBodyCurrent(it0, info.value)).toBe(true);
    expect(isTrackItemBodyCurrent(it0, `${info.value}\n\nAn added line.`)).toBe(false);
  });
});

describe('countMarkdownWords', () => {
  it('counts words, not link targets or markup', () => {
    expect(countMarkdownWords('**Bold** and [a link](https://example.com/long/path) — ![img](x.png) end.')).toBe(5);
  });
});

describe('trackLicenseWarnings', () => {
  const from = (title: string, license?: string, url = 'https://example.org/x') => ({
    title,
    item: item({ sources: [{ title: `${title} source`, url, ...(license ? { license } : {}) }] }),
  });
  const items = [
    from('Open', 'CC BY-SA 4.0'),
    from('NonCommercial', 'CC BY-NC 4.0'),
    from('NoDerivatives', 'CC BY-ND 4.0'),
    from('No license'),
    // A family's own pasted text or file has no address, and is theirs to share.
    { title: 'Pasted', item: item({ sources: [{ title: 'My notes' }] }) },
  ];
  const titles = (code: number) => trackLicenseWarnings(items, code).map((w) => w.title);

  it('says nothing for a track kept in the family', () => {
    expect(titles(3)).toEqual([]);
  });

  it('names NoDerivatives and unlicensed web sources when shared with friends or by link', () => {
    expect(titles(1)).toEqual(['NoDerivatives', 'No license']);
    expect(titles(0)).toEqual(['NoDerivatives', 'No license']);
  });

  it('names everything not openly licensed when public', () => {
    expect(titles(2)).toEqual(['NonCommercial', 'NoDerivatives', 'No license']);
    expect(trackLicenseWarnings(items, 2)[2]).toEqual({ title: 'No license', source: 'No license source', license: 'no license stated' });
  });
});
