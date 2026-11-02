import type { ReasonCode } from './activity.types'

export const REASON_LABELS: Partial<Record<ReasonCode, string>> = {
  'custom-blocked-url': 'Blocked site',
  'short-form-video': 'Short-form video',
  'social-media': 'Social media',
  'strong-language': 'Strong language',
  'inappropriate-topic': 'Inappropriate topic',
  violence: 'Violence',
  extremism: 'Extremism',
  'adult-content': 'Adult content',
  inappropriate: 'Inappropriate',
  'no-time-given': 'Not allowed today',
  'time-exceeded': 'No time left',
  'out-of-time-range': 'Outside allowed hours',
  'no-matching-rule': 'No time allowed',
  'reqs-not-met': 'Requirements not met',
  'checkpoint-pending': 'Daily Check-in',
  'earn-access-pending': 'Earn access',
  'not-in-library': 'Not in library',
  'library-syncing': 'Library syncing',
  'restrict-all': 'Restricted',
  'family-downtime': 'Family Downtime',
  other: 'Blocked',
}

export type ReasonUICopy = {
  title: string
  detailTitle: string
  detailBody: string
}

export const REASON_UI_COPY: Partial<Record<ReasonCode, ReasonUICopy>> = {
  inappropriate: {
    title: 'Inappropriate content.',
    detailTitle: 'Inappropriate content',
    detailBody:
      'This content was classified as inappropriate based on your content filter settings.',
  },
  'adult-content': {
    title: 'Adult content.',
    detailTitle: 'Adult content',
    detailBody:
      'This content matches adult-content restrictions in your content filter settings.',
  },
  'strong-language': {
    title: 'Strong language blocked.',
    detailTitle: 'Strong language blocked',
    detailBody:
      'This page was blocked due to strong-language restrictions in your content filter settings.',
  },
  'inappropriate-topic': {
    title: 'Inappropriate topic blocked.',
    detailTitle: 'Inappropriate topic blocked',
    detailBody:
      'This page was blocked because it matched restricted topic terms.',
  },
  violence: {
    title: 'Violence-related content blocked.',
    detailTitle: 'Violence-related content blocked',
    detailBody:
      'This page matched violence-related restrictions in your content filter settings.',
  },
  extremism: {
    title: 'Extremism-related content blocked.',
    detailTitle: 'Extremism-related content blocked',
    detailBody:
      'This page matched extremism-related restrictions in your content filter settings.',
  },
  'short-form-video': {
    title: 'Short-form video blocked.',
    detailTitle: 'Short-form video blocked',
    detailBody:
      'Short-form video URLs are currently blocked by your content filter settings.',
  },
  // Block social media (SMB-12): a parent's setting, named as one, with the way to ask.
  'social-media': {
    title: 'Social media is blocked.',
    detailTitle: 'Social media is blocked',
    detailBody:
      'A parent set this. Ask a parent if you would like to see this page.',
  },
  // Blocked's words (BTL-7): what stopped the page, not the rule type behind it.
  'custom-blocked-url': {
    title: 'This site is blocked.',
    detailTitle: 'This site is blocked',
    detailBody:
      'A parent turned this site off. It stays off even when you have time left.',
  },
  // Zero time reads "Not allowed" (A2), the same words Time limits uses.
  'no-time-given': {
    title: 'Not allowed today.',
    detailTitle: 'Not allowed today',
    detailBody:
      'This kind of content is set to Not allowed today. Ask a parent if you would like time for it, or request time below.',
  },
  'time-exceeded': {
    title: 'No time left.',
    detailTitle: 'No time left',
    detailBody: 'Your daily time allowance for this category has been used up.',
  },
  'reqs-not-met': {
    title: 'Access requirements not met.',
    detailTitle: 'Access requirements not met',
    detailBody:
      'This content requires certain conditions to be met before it can be accessed.',
  },
  'checkpoint-pending': {
    title: 'Ask a parent before you get online.',
    detailTitle: 'Daily Check-in',
    detailBody:
      'A parent has to unblock you before you can get online today. Ask them below, or ask them in person.',
  },
  'earn-access-pending': {
    title: 'Finish what comes first.',
    detailTitle: 'Earn access',
    detailBody: 'This opens once the steps for it are done.',
  },
  'out-of-time-range': {
    title: 'Outside allowed hours.',
    detailTitle: 'Outside allowed hours',
    detailBody: 'This content is only allowed during certain times of day.',
  },
  'not-in-library': {
    title: 'Content not in library.',
    detailTitle: 'Not in your library',
    detailBody:
      'This content is not in your approved library. Try Search Library, or request to add it.',
  },
  'library-syncing': {
    title: 'Your library is still syncing.',
    detailTitle: 'Library still syncing',
    detailBody:
      "This device hasn't finished downloading your library yet, so we can't tell whether this page is approved. Try again in a moment.",
  },
  // Only "Block all web access" produces this; "a rule" sent a child looking for one about this
  // site. It can be set with an end time, and by an admin for their own account, so it names the
  // setting and both ways it ends rather than a parent who turns it off.
  'restrict-all': {
    title: 'All web access is blocked.',
    detailTitle: 'All web access is blocked',
    detailBody:
      'Block all web access is on for this account, so no site opens until it is turned off or its time runs out.',
  },
  // Had no copy, so the block page fell back to "This page is blocked" with nothing under it.
  'no-matching-rule': {
    title: 'No time allowed.',
    detailTitle: 'No time allowed',
    detailBody: "Your time limits don't give any time to this kind of site.",
  },
  'family-downtime': {
    title: 'Family Downtime.',
    detailTitle: 'Family Downtime',
    detailBody: 'Screens are off for the whole family right now. An admin set this.',
  },
}

export function getReasonUICopy(code: ReasonCode | null | undefined): ReasonUICopy | null {
  if (!code) return null
  return REASON_UI_COPY[code] || null
}

/**
 * Why a save was refused, for a save surface.
 *
 * Saving is gated on library membership, not on access, so only a few reasons
 * can reach here. Anything else — including a failed check — falls back to a
 * plain failure rather than blaming the library, which would be wrong for an
 * adult whose network merely blipped.
 */
export function getSaveBlockedMessage(code: ReasonCode | null | undefined): string {
  switch (code) {
    case 'library-syncing':
      return 'Your library is still syncing. Try again in a moment.'
    case 'custom-blocked-url':
      return "This site is blocked, so it can't be saved."
    case 'not-in-library':
      return "This page isn't in your library. Ask a guardian to add it."
    default:
      return "Couldn't save this page."
  }
}
