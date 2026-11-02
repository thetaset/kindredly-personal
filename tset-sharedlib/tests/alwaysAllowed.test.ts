import {
  ALLOW_LIST_MAX,
  allowListMatches,
  allowListSiteForUrl,
  isAllowListEmpty,
  normalizeAllowList,
  withAllowListEntry,
  withoutAllowListEntry,
} from '../src/restrictions/alwaysAllowed';

const list = (urlPatterns: string[] = [], itemIds: string[] = [], appIds: string[] = []) => ({ urlPatterns, itemIds, appIds });

describe('allowListMatches', () => {
  it('matches a site by name and subdomain, never as a piece of the address', () => {
    const allow = list(['school.org']);
    expect(allowListMatches(allow, { url: 'https://school.org/' })).toBe(true);
    expect(allowListMatches(allow, { url: 'https://www.calendar.school.org/week' })).toBe(true);
    expect(allowListMatches(allow, { url: 'https://notschool.org/' })).toBe(false);
    expect(allowListMatches(allow, { url: 'https://games.com/?school.org' })).toBe(false);
    expect(allowListMatches(allow, { url: 'chrome://settings' })).toBe(false);
  });

  it('narrows to a path and a query', () => {
    expect(allowListMatches(list(['pbskids.org/games']), { url: 'https://pbskids.org/games/wild' })).toBe(true);
    expect(allowListMatches(list(['pbskids.org/games']), { url: 'https://pbskids.org/videos' })).toBe(false);
    const video = list(['youtube.com/watch?v=abc']);
    expect(allowListMatches(video, { url: 'https://www.youtube.com/watch?v=abc' })).toBe(true);
    expect(allowListMatches(video, { url: 'https://www.youtube.com/watch?v=other&v=abc' })).toBe(false);
  });

  it('matches a library item by the page showing it or by the items the address belongs to', () => {
    const allow = list([], ['itm_signup']);
    expect(allowListMatches(allow, { itemId: 'itm_signup' })).toBe(true);
    expect(allowListMatches(allow, { url: 'https://swim.example/signup', itemIds: ['itm_other', 'itm_signup'] })).toBe(true);
    expect(allowListMatches(allow, { url: 'https://swim.example/signup', itemIds: ['itm_other'] })).toBe(false);
    expect(allowListMatches(allow, { url: 'https://swim.example/signup' })).toBe(false);
  });

  it('matches nothing without a list', () => {
    expect(allowListMatches(null, { url: 'https://school.org/' })).toBe(false);
  });
});

describe('normalizeAllowList and the edits', () => {
  it('trims, drops blanks and duplicates, and caps each kind', () => {
    const many = Array.from({ length: ALLOW_LIST_MAX + 5 }, (_, i) => `site${i}.org`);
    const out = normalizeAllowList({ urlPatterns: [' a.org ', 'a.org', '', 3, ...many], itemIds: 'x', appIds: null });
    expect(out.urlPatterns[0]).toBe('a.org');
    expect(out.urlPatterns).toHaveLength(ALLOW_LIST_MAX);
    expect(out.itemIds).toEqual([]);
    expect(isAllowListEmpty(normalizeAllowList(undefined))).toBe(true);
  });

  it('adds once, at the end, and removes', () => {
    const one = withAllowListEntry(undefined, 'urlPatterns', 'school.org');
    expect(withAllowListEntry(one, 'urlPatterns', 'school.org')).toEqual(one);
    const two = withAllowListEntry(one, 'appIds', 'android:com.google.calendar');
    expect(two).toEqual(list(['school.org'], [], ['android:com.google.calendar']));
    expect(withoutAllowListEntry(two, 'urlPatterns', 'school.org')).toEqual(list([], [], ['android:com.google.calendar']));
  });

  it('names the site a page is on', () => {
    expect(allowListSiteForUrl('https://www.calendar.school.org/week?x=1')).toBe('calendar.school.org');
    expect(allowListSiteForUrl('chrome-extension://abc/index.html')).toBeNull();
    expect(allowListSiteForUrl('not a url')).toBeNull();
  });
});
