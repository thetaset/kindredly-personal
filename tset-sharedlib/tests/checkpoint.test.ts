import {
  buildCheckpointRelease,
  checkpointBlocks,
  checkpointHasEduValueExceptions,
  checkpointHasUnsupportedConditions,
  checkpointIsSelfClearable,
  checkpointTaskGateIsActive,
  checkpointTaskGateIsConfigured,
  checkpointResetBoundaryMs,
  defaultCheckpointModeForUserType,
  isCheckpointHolding,
  resolveCheckpointMode,
} from '../src/restrictions/checkpoint';
import type { CheckpointSettings } from '../src/types/usage-limits.types';

function localMs(year: number, month1: number, day: number, hour = 0, minute = 0): number {
  return new Date(year, month1 - 1, day, hour, minute, 0, 0).getTime();
}

describe('checkpointResetBoundaryMs', () => {
  it('defaults to the next local midnight', () => {
    const now = localMs(2026, 8, 4, 14, 30);
    expect(checkpointResetBoundaryMs(now)).toBe(localMs(2026, 8, 5));
  });

  it('returns today at the reset hour when now is before it', () => {
    const now = localMs(2026, 8, 4, 2, 0);
    expect(checkpointResetBoundaryMs(now, 6)).toBe(localMs(2026, 8, 4, 6));
  });

  it('rolls to tomorrow when now is past the reset hour', () => {
    const now = localMs(2026, 8, 4, 9, 0);
    expect(checkpointResetBoundaryMs(now, 6)).toBe(localMs(2026, 8, 5, 6));
  });

  it('rolls forward when now sits exactly on the boundary', () => {
    const now = localMs(2026, 8, 4, 6, 0);
    expect(checkpointResetBoundaryMs(now, 6)).toBe(localMs(2026, 8, 5, 6));
  });

  it('crosses month and year ends', () => {
    expect(checkpointResetBoundaryMs(localMs(2026, 8, 31, 23, 0))).toBe(localMs(2026, 9, 1));
    expect(checkpointResetBoundaryMs(localMs(2026, 12, 31, 23, 0))).toBe(localMs(2027, 1, 1));
  });

  it('falls back to midnight for out-of-range or non-numeric hours', () => {
    const now = localMs(2026, 8, 4, 14, 0);
    const expected = localMs(2026, 8, 5);
    expect(checkpointResetBoundaryMs(now, -1)).toBe(expected);
    expect(checkpointResetBoundaryMs(now, 24)).toBe(expected);
    expect(checkpointResetBoundaryMs(now, Number.NaN)).toBe(expected);
    expect(checkpointResetBoundaryMs(now, undefined)).toBe(expected);
  });
});

describe('isCheckpointHolding', () => {
  const now = localMs(2026, 8, 4, 14, 0);
  const enabled: CheckpointSettings = { enabled: true };

  it('does not hold when there are no settings or it is disabled', () => {
    expect(isCheckpointHolding(undefined, undefined, now)).toBe(false);
    expect(isCheckpointHolding({ enabled: false }, undefined, now)).toBe(false);
    expect(isCheckpointHolding({}, undefined, now)).toBe(false);
  });

  it('holds when enabled with no release', () => {
    expect(isCheckpointHolding(enabled, undefined, now)).toBe(true);
  });

  it('does not hold while a release is unexpired', () => {
    const release = { releasedAtMs: now, releasedUntilMs: now + 60_000 };
    expect(isCheckpointHolding(enabled, release, now)).toBe(false);
  });

  it('holds again once the release has expired', () => {
    const release = { releasedAtMs: now - 120_000, releasedUntilMs: now - 60_000 };
    expect(isCheckpointHolding(enabled, release, now)).toBe(true);
  });

  it('holds on the exact expiry instant', () => {
    const release = { releasedAtMs: now - 60_000, releasedUntilMs: now };
    expect(isCheckpointHolding(enabled, release, now)).toBe(true);
  });

  it('ignores a malformed release rather than treating it as freedom', () => {
    const release = { releasedAtMs: now, releasedUntilMs: Number.NaN };
    expect(isCheckpointHolding(enabled, release, now)).toBe(true);
  });
});

