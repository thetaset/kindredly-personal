import { getItemExperienceContract, getItemTypeInfo, resolveDisplaySubType } from '../src/content.types';
import {
  ITEM_REQUIREMENTS,
  getItemRequirementsForType,
  type ItemRequirement,
} from '../src/item.requirements';
import {
  evaluateItemRequirements,
  getPrimaryUnmetCheck,
  type ItemReadinessInput,
  type ItemReadinessStatus,
} from '../src/item.readiness';

const FEED = 'https://feeds.example.com/show.xml';

const audioFeed = [
  { feedId: 'f1', type: 'rss' as const, title: 'Show', feedURL: FEED, mediaKind: 'audio' as const },
];
/** A feed with no mediaKind — the shape `prepItemFeeds` used to produce for everything. */
const bareFeed = [{ feedId: 'f1', type: 'rss' as const, title: 'Show', feedURL: FEED }];

function evaluate(input: Partial<ItemReadinessInput>) {
  return evaluateItemRequirements({ feeds: [], ...input });
}

describe('evaluateItemRequirements', () => {
  const cases: Array<{ name: string; input: Partial<ItemReadinessInput>; status: ItemReadinessStatus }> = [
    // podcast — the only thing worth warning about is having no feed at all
    { name: 'podcast with no feeds', input: { type: 'link', subType: 'podcast' }, status: 'incomplete' },
    {
      name: 'podcast whose feed has an empty feedURL',
      input: { type: 'link', subType: 'podcast', feeds: [{ feedId: 'f', type: 'rss', title: 'x', feedURL: '  ' }] },
      status: 'incomplete',
    },
    { name: 'podcast with an audio feed', input: { type: 'link', subType: 'podcast', feeds: audioFeed }, status: 'ok' },
    // link / website — the opener takes item.url verbatim, so any non-empty value counts
    { name: 'link with no url', input: { type: 'link' }, status: 'incomplete' },
    { name: 'link with a url', input: { type: 'link', url: 'https://example.com' }, status: 'ok' },
    {
      name: 'link with a non-http scheme the opener still handles',
      input: { type: 'link', url: 'internal:settings' },
      status: 'ok',
    },
    { name: 'website with a url', input: { type: 'link', subType: 'website', url: 'https://example.com' }, status: 'ok' },
    // youtube
    {
      name: 'yt_video with a watch url',
      input: { type: 'link', subType: 'yt_video', url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
      status: 'ok',
    },
    {
      name: 'yt_video with a videoId in meta and no url',
      input: { type: 'link', subType: 'yt_video', meta: { tsExtractedInfo: { videoId: 'dQw4w9WgXcQ' } } as any },
      status: 'ok',
    },
    { name: 'yt_video with no url at all', input: { type: 'link', subType: 'yt_video' }, status: 'incomplete' },
    {
      name: 'yt_channel with a channelId in meta',
      input: { type: 'link', subType: 'yt_channel', meta: { tsExtractedInfo: { channelId: 'UC123' } } as any },
      status: 'ok',
    },
    {
      name: 'yt_channel whose feed prepItemFeeds already synthesized',
      input: { type: 'link', subType: 'yt_channel', feeds: bareFeed },
      status: 'ok',
    },
    { name: 'yt_channel with nothing to go on', input: { type: 'link', subType: 'yt_channel' }, status: 'incomplete' },
    // out of scope
    { name: 'note', input: { type: 'note' }, status: 'not-applicable' },
    { name: 'collection', input: { type: 'col' }, status: 'not-applicable' },
    { name: 'information thing', input: { type: 'thing', subType: 'information' }, status: 'not-applicable' },
    { name: 'file_group', input: { type: 'file_group' }, status: 'not-applicable' },
    { name: 'task', input: { type: 'thing', subType: 'task' }, status: 'not-applicable' },
  ];

  for (const testCase of cases) {
    test(testCase.name, () => {
      expect(evaluate(testCase.input).status).toBe(testCase.status);
    });
  }
});

/**
 * The regression this whole file exists for.
 *
 * The first version required `feed.mediaKind === 'audio'`. That field is written
 * once at save time, is absent on everything saved before 2026-04-13 and on every
 * feed synthesized from additionalLinks or YouTube metadata, and — decisively —
 * is never read by the player, which parses the feed live. Requiring it warned on
 * every working podcast.
 */
describe('a working podcast is never flagged', () => {
  const shouldBeOk: Array<[string, Partial<ItemReadinessInput>]> = [
    ['feed carries mediaKind', { feeds: audioFeed }],
    ['feed has no mediaKind at all (pre-2026-04-13 item)', { feeds: bareFeed }],
    ['feed came from additionalLinks, which never sets mediaKind', { feeds: bareFeed }],
    [
      'video podcast whose enclosures are not predominantly audio',
      { feeds: [{ feedId: 'f', type: 'rss' as const, title: 'V', feedURL: FEED, mediaKind: undefined as any }] },
    ],
    ['several feeds, none labelled', { feeds: [...bareFeed, { feedId: 'f2', type: 'rss' as const, title: 'B', feedURL: 'https://b/f.xml' }] }],
  ];

  for (const [name, input] of shouldBeOk) {
    test(name, () => {
      expect(evaluate({ type: 'link', subType: 'podcast', ...input }).status).toBe('ok');
    });
  }

  test('but a podcast with genuinely no feed still warns', () => {
    expect(evaluate({ type: 'link', subType: 'podcast', feeds: [] }).status).toBe('incomplete');
  });
});

describe('map re-validates the provider allowlist', () => {
  const mapInfo = (schema: unknown) => ({ schemas: { 'kindredly.mapEmbed.v1': schema } }) as any;

  test('no schema is incomplete', () => {
    expect(evaluate({ type: 'link', subType: 'map' }).status).toBe('incomplete');
  });

  test('a coordinate map is ok', () => {
    expect(
      evaluate({
        type: 'link',
        subType: 'map',
        info: mapInfo({
          schemaVersion: 1,
          provider: 'openstreetmap',
          originalUrl: 'https://www.openstreetmap.org/#map=12/47.6/-122.3',
          center: { lat: 47.6, lng: -122.3 },
          zoom: 12,
        }),
      }).status,
    ).toBe('ok');
  });

  // Reusing getMapEmbedSchemaV1 — the same call MapEmbed renders from — means a
  // tampered embed host fails here for free, with no duplicated allowlist.
  test('a non-allowlisted embed host is incomplete', () => {
    expect(
      evaluate({
        type: 'link',
        subType: 'map',
        info: mapInfo({
          schemaVersion: 1,
          provider: 'google_maps',
          originalUrl: 'https://evil.example.com/map',
          embedUrl: 'https://evil.example.com/embed',
        }),
      }).status,
    ).toBe('incomplete');
  });

  test('an unknown schemaVersion is incomplete', () => {
    expect(
      evaluate({
        type: 'link',
        subType: 'map',
        info: mapInfo({ schemaVersion: 2, provider: 'openstreetmap', originalUrl: 'https://osm.org/#map=1/0/0' }),
      }).status,
    ).toBe('incomplete');
  });
});

describe('the stored-subType rule', () => {
  test('an item claiming podcast with no feed is incomplete', () => {
    expect(evaluate({ type: 'link', subType: 'podcast', feeds: [] }).status).toBe('incomplete');
  });

  // Evaluating under the derived type would be circular — the feed requirement
  // is satisfied by the very feed that produced the type — and would nag the
  // owner about a claim they never made.
  test('an item that claims nothing is judged as a plain link', () => {
    const details = { type: 'link', subType: null, url: 'https://example.com', info: { feeds: audioFeed } };
    expect(resolveDisplaySubType(details)).toBe('podcast');

    const result = evaluate({ ...details, feeds: audioFeed });
    expect(result.lookupType).toBe('link');
    expect(result.status).toBe('ok');
  });
});

describe('forward compatibility', () => {
  test('an unrecognized requirement kind evaluates as satisfied', () => {
    const future: ItemRequirement = {
      id: 'future.thing',
      kind: 'quantum-entanglement-present' as any,
      label: 'Future',
      prompt: 'Future',
    };
    ITEM_REQUIREMENTS['__test_future__'] = [future];
    try {
      expect(getItemRequirementsForType('__test_future__')).toHaveLength(1);
      expect(evaluateItemRequirements({ type: '__test_future__', feeds: [] } as any).status).toBe('ok');
    } finally {
      delete ITEM_REQUIREMENTS['__test_future__'];
    }
  });
});

describe('registry consistency', () => {
  test('every registry key is a real item type', () => {
    for (const key of Object.keys(ITEM_REQUIREMENTS)) {
      expect(getItemTypeInfo(key)).toBeTruthy();
    }
  });

  test('requirement ids are unique across the registry', () => {
    const ids = Object.values(ITEM_REQUIREMENTS).flatMap((reqs) => (reqs || []).map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every requirement declares the parameters its kind needs', () => {
    for (const reqs of Object.values(ITEM_REQUIREMENTS)) {
      for (const req of reqs || []) {
        if (req.kind === 'schema-present') expect(req.schemaId).toBeTruthy();
        if (req.kind === 'identifier-present') expect(req.identifier).toBeTruthy();
        expect(req.prompt).toBeTruthy();
        expect(req.label).toBeTruthy();
      }
    }
  });

  test('contracts surface their requirements', () => {
    expect(getItemExperienceContract('link', 'podcast').requirements).toHaveLength(1);
    expect(getItemExperienceContract('link', 'podcast').requirements[0].kind).toBe('feed-present');
    expect(getItemExperienceContract('note', '').requirements).toEqual([]);
  });
});

describe('getPrimaryUnmetCheck', () => {
  test('returns the unmet requirement', () => {
    const missing = evaluate({ type: 'link', subType: 'podcast' });
    expect(getPrimaryUnmetCheck(missing)?.requirement.id).toBe('podcast.feed');
  });

  test('returns null when everything is satisfied', () => {
    expect(getPrimaryUnmetCheck(evaluate({ type: 'link', url: 'https://example.com' }))).toBeNull();
  });
});
