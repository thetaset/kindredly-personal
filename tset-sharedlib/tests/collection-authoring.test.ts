import {
  COLLECTION_ITEM_FORMAT_SPEC,
  COLLECTION_MANIFEST_SCHEMA,
  buildCategoryReference,
  buildCriteriaReference,
  buildCollectionItemsPrompt,
  parseCollectionImportJson,
  extractCollectionRecords,
  validateCollectionRecords,
  sanitizeAuthoredTags,
} from '../src/collection-authoring';

describe('parseCollectionImportJson', () => {
  test('parses a bare array', () => {
    expect(parseCollectionImportJson('[{"name":"A"}]')).toEqual([{ name: 'A' }]);
  });

  test('parses a bare object', () => {
    expect(parseCollectionImportJson('{"records":[]}')).toEqual({ records: [] });
  });

  test('strips a ```json fence', () => {
    const text = 'Here you go:\n```json\n[{"name":"A"}]\n```\nHope that helps!';
    expect(parseCollectionImportJson(text)).toEqual([{ name: 'A' }]);
  });

  test('strips a bare ``` fence', () => {
    expect(parseCollectionImportJson('```\n{"items":[]}\n```')).toEqual({ items: [] });
  });

  test('extracts an array out of surrounding prose', () => {
    const text = 'Sure! [{"name":"A"},{"name":"B"}] — let me know if you want more.';
    expect(parseCollectionImportJson(text)).toEqual([{ name: 'A' }, { name: 'B' }]);
  });

  test('extracts an object out of surrounding prose', () => {
    const text = 'Result:\n{"records":[{"name":"A"}]}\nDone.';
    expect(parseCollectionImportJson(text)).toEqual({ records: [{ name: 'A' }] });
  });

  test('picks the payload fence, not an example fence shown first', () => {
    // Models routinely echo the shape before emitting the data. Taking the first
    // fence would import the example.
    const text = [
      'The format looks like this:',
      '```json',
      '{ "name": "Example" }',
      '```',
      'And here is your collection:',
      '```json',
      '[{"name":"Real One"},{"name":"Real Two"},{"name":"Real Three"}]',
      '```',
    ].join('\n');
    expect(parseCollectionImportJson(text)).toEqual([
      { name: 'Real One' },
      { name: 'Real Two' },
      { name: 'Real Three' },
    ]);
  });

  test('falls through to the next fence when the largest one is not valid JSON', () => {
    const text = '```\nthis block is long prose but not json at all, truly not\n```\n```json\n[{"name":"A"}]\n```';
    expect(parseCollectionImportJson(text)).toEqual([{ name: 'A' }]);
  });

  test('returns null for empty or unparseable input', () => {
    expect(parseCollectionImportJson('')).toBeNull();
    expect(parseCollectionImportJson('   ')).toBeNull();
    expect(parseCollectionImportJson('not json at all')).toBeNull();
  });
});

describe('extractCollectionRecords', () => {
  test('unwraps all three accepted envelopes', () => {
    const records = [{ name: 'A' }];
    expect(extractCollectionRecords(records)).toEqual(records);
    expect(extractCollectionRecords({ items: records })).toEqual(records);
    expect(extractCollectionRecords({ schema: COLLECTION_MANIFEST_SCHEMA, records })).toEqual(records);
  });

  test('prefers records over items when both are present', () => {
    const parsed = { records: [{ name: 'R' }], items: [{ name: 'I' }] };
    expect(extractCollectionRecords(parsed)).toEqual([{ name: 'R' }]);
  });

  test('returns null when there is no recognisable list', () => {
    expect(extractCollectionRecords({ nope: true })).toBeNull();
    expect(extractCollectionRecords('string')).toBeNull();
    expect(extractCollectionRecords(null)).toBeNull();
  });
});

