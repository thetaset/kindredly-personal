/**
 * Every user option the server keeps, declared once (HAT-327, REG-5).
 *
 * Options (`user.options`) are written only through `/user/options/update`, which is admin-only:
 * that is why every permission and parental control lives here rather than in prefs, which a
 * child can write for themselves. The server's merge (`UserService._mergeUserOptions`) reads these
 * lists; a key on none of them is not stored, and is logged so a new setting that forgot to
 * declare itself is noticed instead of vanishing (Rewards' `rewardSettings` was dropped that way).
 */

/** On or off. Stored as `true`/`false` whatever was sent. */
export const USER_OPTION_SWITCH_KEYS = [
  'whitelistingEnabled',
  /** Written by sign-in and the Login page; read by nothing. Kept so old clients' writes are not reported. */
  'codeInjectionEnabled',
  'contentFilteringEnabled',
  'logActivity',
  'containLinksInternally',
  'openYouTubeInApp',
  'aiChatEnabled',
  /** AI tools beside Kinbot (`family-ai.ts`). Absent = on, so only an admin turning it off stores a value. */
  'aiToolsEnabled',
  /** Web search inside Kinbot (HAT-288). Absent = off. */
  'aiWebSearchEnabled',
  /**
   * Helper AI (HAT-1105): set when an adult saves a helper for this child, so the server admits
   * their helper chat while Kinbot and AI tools stay off (`personAllowsHelpers`). Absent = off.
   */
  'aiHelpersEnabled',
  'assistantReviewEnabled',
  'appEditorEnabled',
  'commandBarEnabled',
  'historySearchEnabled',
  'explorePublishedEnabled',
  /*
   * The optional features that used to be one family-wide switch on the account. Per person now,
   * and options rather than prefs for the reason every permission here is: a child could
   * otherwise grant themselves an inbox, a microphone, or the community catalog.
   */
  'emailEnabled',
  'speechModeEnabled',
  'wakeWordEnabled',
  'communityContentEnabled',
  'companionDevicesEnabled',
  'remoteChildActionsEnabled',
  'shoppingCartEnabled',
  /** Offline saves (HAT-1225, OFS-5): an adult's changes save on the device first. Absent = off. */
  'offlineSavesEnabled',
] as const;

/** Stored exactly as sent: whole objects their pages read, change and write back. */
export const USER_OPTION_OBJECT_KEYS = [
  /** About a dozen settings in one object, replaced whole on every save (REG-7 plans field-level saves). */
  'accessControlSettings',
  'usageLimitsData',
  'ruleOverrideSettings',
  /** Rewards (developer-mode only). How a child's claim is stored is still open: observation #107. */
  'rewardSettings',
] as const;

/**
 * Each cleaned by its own function on the server before it is stored, so a bad value cannot reach a
 * reader: Always allowed (HAT-152), Block social media (SMB-6), app capability grants, app grants
 * from a request (HAT-178), a child's email allowlist, and "Keep history for" (PLN-9).
 */
export const USER_OPTION_CLEANED_KEYS = [
  'alwaysAllowed',
  'socialMedia',
  'appCapabilityGrants',
  'appGrants',
  'emailAllowedSenders',
  'historyRetentionDays',
  /** Page notes reminders (PGN-9): `normalizePageNoteReminders`. */
  'pageNoteReminders',
] as const;

/**
 * Instructions, never stored: `accessControlSettingsPatch` changes only the fields it names on the
 * server's own copy (REG-7, `accessControlSettingsPatch.ts`).
 */
export const USER_OPTION_INSTRUCTION_KEYS = ['accessControlSettingsPatch'] as const;

export type UserOptionSwitchKey = (typeof USER_OPTION_SWITCH_KEYS)[number];

const DECLARED = new Set<string>([
  ...USER_OPTION_SWITCH_KEYS,
  ...USER_OPTION_OBJECT_KEYS,
  ...USER_OPTION_CLEANED_KEYS,
  ...USER_OPTION_INSTRUCTION_KEYS,
]);

/** The keys of an options save that no list above declares. The server stores none of them. */
export function undeclaredUserOptionKeys(options: unknown): string[] {
  if (!options || typeof options !== 'object') return [];
  return Object.keys(options).filter((key) => !DECLARED.has(key));
}
