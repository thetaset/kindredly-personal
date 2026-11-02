import {
  PAGE_NOTE_SCHEMA_ID,
  PAGE_NOTE_TAG,
  buildPageNoteDetails,
  canTakePageNotes,
  getPageNoteSchemaV1,
  normalizePageNoteReminders,
  pageNoteKey,
  pageNoteRemindersMayCover,
  youTubeChannelFromInput,
  pageNoteReminderFor,
  withoutPageNoteAccess,
  youTubeVideoIdOf,
  addPageToNoteSchemas,
  noteHasLinks,
  pageNotePagesOf,
} from '../src/pageNote.utils';
import { PAGE_NOTE_SCHEMA_KEY, getItemClaimedPatterns, getItemDetailPatterns } from '../src/url.utils';

describe('pageNoteKey', () => {
  const video = 'https://youtube.com/watch?v=Fq0XRb7mB2s';

  it.each([
    'https://www.youtube.com/watch?v=Fq0XRb7mB2s',
    'https://youtube.com/watch?v=Fq0XRb7mB2s&t=252s',
    'https://www.youtube.com/watch?v=Fq0XRb7mB2s&list=PLx7Yh0bQe2kq9sJm3vRw&index=14',
    'https://m.youtube.com/watch?v=Fq0XRb7mB2s',
    'https://youtu.be/Fq0XRb7mB2s?si=abc',
    'https://www.youtube.com/embed/Fq0XRb7mB2s?autoplay=1',
    'https://www.youtube.com/shorts/Fq0XRb7mB2s',
    'https://m.youtube.com/shorts/Fq0XRb7mB2s',
    'https://www.youtube.com/live/Fq0XRb7mB2s?feature=share',
    'https://www.youtube-nocookie.com/embed/Fq0XRb7mB2s',
  ])('files every form of one video under one key: %s', (url) => {
    expect(pageNoteKey(url)).toBe(video);
  });

  it('keeps the video id as written; ids are case-sensitive', () => {
    expect(pageNoteKey('https://www.youtube.com/watch?v=AbCdEfGhIjK')).toBe('https://youtube.com/watch?v=AbCdEfGhIjK');
    expect(youTubeVideoIdOf('https://youtu.be/AbCdEfGhIjK')).toBe('AbCdEfGhIjK');
  });

  it('files an ordinary page without www, the part after #, or tracking parameters', () => {
    expect(pageNoteKey('https://www.nasa.gov/missions/artemis/?utm_source=x&fbclid=y#crew')).toBe('https://nasa.gov/missions/artemis/');
    expect(pageNoteKey('https://Example.com/')).toBe('https://example.com');
  });

  it('keeps parameters that say which page it is', () => {
    expect(pageNoteKey('https://news.ycombinator.com/item?id=41234567')).toBe('https://news.ycombinator.com/item?id=41234567');
  });

  it('is null for anything that is not a web page', () => {
    for (const url of [null, undefined, '', 'about:blank', 'chrome://settings', 'file:///tmp/a.pdf', 'not a url']) {
      expect(pageNoteKey(url as any)).toBeNull();
      expect(canTakePageNotes(url as any)).toBe(false);
    }
    expect(canTakePageNotes('https://example.com/a')).toBe(true);
  });

  it('is null for a YouTube page that is not a video', () => {
    expect(youTubeVideoIdOf('https://www.youtube.com/@crashcourse')).toBeNull();
    expect(pageNoteKey('https://www.youtube.com/@crashcourse')).toBe('https://youtube.com/@crashcourse');
  });
});