describe('validateCollectionRecords', () => {
  test('accepts a minimal valid record', () => {
    const result = validateCollectionRecords([{ name: 'Khan Academy', type: 'link' }]);
    expect(result.errors).toEqual([]);
  });

  test('accepts `title` as an alias for `name`', () => {
    expect(validateCollectionRecords([{ title: 'Khan Academy' }]).errors).toEqual([]);
  });

  test('errors on an empty list', () => {
    expect(validateCollectionRecords([]).errors.length).toBe(1);
  });

  test('errors on a record with no name', () => {
    const result = validateCollectionRecords([{ description: 'no name here' }]);
    expect(result.errors.join(' ')).toContain('missing `name`');
  });

  test('errors on a non-object record', () => {
    expect(validateCollectionRecords(['nope']).errors.join(' ')).toContain('not a JSON object');
  });

  test('errors on childLocalIds outside a collection', () => {
    const result = validateCollectionRecords([{ name: 'A', type: 'link', childLocalIds: ['x'] }]);
    expect(result.errors.join(' ')).toContain('childLocalIds');
  });

  test('warns (does not error) on childLocalIds on a collection', () => {
    const result = validateCollectionRecords([{ name: 'A', type: 'col', childLocalIds: ['x'] }]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toContain('not applied');
  });

  test('warns on a legacy cat_* category and names the replacement', () => {
    const result = validateCollectionRecords([{ name: 'A', categories: ['cat_science'] }]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toContain('gen_science');
    expect(result.unknownCategories).toEqual([]);
  });

  test('warns on an unmappable category', () => {
    const result = validateCollectionRecords([{ name: 'A', categories: ['gen_not_real'] }]);
    expect(result.unknownCategories).toEqual(['gen_not_real']);
  });

  test('accepts a canonical category without warning', () => {
    const result = validateCollectionRecords([{ name: 'A', categories: ['gen_science'] }]);
    expect(result.warnings).toEqual([]);
  });

  test('accepts valid-but-unlisted tags like ct_other', () => {
    // ct_other is in the ContentType union but not in the pickable option list, and
    // appears ~50 times across resources/sample-imports/. Dropping it would lose real data.
    const result = validateCollectionRecords([{ name: 'A', useCriteria: ['ct_other'] }]);
    expect(result.warnings).toEqual([]);
    expect(result.unknownCriteria).toEqual([]);
    expect(sanitizeAuthoredTags({ useCriteria: ['ct_other'] }).useCriteria).toEqual(['ct_other']);
  });

  test('warns on an unknown useCriteria tag', () => {
    const result = validateCollectionRecords([{ name: 'A', useCriteria: ['eduval_educational', 'made_up_tag'] }]);
    expect(result.unknownCriteria).toEqual(['made_up_tag']);
    expect(result.warnings.join(' ')).toContain('made_up_tag');
  });

  test('warns on an unknown type', () => {
    const result = validateCollectionRecords([{ name: 'A', type: 'sasquatch' }]);
    expect(result.warnings.join(' ')).toContain('unknown type');
  });

  test('warns on a url set on a collection', () => {
    const result = validateCollectionRecords([{ name: 'A', type: 'col', url: 'https://x.test/' }]);
    expect(result.warnings.join(' ')).toContain('no URL');
  });
});

describe('warning grouping', () => {
  test('collapses the same warning across many records into one group', () => {
    const records = Array.from({ length: 12 }, (_, i) => ({
      name: `Item ${i + 1}`,
      categories: ['cat_science'],
    }));
    const result = validateCollectionRecords(records);

    // Raw list stays per-record and precise...
    expect(result.warnings.length).toBe(12);
    // ...but the display list is one line.
    expect(result.warningGroups.length).toBe(1);
    expect(result.warningGroups[0].count).toBe(12);
    expect(result.warningGroups[0].message).toContain('gen_science');
    expect(result.warningGroups[0].message).not.toContain('Item 1:');
  });

  test('caps examples at three', () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      name: `Item ${i + 1}`,
      categories: ['cat_science'],
    }));
    expect(validateCollectionRecords(records).warningGroups[0].examples).toEqual([
      'Item 1',
      'Item 2',
      'Item 3',
    ]);
  });

  test('keeps distinct warnings separate and sorts by frequency', () => {
    const records = [
      { name: 'A', categories: ['cat_science'] },
      { name: 'B', categories: ['cat_science'] },
      { name: 'C', useCriteria: ['made_up_tag'] },
    ];
    const groups = validateCollectionRecords(records).warningGroups;
    expect(groups.length).toBe(2);
    expect(groups[0].count).toBe(2);
    expect(groups[1].count).toBe(1);
  });

  test('is empty when nothing is wrong', () => {
    expect(validateCollectionRecords([{ name: 'A', categories: ['gen_science'] }]).warningGroups).toEqual([]);
  });
});

