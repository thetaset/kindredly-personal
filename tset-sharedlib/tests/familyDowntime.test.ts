import {
  dismissFamilyDowntimeForUser,
  emptyFamilyDowntime,
  endFamilyDowntimeNow,
  expandFamilyDowntimeIntervals,
  familyDowntimeForDevice,
  familyDowntimeStateAt,
  isAllowedDuringDowntime,
  keepDismissalsWithinDowntime,
  normalizeFamilyDowntime,
  oneOffProblem,
  pruneFamilyDowntime,
  resolveFamilyDowntime,
  skipNextFamilyDowntime,
  zonedWallTimeToEpochMs,
  FAMILY_DOWNTIME_DEVICE_HORIZON_MS,
  type FamilyDowntimeSettings,
} from '../src/restrictions/familyDowntime';

const LA = 'America/Los_Angeles';
const HOUR = 60 * 60 * 1000;

/** Wall-clock time in Los Angeles during September 2026 (UTC-7). 2026-09-14 is a Monday. */
function laSept(day: number, hour: number, minute = 0): number {
  return Date.UTC(2026, 8, day, hour + 7, minute);
}

function settings(patch: Partial<FamilyDowntimeSettings>): FamilyDowntimeSettings {
  return { ...emptyFamilyDowntime(), enabled: true, ...patch };
}

const weeknights = settings({
  schedules: [{ id: 's1', daysOfWeek: [0, 1, 2, 3, 4], start: '21:00', end: '07:00' }],
});

describe('normalizeFamilyDowntime', () => {
  it('keeps what can be enforced and drops what cannot', () => {
    const n = normalizeFamilyDowntime({
      enabled: true,
      schedules: [
        { id: 'a', daysOfWeek: [1, 2, 2, 9, -1], start: '21:00', end: '07:00' },
        { id: 'b', daysOfWeek: [2, 3], start: '22:00', end: '06:00' },
        { id: 'c', daysOfWeek: [4], start: '21:00', end: '21:00' },
        { id: 'd', daysOfWeek: [5], start: '9pm', end: '07:00' },
        { id: 'e', daysOfWeek: [2], start: '20:00', end: '06:00' },
      ],
      oneOffs: [
        { id: 'ok', startAt: 1000, endAt: 2000, createdBy: 'u1' },
        { id: 'backwards', startAt: 2000, endAt: 1000 },
        { id: 'too-long', startAt: 0, endAt: 15 * 24 * HOUR },
      ],
      dismissals: [
        { userId: 'admin', untilMs: 10 },
        { userId: 'admin', untilMs: 50 },
        { userId: '', untilMs: 99 },
      ],
      allow: { urlPatterns: [' calm.com ', 'calm.com', '', 42], itemIds: ['i1'], appIds: 'nope' },
    });

    // A day already claimed by an earlier schedule is removed from the later one; the first wins.
    expect(n.schedules).toEqual([
      { id: 'a', daysOfWeek: [1, 2], start: '21:00', end: '07:00' },
      { id: 'b', daysOfWeek: [3], start: '22:00', end: '06:00' },
    ]);
    expect(n.oneOffs.map((o) => o.id)).toEqual(['ok']);
    expect(n.dismissals).toEqual([{ userId: 'admin', untilMs: 50 }]);
    expect(n.allow).toEqual({ urlPatterns: ['calm.com'], itemIds: ['i1'], appIds: [] });
  });

  it('reads nothing at all as off', () => {
    expect(normalizeFamilyDowntime(undefined)).toEqual(emptyFamilyDowntime());
    expect(normalizeFamilyDowntime('garbage').enabled).toBe(false);
  });
});

