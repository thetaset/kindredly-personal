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
}

export interface CategorySet {
  id: string
  name: string
  description?: string
  minAgeGroups?: MinAgeGroup[]
  nodes: CategoryNode[]
}
