import {
  DefaultCategorySets,
  RETIRED_CATEGORY_SET_IDS,
  withoutRetiredSets,
} from '../src/categoryExplorerSets';
import type { CategoryNode, CategorySet } from '../src/types/categoryExplorer.types';

function leaves(set: CategorySet): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      if (n.children?.length) walk(n.children);
      else out.push(n);
    }
  };
  walk(set.nodes);
  return out;
}

const generalSet = DefaultCategorySets.find((s) => s.id === 'general')!;
const kidsSet = DefaultCategorySets.find((s) => s.id === 'kids')!;
const generalLeafIds = new Set(leaves(generalSet).map((l) => l.id));

describe('DefaultCategorySets — taxonomy shape', () => {
  test('browsing ships exactly the General and Kids sets', () => {
    expect(DefaultCategorySets.map((s) => s.id)).toEqual(['general', 'kids']);
  });

  test('general set includes the civics + critical-thinking leaves', () => {
    expect(generalLeafIds.has('gen_civics')).toBe(true);
    expect(generalLeafIds.has('gen_critical_thinking')).toBe(true);
  });

  test('kids carries age bands; general does not', () => {
    expect(kidsSet.minAgeGroups?.length).toBeGreaterThan(0);
    expect(generalSet.minAgeGroups ?? []).toHaveLength(0);
  });
});

describe('Retired sets', () => {
  test('teens is retired and must not ship in the seed', () => {
    expect(RETIRED_CATEGORY_SET_IDS).toContain('teens');
    expect(DefaultCategorySets.some((s) => s.id === 'teens')).toBe(false);
  });

  test('withoutRetiredSets strips a retired set that survived in a saved overlay', () => {
    const overlay = [...DefaultCategorySets, { id: 'teens', name: 'Teens', nodes: [] } as CategorySet];
    expect(withoutRetiredSets(overlay).map((s) => s.id)).toEqual(['general', 'kids']);
  });
});

describe('Kids → General mapping (sourceCategoryIds)', () => {
  test('every Kids leaf maps to at least one real General leaf id', () => {
    for (const leaf of leaves(kidsSet)) {
      expect(Array.isArray(leaf.sourceCategoryIds)).toBe(true);
      expect(leaf.sourceCategoryIds!.length).toBeGreaterThan(0);
      for (const id of leaf.sourceCategoryIds!) {
        // Every mapped id must be a real general leaf so the published query returns content.
        expect(generalLeafIds.has(id)).toBe(true);
      }
    }
  });

  test('General leaves do not need a mapping (they map to themselves)', () => {
    for (const leaf of leaves(generalSet)) {
      expect(leaf.sourceCategoryIds).toBeUndefined();
    }
  });
});