describe('resolveCheckpointMode', () => {
  it('reads a record with no mode as guardian', () => {
    // Every checkpoint written before modes existed was a guardian gate on a
    // child. Softening this default would silently unblock those families.
    expect(resolveCheckpointMode({ enabled: true })).toBe('guardian');
    expect(resolveCheckpointMode(undefined)).toBe('guardian');
    expect(resolveCheckpointMode(null)).toBe('guardian');
  });

  it('returns the stored mode', () => {
    expect(resolveCheckpointMode({ enabled: true, mode: 'reminder' })).toBe('reminder');
    expect(resolveCheckpointMode({ enabled: true, mode: 'self' })).toBe('self');
    expect(resolveCheckpointMode({ enabled: true, mode: 'guardian' })).toBe('guardian');
  });

  it('falls back to guardian for an unrecognized mode', () => {
    expect(resolveCheckpointMode({ enabled: true, mode: 'nonsense' as never })).toBe('guardian');
  });
});

describe('defaultCheckpointModeForUserType', () => {
  it('gives a child a guardian gate', () => {
    expect(defaultCheckpointModeForUserType('restricted')).toBe('guardian');
  });

  it('never gives an admin a guardian gate — nobody could release them', () => {
    expect(defaultCheckpointModeForUserType('admin')).toBe('self');
    expect(defaultCheckpointModeForUserType(undefined)).toBe('self');
    expect(defaultCheckpointModeForUserType(null)).toBe('self');
  });

  it('starts an adult on a mode that actually blocks', () => {
    const mode = defaultCheckpointModeForUserType('admin');
    expect(checkpointBlocks({ enabled: true, mode }, undefined, Date.now())).toBe(true);
  });

  // The default is write-time only. An adult who chose reminder before this
  // changed must not be switched to blocking behind their back.
  it('does not touch a record that already names reminder', () => {
    expect(resolveCheckpointMode({ enabled: true, mode: 'reminder' })).toBe('reminder');
    expect(checkpointBlocks({ enabled: true, mode: 'reminder' }, undefined, Date.now())).toBe(false);
  });

  // Every pre-mode record was a child's gate. Never soften this.
  it('leaves a mode-less stored record reading as guardian', () => {
    expect(resolveCheckpointMode({ enabled: true })).toBe('guardian');
    expect(checkpointBlocks({ enabled: true }, undefined, Date.now())).toBe(true);
  });
});

describe('checkpointBlocks', () => {
  const now = localMs(2026, 8, 4, 14, 0);

  it('blocks for a gate mode with no release', () => {
    expect(checkpointBlocks({ enabled: true, mode: 'guardian' }, undefined, now)).toBe(true);
    expect(checkpointBlocks({ enabled: true, mode: 'self' }, undefined, now)).toBe(true);
  });

  it('never blocks in reminder mode, even though it is still holding', () => {
    const settings: CheckpointSettings = { enabled: true, mode: 'reminder' };
    expect(isCheckpointHolding(settings, undefined, now)).toBe(true);
    expect(checkpointBlocks(settings, undefined, now)).toBe(false);
  });

  it('blocks for a legacy record with no mode', () => {
    expect(checkpointBlocks({ enabled: true }, undefined, now)).toBe(true);
  });

  it('does not block while a release is unexpired', () => {
    const release = { releasedAtMs: now, releasedUntilMs: now + 60_000 };
    expect(checkpointBlocks({ enabled: true, mode: 'self' }, release, now)).toBe(false);
  });

  it('does not block when disabled', () => {
    expect(checkpointBlocks({ enabled: false, mode: 'self' }, undefined, now)).toBe(false);
  });
});

describe('checkpointIsSelfClearable', () => {
  it('is true for the modes the user clears themselves', () => {
    expect(checkpointIsSelfClearable({ enabled: true, mode: 'reminder' })).toBe(true);
    expect(checkpointIsSelfClearable({ enabled: true, mode: 'self' })).toBe(true);
  });

  it('is false for a guardian gate and for a legacy record', () => {
    expect(checkpointIsSelfClearable({ enabled: true, mode: 'guardian' })).toBe(false);
    expect(checkpointIsSelfClearable({ enabled: true })).toBe(false);
  });
});

