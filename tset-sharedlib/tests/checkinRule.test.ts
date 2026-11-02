import {
  CHECKIN_RULE_ID,
  checkinRuleFromSettings,
  checkpointSettingsOf,
  checkpointSettingsSave,
  earnAccessRulesOnly,
} from '../src/restrictions/checkinRule';
import {
  earnAccessRuleIsComplete,
  holdingEarnAccessRules,
  keepEarnAccessPartsOldWritersDrop,
  normalizeEarnAccessSettings,
  EARN_ACCESS_MAX_RULES,
} from '../src/restrictions/earnAccess';
import type { CheckpointSettings } from '../src/types/usage-limits.types';

const checkin: CheckpointSettings = {
  version: 1,
  enabled: true,
  mode: 'self',
  note: 'Make your bed, then check in.',
  resetHourLocal: 5,
  exceptions: [{ id: 'ex1', conditions: [{ type: 'domain', value: 'school.example' }] } as any],
  taskGate: { version: 1, enabled: true, requiredTaskIds: ['t1', 't1', 't2'] },
};

const gamesRule = {
  id: 'r1',
  name: 'Chores before games',
  enabled: true,
  holds: ['games'],
  steps: [{ id: 's1', type: 'task', taskId: 't1' }],
  approval: false,
  reset: 'day',
};

describe('the Daily Check-in stored as a rule (HAT-913)', () => {
  it('reads back exactly as it was saved', () => {
    const save = checkpointSettingsSave({}, checkin);
    expect(save.checkpointSettings).toBeNull();
    expect(save.earnAccessSettings.rules[0]).toMatchObject({ id: CHECKIN_RULE_ID, kind: 'checkin', holds: [], steps: [] });
    expect(checkpointSettingsOf({ earnAccessSettings: save.earnAccessSettings })).toEqual({
      ...checkin,
      taskGate: { version: 1, enabled: true, requiredTaskIds: ['t1', 't2'] },
    });
  });

  it('reads the old field when there is no rule yet', () => {
    expect(checkpointSettingsOf({ checkpointSettings: checkin })).toBe(checkin);
    expect(checkpointSettingsOf({})).toBeUndefined();
    expect(checkpointSettingsOf(null)).toBeUndefined();
  });

  it('prefers the rule over the old field', () => {
    const { earnAccessSettings } = checkpointSettingsSave({}, { ...checkin, enabled: false });
    expect(checkpointSettingsOf({ checkpointSettings: checkin, earnAccessSettings })?.enabled).toBe(false);
  });

  it('keeps the other rules, and replaces an earlier check-in rather than adding a second', () => {
    const first = checkpointSettingsSave({ earnAccessSettings: { version: 2, rules: [gamesRule as any] } }, checkin);
    const second = checkpointSettingsSave(first, { ...checkin, mode: 'guardian' });
    expect(second.earnAccessSettings.rules.map((rule) => rule.id)).toEqual([CHECKIN_RULE_ID, 'r1']);
    expect(checkpointSettingsOf(second)?.mode).toBe('guardian');
  });

  it('holds nothing as a rule, so no rule reader or Companion locks anything for it', () => {
    const rule = checkinRuleFromSettings({ ...checkin, mode: 'guardian' });
    expect(earnAccessRuleIsComplete(rule)).toBe(false);
    expect(rule.approval).toBe(false);
    expect(holdingEarnAccessRules({ version: 2, rules: [rule] }, {}, Date.now(), null)).toEqual([]);
  });

  it('keeps holds and steps empty even when a stored check-in rule names some', () => {
    const settings = normalizeEarnAccessSettings({
      version: 2,
      rules: [{ ...gamesRule, id: CHECKIN_RULE_ID, kind: 'checkin', approval: true, daysOfWeek: [1], checkin: { mode: 'nonsense' } }],
    });
    expect(settings.rules[0]).toMatchObject({ kind: 'checkin', holds: [], steps: [], approval: false, checkin: { mode: 'guardian' } });
    expect(settings.rules[0].daysOfWeek).toBeUndefined();
  });

  it('is one, and not counted against the most rules a person can have', () => {
    const rules = Array.from({ length: EARN_ACCESS_MAX_RULES }, (_, i) => ({ ...gamesRule, id: `r${i}` }));
    const { earnAccessSettings } = checkpointSettingsSave({ earnAccessSettings: { version: 2, rules: rules as any } }, checkin);
    const twice = { version: 2, rules: [...earnAccessSettings.rules, { ...earnAccessSettings.rules[0], id: 'another-checkin' }] };
    const normalized = normalizeEarnAccessSettings(twice);
    expect(normalized.rules.filter((rule) => rule.kind === 'checkin')).toHaveLength(1);
    expect(earnAccessRulesOnly(normalized.rules)).toHaveLength(EARN_ACCESS_MAX_RULES);
  });

  it('survives a save from an older app that does not know the kind', () => {
    const stored = checkpointSettingsSave({}, checkin).earnAccessSettings;
    const old = { version: 1, rules: stored.rules.map(({ kind, checkin: _c, ...rest }) => rest) };
    const merged = keepEarnAccessPartsOldWritersDrop(stored, old) as any;
    expect(checkpointSettingsOf({ earnAccessSettings: merged })?.mode).toBe('self');
  });
});