describe('page-note details', () => {
  const details = buildPageNoteDetails({
    url: 'https://www.youtube.com/watch?v=Fq0XRb7mB2s&t=10s',
    title: 'How Do Bees Make Honey?',
    channelId: 'UCX6b17PVsYBQ0ip5gyeme-Q',
  })!;

  it('is a note tagged Page notes, carrying the page in its schema', () => {
    expect(details.type).toBe('note');
    expect(details.tags).toEqual([PAGE_NOTE_TAG]);
    expect(getPageNoteSchemaV1({ info: details.info })).toEqual({
      schemaVersion: 1,
      sourceUrl: 'https://www.youtube.com/watch?v=Fq0XRb7mB2s&t=10s',
      sourceKey: 'https://youtube.com/watch?v=Fq0XRb7mB2s',
      title: 'How Do Bees Make Honey?',
      videoId: 'Fq0XRb7mB2s',
      channelId: 'UCX6b17PVsYBQ0ip5gyeme-Q',
    });
  });

  it('never claims the page: no url, patterns or links, so it opens nothing', () => {
    expect((details as any).url).toBeUndefined();
    expect((details as any).patterns).toBeUndefined();
    expect((details.info as any).additionalLinks).toBeUndefined();
    expect(getItemDetailPatterns(details)).toEqual([]);
    expect(getItemClaimedPatterns(details)).toEqual([]);
  });

  it('claims nothing even when an edit adds a url, a pattern or a link', () => {
    const edited = {
      ...details,
      url: 'https://www.youtube.com/watch?v=Fq0XRb7mB2s',
      patterns: ['youtube.com'],
      info: { ...details.info, additionalLinks: [{ id: 'a', title: 'Video', url: 'https://www.youtube.com/' }] },
    };
    expect(getItemDetailPatterns(edited)).toEqual([]);
    expect(getItemClaimedPatterns(edited)).toEqual([]);
  });

  it('takes the url, patterns and links off before a save', () => {
    const stripped = withoutPageNoteAccess({
      name: 'n',
      url: 'https://x.com',
      patterns: ['x.com'],
      info: { value: 'v', additionalLinks: [{ url: 'https://x.com' }], schemas: { a: 1 } },
    });
    expect(stripped).toEqual({ name: 'n', info: { value: 'v', schemas: { a: 1 } } });
  });

  it('is null for an address that is not a web page', () => {
    expect(buildPageNoteDetails({ url: 'chrome://newtab' })).toBeNull();
  });

  it('reads no schema from an ordinary note or a malformed one', () => {
    expect(getPageNoteSchemaV1({ info: { schemas: { 'kindredly.note.v1': { schemaVersion: 1 } } } })).toBeNull();
    expect(getPageNoteSchemaV1({ info: { schemas: { [PAGE_NOTE_SCHEMA_ID]: { schemaVersion: 2, sourceUrl: 'https://a.com' } } } })).toBeNull();
    expect(getPageNoteSchemaV1({ details: { info: { schemas: { [PAGE_NOTE_SCHEMA_ID]: { schemaVersion: 1, sourceUrl: 'about:blank' } } } } })).toBeNull();
  });

  it('keeps the literal in url.utils equal to the schema id', () => {
    expect(PAGE_NOTE_SCHEMA_KEY).toBe(PAGE_NOTE_SCHEMA_ID);
  });
});

describe('page-note reminders', () => {
  const reminders = normalizePageNoteReminders([
    { id: 'r1', kind: 'youtubeChannel', value: 'UCX6b17PVsYBQ0ip5gyeme-Q', label: 'Crash Course' },
    { id: 'r2', kind: 'youtubeChannel', value: '@SciShow' },
    { id: 'r3', kind: 'site', value: 'https://www.nasa.gov/missions' },
    { id: 'r4', kind: 'site', value: 'nasa.gov' },
    { id: 'r5', kind: 'other', value: 'x' },
    { kind: 'site', value: 'noid.com' },
    { id: 'r6', kind: 'site', value: 'localhost' },
  ]);

  it('keeps well-formed reminders once each, compared by channel id, handle or host', () => {
    expect(reminders).toEqual([
      { id: 'r1', kind: 'youtubeChannel', value: 'UCX6b17PVsYBQ0ip5gyeme-Q', label: 'Crash Course' },
      { id: 'r2', kind: 'youtubeChannel', value: 'scishow' },
      { id: 'r3', kind: 'site', value: 'nasa.gov' },
    ]);
    expect(normalizePageNoteReminders('nope')).toEqual([]);
  });

  it('covers a channel by its id or handle', () => {
    expect(pageNoteReminderFor(reminders, { url: 'https://www.youtube.com/watch?v=Fq0XRb7mB2s', channelIds: ['UCX6b17PVsYBQ0ip5gyeme-Q'] })?.id).toBe('r1');
    expect(pageNoteReminderFor(reminders, { url: 'https://www.youtube.com/watch?v=Fq0XRb7mB2s', channelIds: [null, '@scishow'] })?.id).toBe('r2');
    expect(pageNoteReminderFor(reminders, { url: 'https://www.youtube.com/watch?v=Fq0XRb7mB2s', channelIds: ['UCother'] })).toBeNull();
  });

  it('reads a channel as people paste it', () => {
    expect(youTubeChannelFromInput('@CrashCourse')).toEqual({ value: 'crashcourse', label: '@CrashCourse' });
    expect(youTubeChannelFromInput('https://www.youtube.com/@CrashCourse/videos')).toEqual({ value: 'crashcourse', label: '@CrashCourse' });
    expect(youTubeChannelFromInput('youtube.com/channel/UCX6b17PVsYBQ0ip5gyeme-Q')).toEqual({ value: 'UCX6b17PVsYBQ0ip5gyeme-Q', label: 'UCX6b17PVsYBQ0ip5gyeme-Q' });
    expect(youTubeChannelFromInput('https://www.youtube.com/watch?v=Fq0XRb7mB2s')).toBeNull();
    expect(youTubeChannelFromInput('https://example.com/@someone')).toBeNull();
    expect(youTubeChannelFromInput('')).toBeNull();
  });

  it('puts the page script only where a reminder could cover the page', () => {
    expect(pageNoteRemindersMayCover(reminders, 'https://www.youtube.com/watch?v=Fq0XRb7mB2s')).toBe(true);
    expect(pageNoteRemindersMayCover(reminders, 'https://www.youtube.com/@crashcourse')).toBe(false);
    expect(pageNoteRemindersMayCover(reminders, 'https://science.nasa.gov/')).toBe(true);
    expect(pageNoteRemindersMayCover(reminders, 'https://example.com/')).toBe(false);
    expect(pageNoteRemindersMayCover([], 'https://nasa.gov/')).toBe(false);
    const sitesOnly = reminders.filter((r) => r.kind === 'site');
    expect(pageNoteRemindersMayCover(sitesOnly, 'https://www.youtube.com/watch?v=Fq0XRb7mB2s')).toBe(false);
  });

  it('covers a site and its subdomains, not a lookalike', () => {
    expect(pageNoteReminderFor(reminders, { url: 'https://www.nasa.gov/a' })?.id).toBe('r3');
    expect(pageNoteReminderFor(reminders, { url: 'https://science.nasa.gov/b' })?.id).toBe('r3');
    expect(pageNoteReminderFor(reminders, { url: 'https://notnasa.gov/' })).toBeNull();
    expect(pageNoteReminderFor([], { url: 'https://nasa.gov' })).toBeNull();
  });
});