describe('buildCheckpointRelease', () => {
  it('releases until the next reset boundary', () => {
    const now = localMs(2026, 8, 4, 14, 0);
    const release = buildCheckpointRelease(now, { enabled: true }, 'usr_parent');

    expect(release.releasedAtMs).toBe(now);
    expect(release.releasedUntilMs).toBe(localMs(2026, 8, 5));
    expect(release.releasedByUserId).toBe('usr_parent');
    expect(release.releasedBySelf).toBeUndefined();
  });

  it('marks a self-clear so the audit trail keeps the two apart', () => {
    const now = localMs(2026, 8, 4, 14, 0);
    const release = buildCheckpointRelease(now, { enabled: true, mode: 'self' }, 'usr_kid', true);

    expect(release.releasedBySelf).toBe(true);
    expect(release.releasedByUserId).toBe('usr_kid');
  });

  it('produces a release that immediately stops the checkpoint holding', () => {
    const now = localMs(2026, 8, 4, 14, 0);
    const settings: CheckpointSettings = { enabled: true, resetHourLocal: 6 };
    const release = buildCheckpointRelease(now, settings);

    expect(isCheckpointHolding(settings, release, now)).toBe(false);
    expect(isCheckpointHolding(settings, release, release.releasedUntilMs)).toBe(true);
  });
});

describe('checkpointHasUnsupportedConditions', () => {
  it('is false for site-only exceptions', () => {
    expect(
      checkpointHasUnsupportedConditions({
        enabled: true,
        exceptions: [{ id: 'a', conditions: [{ type: 'urlPatterns', values: ['school.example'] }] }],
      }),
    ).toBe(false);
  });

  it('is true when a content-shaped condition is present', () => {
    expect(
      checkpointHasUnsupportedConditions({
        enabled: true,
        exceptions: [{ id: 'a', conditions: [{ type: 'intent', values: ['intent_learn'] }] }],
      }),
    ).toBe(true);
  });

  it('no longer flags eduValue — it is supported now, just slower', () => {
    expect(
      checkpointHasUnsupportedConditions({
        enabled: true,
        exceptions: [{ id: 'a', conditions: [{ type: 'eduValue', values: ['eduval_educational'] }] }],
      }),
    ).toBe(false);
  });

  it('is false with no exceptions', () => {
    expect(checkpointHasUnsupportedConditions({ enabled: true })).toBe(false);
    expect(checkpointHasUnsupportedConditions(undefined)).toBe(false);
  });
});

/**
 * The switch between the fast gate and the opt-in slow one. Getting this wrong
 * in the "true" direction drags every user onto a path that lets pages load.
 */
describe('checkpointHasEduValueExceptions', () => {
  it('is false for a site-only check-in — the fast path everyone starts on', () => {
    expect(
      checkpointHasEduValueExceptions({
        enabled: true,
        exceptions: [{ id: 'a', conditions: [{ type: 'urlPatterns', values: ['school.example'] }] }],
      }),
    ).toBe(false);
  });

  it('is false with no exceptions at all', () => {
    expect(checkpointHasEduValueExceptions({ enabled: true })).toBe(false);
    expect(checkpointHasEduValueExceptions(undefined)).toBe(false);
  });

  it('is true once a usage type is named', () => {
    expect(
      checkpointHasEduValueExceptions({
        enabled: true,
        exceptions: [{ id: 'a', conditions: [{ type: 'eduValue', values: ['eduval_educational'] }] }],
      }),
    ).toBe(true);
  });

  it('stays on the fast path for an eduValue condition that can only ever be stripped', () => {
    // eduval_unknown is removed at match time, so this exception can never match.
    // Treating it as "has exceptions" would slow the gate down for nothing.
    expect(
      checkpointHasEduValueExceptions({
        enabled: true,
        exceptions: [{ id: 'a', conditions: [{ type: 'eduValue', values: ['eduval_unknown'] }] }],
      }),
    ).toBe(false);
  });
});

/**
 * The display question, deliberately mode-independent.
 *
 * Every mode has a use for a task list — `self` gates on it, `guardian` shows it
 * to the child and its status to the approving adult, `reminder` lists it with
 * the nudge. Tying this to `self` is what made the picker invisible on a kid's
 * check-in, which defaults to `guardian`.
 */
