import { getItemTypeEduValue, resolveItemEduValue } from '../src/content.types';

describe('resolveItemEduValue', () => {
  test('reads a Category picked by hand, normalizing legacy aliases', () => {
    expect(resolveItemEduValue(['topic_podcasts', 'eduval_academic'])).toBe('eduval_educational');
  });

  test('counts an item with no Category as unassigned', () => {
    expect(resolveItemEduValue(['ads_none'], 'link')).toBe('eduval_unknown');
    expect(resolveItemEduValue(undefined)).toBe('eduval_unknown');
  });
});

// HAT-544: every note is classified Task-Related.
describe('item type usage rules', () => {
  test('a note with no Category is Task-Related', () => {
    expect(resolveItemEduValue(undefined, 'note')).toBe('eduval_task');
    expect(resolveItemEduValue([], 'note')).toBe('eduval_task');
  });

  test('a note marked Unassigned is still Task-Related', () => {
    expect(resolveItemEduValue(['eduval_unknown', 'ct_article'], 'note')).toBe('eduval_task');
  });

  test('a Category picked by hand on a note still wins', () => {
    expect(resolveItemEduValue(['eduval_educational'], 'note')).toBe('eduval_educational');
  });

  test('only notes have a rule', () => {
    expect(getItemTypeEduValue('note')).toBe('eduval_task');
    expect(getItemTypeEduValue('link')).toBeUndefined();
    expect(getItemTypeEduValue('thing')).toBeUndefined();
    expect(getItemTypeEduValue(null)).toBeUndefined();
    // A type name is a map key, never an object property: no prototype lookups.
    expect(getItemTypeEduValue('constructor')).toBeUndefined();
  });
});
