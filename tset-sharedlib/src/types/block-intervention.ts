import type { ReasonCode } from './activity.types'

/**
 * What a person actually needs when a block stops them — derived from *why* it
 * stopped them.
 *
 * A block is not one situation. "You are out of time" and "that particular site
 * is not allowed" call for opposite responses, and the difference is already
 * captured in the `ReasonCode` the decision carries. This maps that code to a
 * stance, so the block page can answer the real situation instead of showing one
 * generic screen.
 *
 * - `step-away`        the limit itself said stop. Offer things away from the
 *                      screen, and nothing that leads back to one.
 * - `redirect-on-screen` the intent was fine, the destination wasn't. A good
 *                      approved alternative genuinely serves what they came for.
 * - `finish-task`      something of theirs is outstanding, and doing it is the
 *                      way through.
 * - `just-wait`        nothing is actually wrong. Say so and stay out of the way.
 */
export type InterventionStance =
  | 'step-away'
  | 'redirect-on-screen'
  | 'finish-task'
  | 'just-wait'

export type BlockIntervention = {
  stance: InterventionStance
  /**
   * The default line shown when a guardian has not written their own reminder
   * message. Calm and short. Never a lecture, and never praise for being
   * blocked — this is the moment a person is most likely to read it as either.
   */
  message: string
  /**
   * Whether on-screen alternatives (library items, mini-apps) may be offered.
   *
   * False for every `step-away` reason, and that is the point: answering "you
   * are out of time" with a menu of more things to look at makes reaching the
   * limit mildly rewarding, and quietly turns a boundary into a doorway. The
   * unit test asserts this invariant rather than trusting the table below.
   */
  offerOnScreenAlternatives: boolean
  /** Keys into the off-screen idea catalog. Empty when the stance offers nothing. */
  offscreenIdeaKeys: string[]
}

/** Ideas that suit "you have had your time" — restful, physical, social. */
const WIND_DOWN_IDEAS = ['outside', 'move', 'paper', 'talk', 'make', 'tidy', 'rest']

/** Ideas that suit "a parent is waiting on something from you". */
const TASK_IDEAS = ['tasks', 'talk']

const INTERVENTIONS: Record<ReasonCode, BlockIntervention> = {
  // --- Time and allowance: the limit did its job. Point away from the screen. ---
  'time-exceeded': {
    stance: 'step-away',
    message: "That's your screen time for now. It'll come back.",
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },
  'no-time-given': {
    stance: 'step-away',
    message: "There's no time set for this today.",
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },
  'out-of-time-range': {
    stance: 'step-away',
    message: 'This one is for a different time of day.',
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },
  'no-matching-rule': {
    stance: 'step-away',
    message: "There's no time set for this today.",
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },
  'restrict-all': {
    stance: 'step-away',
    message: 'The internet is switched off right now.',
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },

  // --- Something of theirs is outstanding. Doing it is the way through. ---
  'checkpoint-pending': {
    stance: 'finish-task',
    message: "There's a check-in to get through first.",
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: TASK_IDEAS,
  },
  // Not a task gate, despite the name. The usage evaluator sets this whenever a
  // usage row's requirements fail, and it outranks `time-exceeded` in the shared
  // precedence — so it is what an ordinary "no time left" block actually reports.
  // Treating it as something to go and finish sent children looking for a task
  // that does not exist.
  'reqs-not-met': {
    stance: 'step-away',
    message: "That's your screen time for now. It'll come back.",
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },

  // --- The destination was wrong, not the intent. A real alternative helps. ---
  'not-in-library': {
    stance: 'redirect-on-screen',
    message: "That one isn't in your library yet. Here's what is.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: [],
  },
  'adult-content': {
    stance: 'redirect-on-screen',
    message: "That page isn't one for you. Try something else instead.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: [],
  },
  'violence': {
    stance: 'redirect-on-screen',
    message: "That page isn't one for you. Try something else instead.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: [],
  },
  'extremism': {
    stance: 'redirect-on-screen',
    message: "That page isn't one for you. Try something else instead.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: [],
  },
  'inappropriate': {
    stance: 'redirect-on-screen',
    message: "That page isn't one for you. Try something else instead.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: [],
  },
  'inappropriate-topic': {
    stance: 'redirect-on-screen',
    message: "That page isn't one for you. Try something else instead.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: [],
  },
  'strong-language': {
    stance: 'redirect-on-screen',
    message: "That page isn't one for you. Try something else instead.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: [],
  },
  'custom-blocked-url': {
    stance: 'redirect-on-screen',
    message: "That site is switched off. Here's what's open.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: [],
  },
  // Attention-capture sites. Still `redirect-on-screen`: someone heading for a
  // feed wants something to watch or read, and an approved thing that scratches
  // the same itch beats a closed door. The off-screen ideas ride along here as
  // well, because for these two "not on a screen at all" is often the better
  // answer and should at least be visible.
  'social-media': {
    stance: 'redirect-on-screen',
    message: "Social sites are switched off. Here's what's open.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },
  'short-form-video': {
    stance: 'redirect-on-screen',
    message: "Short videos are switched off. Here's what's open.",
    offerOnScreenAlternatives: true,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },

  // --- Nothing is wrong. Do not dress a sync window up as a restriction. ---
  'library-syncing': {
    stance: 'just-wait',
    message: 'Your library is still loading. Try again in a moment.',
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: [],
  },

  // --- Unattributed. Assume the limit meant it. ---
  other: {
    stance: 'step-away',
    message: 'This one is closed for now.',
    offerOnScreenAlternatives: false,
    offscreenIdeaKeys: WIND_DOWN_IDEAS,
  },
}

/**
 * Fallback for an unknown or missing reason code.
 *
 * Deliberately `step-away`: when we cannot tell why someone was stopped, the
 * safe guess is that a limit meant it. Guessing `redirect-on-screen` would offer
 * more screen time on the strength of missing information — and the reason code
 * genuinely does go missing, because the block page reads it from an activity-log
 * lookup that can miss.
 */
const FALLBACK: BlockIntervention = INTERVENTIONS.other

export function getBlockIntervention(
  code: ReasonCode | null | undefined,
): BlockIntervention {
  if (!code) return FALLBACK
  return INTERVENTIONS[code] || FALLBACK
}

export function interventionStanceFor(
  code: ReasonCode | null | undefined,
): InterventionStance {
  return getBlockIntervention(code).stance
}

/**
 * Does this block warrant showing the intervention at all?
 *
 * `just-wait` is the one stance with nothing to say beyond "try again", which
 * the block page already says on its own.
 */
export function hasIntervention(code: ReasonCode | null | undefined): boolean {
  return interventionStanceFor(code) !== 'just-wait'
}