describe('zonedWallTimeToEpochMs', () => {
  it('reads an ordinary wall-clock time in the family zone', () => {
    expect(zonedWallTimeToEpochMs(2026, 8, 14, 21, 0, LA)).toBe(laSept(14, 21));
  });

  it('takes the earlier instant when clocks go back and the time happens twice', () => {
    // 2026-11-01: 01:30 happens at UTC-7 and again an hour later at UTC-8.
    expect(zonedWallTimeToEpochMs(2026, 10, 1, 1, 30, LA)).toBe(Date.UTC(2026, 10, 1, 8, 30));
  });

  it('moves a time the clocks skip to where it lands, rather than losing it', () => {
    // 2027-03-14: 02:00 jumps to 03:00, so 02:30 does not exist; it starts at 03:30 (10:30 UTC).
    expect(zonedWallTimeToEpochMs(2027, 2, 14, 2, 30, LA)).toBe(Date.UTC(2027, 2, 14, 10, 30));
  });
});

describe('resolveFamilyDowntime', () => {
  it('runs an evening window into the next morning, on the evening it starts', () => {
    const monNight = resolveFamilyDowntime(weeknights, laSept(14, 22), LA);
    expect(monNight).toMatchObject({ active: true, lockedForUser: true });
    expect(monNight.startedAtMs).toBe(laSept(14, 21));
    expect(monNight.endsAtMs).toBe(laSept(15, 7));
    expect(monNight.nextChangeMs).toBe(laSept(15, 7));

    expect(resolveFamilyDowntime(weeknights, laSept(15, 6, 59), LA).active).toBe(true);
    // The end is exclusive.
    expect(resolveFamilyDowntime(weeknights, laSept(15, 7), LA).active).toBe(false);
  });

  it('does not run on a night the schedule leaves out, even when the next morning is a weekday', () => {
    // Friday (5) is not in the schedule: Friday 22:00 is off, and so is Saturday morning.
    expect(resolveFamilyDowntime(weeknights, laSept(18, 22), LA).active).toBe(false);
    expect(resolveFamilyDowntime(weeknights, laSept(19, 6), LA).active).toBe(false);
    // Thursday night (4) does reach Friday morning.
    expect(resolveFamilyDowntime(weeknights, laSept(18, 6), LA).active).toBe(true);
  });

  it('says when the next one starts while it is off', () => {
    const afternoon = resolveFamilyDowntime(weeknights, laSept(14, 18, 40), LA);
    expect(afternoon).toMatchObject({ active: false, lockedForUser: false, endsAtMs: null });
    expect(afternoon.nextStartMs).toBe(laSept(14, 21));
    expect(afternoon.nextEndMs).toBe(laSept(15, 7));
    expect(afternoon.nextChangeMs).toBe(laSept(14, 21));
  });

  it('is an hour longer on the night clocks go back, and an hour shorter when they skip', () => {
    const saturdays = settings({ schedules: [{ id: 's', daysOfWeek: [6], start: '21:00', end: '07:00' }] });

    const fallBack = expandFamilyDowntimeIntervals(saturdays, Date.UTC(2026, 9, 31, 12), Date.UTC(2026, 10, 2), LA);
    expect(fallBack).toEqual([{ startMs: Date.UTC(2026, 10, 1, 4), endMs: Date.UTC(2026, 10, 1, 15) }]);
    expect(fallBack[0].endMs - fallBack[0].startMs).toBe(11 * HOUR);

    const springForward = expandFamilyDowntimeIntervals(saturdays, Date.UTC(2027, 2, 13, 12), Date.UTC(2027, 2, 15), LA);
    expect(springForward[0].endMs - springForward[0].startMs).toBe(9 * HOUR);
  });

  it('applies a one-off that spans a weekend, whether or not the schedule is on', () => {
    const weekend = settings({
      enabled: false,
      schedules: weeknights.schedules,
      oneOffs: [{ id: 'trip', startAt: laSept(19, 18), endAt: laSept(20, 9), createdBy: 'alex' }],
    });
    expect(resolveFamilyDowntime(weekend, laSept(19, 23), LA)).toMatchObject({ active: true, endsAtMs: laSept(20, 9) });
    // The recurring schedule is switched off, so Monday night is not downtime.
    expect(resolveFamilyDowntime(weekend, laSept(21, 22), LA).active).toBe(false);
  });

  it('merges a one-off that overlaps or touches a recurring window into one downtime', () => {
    const touching = settings({
      schedules: weeknights.schedules,
      oneOffs: [{ id: 'late', startAt: laSept(15, 7), endAt: laSept(15, 9), createdBy: 'alex' }],
    });
    expect(resolveFamilyDowntime(touching, laSept(14, 23), LA).endsAtMs).toBe(laSept(15, 9));
  });

  it('treats no settings as off', () => {
    expect(resolveFamilyDowntime(null, laSept(14, 22), LA)).toMatchObject({ active: false, nextChangeMs: null });
  });
});

