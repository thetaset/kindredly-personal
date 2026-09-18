import type { MinAgeGroup } from '../content.types'
import { ADULT_BANDS, TEEN_BANDS } from './ageBands'

/**
 * Collection templates — the entries the "Select from templates" chooser shows.
 *
 * A CollectionTemplate is the DISCOVERY half (name, description, icon, age band,
 * search text); the VIEW half is a KindTemplate (slots/layout/accent) referenced
 * by `kindTemplateId`. The two stay separate on purpose:
 *
 *  - `KindTemplate.id` is what gets written into a collection's E2E-encrypted
 *    instance marker, so it is an identity that already exists at rest.
 *  - Views exist without chooser entries (`kindtpl.apps.v1` is retired, and
 *    Collection.vue's change-view picker reads KindTemplates directly).
 *
 * This list is the SEED: it is compiled into every client as the offline floor,
 * and it is also serialized to static JSON by the catalog build script. Clients
 * merge the fetched catalog over this seed, which is how a template added after
 * a client shipped still reaches it. See `templateCatalog.sanitize.ts`.
 */
export type CollectionTemplate = {
  id: string
  name: string
  description?: string
  tags?: string[]
  /** Display grouping label for the chooser ("Personal Admin", "Finance", …) */
  group?: string
  /** Optional text used for embeddings-based matching (no LLM required) */
  seedText?: string
  /**
   * Links to a KindTemplate (kindTemplates.ts) — the view the created
   * collection opens as. REQUIRED in practice: a template that brings no view is
   * just a name suggestion, and those were removed.
   */
  kindTemplateId: string
  /** Bootstrap icon name shown on the chooser card */
  icon?: string
  /**
   * Age bands this template is a *default* suggestion for. Omit for all ages.
   * This only affects what shows first — "Show all" and search reach everything.
   */
  minAgeGroups?: MinAgeGroup[]
}

/**
 * Declared display order for the chooser's section headings. Groups not listed
 * here sort after these, alphabetically.
 */
export const TEMPLATE_GROUP_ORDER: string[] = [
  'Photos & Media',
  'Personal Admin',
  'Home & Family',
  'Finance',
  'School & Learning',
]

/**
 * Every template here brings a view (kindTemplateId). Plain name-and-tag
 * suggestions were removed: a "template" that only prefills a name promises
 * something it does not deliver.
 */
export const COLLECTION_TEMPLATE_SEED: CollectionTemplate[] = [
  {
    id: 'personal.health.v1',
    name: 'Health',
    group: 'Personal Admin',
    description: 'Insurance, providers, and pharmacy — with a view of what you have.',
    tags: ['health'],
    seedText: 'health insurance physician dentist pharmacy provider patient portal coverage',
    kindTemplateId: 'kindtpl.health.v1',
    icon: 'heart-pulse',
    minAgeGroups: ADULT_BANDS,
  },
  {
    id: 'personal.health.symbols.v1',
    name: 'Health Info',
    group: 'Personal Admin',
    description: 'A symbolic health board — big tiles, tap one to see what’s inside.',
    tags: ['health'],
    seedText: 'health insurance physician dentist pharmacy provider patient portal coverage',
    kindTemplateId: 'kindtpl.health.symbols.v1',
    icon: 'grid',
    minAgeGroups: ADULT_BANDS,
  },
  {
    id: 'personal.home.v1',
    name: 'Home',
    group: 'Home & Family',
    description: 'Wi-Fi, insurance, utilities, and the people who fix things.',
    tags: ['home'],
    seedText: 'home wifi network insurance utilities warranty manual plumber electrician hvac',
    kindTemplateId: 'kindtpl.home.v1',
    icon: 'house-heart',
    minAgeGroups: ADULT_BANDS,
  },
  {
    id: 'personal.finance.v1',
    name: 'Finance',
    group: 'Finance',
    description: 'Banking, taxes, and coverage in one place.',
    tags: ['finance'],
    seedText: 'bank taxes insurance retirement account portal finance money',
    kindTemplateId: 'kindtpl.finance.v1',
    icon: 'bank',
    minAgeGroups: ADULT_BANDS,
  },
  {
    id: 'personal.school.v1',
    name: 'School',
    group: 'School & Learning',
    description: 'Portal, teachers, and schedules for a student.',
    tags: ['school'],
    seedText: 'school portal teacher contact calendar lunch menu classroom grades',
    kindTemplateId: 'kindtpl.school.v1',
    icon: 'mortarboard',
    minAgeGroups: TEEN_BANDS,
  },
  {
    id: 'photos.gallery.v1',
    name: 'Photo Gallery',
    group: 'Photos & Media',
    description: 'Everything you add, shown as a grid of pictures.',
    tags: ['photos'],
    seedText: 'photo gallery pictures images album grid art screenshots snapshots',
    kindTemplateId: 'kindtpl.gallery.v1',
    icon: 'images',
  },
]
