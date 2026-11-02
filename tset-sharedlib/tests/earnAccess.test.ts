import {
  EARN_ACCESS_MAX_INSTRUCTIONS_LENGTH,
  buildEarnAccessOpening,
  earnAccessHoldCondition,
  earnAccessHoldsAsLimitRules,
  earnAccessDayStarts,
  earnAccessNextChangeMs,
  earnAccessOpenTimes,
  earnAccessPeriodStartMs,
  earnAccessRuleHolding,
  earnAccessRuleIsComplete,
  heldEarnAccessHolds,
  holdingEarnAccessRules,
  keepEarnAccessPartsOldWritersDrop,
  normalizeEarnAccessRule,
  normalizeEarnAccessSettings,
  pruneEarnAccessOpenings,
} from '../src/restrictions/earnAccess';
import { familyClock } from '../src/deviceguard/familyClock';
import type { EarnAccessRule } from '../src/types/earn-access.types';

const TZ = 'America/Los_Angeles';
// Wednesday 2026-10-28, 15:00 in Los Angeles (PDT, UTC-7).
const WED_3PM = Date.UTC(2026, 9, 28, 22, 0);
const WED_START = Date.UTC(2026, 9, 28, 7, 0);
const MON_START = Date.UTC(2026, 9, 26, 7, 0);
const THU_START = Date.UTC(2026, 9, 29, 7, 0);

function rule(overrides: Partial<EarnAccessRule> = {}): EarnAccessRule {
  return {
    id: 'r1',
    name: 'Chores before games',
    enabled: true,
    holds: ['games', 'entertainment'],
    steps: [{ id: 's1', type: 'task', taskId: 't1' }],
    approval: false,
    reset: 'day',
    ...overrides,
  };
}

describe('earnAccessPeriodStartMs', () => {
  const clock = familyClock(WED_3PM, TZ);

  it('starts a daily rule at the family day start', () => {
    expect(earnAccessPeriodStartMs('day', clock)).toBe(WED_START);
  });

  it('starts a weekly rule on this family week’s Monday', () => {
    expect(earnAccessPeriodStartMs('week', clock)).toBe(MON_START);
  });

  it('treats Sunday as the end of the week, not the start', () => {
    const sunday = familyClock(Date.UTC(2026, 10, 1, 20, 0), TZ);
    expect(sunday.dayOfWeek).toBe(0);
    expect(earnAccessPeriodStartMs('week', sunday)).toBe(MON_START);
  });

  it('lands on Monday midnight across the November clock change', () => {
    // Monday 2026-11-02 is the first day after the change back to PST (UTC-8).
    const tuesday = familyClock(Date.UTC(2026, 10, 3, 20, 0), TZ);
    expect(earnAccessPeriodStartMs('week', tuesday)).toBe(Date.UTC(2026, 10, 2, 8, 0));
  });

  it('never starts over a rule that never resets', () => {
    expect(earnAccessPeriodStartMs('never', clock)).toBe(0);
  });
});

describe('earnAccessRuleHolding', () => {
  const clock = familyClock(WED_3PM, TZ);

  it('holds an enabled rule nobody has opened', () => {
    expect(earnAccessRuleHolding(rule(), {}, clock)).toBe(true);
  });

  it('opens for the rest of the day once opened today', () => {
    expect(earnAccessRuleHolding(rule(), { r1: buildEarnAccessOpening(WED_START + 1000) }, clock)).toBe(false);
  });

  it('holds again the next day: an opening yesterday does not count', () => {
    expect(earnAccessRuleHolding(rule(), { r1: buildEarnAccessOpening(WED_START - 1000) }, clock)).toBe(true);
  });

  it('keeps a weekly rule open all week after Monday’s opening', () => {
    const weekly = rule({ reset: 'week' });
    expect(earnAccessRuleHolding(weekly, { r1: buildEarnAccessOpening(MON_START + 5000) }, clock)).toBe(false);
    expect(earnAccessRuleHolding(weekly, { r1: buildEarnAccessOpening(MON_START - 5000) }, clock)).toBe(true);
  });

  it('keeps a rule that never resets open for good once opened', () => {
    expect(earnAccessRuleHolding(rule({ reset: 'never' }), { r1: buildEarnAccessOpening(1000) }, clock)).toBe(false);
  });

  it('does not hold on a day the rule does not apply', () => {
    expect(earnAccessRuleHolding(rule({ daysOfWeek: [1, 2, 4, 5] }), {}, clock)).toBe(false);
    expect(earnAccessRuleHolding(rule({ daysOfWeek: [3] }), {}, clock)).toBe(true);
  });

  it('holds nothing while off', () => {
    expect(earnAccessRuleHolding(rule({ enabled: false }), {}, clock)).toBe(false);
  });

  it('holds nothing when nothing could open it', () => {
    const inert = rule({ steps: [], approval: false });
    expect(earnAccessRuleIsComplete(inert)).toBe(false);
    expect(earnAccessRuleHolding(inert, {}, clock)).toBe(false);
  });

  it('holds an approval-only rule', () => {
    expect(earnAccessRuleHolding(rule({ steps: [], approval: true }), {}, clock)).toBe(true);
  });

  it('holds nothing when it holds no content', () => {
    expect(earnAccessRuleHolding(rule({ holds: [] }), {}, clock)).toBe(false);
  });
});

