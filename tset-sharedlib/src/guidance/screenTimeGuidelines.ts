/**
 * Cited screen-time guideline table — one row per age band.
 *
 * A fourth age-band scheme, deliberately separate from MinAgeGroup,
 * restrictionPresets and screenTimePresets: every number here needs a
 * citation, and the bands are where the sources draw lines. Do not
 * re-band the other three schemes to match this one.
 *
 * Confidence tiers follow the registry's evidence-quality section:
 * - established: well established (sleep/activity needs, bedtime devices,
 *   video deficit, co-viewing → language)
 * - consistent: consistent association, small effects, causality unresolved
 * - consensus: expert consensus or precaution, thin direct evidence
 */

import { GUIDANCE_SOURCES, type GuidanceSourceId } from './guidanceSources'

export type GuidanceAgeBand = 'under2' | 'preschool' | 'schoolAge' | 'teen' | 'adult'

export type GuidanceConfidence = 'established' | 'consistent' | 'consensus'

export const GUIDANCE_CONFIDENCE_LABELS: Record<GuidanceConfidence, string> = {
  established: 'Well established',
  consistent: 'Consistent, small effects',
  consensus: 'Expert consensus',
}

export interface GuidanceClaim<T> {
  value: T
  sourceIds: GuidanceSourceId[]
  confidence: GuidanceConfidence
  note?: string
}

export type SocialMediaGuidance = 'not-recommended' | 'monitored' | 'family-decision'

/**
 * What each social-media verdict is called on screen. Written as a verdict about the
 * child in front of the parent, not as a category name, so a row can carry it alone.
 */
export const SOCIAL_MEDIA_GUIDANCE_LABELS: Record<SocialMediaGuidance, string> = {
  'not-recommended': 'Not recommended at this age',
  monitored: 'Only alongside an adult',
  'family-decision': 'Your call',
}

/**
 * Why a video cap is worth setting, at any age.
 *
 * No band varies it, so it is one claim rather than a row on the table.
 *
 * This used to be an autoplay claim cited to the AAP policy statement (S3) — that one
 * video runs into the next, so watching has no end of its own. It was dropped because it
 * is not reliably true: plenty of watching is a chosen film that ends by itself, and a
 * reason a parent can find a counter-example to is worse than none.
 *
 * What replaces it is the active-versus-passive one: skill comes from doing, and watching
 * is the activity that displaces doing. Active skill-building is the Harvard center's
 * framing (S33); the video deficit — children learning less from a screen than from the
 * same thing live — is Jing 2022 (S13). The citations moved with the claim, because S3
 * was evidence for the sentence that is gone, not for this one.
 *
 * It is still deliberately NOT a claim that "passive screen time" is a measured quantity,
 * and not a claim about brain activation: no source here supports either. Note the video
 * deficit evidence is strongest in early childhood, which is why the sentence says what
 * children build skills from rather than putting a number or an age on it.
 */
export const VIDEO_LIMIT_GUIDANCE: { text: string; sourceIds: GuidanceSourceId[]; confidence: GuidanceConfidence } = {
  text: 'Watching is passive: children build skills by doing, not viewing. A cap leaves room for the rest of the day.',
  sourceIds: ['S33', 'S13'],
  confidence: 'consistent',
}

export interface ScreenTimeGuideline {
  band: GuidanceAgeBand
  label: string
  /** Display range, e.g. "2–5". */
  ages: string
  minAge: number
  /** Exclusive upper bound; teen ends at 18. */
  maxAge: number
  recreationalScreen: GuidanceClaim<{ maxMinutesPerDay: number | null }>
  sleep: GuidanceClaim<{ minHours: number; maxHours: number }>
  physicalActivity: GuidanceClaim<{ minutesPerDay: number | null; perWeekMinutes?: number; kind: 'any' | 'mvpa' }>
  socialMedia: GuidanceClaim<SocialMediaGuidance>
  bedtime: GuidanceClaim<{ bufferMinutes: number; deviceOutOfBedroom: boolean; lateNightCutoffHour: number }>
  contentQuality: GuidanceClaim<string[]>
  /** What the guidance recommends that Kindredly cannot see. */
  offScreen: GuidanceClaim<string[]>
}

/** Which claims Kindredly can measure at all — rendered on the public page as a table. */
export type GuidanceClaimKey =
  | 'recreationalScreen'
  | 'sleep'
  | 'physicalActivity'
  | 'socialMedia'
  | 'bedtime'
  | 'contentQuality'
  | 'offScreen'

/** `partial` = visible when the child's device is logged and classified; `none` = never measured. */
export const MEASUREMENT_COVERAGE: Record<GuidanceClaimKey, 'partial' | 'none'> = {
  recreationalScreen: 'partial',
  sleep: 'none',
  physicalActivity: 'none',
  socialMedia: 'partial',
  bedtime: 'partial',
  contentQuality: 'partial',
  offScreen: 'none',
}

