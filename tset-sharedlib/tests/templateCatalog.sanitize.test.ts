import {
  mergeCollectionTemplates,
  sanitizeTemplateCatalog,
} from '../src/kinds/templateCatalog.sanitize'
import type { KindTemplate } from '../src/kinds/kindTemplates'

const view = (over: Partial<KindTemplate> = {}): any => ({
  id: 'kindtpl.test.v1',
  name: 'Test',
  slots: [{ kindId: 'health.pharmacy' }],
  ...over,
})

const entry = (over: Record<string, unknown> = {}): any => ({
  id: 'test.v1',
  name: 'Test',
  kindTemplateId: 'kindtpl.test.v1',
  ...over,
})

describe('sanitizeTemplateCatalog — kindTemplates', () => {
  it('keeps a well-formed template and defaults its layout', () => {
    const { kindTemplates, warnings } = sanitizeTemplateCatalog({ kindTemplates: [view()] })
    expect(warnings).toEqual([])
    expect(kindTemplates).toHaveLength(1)
    expect(kindTemplates[0]).toMatchObject({ id: 'kindtpl.test.v1', name: 'Test', layout: 'cards' })
  })

  it('coerces an unknown layout to cards — the forward-compat contract', () => {
    const { kindTemplates, warnings } = sanitizeTemplateCatalog({
      kindTemplates: [view({ layout: 'timeline' as any })],
    })
    expect(kindTemplates[0].layout).toBe('cards')
    expect(warnings.join()).toMatch(/unknown layout 'timeline' coerced/)
  })

  it('drops an unknown accent and emphasis rather than passing them through', () => {
    const { kindTemplates } = sanitizeTemplateCatalog({
      kindTemplates: [view({ accent: 'chartreuse' as any, emphasis: 'huge' as any })],
    })
    expect(kindTemplates[0].accent).toBeUndefined()
    expect(kindTemplates[0].emphasis).toBeUndefined()
  })

  it('rejects an id that is not namespaced kindtpl.', () => {
    const { kindTemplates, warnings } = sanitizeTemplateCatalog({ kindTemplates: [view({ id: 'health.v1' })] })
    expect(kindTemplates).toHaveLength(0)
    expect(warnings.join()).toMatch(/must match/)
  })

  it('never echoes unknown keys', () => {
    const { kindTemplates } = sanitizeTemplateCatalog({
      kindTemplates: [view({ evil: '<script>', onClick: 'alert(1)' } as any)],
    })
    expect(kindTemplates[0]).not.toHaveProperty('evil')
    expect(kindTemplates[0]).not.toHaveProperty('onClick')
  })

  it('drops a duplicate id, keeping the first', () => {
    const { kindTemplates, warnings } = sanitizeTemplateCatalog({
      kindTemplates: [view({ name: 'First' }), view({ name: 'Second' })],
    })
    expect(kindTemplates).toHaveLength(1)
    expect(kindTemplates[0].name).toBe('First')
    expect(warnings.join()).toMatch(/duplicate id/)
  })
})

describe('sanitizeTemplateCatalog — slots', () => {
  it('keeps a shipped registry kind id', () => {
    const { kindTemplates } = sanitizeTemplateCatalog({
      kindTemplates: [view({ slots: [{ kindId: 'health.pharmacy' }] })],
    })
    expect(kindTemplates[0].slots.map((s) => s.kindId)).toEqual(['health.pharmacy'])
  })

  it('keeps a custom.<slug> id with its inline label and icon', () => {
    const { kindTemplates } = sanitizeTemplateCatalog({
      kindTemplates: [view({ slots: [{ kindId: 'custom.vet', label: 'Vet', icon: 'heart-pulse' }] })],
    })
    expect(kindTemplates[0].slots[0]).toMatchObject({ kindId: 'custom.vet', label: 'Vet', icon: 'heart-pulse' })
  })

  it('drops an id that is neither in the registry nor custom.* — the data-loss guard', () => {
    const { kindTemplates, warnings } = sanitizeTemplateCatalog({
      kindTemplates: [view({ slots: [{ kindId: 'health.pharmacy' }, { kindId: 'pets.vet' }] })],
    })
    expect(kindTemplates[0].slots.map((s) => s.kindId)).toEqual(['health.pharmacy'])
    expect(warnings.join()).toMatch(/'pets\.vet' dropped/)
  })

  it('drops an icon carrying extra CSS classes', () => {
    const { kindTemplates, warnings } = sanitizeTemplateCatalog({
      kindTemplates: [view({ slots: [{ kindId: 'custom.vet', icon: 'x d-none position-fixed top-0' }] })],
    })
    expect(kindTemplates[0].slots[0].icon).toBeUndefined()
    expect(warnings.join()).toMatch(/icon dropped/)
  })

  it('dedupes slots by kindId', () => {
    const { kindTemplates } = sanitizeTemplateCatalog({
      kindTemplates: [view({ slots: [{ kindId: 'custom.vet' }, { kindId: 'custom.vet' }] })],
    })
    expect(kindTemplates[0].slots).toHaveLength(1)
  })

  it('drops a slotted template left with no usable slots', () => {
    const { kindTemplates, warnings } = sanitizeTemplateCatalog({
      kindTemplates: [view({ slots: [{ kindId: 'pets.vet' }] })],
    })
    expect(kindTemplates).toHaveLength(0)
    expect(warnings.join()).toMatch(/needs at least one usable slot/)
  })

  it('keeps a gallery template with zero slots — slotless layouts legitimately have none', () => {
    const { kindTemplates } = sanitizeTemplateCatalog({
      kindTemplates: [view({ id: 'kindtpl.gal.v1', layout: 'gallery', slots: [] })],
    })
    expect(kindTemplates).toHaveLength(1)
    expect(kindTemplates[0].layout).toBe('gallery')
  })
})

