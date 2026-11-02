import {AGE_GROUP_TAGS, audienceForDob, fitsAudience, fitsLens, normalizeLens, olderRatings} from '../src/exploreAudience';

/** HAT-554: what Explore shows once a parent picks one of their children, or a child signs in. */
describe('exploreAudience', () => {
  const day = new Date(2026, 9, 16);

  it('reads a child’s age group from their date of birth, the same bands as a rating', () => {
    expect(audienceForDob({y: 2019, m: 3, d: 1}, day)).toBe('ta_kids'); // 7
    expect(audienceForDob({y: 2015, m: 10, d: 16}, day)).toBe('ta_preteen'); // 11 today
    expect(audienceForDob({y: 2013, m: 11, d: 1}, day)).toBe('ta_preteen'); // 12 until next month
    expect(audienceForDob({y: 2010, m: 1, d: 1}, day)).toBe('ta_teen');
    expect(audienceForDob(null, day)).toBeNull();
  });

  describe('made for — a parent picked a child', () => {
    const madeFor = (tags: string[] | null, audience = 'ta_preteen' as const) => fitsLens(tags, {audience, mode: 'madeFor'});

    it('shows what is made for their age group or for all ages', () => {
      expect(madeFor(['ta_kids', 'ta_preteen'])).toBe(true);
      expect(madeFor(['ta_all'])).toBe(true);
      expect(madeFor(['ta_teen', 'ta_adult'])).toBe(false);
      expect(fitsAudience(['ta_kids', 'ta_preteen'], 'ta_preteen')).toBe(true);
    });

    it('never shows something rated for someone older, even when it says it is for them', () => {
      expect(madeFor(['ta_preteen', 'minage_teen'])).toBe(false);
      expect(madeFor(['ta_preteen', 'minage_preteen'])).toBe(true);
    });

    it('leaves out an item with no age group', () => {
      expect(madeFor([])).toBe(false);
      expect(madeFor(null)).toBe(false);
      expect(madeFor(['ta_unknown'])).toBe(false);
    });
  });

  describe('shown to — the child is signed in', () => {
    const shownTo = (tags: string[]) => fitsLens(tags, {audience: 'ta_kids', mode: 'shownTo'});

    it('keeps an item with no age group yet', () => {
      expect(shownTo([])).toBe(true);
      expect(shownTo(['ta_unknown', 'cost_free'])).toBe(true);
    });

    it('still leaves out what is rated older or made only for other ages', () => {
      expect(shownTo(['minage_teen'])).toBe(false);
      expect(shownTo(['ta_teen', 'ta_adult'])).toBe(false);
      expect(shownTo(['ta_kids', 'ta_preteen'])).toBe(true);
      expect(shownTo(['ta_all'])).toBe(true);
    });
  });

  it('shows everything to Everyone', () => {
    expect(fitsLens([], null)).toBe(true);
    expect(fitsAudience(['minage_adult'], null)).toBe(true);
  });

  it('accepts only a real age group and mode from a request', () => {
    expect(normalizeLens({audience: 'ta_kids', mode: 'shownTo'})).toEqual({audience: 'ta_kids', mode: 'shownTo'});
    expect(normalizeLens({audience: 'ta_all', mode: 'madeFor'})).toBeNull();
    expect(normalizeLens({audience: 'ta_kids', mode: 'anything'})).toBeNull();
    expect(normalizeLens('ta_kids')).toBeNull();
    expect(olderRatings('ta_kids')).toEqual(['minage_preteen', 'minage_teen', 'minage_adult']);
    expect(AGE_GROUP_TAGS).not.toContain('ta_unknown');
  });
});