/**
 * The public methodology page. In-app builds link out to it (D5); the website
 * build renders this same data so page and engine cannot drift.
 */
export const SCREEN_TIME_GUIDANCE_URL = 'https://kindredly.ai/screen-time-guidance'

/**
 * What "recreational" means, in plain language. Every published hour cap is a
 * recreational cap — learning and task time sit outside it — and this is the
 * one distinction parents most often get wrong, so pages and engine share it.
 */
export const RECREATIONAL_SCREEN_INFO = {
  counts: [
    'Shows and movies',
    'Games and casual play',
    'Feeds and scrolling',
    'Edu-tainment — fun first, learning second',
  ],
  neverCounts: [
    'Schoolwork and study',
    'Tutorials and documentaries',
    'Docs, calendars and research',
    'Messaging family and friends',
  ],
  note: 'Every published hour cap is a recreational cap. Learning and task time sit outside it — a two-hour homework session never counts against the two-hour ceiling.',
}

/**
 * The anchor a source is rendered under on the sources page: the citeKey, not
 * the S-id. Author-year is what a reader sees on the chip (D10); the S-ids are
 * internal filing. One helper so the in-app link and the website's own
 * router-link cannot drift apart.
 */
export function guidanceRefAnchor(id: GuidanceSourceId): string {
  const source = GUIDANCE_SOURCES[id]
  return `ref-${(source?.citeKey ?? id).replace(/\s+/g, '-')}`
}

/**
 * Absolute link to a reference entry, for in-app builds that must leave the app
 * to reach it. The references live on the /sources subpage, not the hub — this
 * pointed at a dead anchor on the wrong page until STG-7.
 */
export function guidanceRefUrl(id: GuidanceSourceId): string {
  return `${SCREEN_TIME_GUIDANCE_URL}/sources#${guidanceRefAnchor(id)}`
}

const BEDTIME_NOTE =
  'The late-night hour is a derived convention — each band\u2019s sleep need plus a one-hour wind-down against a 7 a.m. wake — not a finding from a study.'

