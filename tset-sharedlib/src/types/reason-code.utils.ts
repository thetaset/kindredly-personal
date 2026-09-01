import type { ReasonCode } from './activity.types'
import { REASON_LABELS } from './reason-metadata'

const reasonPrecedence: ReasonCode[] = [
  'custom-blocked-url',
  'short-form-video',
  'social-media',
  'extremism',
  'violence',
  'strong-language',
  'inappropriate-topic',
  'adult-content',
  'inappropriate',
  'restrict-all',
  // Above the time reasons on purpose: when a checkpoint is holding, "ask a
  // parent" is the actionable explanation and "outside allowed hours" is not.
  'checkpoint-pending',
  'reqs-not-met',
  // Above 'not-in-library' on purpose, and present at all on purpose: a device
  // part-way through its first sync cannot tell whether a page is approved, and
  // saying "not in your library" there tells a child their own content isn't
  // theirs. Omitting it from this list left it ranked last-of-all, so it never
  // won a merge and its written copy was unreachable.
  'library-syncing',
  'not-in-library',
  'no-matching-rule',
  'out-of-time-range',
  'no-time-given',
  'time-exceeded',
  'other',
]

/**
 * Rank of a reason within the canonical precedence: lower number = higher
 * priority. Codes absent from the precedence list sort last. Single source of
 * truth shared by pickPrimaryReasonCode and the pipeline's block attribution, so
 * the reason shown on the block page agrees with how reasons are merged elsewhere.
 */
export function reasonCodePrecedenceRank(code: ReasonCode | null | undefined): number {
  if (!code) return Number.MAX_SAFE_INTEGER
  const index = reasonPrecedence.indexOf(code)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

export function pickPrimaryReasonCode(
  reasonCodes: Array<ReasonCode | null | undefined>
): ReasonCode | null {
  const set = new Set<ReasonCode>()
  for (const code of reasonCodes) {
    if (code) set.add(code)
  }

  for (const code of reasonPrecedence) {
    if (set.has(code)) return code
  }

  return null
}

/**
 * Convenience wrapper for merging multiple reason-code signals.
 * Uses the same precedence as `pickPrimaryReasonCode`.
 */
export function mergeReasonCodes(
  ...reasonCodes: Array<ReasonCode | null | undefined>
): ReasonCode | null {
  return pickPrimaryReasonCode(reasonCodes)
}

export function canGrantExtraTimeForReasonCode(
  reasonCode: ReasonCode | null | undefined
): boolean {
  return (
    reasonCode === 'time-exceeded' ||
    reasonCode === 'no-time-given' ||
    reasonCode === 'out-of-time-range'
  )
}

export function reasonCodeLabel(reasonCode: ReasonCode | null | undefined): string {
  if (!reasonCode) return ''
  return REASON_LABELS[reasonCode] || ''
}

/**
 * Reasons that come from scanning the PAGE'S CONTENT rather than from the URL,
 * the clock, or the library.
 *
 * This distinction exists because of a runaway retry loop. The blocked page polls
 * `/access/evaluate` so it can move a child on the moment a parent grants access.
 * That evaluator is handed an empty `contentInfo` — it re-checks URL block rules,
 * check-ins, library access and usage limits, and it is structurally incapable of
 * re-deriving a content verdict. For a content-derived block it therefore answers
 * "allowed", the page navigates back, the content script re-scans, and it blocks
 * again — immediately, with no delay and no counter.
 *
 * So: a content-derived reason must never be cleared by a URL-level evaluation.
 * Only the child navigating again, through the real gate, can clear one.
 *
 * `adult-content` is listed here even though `adult-url-block` can also produce it
 * from the URL alone. Auto-navigating on it is wrong either way, and the
 * URL-derived half is re-checked by the navigation gate on the next real attempt.
 *
 * Written as an allowlist of the codes the poll CAN re-derive, rather than a list
 * of content ones, so that a reason code added later is treated as content-derived
 * until someone decides otherwise. Fail-safe by construction: the cost of a wrong
 * "content-derived" is a child pressing Retry; the cost of a wrong "re-evaluable"
 * is the runaway.
 */
const POLL_RE_EVALUABLE_REASON_CODES: ReadonlySet<ReasonCode> = new Set<ReasonCode>([
  // From the URL, via the same block-rule gate the poll runs.
  'custom-blocked-url',
  'short-form-video',
  'social-media',
  // From the library index.
  'not-in-library',
  'library-syncing',
  // From the clock and the usage ledger.
  'no-time-given',
  'time-exceeded',
  'out-of-time-range',
  'no-matching-rule',
  // From check-in state.
  'checkpoint-pending',
  'reqs-not-met',
  // Whole-session stances the poll reads directly.
  'restrict-all',
  'other',
])

/**
 * Whether this reason was derived from page content.
 *
 * Unknown or missing codes answer `true` — the safe direction. Not moving a child
 * leaves them on a page that explains itself; moving them wrongly is the loop.
 */
export function isContentDerivedReason(code: ReasonCode | null | undefined): boolean {
  if (!code) return true
  return !POLL_RE_EVALUABLE_REASON_CODES.has(code)
}
