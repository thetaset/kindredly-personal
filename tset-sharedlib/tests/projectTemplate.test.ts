import {
  KIND_TEMPLATE_SCHEMA_ID,
  PROJECT_KIND_TEMPLATE_ID,
  getKindTemplate,
  getKindTemplateSchema,
  makeKindTemplateSchema,
  setKindTemplateSchemaOnInfo,
} from '../src/kinds/kindTemplates'
import { COLLECTION_TEMPLATE_SEED } from '../src/kinds/collectionTemplates'
import { sanitizeTemplateCatalog } from '../src/kinds/templateCatalog.sanitize'
import {
  PROJECT_SETTINGS_SCHEMA_ID,
  getProjectSettings,
  isProjectCollection,
  sameProjectCollectionName,
  setProjectSettingsOnInfo,
} from '../src/kinds/projectTemplate'

const projectInfo = () => setKindTemplateSchemaOnInfo({}, makeKindTemplateSchema(getKindTemplate(PROJECT_KIND_TEMPLATE_ID)!))

describe('Project template (HAT-1064)', () => {
  it('is a slotless view whose marker keeps its snapshot', () => {
    const schema = getKindTemplateSchema({ info: projectInfo() })
    expect(schema?.schemaVersion).toBe(2)
    expect(schema?.schemaVersion === 2 && schema.snapshot.layout).toBe('project')
  })

  it('has a chooser entry that brings the Project view and no tags', () => {
    const entry = COLLECTION_TEMPLATE_SEED.find((t) => t.kindTemplateId === PROJECT_KIND_TEMPLATE_ID)
    expect(entry?.name).toBe('Project')
    expect(entry?.tags).toBeUndefined()
  })

  it('survives the catalog sanitizer without a warning', () => {
    const tpl = getKindTemplate(PROJECT_KIND_TEMPLATE_ID)!
    const entry = COLLECTION_TEMPLATE_SEED.find((t) => t.kindTemplateId === PROJECT_KIND_TEMPLATE_ID)!
    const out = sanitizeTemplateCatalog({ kindTemplates: [tpl], templates: [entry] })
    expect(out.warnings).toEqual([])
    expect(out.kindTemplates.map((t: any) => t.layout)).toEqual(['project'])
  })

  it('knows a Project collection from any other', () => {
    expect(isProjectCollection({ info: projectInfo() })).toBe(true)
    expect(isProjectCollection({ details: { info: projectInfo() } })).toBe(true)
    const gallery = setKindTemplateSchemaOnInfo({}, makeKindTemplateSchema(getKindTemplate('kindtpl.gallery.v1')!))
    expect(isProjectCollection({ info: gallery })).toBe(false)
    expect(isProjectCollection({ info: {} })).toBe(false)
    expect(isProjectCollection(null)).toBe(false)
  })

  it('keeps settings beside the view marker', () => {
    const info = setProjectSettingsOnInfo(projectInfo(), { schemaVersion: 1, inOrderPartIds: ['a', 'a', '', 'b'] as any })
    expect((info.schemas as any)[KIND_TEMPLATE_SCHEMA_ID]).toBeTruthy()
    expect((info.schemas as any)[PROJECT_SETTINGS_SCHEMA_ID]).toEqual({ schemaVersion: 1, inOrderPartIds: ['a', 'b'] })
    expect(getProjectSettings({ info }).inOrderPartIds).toEqual(['a', 'b'])
    expect(getProjectSettings({ info: {} })).toEqual({ schemaVersion: 1, inOrderPartIds: [] })
  })

  it('matches names ignoring case and spacing', () => {
    expect(sameProjectCollectionName('Kitchen  remodel ', 'kitchen remodel')).toBe(true)
    expect(sameProjectCollectionName('', '')).toBe(false)
    expect(sameProjectCollectionName('Kitchen', 'Kitchens')).toBe(false)
  })
})
