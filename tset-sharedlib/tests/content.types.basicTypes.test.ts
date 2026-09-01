import {
  BASIC_ITEM_TYPE_KEYS,
  getEditableItemTypeSelectorOptions,
  getItemTypeInfo,
  isBasicItemType,
  typeNameList,
} from '../src/content.types';

const values = (options: Array<{ value: string }>) => options.map((option) => option.value);

describe('BASIC_ITEM_TYPE_KEYS', () => {
  test('every key is a real item type', () => {
    for (const key of BASIC_ITEM_TYPE_KEYS) {
      expect(getItemTypeInfo(key)).toBeTruthy();
    }
  });

  // A key that the system-type filter drops would silently shrink the basic picker.
  test('every key survives the picker and is offered by default', () => {
    const offered = new Set(values(getEditableItemTypeSelectorOptions()));

    for (const key of BASIC_ITEM_TYPE_KEYS) {
      expect(offered.has(key)).toBe(true);
    }
    expect(offered.size).toBe(BASIC_ITEM_TYPE_KEYS.length);
  });

  test('the basic list is a strict subset of the full list', () => {
    const advanced = values(getEditableItemTypeSelectorOptions({ includeAdvanced: true }));

    expect(advanced.length).toBeGreaterThan(BASIC_ITEM_TYPE_KEYS.length);
    for (const key of BASIC_ITEM_TYPE_KEYS) {
      expect(advanced).toContain(key);
    }
  });

  test('system types stay hidden even with advanced included', () => {
    const advanced = values(getEditableItemTypeSelectorOptions({ includeAdvanced: true }));

    expect(advanced).not.toContain('col');
    expect(advanced).not.toContain('thing');
    expect(advanced).not.toContain('pub_col_slink');
  });

  test('isBasicItemType agrees with the list', () => {
    expect(isBasicItemType('note')).toBe(true);
    expect(isBasicItemType('book')).toBe(false);
    expect(isBasicItemType('animal')).toBe(false);
  });

  /**
   * The "add a thing" pickers narrow to `parent === 'thing' || key === 'file_group'`. If the basic
   * set ever loses its generic fallbacks that surface goes nearly empty, which is the failure this
   * guards.
   */
  test('the onlyThing picker still offers a usable basic set', () => {
    const onlyThing = values(getEditableItemTypeSelectorOptions({ onlyThing: true }));

    expect(onlyThing.length).toBeGreaterThanOrEqual(4);
    expect(onlyThing).toContain('other');
    expect(onlyThing).toContain('information');
    expect(onlyThing).toContain('file_group');
  });

  test('most types are advanced — the split is worth having', () => {
    expect(BASIC_ITEM_TYPE_KEYS.length).toBeLessThan(typeNameList.length / 3);
  });
});
