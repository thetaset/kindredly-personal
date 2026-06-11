import { getUseCriteriaObjWithKeys, normalizeEduValueAlias, withEduValueCompatibilityAliases } from '../src/content.types';

describe('eduValue compatibility aliases', () => {
  test('normalizes eduval_mixed to eduval_edutainment', () => {
    expect(normalizeEduValueAlias('eduval_mixed')).toBe('eduval_edutainment');
  });

  test('expands eduval_mixed in compatibility arrays', () => {
    expect(withEduValueCompatibilityAliases(['eduval_mixed'])).toEqual(['eduval_edutainment']);
  });

  test('parses legacy library useCriteria as edutainment', () => {
    expect(getUseCriteriaObjWithKeys(['eduval_mixed', 'topic_podcasts']).eduValue).toBe('eduval_edutainment');
  });
});