export const SCREEN_TIME_GUIDELINES: Record<GuidanceAgeBand, ScreenTimeGuideline> = {
  under2: {
    band: 'under2',
    label: 'Under 2',
    ages: '0–1',
    minAge: 0,
    maxAge: 2,
    recreationalScreen: {
      value: { maxMinutesPerDay: 0 },
      sourceIds: ['S1', 'S4'],
      confidence: 'consensus',
      note: 'The one exception: video chat with family, a caregiver alongside. WHO graded its own screen-time evidence "very low quality" — this is precaution.',
    },
    sleep: {
      value: { minHours: 11, maxHours: 17 },
      sourceIds: ['S4'],
      confidence: 'established',
      note: 'Newborns need the most (14–17h); by age 1–2 it settles to 11–14h including naps.',
    },
    physicalActivity: {
      value: { minutesPerDay: 180, kind: 'any' },
      sourceIds: ['S4'],
      confidence: 'established',
      note: 'Several short sessions through the day — floor play and tummy time count.',
    },
    socialMedia: {
      value: 'not-recommended',
      sourceIds: ['S9', 'S10'],
      confidence: 'consistent',
    },
    bedtime: {
      value: { bufferMinutes: 60, deviceOutOfBedroom: true, lateNightCutoffHour: 20 },
      sourceIds: ['S2', 'S8'],
      confidence: 'established',
      note: BEDTIME_NOTE,
    },
    contentQuality: {
      value: [
        'People over screens — learning at this age comes from live interaction',
        'If screens appear at all, an adult alongside talking about it',
      ],
      sourceIds: ['S1', 'S13'],
      confidence: 'established',
    },
    offScreen: {
      value: [
        'Being read to',
        'Floor play and exploring with people',
      ],
      sourceIds: ['S1', 'S4', 'S13'],
      confidence: 'consensus',
    },
  },
  preschool: {
    band: 'preschool',
    label: 'Preschool',
    ages: '2–5',
    minAge: 2,
    maxAge: 6,
    recreationalScreen: {
      value: { maxMinutesPerDay: 60 },
      sourceIds: ['S1', 'S4', 'S20'],
      confidence: 'consensus',
      note: 'A ceiling, not a target — guidelines use about an hour of high-quality programming as a precaution. AACAP allows up to 3 hours on weekend days.',
    },
    sleep: {
      value: { minHours: 10, maxHours: 13 },
      sourceIds: ['S7', 'S4'],
      confidence: 'established',
      note: 'Per 24 hours, naps included.',
    },
    physicalActivity: {
      value: { minutesPerDay: 180, kind: 'any' },
      sourceIds: ['S4'],
      confidence: 'established',
      note: 'From age 3, at least 60 minutes should be moderate-to-vigorous — energetic play.',
    },
    socialMedia: {
      value: 'not-recommended',
      sourceIds: ['S9', 'S10'],
      confidence: 'consistent',
    },
    bedtime: {
      value: { bufferMinutes: 60, deviceOutOfBedroom: true, lateNightCutoffHour: 20 },
      sourceIds: ['S2', 'S8', 'S20'],
      confidence: 'established',
      note: BEDTIME_NOTE,
    },
    contentQuality: {
      value: [
        'Slow-paced, educational programming over fast-paced cartoons',
        'Co-view and talk about what you watch together',
      ],
      sourceIds: ['S1', 'S11', 'S12', 'S13'],
      confidence: 'established',
    },
    offScreen: {
      value: [
        'Unstructured play, indoors and out',
        'Being read to',
        'Outdoor and adventurous play',
      ],
      sourceIds: ['S4', 'S35'],
      confidence: 'consensus',
    },
  },
  schoolAge: {
    band: 'schoolAge',
    label: 'School age',
    ages: '6–12',
    minAge: 6,
    maxAge: 13,
    recreationalScreen: {
      value: { maxMinutesPerDay: 120 },
      sourceIds: ['S6'],
      confidence: 'consensus',
      note: 'What national movement guidelines use for recreation; school work is explicitly excluded. No study finds a cliff at two hours.',
    },
    sleep: {
      value: { minHours: 9, maxHours: 12 },
      sourceIds: ['S7'],
      confidence: 'established',
    },
    physicalActivity: {
      value: { minutesPerDay: 60, kind: 'mvpa' },
      sourceIds: ['S5', 'S6'],
      confidence: 'established',
      note: 'Moderate-to-vigorous, on average across the week; vigorous and bone-strengthening activity at least 3 days/week.',
    },
    socialMedia: {
      value: 'not-recommended',
      sourceIds: ['S9', 'S10'],
      confidence: 'consistent',
      note: '13 is the platforms\u2019 own legal floor, not a developmental finding; the sensitive window starts around 11.',
    },
    bedtime: {
      value: { bufferMinutes: 60, deviceOutOfBedroom: true, lateNightCutoffHour: 21 },
      sourceIds: ['S2', 'S8', 'S20'],
      confidence: 'established',
      note: BEDTIME_NOTE,
    },
    contentQuality: {
      value: [
        'Finite experiences over endless feeds — pick a show or a game with an end',
        'Educational and creative uses count toward the good half',
        'Serious or difficult content is fine — hard things are not junk; a parent alongside makes them better',
      ],
      sourceIds: ['S3', 'S12', 'S14', 'S33'],
      confidence: 'consistent',
    },
    offScreen: {
      value: [
        'Reading for pleasure — around 12 hours/week is linked to better cognition and well-being',
        'Outdoor and risky play: climbing, exploring, rough-and-tumble',
        'In-person time with friends',
        'Sport, hobbies, making things',
      ],
      sourceIds: ['S16', 'S29', 'S35', 'S5'],
      confidence: 'consistent',
    },
  },
  teen: {
    band: 'teen',
    label: 'Teen',
    ages: '13–17',
    minAge: 13,
    maxAge: 18,
    recreationalScreen: {
      value: { maxMinutesPerDay: 120 },
      sourceIds: ['S6'],
      confidence: 'consensus',
      note: 'Same movement-guideline figure as school age; no hourly cap exists in AAP guidance — consistency beats a number.',
    },
    sleep: {
      value: { minHours: 8, maxHours: 10 },
      sourceIds: ['S7'],
      confidence: 'established',
    },
    physicalActivity: {
      value: { minutesPerDay: 60, kind: 'mvpa' },
      sourceIds: ['S5'],
      confidence: 'established',
    },
    socialMedia: {
      value: 'monitored',
      sourceIds: ['S9', 'S10', 'S25'],
      confidence: 'consistent',
      note: 'Adult monitoring through the early teens (~14), when the sensitivity window closes; after that a family decision. Heavy use (>3 h/day) doubles depression/anxiety symptom risk at 12–15.',
    },
    bedtime: {
      value: { bufferMinutes: 60, deviceOutOfBedroom: true, lateNightCutoffHour: 22 },
      sourceIds: ['S2', 'S8'],
      confidence: 'established',
      note: BEDTIME_NOTE,
    },
    contentQuality: {
      value: [
        'Turn off notifications and autoplay — they are designed to pull you back in',
        'Creating counts more than scrolling: make, build, publish',
        'Hard topics are part of growing up — discussed together, they build judgement',
      ],
      sourceIds: ['S3', 'S27', 'S28', 'S33'],
      confidence: 'consistent',
    },
    offScreen: {
      value: [
        'Reading — fiction correlates with empathy and reading people',
        'In-person social time — face-to-face is where emotional cues are learned',
        'Sport and physical activity',
        'Sleep protected: device out of the room overnight',
      ],
      sourceIds: ['S5', 'S16', 'S29', 'S30', 'S31'],
      confidence: 'consistent',
    },
  },
  adult: {
    band: 'adult',
    label: 'Adult',
    ages: '18–64',
    minAge: 18,
    maxAge: 65,
    recreationalScreen: {
      value: { maxMinutesPerDay: 180 },
      sourceIds: ['S37'],
      confidence: 'consensus',
      note: 'What the Canadian adult movement guidelines use — no more than 3 hours of recreational screen time, inside an 8-hour sedentary ceiling. No other major body publishes an adult screen figure; treat it as a ceiling, not a target. Ages 65+ have their own guidelines.',
    },
    sleep: {
      value: { minHours: 7, maxHours: 9 },
      sourceIds: ['S37'],
      confidence: 'established',
      note: 'With consistent bed and wake times — the schedule matters as much as the total.',
    },
    physicalActivity: {
      value: { minutesPerDay: null, perWeekMinutes: 150, kind: 'mvpa' },
      sourceIds: ['S37'],
      confidence: 'established',
      note: 'At least 150 minutes of moderate-to-vigorous activity across the week, plus muscle-strengthening twice a week; several hours of light activity, including standing.',
    },
    socialMedia: {
      value: 'family-decision',
      sourceIds: ['S3'],
      confidence: 'consensus',
      note: 'No adult guideline sets a number — it is your call. The design-awareness points hold at every age: notifications, autoplay and endless scroll are built to maximise time spent.',
    },
    bedtime: {
      value: { bufferMinutes: 60, deviceOutOfBedroom: true, lateNightCutoffHour: 23 },
      sourceIds: ['S37', 'S8'],
      confidence: 'consistent',
      note: 'The adult guidelines call for consistent schedules and good sleep hygiene. The device-out-of-the-bedroom evidence base is strongest in children and teens; the adult-specific studies point the same way.',
    },
    contentQuality: {
      value: [
        'Turn off notifications and autoplay — the same design traps work on adults',
        'Finite experiences over endless feeds — pick a show or a game with an end',
        'Creating counts more than scrolling: make, build, publish',
      ],
      sourceIds: ['S3'],
      confidence: 'consistent',
    },
    offScreen: {
      value: [
        'Movement through the day — break up long periods of sitting',
        'Several hours of light activity, including standing',
        'A consistent wind-down before bed',
      ],
      sourceIds: ['S37'],
      confidence: 'established',
    },
  },
}