describe('End now', () => {
  it('ends tonight only, and a one-off started afterwards still applies', () => {
    const ended = endFamilyDowntimeNow(weeknights, laSept(14, 22, 30), LA, 'alex');
    expect(ended.exceptions).toEqual([
      { fromMs: laSept(14, 22, 30), untilMs: laSept(15, 7), kind: 'ended', byUserId: 'alex' },
    ]);
    expect(resolveFamilyDowntime(ended, laSept(14, 22, 31), LA).active).toBe(false);
    expect(resolveFamilyDowntime(ended, laSept(15, 22), LA).active).toBe(true);

    const restarted = { ...ended, oneOffs: [{ id: 'again', startAt: laSept(14, 23), endAt: laSept(15, 1), createdBy: 'alex' }] };
    expect(resolveFamilyDowntime(restarted, laSept(14, 23, 30), LA)).toMatchObject({ active: true, endsAtMs: laSept(15, 1) });
  });

  it('shortens a running one-off to now and leaves a later one alone', () => {
    const withOneOffs = settings({
      oneOffs: [
        { id: 'now', startAt: laSept(14, 18), endAt: laSept(14, 20), createdBy: 'alex' },
        { id: 'later', startAt: laSept(19, 18), endAt: laSept(20, 9), createdBy: 'alex' },
      ],
    });
    const ended = endFamilyDowntimeNow(withOneOffs, laSept(14, 19), LA, 'alex');
    expect(ended.oneOffs).toEqual([
      { id: 'now', startAt: laSept(14, 18), endAt: laSept(14, 19), createdBy: 'alex' },
      { id: 'later', startAt: laSept(19, 18), endAt: laSept(20, 9), createdBy: 'alex' },
    ]);
    expect(ended.exceptions).toEqual([]);
    expect(resolveFamilyDowntime(ended, laSept(14, 19), LA).active).toBe(false);
  });

  // End now ends what the screen said: "until 09:00" means nobody is locked again before 09:00.
  it('ends the whole downtime shown, when two schedules run back to back', () => {
    const backToBack = settings({
      schedules: [
        { id: 'mon', daysOfWeek: [1], start: '21:00', end: '07:00' },
        { id: 'tue', daysOfWeek: [2], start: '07:00', end: '09:00' },
      ],
    });
    expect(resolveFamilyDowntime(backToBack, laSept(14, 23), LA).endsAtMs).toBe(laSept(15, 9));
    const ended = endFamilyDowntimeNow(backToBack, laSept(14, 23), LA, 'alex');
    expect(resolveFamilyDowntime(ended, laSept(15, 8), LA).active).toBe(false);
  });

  it('ends a one-off planned inside the downtime, and one running into the schedule', () => {
    const planned = settings({
      schedules: weeknights.schedules,
      oneOffs: [{ id: 'morning', startAt: laSept(15, 6), endAt: laSept(15, 10), createdBy: 'sam' }],
    });
    const endedPlanned = endFamilyDowntimeNow(planned, laSept(14, 23), LA, 'alex');
    expect(endedPlanned.oneOffs).toEqual([]);
    expect(resolveFamilyDowntime(endedPlanned, laSept(15, 8), LA).active).toBe(false);

    const runningIn = settings({
      schedules: [{ id: 'mon', daysOfWeek: [1], start: '22:00', end: '07:00' }],
      oneOffs: [{ id: 'early', startAt: laSept(14, 20), endAt: laSept(14, 22), createdBy: 'sam' }],
    });
    const endedRunning = endFamilyDowntimeNow(runningIn, laSept(14, 21), LA, 'alex');
    expect(resolveFamilyDowntime(endedRunning, laSept(14, 22, 30), LA).active).toBe(false);
    expect(endedRunning.oneOffs).toEqual([{ id: 'early', startAt: laSept(14, 20), endAt: laSept(14, 21), createdBy: 'sam' }]);
  });

  it('does nothing while downtime is off', () => {
    expect(endFamilyDowntimeNow(weeknights, laSept(14, 18), LA, 'alex')).toBe(weeknights);
  });
});

