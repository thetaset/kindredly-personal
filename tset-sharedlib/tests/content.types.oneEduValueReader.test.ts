import { getUseCriteriaObjWithInfo, getUseCriteriaObjWithKeys, resolveItemEduValue } from '../src/content.types';

// W8 (CLS-13): a library item's Category is read one way everywhere.
describe('one reader for an item’s Category', () => {
  it.each([
    [['eduval_fun', 'eduval_educational'], 'eduval_fun'],
    [['eduval_unknown', 'eduval_task'], 'eduval_task'],
    [['eduval_task', 'eduval_unknown'], 'eduval_task'],
    [['eduval_mixed'], 'eduval_edutainment'],
    [['eduval_unknown'], 'eduval_unknown'],
  ])('%j reads as %s in all three', (tags, category) => {
    expect(resolveItemEduValue(tags)).toBe(category);
    expect(getUseCriteriaObjWithKeys(tags).eduValue).toBe(category);
    expect(getUseCriteriaObjWithInfo(tags).eduValue?.key).toBe(category);
  });
});