describe('sanitizeAuthoredTags', () => {
  test('maps legacy categories and drops unknown ones', () => {
    const { categories } = sanitizeAuthoredTags({ categories: ['cat_science', 'gen_not_real', 'gen_math'] });
    expect(categories).toContain('gen_science');
    expect(categories).toContain('gen_math');
    expect(categories).not.toContain('gen_not_real');
  });

  test('keeps known criteria tags and drops the rest', () => {
    const { useCriteria } = sanitizeAuthoredTags({ useCriteria: ['eduval_educational', 'made_up_tag'] });
    expect(useCriteria).toEqual(['eduval_educational']);
  });

  test('deduplicates criteria tags', () => {
    const { useCriteria } = sanitizeAuthoredTags({ useCriteria: ['cost_free', 'cost_free'] });
    expect(useCriteria).toEqual(['cost_free']);
  });

  test('tolerates missing / non-array input', () => {
    expect(sanitizeAuthoredTags({})).toEqual({ categories: [], useCriteria: [] });
    expect(sanitizeAuthoredTags({ categories: 'nope', useCriteria: 7 })).toEqual({ categories: [], useCriteria: [] });
  });
});

describe('prompt building', () => {
  test('category reference uses canonical gen_* ids', () => {
    const ref = buildCategoryReference();
    expect(ref).toContain('gen_science');
    expect(ref).not.toContain('cat_science');
  });

  test('criteria reference covers every axis', () => {
    const ref = buildCriteriaReference();
    expect(ref).toContain('eduval_educational');
    expect(ref).toContain('minage_kids');
    expect(ref).toContain('cost_free');
    expect(ref).toContain('intent_learn');
  });

  test('prompt includes instructions, taxonomy and the format spec', () => {
    const prompt = buildCollectionItemsPrompt({ instructions: 'Astronomy for 8 year olds' });
    expect(prompt).toContain('Astronomy for 8 year olds');
    expect(prompt).toContain('gen_space');
    expect(prompt).toContain(COLLECTION_ITEM_FORMAT_SPEC);
  });

  test('prompt includes collection context, count and existing names', () => {
    const prompt = buildCollectionItemsPrompt({
      instructions: 'more like these',
      collectionName: 'Night Sky',
      collectionDescription: 'Stargazing basics',
      itemCount: 5,
      existingItemNames: ['Orion', 'Andromeda'],
    });
    expect(prompt).toContain('Night Sky');
    expect(prompt).toContain('Stargazing basics');
    expect(prompt).toContain('about 5 items');
    expect(prompt).toContain('Orion');
    expect(prompt).toContain('do NOT repeat');
  });

  test('a server-supplied format spec replaces the bundled one', () => {
    const prompt = buildCollectionItemsPrompt({ instructions: 'x', formatSpec: 'SERVER SPEC' });
    expect(prompt).toContain('SERVER SPEC');
    expect(prompt).not.toContain(COLLECTION_ITEM_FORMAT_SPEC);
  });

  test('an empty server spec falls back to the bundled one', () => {
    const prompt = buildCollectionItemsPrompt({ instructions: 'x', formatSpec: '   ' });
    expect(prompt).toContain(COLLECTION_ITEM_FORMAT_SPEC);
  });
});