describe('holdingEarnAccessRules', () => {
  it('reads raw stored settings and returns only holding rules', () => {
    const settings = {
      version: 1,
      rules: [rule(), rule({ id: 'r2', holds: ['social'], reset: 'week' }), rule({ id: 'r3', enabled: false })],
    };
    const held = holdingEarnAccessRules(settings, { r2: buildEarnAccessOpening(MON_START + 1) }, WED_3PM, TZ);
    expect(held.map((r) => r.id)).toEqual(['r1']);
    expect([...heldEarnAccessHolds(held)].sort()).toEqual(['entertainment', 'games']);
  });

  it('reads absent or broken settings as nothing held', () => {
    expect(holdingEarnAccessRules(undefined, undefined, WED_3PM, TZ)).toEqual([]);
    expect(holdingEarnAccessRules({ rules: 'nope' }, null, WED_3PM, TZ)).toEqual([]);
  });
});

describe('normalizeEarnAccessRule', () => {
  it('drops unknown holds, broken steps and impossible days', () => {
    const out = normalizeEarnAccessRule({
      id: 'r1',
      name: '  Homework first  ',
      enabled: true,
      holds: ['games', 'video', 'junk'],
      steps: [
        { id: 'a', type: 'task', taskId: 't1' },
        { id: 'b', type: 'task' },
        { id: 'c', type: 'minutes', eduValues: ['eduval_educational', 'eduval_unknown', 'eduval_fun'], minutes: 30 },
        { id: 'd', type: 'minutes', eduValues: ['eduval_unknown'], minutes: 30 },
        { id: 'a', type: 'lesson', count: 1 },
        { id: 'e', type: 'warp' },
      ],
      reset: 'fortnight',
      daysOfWeek: [1, 2, 9, 2, -1],
    });
    expect(out).toEqual({
      id: 'r1',
      name: 'Homework first',
      enabled: true,
      holds: ['junk', 'games'],
      steps: [
        { id: 'a', type: 'task', taskId: 't1' },
        { id: 'c', type: 'minutes', eduValues: ['eduval_educational'], minutes: 30 },
      ],
      approval: false,
      reset: 'day',
      daysOfWeek: [1, 2],
    });
  });

  it('never lets time nobody could classify earn anything', () => {
    const out = normalizeEarnAccessRule({ id: 'r', holds: ['games'], steps: [{ id: 's', type: 'minutes', eduValues: ['eduval_unknown'], minutes: 5 }] });
    expect(out?.steps).toEqual([]);
  });

  it('caps minutes and reads every day as no day filter', () => {
    const out = normalizeEarnAccessRule({ id: 'r', holds: ['games'], steps: [{ id: 's', type: 'minutes', eduValues: ['eduval_task'], minutes: 5000 }], daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
    expect(out?.steps[0]).toEqual({ id: 's', type: 'minutes', eduValues: ['eduval_task'], minutes: 600 });
    expect(out?.daysOfWeek).toBeUndefined();
  });

  it('refuses a rule with no id, and drops duplicate rules', () => {
    expect(normalizeEarnAccessRule({ name: 'x' })).toBeNull();
    expect(normalizeEarnAccessSettings({ rules: [rule(), rule()] }).rules).toHaveLength(1);
  });

  it('keeps one I’ve done it step and drops a second (HAT-912)', () => {
    const out = normalizeEarnAccessRule({
      id: 'r',
      holds: ['games'],
      steps: [
        { id: 'a', type: 'confirm', extra: 'dropped' },
        { id: 'b', type: 'task', taskId: 't1' },
        { id: 'c', type: 'confirm' },
      ],
    });
    expect(out?.steps).toEqual([
      { id: 'a', type: 'confirm' },
      { id: 'b', type: 'task', taskId: 't1' },
    ]);
  });

  it('drops a confirm step with no id', () => {
    const out = normalizeEarnAccessRule({ id: 'r', holds: ['games'], steps: [{ type: 'confirm' }, { id: ' ', type: 'confirm' }] });
    expect(out?.steps).toEqual([]);
  });

  it('keeps instructions trimmed, capped, and leaves out empty ones (HAT-912)', () => {
    expect(normalizeEarnAccessRule({ id: 'r', instructions: '  Tidy your room.\n\n- Bed made\n- Floor clear  ' })?.instructions)
      .toBe('Tidy your room.\n\n- Bed made\n- Floor clear');
    expect(normalizeEarnAccessRule({ id: 'r', instructions: 'x'.repeat(EARN_ACCESS_MAX_INSTRUCTIONS_LENGTH + 50) })?.instructions)
      .toHaveLength(EARN_ACCESS_MAX_INSTRUCTIONS_LENGTH);
    const blank = normalizeEarnAccessRule({ id: 'r', instructions: '   \n ' });
    expect(blank).not.toHaveProperty('instructions');
    expect(normalizeEarnAccessRule({ id: 'r', instructions: 42 })).not.toHaveProperty('instructions');
  });
});

describe('a rule opened only by I’ve done it (HAT-912)', () => {
  const clock = familyClock(WED_3PM, TZ);
  const confirmOnly = rule({ steps: [{ id: 's1', type: 'confirm' }] });

  it('is complete, so it holds until opened this period', () => {
    expect(earnAccessRuleIsComplete(confirmOnly)).toBe(true);
    expect(earnAccessRuleHolding(confirmOnly, {}, clock)).toBe(true);
    expect(earnAccessRuleHolding(confirmOnly, { r1: buildEarnAccessOpening(WED_START + 1000, 'kid', true) }, clock)).toBe(false);
  });

  it('survives a stored round trip', () => {
    const stored = normalizeEarnAccessSettings({ version: 1, rules: [{ ...confirmOnly, instructions: 'Read for 20 minutes.' }] });
    expect(stored.rules[0].steps).toEqual([{ id: 's1', type: 'confirm' }]);
    expect(stored.rules[0].instructions).toBe('Read for 20 minutes.');
    expect(holdingEarnAccessRules(stored, {}, WED_3PM, TZ).map((r) => r.id)).toEqual(['r1']);
  });
});

describe('earnAccessHoldsAsLimitRules', () => {
  it('makes one closed limit rule per hold with the limits’ own conditions', () => {
    const limits = earnAccessHoldsAsLimitRules(rule({ holds: ['games', 'social'] }));
    expect(limits).toEqual([
      expect.objectContaining({ id: 'earn-access:r1:games', conditions: [{ type: 'attribute', values: ['game'] }], timeLimits: [{ hours: 0, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }] }),
      expect.objectContaining({ id: 'earn-access:r1:social', conditions: [{ type: 'socialDesignation', values: ['social'] }] }),
    ]);
    expect(earnAccessHoldCondition('entertainment')).toEqual({ type: 'eduValue', values: ['eduval_fun'] });
    expect(earnAccessHoldCondition('junk')).toEqual({ type: 'eduValue', values: ['eduval_junk'] });
  });
});

describe('earnAccessNextChangeMs', () => {
  it('is the next family day start while a daily rule is on', () => {
    expect(earnAccessNextChangeMs({ rules: [rule()] }, WED_3PM, TZ)).toBe(THU_START);
  });

  it('is null when nothing can change by itself', () => {
    expect(earnAccessNextChangeMs({ rules: [rule({ reset: 'never' })] }, WED_3PM, TZ)).toBeNull();
    expect(earnAccessNextChangeMs({ rules: [rule({ enabled: false })] }, WED_3PM, TZ)).toBeNull();
    expect(earnAccessNextChangeMs(undefined, WED_3PM, TZ)).toBeNull();
  });

  it('still changes daily for a never-resetting rule limited to some days', () => {
    expect(earnAccessNextChangeMs({ rules: [rule({ reset: 'never', daysOfWeek: [6] })] }, WED_3PM, TZ)).toBe(THU_START);
  });
});

describe('earnAccessOpenTimes', () => {
  // Wednesday 2026-10-28 to Wednesday 2026-11-04 in Los Angeles; clocks go back on Sunday 2026-11-01.
  const starts = earnAccessDayStarts(WED_3PM, TZ, 7);
  const FRI_START = Date.UTC(2026, 9, 30, 7, 0);
  const SAT_START = Date.UTC(2026, 9, 31, 7, 0);
  const SUN_START = Date.UTC(2026, 10, 1, 7, 0);
  const MON2_START = Date.UTC(2026, 10, 2, 8, 0);

  it('gives each family day start, an hour later after the clocks go back', () => {
    expect(starts).toEqual([
      WED_START,
      THU_START,
      FRI_START,
      SAT_START,
      SUN_START,
      MON2_START,
      Date.UTC(2026, 10, 3, 8, 0),
      Date.UTC(2026, 10, 4, 8, 0),
    ]);
    // Sunday is 25 hours long.
    expect(MON2_START - SUN_START).toBe(25 * 60 * 60 * 1000);
  });

  it('a daily rule opened today is open until midnight and holds every day after', () => {
    expect(earnAccessOpenTimes(rule(), { r1: { openedAtMs: WED_START + 1 } }, starts, TZ)).toEqual([
      { startMs: WED_START, endMs: THU_START },
    ]);
  });

  it('a daily rule opened yesterday, or never, is open nowhere', () => {
    expect(earnAccessOpenTimes(rule(), { r1: { openedAtMs: WED_START - 1 } }, starts, TZ)).toEqual([]);
    expect(earnAccessOpenTimes(rule(), undefined, starts, TZ)).toEqual([]);
  });

  it('a weekly rule opened this week is open until the family week ends on Sunday night', () => {
    expect(earnAccessOpenTimes(rule({ reset: 'week' }), { r1: { openedAtMs: MON_START + 1 } }, starts, TZ)).toEqual([
      { startMs: WED_START, endMs: MON2_START },
    ]);
  });

  it('a school-days rule is open on the weekend, joined into one stretch', () => {
    expect(earnAccessOpenTimes(rule({ daysOfWeek: [1, 2, 3, 4, 5] }), undefined, starts, TZ)).toEqual([
      { startMs: SAT_START, endMs: MON2_START },
    ]);
  });

  it('a rule opened for good has no times, and one never opened holds every day', () => {
    expect(earnAccessOpenTimes(rule({ reset: 'never' }), { r1: { openedAtMs: 1 } }, starts, TZ)).toBeNull();
    expect(earnAccessOpenTimes(rule({ reset: 'never' }), undefined, starts, TZ)).toEqual([]);
  });
});

describe('pruneEarnAccessOpenings', () => {
  it('keeps openings only for rules that still exist', () => {
    const out = pruneEarnAccessOpenings({ rules: [rule()] }, { r1: { openedAtMs: 5, bySelf: true }, gone: { openedAtMs: 6 }, r1x: 'junk' });
    expect(out).toEqual({ r1: { openedAtMs: 5, bySelf: true } });
  });
});

describe('keepEarnAccessPartsOldWritersDrop (HAT-912)', () => {
  const stored = {
    version: 2,
    rules: [
      { id: 'r1', name: 'Chores', enabled: true, holds: ['games'], steps: [{ id: 's1', type: 'minutes', eduValues: ['eduval_educational'], minutes: 30 }, { id: 'c1', type: 'confirm' }], approval: false, reset: 'day', instructions: '- [ ] Dishes' },
      { id: 'r2', name: 'Reading', enabled: true, holds: ['social'], steps: [{ id: 's2', type: 'minutes', eduValues: ['eduval_educational'], minutes: 20 }], approval: false, reset: 'day' },
    ],
  };

  it('keeps instructions and the confirm step an older app dropped from a rule it saved', () => {
    const fromOldApp = {
      version: 1,
      rules: [
        { id: 'r1', name: 'Chores', enabled: false, holds: ['games'], steps: [{ id: 's1', type: 'minutes', eduValues: ['eduval_educational'], minutes: 45 }], approval: false, reset: 'day' },
        { id: 'r2', name: 'Reading', enabled: true, holds: ['social'], steps: [], approval: true, reset: 'day' },
      ],
    };
    const out = keepEarnAccessPartsOldWritersDrop(stored, fromOldApp) as any;
    expect(out.rules[0].instructions).toBe('- [ ] Dishes');
    expect(out.rules[0].steps).toEqual([{ id: 's1', type: 'minutes', eduValues: ['eduval_educational'], minutes: 45 }, { id: 'c1', type: 'confirm' }]);
    // What the older app did change stays changed.
    expect(out.rules[0].enabled).toBe(false);
    expect(out.rules[1]).toEqual(fromOldApp.rules[1]);
  });

  it('takes a save from a writer that knows them as written, removals included', () => {
    const fromNewApp = { version: 2, rules: [{ ...stored.rules[0], steps: [stored.rules[0].steps[0]], instructions: undefined }] };
    expect(keepEarnAccessPartsOldWritersDrop(stored, fromNewApp)).toBe(fromNewApp);
  });

  it('brings back no rule an older app removed', () => {
    const fromOldApp = { version: 1, rules: [stored.rules[1]] };
    expect(keepEarnAccessPartsOldWritersDrop(stored, fromOldApp)).toBe(fromOldApp);
  });

  it('changes nothing when nothing was stored to keep', () => {
    const fromOldApp = { version: 1, rules: [stored.rules[1]] };
    expect(keepEarnAccessPartsOldWritersDrop({ version: 1, rules: [stored.rules[1]] }, fromOldApp)).toBe(fromOldApp);
    expect(keepEarnAccessPartsOldWritersDrop(stored, null)).toBe(null);
  });
});
