/**
 * The family AI setting (founder decisions 2026-09-15, PLN-3): one choice for the whole family,
 * stored in `account.options.aiSetting` and written only by an admin.
 *
 * - `off`: no AI anywhere in Kindredly, private AI included. **Every family starts here**, existing
 *   families too; nothing is carried over from a person's AI Chat switch.
 * - `privateOnly`: AI works only through a private provider (a model the family runs, or the
 *   browser's built-in model). Kindredly.ai is never used, so a tool that always uses it is
 *   unavailable.
 * - `settingsOnly`: Kindredly.ai may be used, but only on settings, with names replaced by
 *   placeholders. Reserved for PLN-11: not offered, and refused on save, until that row lands.
 * - `on`: AI tools may use Kindredly.ai within the plan's AI limits, or a private provider.
 *
 * The per-person switches (`user.options.aiChatEnabled`, `assistantReviewEnabled`) still apply,
 * but only below this: a person with AI Chat on in a family set to Off has no AI.
 *
 * One rule, read by the server when it admits a hosted request and by every AI entry point in the
 * app, so what a parent chose is what decides.
 */

export type FamilyAiSetting = 'off' | 'privateOnly' | 'settingsOnly' | 'on';

/** What a family may choose today, in the order the choices are shown. */
export const FAMILY_AI_SETTINGS_OFFERED: readonly FamilyAiSetting[] = ['off', 'privateOnly', 'on'];

/** A family that never chose. */
export const FAMILY_AI_DEFAULT: FamilyAiSetting = 'off';

/**
 * The 428 `errorType` when the family setting refuses a Kindredly.ai request: set to Off, or to
 * Private AI only. 428 for the same reason as `AI_ASSISTANT_OFF`: nothing about the sign-in is
 * wrong, and installed clients treat an auth status as a reason to sign out.
 */
export const AI_OFF_FOR_FAMILY = 'AI_OFF_FOR_FAMILY';

/**
 * The family's setting, from its account options. Anything missing, unknown or not offered yet
 * reads as Off: a value this code does not understand must never switch AI on.
 */
export function familyAiSetting(options: { aiSetting?: unknown } | null | undefined): FamilyAiSetting {
  const value = options?.aiSetting;
  return (FAMILY_AI_SETTINGS_OFFERED as readonly unknown[]).includes(value)
    ? (value as FamilyAiSetting)
    : FAMILY_AI_DEFAULT;
}

/** May a request go to Kindredly.ai (the hosted models)? */
export function familyAllowsHostedAi(setting: FamilyAiSetting): boolean {
  return setting === 'on';
}

/** May a private provider (a model the family runs, or the browser's built-in model) be used? */
export function familyAllowsPrivateAi(setting: FamilyAiSetting): boolean {
  return setting === 'on' || setting === 'privateOnly';
}

/**
 * What a person reads when the family setting refused an AI request: which setting, and who can
 * change it. The server has no way to know whether this device can use private AI, so the app adds
 * that step itself (`bg/services/ai/familyAiGate.ts`).
 */
export function familyAiRefusalMessage(setting: FamilyAiSetting): string {
  return setting === 'privateOnly'
    ? 'Your family uses private AI only, so Kindredly.ai is not used.'
    : 'AI is off for your family. An admin can turn it on in Family settings.';
}
