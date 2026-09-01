import {
  mapLegacyCategoryIds,
  sanitizeCategoryIds,
  sanitizeCategoryIdsAgainst,
  applyCategoryRemap,
  leafIdsForSets,
  isCanonicalCategoryId,
  CANONICAL_CATEGORY_IDS,
  CANONICAL_CATEGORIES,
  LEGACY_CATEGORY_MAP,
} from '../src/publishedCategoryMapping'
import { DefaultCategorySets } from '../src/categoryExplorerSets'

describe('publishedCategoryMapping', () => {
  it('maps legacy cat_* IDs onto canonical general leaves', () => {
    expect(mapLegacyCategoryIds(['cat_science'])).toEqual(['gen_science'])
    expect(mapLegacyCategoryIds(['cat_ai'])).toEqual(['gen_ai'])
    expect(mapLegacyCategoryIds(['cat_space', 'cat_weather'])).toEqual(['gen_space', 'gen_weather'])
  })

  it('collapses several legacy IDs that share a canonical leaf, de-duplicated', () => {
    expect(mapLegacyCategoryIds(['cat_biology', 'cat_chemistry', 'cat_science'])).toEqual(['gen_science'])
    expect(mapLegacyCategoryIds(['cat_money', 'cat_finance'])).toEqual(['gen_finance'])
  })

  it('passes already-canonical IDs through unchanged (idempotent)', () => {
    expect(mapLegacyCategoryIds(['gen_science', 'gen_art'])).toEqual(['gen_science', 'gen_art'])
    expect(mapLegacyCategoryIds(mapLegacyCategoryIds(['cat_science']))).toEqual(['gen_science'])
  })

  it('drops unmappable / age-signal / junk IDs', () => {
    expect(mapLegacyCategoryIds(['cat_kids', 'cat_misc', 'cat_other', 'cat_parenting'])).toEqual([])
    expect(mapLegacyCategoryIds(['cat_science', 'cat_misc'])).toEqual(['gen_science'])
    expect(mapLegacyCategoryIds(['totally_unknown'])).toEqual([])
  })

  it('preserves first-seen order and de-dupes within the input', () => {
    expect(mapLegacyCategoryIds(['cat_art', 'cat_science', 'cat_art'])).toEqual(['gen_art', 'gen_science'])
  })

  it('handles non-array / non-string / blank input safely', () => {
    expect(mapLegacyCategoryIds(null)).toEqual([])
    expect(mapLegacyCategoryIds(undefined)).toEqual([])
    expect(mapLegacyCategoryIds('cat_science' as any)).toEqual([])
    expect(mapLegacyCategoryIds([' ', '', 42 as any, '  cat_science  '])).toEqual(['gen_science'])
  })

  it('sanitizeCategoryIds keeps only valid canonical IDs (no legacy translation)', () => {
    expect(sanitizeCategoryIds(['gen_science', 'cat_science', 'bogus'])).toEqual(['gen_science'])
    expect(sanitizeCategoryIds(['gen_art', 'gen_art'])).toEqual(['gen_art'])
  })

  it('every legacy map target is a real canonical leaf', () => {
    for (const target of Object.values(LEGACY_CATEGORY_MAP)) {
      expect(isCanonicalCategoryId(target)).toBe(true)
    }
  })

  it('exposes the canonical leaves as a flat {id,name} list matching the id set', () => {
    expect(CANONICAL_CATEGORIES.length).toBe(CANONICAL_CATEGORY_IDS.size)
    expect(CANONICAL_CATEGORIES.every((c) => c.id && c.name)).toBe(true)
    expect(CANONICAL_CATEGORY_IDS.has('gen_ai')).toBe(true)
  })

  describe('applyCategoryRemap', () => {
    it('renames ids and passes unlisted ones through', () => {
      expect(applyCategoryRemap(['gen_science', 'gen_art'], { gen_science: 'gen_stem' })).toEqual([
        'gen_stem',
        'gen_art',
      ])
    })

    it('merges ids onto one target, de-duplicated', () => {
      expect(applyCategoryRemap(['gen_a', 'gen_b', 'gen_c'], { gen_a: 'gen_x', gen_b: 'gen_x' })).toEqual([
        'gen_x',
        'gen_c',
      ])
    })

    it('drops ids mapped to null or empty string', () => {
      expect(applyCategoryRemap(['gen_a', 'gen_b'], { gen_a: null, gen_b: '' })).toEqual([])
      expect(applyCategoryRemap(['gen_a', 'gen_b'], { gen_a: null })).toEqual(['gen_b'])
    })

    it('is idempotent once the old ids are gone', () => {
      const remap = { gen_old: 'gen_new' }
      expect(applyCategoryRemap(applyCategoryRemap(['gen_old'], remap), remap)).toEqual(['gen_new'])
    })

    it('handles non-array / blank / non-string input safely', () => {
      expect(applyCategoryRemap(null, { a: 'b' })).toEqual([])
      expect(applyCategoryRemap([' ', 1 as any, 'gen_a'], {})).toEqual(['gen_a'])
    })
  })

  it('sanitizeCategoryIdsAgainst validates against an arbitrary (e.g. overlay) id set', () => {
    const valid = new Set(['gen_custom', 'gen_science'])
    expect(sanitizeCategoryIdsAgainst(['gen_custom', 'gen_art', 'gen_science'], valid)).toEqual([
      'gen_custom',
      'gen_science',
    ])
    // gen_art is canonical in the seed but NOT in this overlay set, so it's rejected here.
    expect(sanitizeCategoryIds(['gen_art'])).toEqual(['gen_art'])
  })

  it('leafIdsForSets returns the leaves of the given sets', () => {
    const ids = leafIdsForSets(DefaultCategorySets.filter((s) => s.id === 'general'))
    expect(ids.has('gen_science')).toBe(true)
    expect(ids.has('gen_grp_science')).toBe(false) // groups are not leaves
  })
})
