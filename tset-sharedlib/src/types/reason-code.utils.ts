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
  'reqs-not-met',
  'not-in-library',
  'no-matching-rule',
  'out-of-time-range',
  'no-time-given',
  'time-exceeded',
  'other',
]

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
