import type { MinAgeGroup } from '../content.types'
import { matchesAgeBand, KIDS_BANDS, ADULT_BANDS } from '../kinds/ageBands'

/**
 * Things to do that are not on a screen.
 *
 * Shown when a block's stance is `step-away` — the moments where the honest
 * answer is "not right now" rather than "here is something else to look at".
 *
 * These are deliberately **prompts, not links**. Nothing here is tappable and
 * nothing opens anything: a list of suggestions that all lead back to the device
 * would undo the limit it is standing in for. They are also deliberately vague
 * ("Go outside for a bit", not "Go for a 20 minute walk") — the person knows
 * their own life, and a specific instruction from a blocking screen reads as
 * nagging.
 */
export type OffscreenIdea = {
  /** Stable key referenced by `BlockIntervention.offscreenIdeaKeys`. */
  key: string
  title: string
  /** Bootstrap icon name. */
  icon: string
  /**
   * Age bands this wording suits. Omitted means every age.
   * Matched with the shared `matchesAgeBand` helper, so an unknown band (no
   * date of birth) falls back to adult exactly as the other preset catalogs do.
   */
  minAgeGroups?: MinAgeGroup[]
}

export const OFFSCREEN_IDEAS: OffscreenIdea[] = [
  { key: 'outside', title: 'Go outside for a bit', icon: 'sun' },
  { key: 'move', title: 'Move around — stretch, walk, anything', icon: 'bicycle' },
  { key: 'paper', title: 'Read something on paper', icon: 'book' },

  // Same idea, different words by age. Only one of each pair ever shows.
  { key: 'talk', title: 'Find someone to talk to', icon: 'chat-heart', minAgeGroups: KIDS_BANDS },
  { key: 'talk', title: 'Talk to someone', icon: 'chat-heart', minAgeGroups: ADULT_BANDS },
  { key: 'make', title: 'Build or draw something', icon: 'palette', minAgeGroups: KIDS_BANDS },
  { key: 'make', title: 'Make something with your hands', icon: 'palette', minAgeGroups: ADULT_BANDS },
  { key: 'tidy', title: 'Sort out one small thing', icon: 'box-seam' },
  { key: 'rest', title: 'Rest your eyes', icon: 'moon-stars' },
  { key: 'tasks', title: 'Finish what you owe someone', icon: 'check2-square' },
]

/**
 * The ideas for a person, in the order the caller asked for them.
 *
 * Keys drive the order (so a stance can lead with what fits it best), and each
 * key resolves to at most one idea — the age-appropriate wording. A key with no
 * age match is skipped rather than falling back, since a missing entry means the
 * catalog has no version of it for this person.
 */
export function offscreenIdeasFor(
  band: MinAgeGroup | null | undefined,
  keys: string[],
): OffscreenIdea[] {
  const out: OffscreenIdea[] = []
  for (const key of keys) {
    const match = OFFSCREEN_IDEAS.find(
      (idea) => idea.key === key && matchesAgeBand(idea.minAgeGroups, band),
    )
    if (match) out.push(match)
  }
  return out
}
