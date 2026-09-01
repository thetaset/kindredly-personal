import type { MinAgeGroup } from '../content.types'

export interface CategoryNode {
  id: string
  label: string
  description?: string
  tags?: string[]
  children?: CategoryNode[]
  /** Bootstrap icon name (without the `bi-` prefix), used as a lightweight visual badge. */
  icon?: string
  /** Real artwork URL; takes precedence over `icon` when present. */
  imageUrl?: string
  /**
   * Published-content query ids this leaf resolves to. Published rows are tagged only with the
   * canonical `general` set's leaf ids, so age-set leaves (`kid_*`/`teen_*`) map to one or more
   * `gen_*` ids here to surface real content. Absent means the leaf maps to itself (`[id]`).
   */
  sourceCategoryIds?: string[]
}

export interface CategorySet {
  id: string
  name: string
  description?: string
  minAgeGroups?: MinAgeGroup[]
  /** Banner Library filename for the set's header/cover image. Resolved to a URL at render. */
  bannerFilename?: string
  /**
   * When `false`, the set is hidden from the user-facing published/explorer UI (but still
   * visible and editable in admin). Absent/`true` means visible — the default.
   */
  enabled?: boolean
  nodes: CategoryNode[]
}