describe('Skip tonight', () => {
  it('skips the next recurring window and leaves the one after', () => {
    const skipped = skipNextFamilyDowntime(weeknights, laSept(14, 18), LA, 'alex');
    expect(resolveFamilyDowntime(skipped, laSept(14, 22), LA).active).toBe(false);
    const next = resolveFamilyDowntime(skipped, laSept(14, 18), LA);
    expect(next.nextStartMs).toBe(laSept(15, 21));
    expect(resolveFamilyDowntime(skipped, laSept(15, 22), LA).active).toBe(true);
  });
});

describe('Dismiss for me', () => {
  it('releases only the admin who dismissed, until this downtime ends', () => {
    const dismissed = dismissFamilyDowntimeForUser(weeknights, laSept(14, 22), LA, 'alex');
    expect(dismissed.dismissals).toEqual([{ userId: 'alex', untilMs: laSept(15, 7) }]);

    expect(resolveFamilyDowntime(dismissed, laSept(14, 23), LA, 'alex')).toMatchObject({
      active: true,
      dismissedForUser: true,
      lockedForUser: false,
      dismissedUntilMs: laSept(15, 7),
    });
    expect(resolveFamilyDowntime(dismissed, laSept(14, 23), LA, 'emma').lockedForUser).toBe(true);
    // It does not carry into tomorrow night.
    expect(resolveFamilyDowntime(dismissed, laSept(15, 22), LA, 'alex').lockedForUser).toBe(true);
  });

  it('locks the admin again when downtime is extended past their dismissal', () => {
    const dismissed = dismissFamilyDowntimeForUser(weeknights, laSept(14, 22), LA, 'alex');
    const extended = { ...dismissed, oneOffs: [{ id: 'x', startAt: laSept(15, 7), endAt: laSept(15, 9), createdBy: 'sam' }] };
    const state = resolveFamilyDowntime(extended, laSept(14, 23), LA, 'alex');
    expect(state).toMatchObject({ lockedForUser: false, endsAtMs: laSept(15, 9) });
    expect(state.nextChangeMs).toBe(laSept(15, 7));
    expect(resolveFamilyDowntime(extended, laSept(15, 8), LA, 'alex').lockedForUser).toBe(true);
  });

  // Removing the one-off that was running ends the dismissed downtime just as End now does.
  it('ends with the downtime it was made in when a write cuts that downtime short', () => {
    const tonight = settings({
      enabled: false,
      oneOffs: [{ id: 'now', startAt: laSept(14, 21), endAt: laSept(15, 7), createdBy: 'sam' }],
    });
    const dismissed = dismissFamilyDowntimeForUser(tonight, laSept(14, 22), LA, 'alex');
    const removed = keepDismissalsWithinDowntime({ ...dismissed, oneOffs: [] }, laSept(14, 22, 15), LA);
    expect(removed.dismissals).toEqual([]);

    // A write that shortens it keeps the dismissal, ending at the new end.
    const shortened = keepDismissalsWithinDowntime(
      { ...dismissed, oneOffs: [{ ...tonight.oneOffs[0], endAt: laSept(14, 23) }] },
      laSept(14, 22, 15),
      LA,
    );
    expect(shortened.dismissals).toEqual([{ userId: 'alex', untilMs: laSept(14, 23) }]);
  });

  // The background expands downtime from a day before its last read, so a long downtime's first piece
  // can be missing from what it holds. The dismissal must not depend on that.
  it('keeps counting through a downtime made of joined pieces, however it was expanded', () => {
    const weekend = settings({
      schedules: [{ id: 'fri', daysOfWeek: [5], start: '21:00', end: '07:00' }],
      oneOffs: [{ id: 'away', startAt: laSept(19, 7), endAt: laSept(21, 7), createdBy: 'sam' }],
    });
    const dismissed = dismissFamilyDowntimeForUser(weekend, laSept(18, 22), LA, 'alex');
    expect(dismissed.dismissals).toEqual([{ userId: 'alex', untilMs: laSept(21, 7) }]);
    const laterPieces = expandFamilyDowntimeIntervals(dismissed, laSept(20, 7), laSept(22, 7), LA);
    expect(familyDowntimeStateAt(laterPieces, dismissed.dismissals, laSept(20, 8), 'alex').lockedForUser).toBe(false);
  });

  it('does not release the admin from a new downtime started after End now', () => {
    const dismissed = dismissFamilyDowntimeForUser(weeknights, laSept(14, 22), LA, 'alex');
    const ended = endFamilyDowntimeNow(dismissed, laSept(14, 23), LA, 'sam');
    const restarted = { ...ended, oneOffs: [{ id: 'again', startAt: laSept(14, 23, 30), endAt: laSept(15, 1), createdBy: 'sam' }] };
    expect(resolveFamilyDowntime(restarted, laSept(14, 23, 45), LA, 'alex')).toMatchObject({
      active: true,
      dismissedForUser: false,
      lockedForUser: true,
    });
  });

  it('cannot be banked while downtime is off', () => {
    expect(dismissFamilyDowntimeForUser(weeknights, laSept(14, 18), LA, 'alex').dismissals).toEqual([]);
  });
});