describe('checkpointTaskGateIsConfigured', () => {
  const requiredTaskIds = ['tsk_a'];

  it('is true in every mode once tasks are picked', () => {
    for (const mode of ['self', 'guardian', 'reminder'] as const) {
      expect(
        checkpointTaskGateIsConfigured({
          enabled: true,
          mode,
          taskGate: { version: 1, enabled: true, requiredTaskIds },
        }),
      ).toBe(true);
    }
  });

  it('is false with no tasks picked, or with the gate off', () => {
    expect(
      checkpointTaskGateIsConfigured({
        enabled: true,
        mode: 'self',
        taskGate: { version: 1, enabled: true, requiredTaskIds: [] },
      }),
    ).toBe(false);
    expect(
      checkpointTaskGateIsConfigured({
        enabled: true,
        mode: 'self',
        taskGate: { version: 1, enabled: false, requiredTaskIds },
      }),
    ).toBe(false);
    expect(checkpointTaskGateIsConfigured(undefined)).toBe(false);
  });
});

describe('checkpointTaskGateIsActive', () => {
  const requiredTaskIds = ['tsk_a'];

  it('is active for a self check-in with tasks picked', () => {
    expect(
      checkpointTaskGateIsActive({
        enabled: true,
        mode: 'self',
        taskGate: { version: 1, enabled: true, requiredTaskIds },
      }),
    ).toBe(true);
  });

  it('is inactive in guardian mode — a grown-up already holds the key', () => {
    expect(
      checkpointTaskGateIsActive({
        enabled: true,
        mode: 'guardian',
        taskGate: { version: 1, enabled: true, requiredTaskIds },
      }),
    ).toBe(false);
  });

  it('is inactive in reminder mode — there is nothing to gate', () => {
    expect(
      checkpointTaskGateIsActive({
        enabled: true,
        mode: 'reminder',
        taskGate: { version: 1, enabled: true, requiredTaskIds },
      }),
    ).toBe(false);
  });

  it('is inactive on a legacy record with no mode (which means guardian)', () => {
    expect(
      checkpointTaskGateIsActive({
        enabled: true,
        taskGate: { version: 1, enabled: true, requiredTaskIds },
      }),
    ).toBe(false);
  });

  it('is inactive when enabled with no tasks picked', () => {
    expect(
      checkpointTaskGateIsActive({
        enabled: true,
        mode: 'self',
        taskGate: { version: 1, enabled: true, requiredTaskIds: [] },
      }),
    ).toBe(false);
  });

  it('is inactive when the gate itself is off', () => {
    expect(
      checkpointTaskGateIsActive({
        enabled: true,
        mode: 'self',
        taskGate: { version: 1, enabled: false, requiredTaskIds },
      }),
    ).toBe(false);
    expect(checkpointTaskGateIsActive({ enabled: true, mode: 'self' })).toBe(false);
  });
});

/**
 * The release-survives rule, asserted from the enforcement side.
 *
 * A granted release runs to its boundary regardless of what happens to the
 * tasks. If this ever fails, a child who checked in this morning is being
 * dropped offline mid-session — which is the one outcome this design exists to
 * prevent.
 */
describe('checkpointBlocks ignores taskGate entirely', () => {
  const release = { releasedAtMs: 0, releasedUntilMs: 10_000 };

  it('is unaffected by a task gate in any state', () => {
    const base: CheckpointSettings = { enabled: true, mode: 'self' };
    const gated: CheckpointSettings = {
      ...base,
      taskGate: { version: 1, enabled: true, requiredTaskIds: ['tsk_a', 'tsk_b'] },
    };

    expect(checkpointBlocks(gated, release, 1_000)).toBe(checkpointBlocks(base, release, 1_000));
    expect(checkpointBlocks(gated, null, 1_000)).toBe(checkpointBlocks(base, null, 1_000));
    expect(checkpointBlocks(gated, release, 1_000)).toBe(false);
    expect(checkpointBlocks(gated, null, 1_000)).toBe(true);
  });
});