describe('a note about several pages (HAT-926)', () => {
  const video = { url: 'https://www.youtube.com/watch?v=Fq0XRb7mB2s', title: 'How Do Bees Make Honey?' };
  const nasa = { url: 'https://www.nasa.gov/missions/artemis/?utm_source=x', title: 'Artemis' };

  it('makes an ordinary note a page note, then adds further pages once each', () => {
    const first = addPageToNoteSchemas({ 'kindredly.note.v1': { schemaVersion: 1 } }, video)!;
    expect(first.added).toBe(true);
    expect(first.schemas['kindredly.note.v1']).toEqual({ schemaVersion: 1 });
    const second = addPageToNoteSchemas(first.schemas, nasa)!;
    expect(pageNotePagesOf({ info: { schemas: second.schemas } }).map((p) => p.sourceKey)).toEqual([
      'https://youtube.com/watch?v=Fq0XRb7mB2s',
      'https://nasa.gov/missions/artemis/',
    ]);
    // The same page in another form is not added again.
    const again = addPageToNoteSchemas(second.schemas, { url: 'https://youtu.be/Fq0XRb7mB2s' })!;
    expect(again.added).toBe(false);
    expect(addPageToNoteSchemas(second.schemas, { url: 'chrome://newtab' })).toBeNull();
  });

  it('reads further pages again on read, dropping repeats and anything not a web page', () => {
    const schemas = {
      [PAGE_NOTE_SCHEMA_ID]: {
        schemaVersion: 1,
        sourceUrl: video.url,
        morePages: [{ sourceUrl: nasa.url, sourceKey: 'stale' }, { sourceUrl: 'https://youtu.be/Fq0XRb7mB2s' }, { sourceUrl: 'about:blank' }, 'nope'],
      },
    };
    expect(pageNotePagesOf({ info: { schemas } }).map((p) => p.sourceKey)).toEqual([
      'https://youtube.com/watch?v=Fq0XRb7mB2s',
      'https://nasa.gov/missions/artemis/',
    ]);
    expect(pageNotePagesOf({ info: { schemas: {} } })).toEqual([]);
  });

  it('claims nothing for a note about several pages', () => {
    const { schemas } = addPageToNoteSchemas(addPageToNoteSchemas({}, video)!.schemas, nasa)!;
    expect(getItemDetailPatterns({ type: 'note', info: { schemas } })).toEqual([]);
  });

  it('tells a note with links, which cannot become a page note', () => {
    expect(noteHasLinks({ url: 'https://example.com' })).toBe(true);
    expect(noteHasLinks({ patterns: ['example.com'] })).toBe(true);
    expect(noteHasLinks({ info: { additionalLinks: [{ url: 'https://example.com' }] } })).toBe(true);
    expect(noteHasLinks({ url: '', patterns: [], info: { additionalLinks: [] } })).toBe(false);
  });
});