const ALL_BANDS: GuidanceAgeBand[] = ['under2', 'preschool', 'schoolAge', 'teen', 'adult']

/**
 * Map an age in whole years to its guidance band.
 * Returns null only for unknown ages — guidance now runs from birth through adulthood.
 */
export function guidanceBandForAge(age: number | null): GuidanceAgeBand | null {
  if (age === null || age < 0) return null
  if (age < 2) return 'under2'
  if (age < 6) return 'preschool'
  if (age < 13) return 'schoolAge'
  if (age < 18) return 'teen'
  return 'adult'
}

export function guidanceBandAges(band: GuidanceAgeBand): [number, number] {
  const g = SCREEN_TIME_GUIDELINES[band]
  return [g.minAge, g.maxAge]
}

/** The full guideline row for an age, or null outside 0–17. */
export function guidelineForAge(age: number | null): ScreenTimeGuideline | null {
  const band = guidanceBandForAge(age)
  return band ? SCREEN_TIME_GUIDELINES[band] : null
}

export function allGuidanceBands(): GuidanceAgeBand[] {
  return [...ALL_BANDS]
}

/**
 * Why a preset recommends the numbers it does.
 *
 * Deliberately NOT a copy of the band's figures — the guideline value is always
 * `SCREEN_TIME_GUIDELINES[band].recreationalScreen`, and duplicating it here
 * would only create something to drift.
 *
 * `note` carries the one thing the numbers cannot: every published cap is a
 * *recreational* cap, while a preset's `overallMinutes` is a *total* cap that
 * includes schoolwork and learning. They measure different quantities, so a
 * note must say which direction its preset differs from the guideline. Never
 * imply the preset's number is the guideline's number.
 */
export interface GuidanceBasis {
  band: GuidanceAgeBand
  sourceIds: GuidanceSourceId[]
  note: string
}
