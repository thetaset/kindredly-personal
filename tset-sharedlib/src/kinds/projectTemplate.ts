import type { ItemDetailsInfo } from '../shared.types'
import { getKindTemplateSchema, PROJECT_KIND_TEMPLATE_ID } from './kindTemplates'

/**
 * Projects (HAT-1064). A Project is a collection whose view is the Project template
 * (`kindtpl.project.v1`, layout 'project'); its parts are its sub-collections. There is no
 * project tag: being in the collection is what puts an item in the project.
 */
export function isProjectCollection(source: any): boolean {
  const schema = getKindTemplateSchema(source)
  if (!schema) return false
  if (schema.templateId === PROJECT_KIND_TEMPLATE_ID) return true
  return schema.schemaVersion === 2 && schema.snapshot.layout === 'project'
}

/**
 * The project's own settings, beside the template marker in encrypted `info.schemas`: which
 * parts are worked through in order. Kept apart from the template marker so changing a
 * setting never rewrites the view, and an older client that rewrites the view keeps them.
 */
export const PROJECT_SETTINGS_SCHEMA_ID = 'kindredly.project.v1'

export type ProjectSettingsV1 = { schemaVersion: 1; inOrderPartIds: string[] }

const MAX_IN_ORDER_PARTS = 200

export function getProjectSettings(source: any): ProjectSettingsV1 {
  const info: ItemDetailsInfo | undefined = source?.info ?? source?.details?.info
  const raw: any = (info?.schemas as any)?.[PROJECT_SETTINGS_SCHEMA_ID]
  const ids = Array.isArray(raw?.inOrderPartIds) ? raw.inOrderPartIds : []
  const inOrderPartIds = [...new Set<string>(ids.filter((id: unknown) => typeof id === 'string' && !!id))].slice(
    0,
    MAX_IN_ORDER_PARTS,
  )
  return { schemaVersion: 1, inOrderPartIds }
}

/** Immutable merge — preserves other info keys and the template marker. */
export function setProjectSettingsOnInfo(
  info: ItemDetailsInfo | null | undefined,
  settings: ProjectSettingsV1,
): ItemDetailsInfo {
  const base = info ?? {}
  return {
    ...base,
    schemas: {
      ...(base.schemas ?? {}),
      [PROJECT_SETTINGS_SCHEMA_ID]: getProjectSettings({ info: { schemas: { [PROJECT_SETTINGS_SCHEMA_ID]: settings } } }),
    },
  }
}

/** A project name compared the way people mean it: case and spacing do not count. */
export function sameProjectCollectionName(a: unknown, b: unknown): boolean {
  const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().toLocaleLowerCase() : '')
  const x = clean(a)
  return !!x && x === clean(b)
}

export type ProjectCollectionRow = { collectionId: string; name: string; description: string }

/**
 * The Project collections among collection rows (a `/collection/listByUser` answer, decrypted),
 * leaving out archived ones. The app and the background both read rows with this, so the two
 * never disagree about what is a project.
 */
export function projectRowsFrom(rows: any[]): ProjectCollectionRow[] {
  const out: ProjectCollectionRow[] = []
  for (const row of rows) {
    const details = row?.details || {}
    const collectionId: string | undefined = row?.itemId || details?._id
    if (!collectionId || details.archived) continue
    if (!isProjectCollection(row)) continue
    out.push({ collectionId, name: details.name || 'Untitled', description: details.description || '' })
  }
  return out
}

/** The project with this name, ignoring case and spacing. Only ever a Project collection. */
export function findProjectByName(rows: ProjectCollectionRow[], name: unknown): ProjectCollectionRow | null {
  return rows.find((row) => sameProjectCollectionName(row.name, name)) ?? null
}
