import {
  KIND_TEMPLATES,
  clearRemoteKindTemplates,
  getAllKindTemplates,
  getKindTemplate,
  getSelectableKindTemplates,
  makeKindTemplateSchema,
  resolveKindTemplateFromSchema,
  setRemoteKindTemplates,
  type KindTemplate,
} from '../src/kinds/kindTemplates'

const remote = (over: Partial<KindTemplate> = {}): KindTemplate => ({
  id: 'kindtpl.remote.v1',
  name: 'Remote',
  slots: [{ kindId: 'custom.vet', label: 'Vet' }],
  ...over,
})

afterEach(() => clearRemoteKindTemplates())

describe('kind template overlay', () => {
  it('returns the seed untouched when no catalog is installed', () => {
    expect(getAllKindTemplates()).toHaveLength(KIND_TEMPLATES.length)
  })

  it('adds a catalog-only template — the whole point of the catalog', () => {
    setRemoteKindTemplates([remote()])
    expect(getKindTemplate('kindtpl.remote.v1')).toMatchObject({ name: 'Remote' })
    expect(getAllKindTemplates()).toHaveLength(KIND_TEMPLATES.length + 1)
  })

  it('keeps every seed template when a catalog is installed', () => {
    setRemoteKindTemplates([remote()])
    for (const seed of KIND_TEMPLATES) {
      expect(getKindTemplate(seed.id)).not.toBeNull()
    }
  })

  it('lets the catalog override a seed template field-by-field', () => {
    setRemoteKindTemplates([{ id: 'kindtpl.health.v1', name: 'Health (updated)', slots: [] } as KindTemplate])
    const merged = getKindTemplate('kindtpl.health.v1')!
    expect(merged.name).toBe('Health (updated)')
    // Untouched fields survive the merge.
    expect(merged.accent).toBe('rose')
  })

  it('ORs `retired` so code keeps its veto over a stale catalog', () => {
    // kindtpl.apps.v1 is retired in code; a catalog saying otherwise must not resurrect it.
    setRemoteKindTemplates([{ id: 'kindtpl.apps.v1', name: 'Standard Apps', slots: [], retired: false } as KindTemplate])
    expect(getKindTemplate('kindtpl.apps.v1')!.retired).toBe(true)
    expect(getSelectableKindTemplates().find((t) => t.id === 'kindtpl.apps.v1')).toBeUndefined()
  })

  it('lets the catalog retire a seed template', () => {
    setRemoteKindTemplates([{ id: 'kindtpl.health.v1', name: 'Health', slots: [], retired: true } as KindTemplate])
    expect(getSelectableKindTemplates().find((t) => t.id === 'kindtpl.health.v1')).toBeUndefined()
    // Still resolvable, so existing instances keep rendering.
    expect(getKindTemplate('kindtpl.health.v1')).not.toBeNull()
  })

  it('excludes retired templates from the picker but not from resolution', () => {
    setRemoteKindTemplates([remote({ retired: true })])
    expect(getSelectableKindTemplates().find((t) => t.id === 'kindtpl.remote.v1')).toBeUndefined()
    expect(getKindTemplate('kindtpl.remote.v1')).not.toBeNull()
  })

  it('restores the seed exactly when the overlay is cleared', () => {
    const before = getAllKindTemplates()
    setRemoteKindTemplates([remote()])
    clearRemoteKindTemplates()
    expect(getAllKindTemplates()).toEqual(before)
  })

  it('recomputes rather than serving a stale memoized merge', () => {
    setRemoteKindTemplates([remote({ name: 'First' })])
    expect(getKindTemplate('kindtpl.remote.v1')!.name).toBe('First')
    setRemoteKindTemplates([remote({ name: 'Second' })])
    expect(getKindTemplate('kindtpl.remote.v1')!.name).toBe('Second')
  })
})

describe('instance markers against the overlay', () => {
  it('prefers the live catalog template over the snapshot', () => {
    setRemoteKindTemplates([remote({ name: 'Live name' })])
    const schema = makeKindTemplateSchema(remote({ name: 'Snapshot name' }))
    expect(resolveKindTemplateFromSchema(schema)!.name).toBe('Live name')
  })

  it('falls back to the snapshot once a catalog template is withdrawn', () => {
    const schema = makeKindTemplateSchema(remote({ name: 'Snapshot name' }))
    clearRemoteKindTemplates()
    const resolved = resolveKindTemplateFromSchema(schema)!
    expect(resolved.name).toBe('Snapshot name')
    expect(resolved.slots.map((s) => s.kindId)).toEqual(['custom.vet'])
  })

  it('carries slot label/icon through a v2 snapshot', () => {
    const schema = makeKindTemplateSchema(
      remote({ slots: [{ kindId: 'custom.vet', label: 'Vet', icon: 'heart-pulse' }] }),
    )
    clearRemoteKindTemplates()
    expect(resolveKindTemplateFromSchema(schema)!.slots[0]).toMatchObject({ label: 'Vet', icon: 'heart-pulse' })
  })
})