describe('familyDowntimeForDevice', () => {
  it('sends 28 days of actual start and end times and the apps that stay open', () => {
    const withApps = { ...weeknights, allow: { urlPatterns: [], itemIds: [], appIds: ['android:com.audible.application'] } };
    const now = laSept(14, 22);
    const device = familyDowntimeForDevice(withApps, now, LA);
    expect(device.horizonEndMs).toBe(now + FAMILY_DOWNTIME_DEVICE_HORIZON_MS);
    expect(device.allowAppIds).toEqual(['android:com.audible.application']);
    // The running one is included; five weeknights a week for four weeks, give or take the edges.
    expect(device.intervals[0]).toEqual({ startMs: laSept(14, 21), endMs: laSept(15, 7) });
    expect(device.intervals.length).toBeGreaterThanOrEqual(19);
    expect(device.intervals.every((i) => i.endMs > now)).toBe(true);
  });
});

describe('isAllowedDuringDowntime', () => {
  const allow = { urlPatterns: ['calm.com'], itemIds: ['item-stories'], appIds: [] };

  it('matches a site the way a custom limit does, and a library item by id', () => {
    expect(isAllowedDuringDowntime(allow, { url: 'https://www.calm.com/sleep' })).toBe(true);
    expect(isAllowedDuringDowntime(allow, { url: 'https://youtube.com/' })).toBe(false);
    expect(isAllowedDuringDowntime(allow, { itemId: 'item-stories' })).toBe(true);
    expect(isAllowedDuringDowntime(allow, { itemId: 'item-games' })).toBe(false);
  });

  // An allowlist that matched a piece of the address let a child type any site past downtime.
  it('matches the site name, not text anywhere in the address', () => {
    expect(isAllowedDuringDowntime(allow, { url: 'https://calm.com' })).toBe(true);
    expect(isAllowedDuringDowntime(allow, { url: 'https://app.calm.com/x?y=1' })).toBe(true);
    expect(isAllowedDuringDowntime(allow, { url: 'https://www.tiktok.com/?calm.com' })).toBe(false);
    expect(isAllowedDuringDowntime(allow, { url: 'https://www.tiktok.com/#calm.com' })).toBe(false);
    expect(isAllowedDuringDowntime(allow, { url: 'https://notcalm.com/' })).toBe(false);
    expect(isAllowedDuringDowntime(allow, { url: 'https://calm.com.evil.io/' })).toBe(false);
    expect(isAllowedDuringDowntime(allow, { url: 'chrome-extension://abc/calm.com' })).toBe(false);
  });

  // A query used to be dropped, so one allowed video opened every video.
  it('opens only addresses carrying the query an entry has', () => {
    const oneVideo = { urlPatterns: ['youtube.com/watch?v=Abc123'], itemIds: [], appIds: [] };
    expect(isAllowedDuringDowntime(oneVideo, { url: 'https://www.youtube.com/watch?v=Abc123&t=30' })).toBe(true);
    expect(isAllowedDuringDowntime(oneVideo, { url: 'https://www.youtube.com/watch?v=OTHER' })).toBe(false);
    expect(isAllowedDuringDowntime(oneVideo, { url: 'https://www.youtube.com/watch?v=abc123' })).toBe(false);
    // A second copy of the key does not carry the allowed one past the one the site plays.
    expect(isAllowedDuringDowntime(oneVideo, { url: 'https://www.youtube.com/watch?v=OTHER&v=Abc123' })).toBe(false);
  });

  it('reads a leading dot or star as the site itself', () => {
    const dotted = { urlPatterns: ['.calm.com', '*.pbskids.org'], itemIds: [], appIds: [] };
    expect(isAllowedDuringDowntime(dotted, { url: 'https://www.calm.com/' })).toBe(true);
    expect(isAllowedDuringDowntime(dotted, { url: 'https://pbskids.org/' })).toBe(true);
  });

  it('opens only pages under an entry with a path', () => {
    const games = { urlPatterns: ['https://www.pbskids.org/games/'], itemIds: [], appIds: [] };
    expect(isAllowedDuringDowntime(games, { url: 'https://pbskids.org/games' })).toBe(true);
    expect(isAllowedDuringDowntime(games, { url: 'https://pbskids.org/games/wild-kratts' })).toBe(true);
    expect(isAllowedDuringDowntime(games, { url: 'https://pbskids.org/gamesroom' })).toBe(false);
    expect(isAllowedDuringDowntime(games, { url: 'https://pbskids.org/videos' })).toBe(false);
  });

  it('allows nothing without an allowlist, and an empty pattern matches nothing', () => {
    expect(isAllowedDuringDowntime(null, { url: 'https://calm.com' })).toBe(false);
    expect(isAllowedDuringDowntime({ urlPatterns: [''], itemIds: [], appIds: [] }, { url: 'https://x.com' })).toBe(false);
  });
});

