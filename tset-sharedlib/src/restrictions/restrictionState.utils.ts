import type { UserType } from '../types/user.types'

export type RestrictionBaseMode =
  | 'libraryOnly'
  | 'contentFiltering'
  | 'noRestrictions'
  | 'libraryOnlyNoFiltering'

export type RestrictionNormalizationIssue =
  | 'advanced_combo_library_only_no_filtering'
  | 'restricted_user_no_restrictions'

export function getRestrictionBaseModeFromFlags(flags: {
  whitelistingEnabled?: boolean
  contentFilteringEnabled?: boolean
}): RestrictionBaseMode {
  const whitelistingEnabled = !!flags.whitelistingEnabled
  const contentFilteringEnabled = !!flags.contentFilteringEnabled

  if (whitelistingEnabled) {
    return contentFilteringEnabled ? 'libraryOnly' : 'libraryOnlyNoFiltering'
  }

  if (contentFilteringEnabled) {
    return 'contentFiltering'
  }

  return 'noRestrictions'
}

export function normalizeRestrictionFlags(input: {
  userType?: UserType | string | null
  /** For cases where “restricted” is derived outside of userType (e.g. local mode). */
  isRestrictedUser?: boolean
  whitelistingEnabled?: boolean
  contentFilteringEnabled?: boolean
  allowLibraryOnlyNoFiltering?: boolean
}): {
  baseMode: RestrictionBaseMode
  normalizedBaseMode: RestrictionBaseMode
  normalized: { whitelistingEnabled: boolean; contentFilteringEnabled: boolean }
  isValidForRestrictedUser: boolean
  issues: RestrictionNormalizationIssue[]
} {
  const whitelistingEnabled = !!input.whitelistingEnabled
  const contentFilteringEnabled = !!input.contentFilteringEnabled

  const baseMode = getRestrictionBaseModeFromFlags({
    whitelistingEnabled,
    contentFilteringEnabled,
  })

  const issues: RestrictionNormalizationIssue[] = []

  const isRestrictedUser =
    input.isRestrictedUser === true || input.userType === 'restricted'

  let normalizedWhitelistingEnabled = whitelistingEnabled
  let normalizedContentFilteringEnabled = contentFilteringEnabled
  let normalizedBaseMode: RestrictionBaseMode = baseMode

  const allowAdvanced = input.allowLibraryOnlyNoFiltering === true

  // Default policy: whitelisting implies filtering unless explicitly allowed.
  if (baseMode === 'libraryOnlyNoFiltering' && !allowAdvanced) {
    issues.push('advanced_combo_library_only_no_filtering')
    normalizedContentFilteringEnabled = true
    normalizedBaseMode = 'libraryOnly'
  }

  let isValidForRestrictedUser = true

  // Restricted cohort policy: do not allow “no restrictions”.
  if (isRestrictedUser && baseMode === 'noRestrictions') {
    isValidForRestrictedUser = false
    issues.push('restricted_user_no_restrictions')
    normalizedContentFilteringEnabled = true
    normalizedBaseMode = 'contentFiltering'
  }

  return {
    baseMode,
    normalizedBaseMode,
    normalized: {
      whitelistingEnabled: normalizedWhitelistingEnabled,
      contentFilteringEnabled: normalizedContentFilteringEnabled,
    },
    isValidForRestrictedUser,
    issues,
  }
}

export function assertNoRestrictionNormalizationIssues(result: {
  issues: RestrictionNormalizationIssue[]
}): void {
  if (!result.issues || result.issues.length === 0) return
  throw new Error(`Restriction state validation failed: ${result.issues.join(', ')}`)
}