describe('sanitizeTemplateCatalog — collection templates', () => {
  it('keeps an entry whose view resolves in the same document', () => {
    const { templates, warnings } = sanitizeTemplateCatalog({ kindTemplates: [view()], templates: [entry()] })
    expect(warnings).toEqual([])
    expect(templates).toHaveLength(1)
  })

  it('resolves a view that exists only in the bundled seed', () => {
    const seed = [{ id: 'kindtpl.seed.v1', name: 'Seed', slots: [{ kindId: 'health.pharmacy' }] }]
    const { templates } = sanitizeTemplateCatalog(
      { templates: [entry({ kindTemplateId: 'kindtpl.seed.v1' })] },
      seed as KindTemplate[],
    )
    expect(templates).toHaveLength(1)
  })

  it('drops an entry whose view does not resolve — no blank previews, no dead markers', () => {
    const { templates, warnings } = sanitizeTemplateCatalog({
      templates: [entry({ kindTemplateId: 'kindtpl.missing.v1' })],
    })
    expect(templates).toHaveLength(0)
    expect(warnings.join()).toMatch(/does not resolve/)
  })

  it('drops an entry pointing at a retired view', () => {
    const { templates, warnings } = sanitizeTemplateCatalog({
      kindTemplates: [view({ retired: true })],
      templates: [entry()],
    })
    expect(templates).toHaveLength(0)
    expect(warnings.join()).toMatch(/is retired/)
  })

  it('strips seedText to embedding-safe characters', () => {
    const { templates } = sanitizeTemplateCatalog({
      kindTemplates: [view()],
      templates: [entry({ seedText: 'health <script>alert(1)</script> insurance' })],
    })
    // Markup characters are gone and whitespace is collapsed. Leftover words are
    // harmless here — this string only ever becomes an embedding query.
    expect(templates[0].seedText).toBe('health script alert 1 script insurance')
    expect(templates[0].seedText).not.toMatch(/[<>/]/)
  })

  it('filters tags and minAgeGroups to their allow-lists', () => {
    const { templates } = sanitizeTemplateCatalog({
      kindTemplates: [view()],
      templates: [entry({ tags: ['health', 'BAD TAG', 'health'], minAgeGroups: ['minage_adult', 'nope'] })],
    })
    expect(templates[0].tags).toEqual(['health'])
    expect(templates[0].minAgeGroups).toEqual(['minage_adult'])
  })

  it('treats an empty minAgeGroups as all-ages rather than none', () => {
    const { templates } = sanitizeTemplateCatalog({
      kindTemplates: [view()],
      templates: [entry({ minAgeGroups: ['nonsense'] })],
    })
    expect(templates[0].minAgeGroups).toBeUndefined()
  })
})

describe('mergeCollectionTemplates', () => {
  const seed = [entry({ id: 'a', name: 'Seed A' }), entry({ id: 'b', name: 'Seed B' })]

  it('keeps seed-only entries', () => {
    expect(mergeCollectionTemplates(seed, []).map((t) => t.name)).toEqual(['Seed A', 'Seed B'])
  })

  it('appends catalog-only entries — how a new template reaches an old client', () => {
    const merged = mergeCollectionTemplates(seed, [entry({ id: 'c', name: 'New' })])
    expect(merged.map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })

  it('lets the catalog override a seed entry field-by-field', () => {
    const merged = mergeCollectionTemplates(seed, [entry({ id: 'a', name: 'Fixed A' })])
    expect(merged.find((t) => t.id === 'a')!.name).toBe('Fixed A')
    expect(merged).toHaveLength(2)
  })
})

describe('retired veto across the seed boundary', () => {
  it('drops a chooser card whose view the CODE retired, even when the catalog says otherwise', () => {
    // Mirrors mergeKindTemplates' OR rule: a stale catalog must not resurrect a
    // view retired in code by simply shipping `retired: false`.
    const seed = [
      { id: 'kindtpl.test.v1', name: 'Test', retired: true, slots: [{ kindId: 'health.pharmacy' }] },
    ] as KindTemplate[]
    const { templates, warnings } = sanitizeTemplateCatalog(
      { kindTemplates: [view({ retired: false })], templates: [entry()] },
      seed,
    )
    expect(templates).toHaveLength(0)
    expect(warnings.join()).toMatch(/is retired/)
  })

  it('still allows a catalog-only view that is not retired', () => {
    const { templates } = sanitizeTemplateCatalog(
      { kindTemplates: [view({ retired: false })], templates: [entry()] },
      [],
    )
    expect(templates).toHaveLength(1)
  })
})