describe('oneOffProblem', () => {
  const now = laSept(14, 18);
  it('explains each way a one-off cannot be saved', () => {
    expect(oneOffProblem(now, now - HOUR, now)).toBe('The end has to be after the start.');
    expect(oneOffProblem(now - 3 * HOUR, now - HOUR, now)).toBe('That time has already passed.');
    expect(oneOffProblem(now, now + 15 * 24 * HOUR, now)).toBe('A one-off can last up to 14 days.');
    expect(oneOffProblem(now, now + 13 * HOUR, now)).toBeNull();
  });
});

describe('pruneFamilyDowntime', () => {
  it('drops one-offs, exceptions and dismissals that have ended', () => {
    const now = laSept(15, 12);
    const pruned = pruneFamilyDowntime(settings({
      oneOffs: [
        { id: 'old', startAt: laSept(14, 18), endAt: laSept(14, 20), createdBy: 'a' },
        { id: 'new', startAt: laSept(19, 18), endAt: laSept(20, 9), createdBy: 'a' },
      ],
      exceptions: [
        { fromMs: laSept(14, 22), untilMs: laSept(15, 7), kind: 'ended', byUserId: 'a' },
        { fromMs: laSept(15, 21), untilMs: laSept(16, 7), kind: 'skipped', byUserId: 'a' },
      ],
      dismissals: [{ userId: 'a', untilMs: laSept(15, 7) }],
    }), now);
    expect(pruned.oneOffs.map((o) => o.id)).toEqual(['new']);
    expect(pruned.exceptions.map((e) => e.kind)).toEqual(['skipped']);
    expect(pruned.dismissals).toEqual([]);
  });
});
