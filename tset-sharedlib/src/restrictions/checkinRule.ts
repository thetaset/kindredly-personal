/**
 * The Daily Check-in, stored as an Earn access rule (HAT-913, EA-25).
 *
 * The check-in used to be `accessControlSettings.checkpointSettings`. It is now one rule in
 * `earnAccessSettings.rules`, with `kind: 'checkin'`, and every reader and writer goes through the two
 * functions here: `checkpointSettingsOf` gives the check-in exactly as `checkpointSettings` held it, and
 * `checkpointSettingsSave` gives the settings patch that stores it. Data saved before this change still
 * reads, from the old field, until the check-in is next saved; a save clears the old field.
 *
 * Its release (`checkpointRelease`) and its gate are unchanged: only where the settings live moved.
 */

import type { AccessControlSettings, CheckpointSettings } from '../types/usage-limits.types';
import type { EarnAccessRule, EarnAccessSettings } from '../types/earn-access.types';
import { resolveCheckpointMode } from './checkpoint';
import { normalizeEarnAccessRule, normalizeEarnAccessSettings } from './earnAccess';

/** The one check-in rule's id. */
export const CHECKIN_RULE_ID = 'daily-checkin';

/** The rule's stored name. The app shows its own words ("Daily Check-in"), never this. */
const CHECKIN_RULE_NAME = 'Daily Check-in';

export function isCheckinRule(rule: Pick<EarnAccessRule, 'kind'> | null | undefined): boolean {
  return rule?.kind === 'checkin';
}

/** Every rule except the check-in: the rules Earn access lists, counts, and opens. */
export function earnAccessRulesOnly<T extends Pick<EarnAccessRule, 'kind'>>(rules: readonly T[] | null | undefined): T[] {
  return (rules ?? []).filter((rule) => !isCheckinRule(rule));
}

/** The check-in rule, or null when there is none. */
export function checkinRuleOf(earnAccessSettings: unknown): EarnAccessRule | null {
  return normalizeEarnAccessSettings(earnAccessSettings).rules.find(isCheckinRule) ?? null;
}

/** The check-in rule as the settings the check-in's gate, editor and screens read. */
export function checkpointSettingsFromRule(rule: EarnAccessRule): CheckpointSettings {
  const checkin = rule.checkin ?? { mode: resolveCheckpointMode(null) };
  const settings: CheckpointSettings = { version: 1, enabled: rule.enabled, mode: checkin.mode };
  if (rule.instructions) settings.note = rule.instructions;
  if (checkin.resetHourLocal !== undefined) settings.resetHourLocal = checkin.resetHourLocal;
  if (checkin.exceptions?.length) settings.exceptions = checkin.exceptions;
  if (checkin.taskGate) settings.taskGate = checkin.taskGate;
  return settings;
}

/** The check-in's settings as its rule. */
export function checkinRuleFromSettings(settings: CheckpointSettings): EarnAccessRule {
  const rule = normalizeEarnAccessRule({
    id: CHECKIN_RULE_ID,
    kind: 'checkin',
    name: CHECKIN_RULE_NAME,
    enabled: settings.enabled === true,
    instructions: settings.note ?? '',
    checkin: {
      mode: resolveCheckpointMode(settings),
      exceptions: settings.exceptions,
      resetHourLocal: settings.resetHourLocal,
      taskGate: settings.taskGate,
    },
  });
  // A fixed id and kind always make a rule.
  return rule as EarnAccessRule;
}

/**
 * The check-in as `checkpointSettings` held it: from its rule, or from the old field for data saved before
 * the check-in became a rule. Undefined when neither has one.
 */
export function checkpointSettingsOf(
  access: { checkpointSettings?: CheckpointSettings | null; earnAccessSettings?: unknown } | null | undefined,
): CheckpointSettings | undefined {
  const rule = checkinRuleOf(access?.earnAccessSettings);
  if (rule) return checkpointSettingsFromRule(rule);
  return access?.checkpointSettings ?? undefined;
}

/**
 * The settings patch that stores the check-in: the rules with the check-in rule first, and the old field
 * cleared. `access` is the stored settings the other rules come from; they are kept as they are.
 */
export function checkpointSettingsSave(
  access: Pick<AccessControlSettings, 'earnAccessSettings'> | null | undefined,
  settings: CheckpointSettings,
): { earnAccessSettings: EarnAccessSettings; checkpointSettings: null } {
  const others = normalizeEarnAccessSettings(access?.earnAccessSettings).rules.filter((rule) => !isCheckinRule(rule));
  return {
    earnAccessSettings: { version: 2, rules: [checkinRuleFromSettings(settings), ...others] },
    checkpointSettings: null,
  };
}

/**
 * The rules list with the stored check-in rule put back, for a writer that saves Earn access rules
 * without it (the rule editor and Kinbot keep only the rules they list). Without this a rule save would
 * delete the check-in.
 */
export function earnAccessRulesKeepingCheckin(storedEarnAccessSettings: unknown, rules: EarnAccessRule[]): EarnAccessRule[] {
  const checkin = checkinRuleOf(storedEarnAccessSettings);
  const others = rules.filter((rule) => !isCheckinRule(rule));
  return checkin ? [checkin, ...others] : others;
}
