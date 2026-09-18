import { familyClock, isKnownTimeZone } from '../src/deviceguard/familyClock';

/**
 * DCP-16: web limits follow the family timezone. The clock that decides "today", the weekday and
 * where a schedule window is must be the family's, and fall back to the device's own when the
 * family has none.
 */
describe('familyClock', () => {
  // 2026-09-15 06:30 UTC: Monday 23:30 in Los Angeles (UTC-7), Tuesday 15:30 in Tokyo (UTC+9).
  const NOW = Date.UTC(2026, 8, 15, 6, 30);

  it('reads the day, weekday and time of day in the family zone, not the device', () => {
    const la = familyClock(NOW, 'America/Los_Angeles');
    expect(la).toMatchObject({ timeZone: 'America/Los_Angeles', dateKey: '2026-09-14', dayOfWeek: 1, offsetMinutes: -420 });
    expect(la.msOfDay).toBe((23 * 60 + 30) * 60_000);
    expect(la.dayStartMs).toBe(Date.UTC(2026, 8, 14, 7, 0));

    const tokyo = familyClock(NOW, 'Asia/Tokyo');
    expect(tokyo).toMatchObject({ dateKey: '2026-09-15', dayOfWeek: 2, offsetMinutes: 540 });
    expect(tokyo.msOfDay).toBe((15 * 60 + 30) * 60_000);
    expect(tokyo.dayStartMs).toBe(Date.UTC(2026, 8, 14, 15, 0));
  });

  it("starts the day at midnight's own offset on the day clocks change", () => {
    // 2026-11-01 is the US fall-back day: midnight is still UTC-7, 10:00 is UTC-8.
    const tenAm = Date.UTC(2026, 10, 1, 18, 0);
    const c = familyClock(tenAm, 'America/Los_Angeles');
    expect(c.offsetMinutes).toBe(-480);
    expect(c.dayStartMs).toBe(Date.UTC(2026, 10, 1, 7, 0));
    expect(c.msOfDay).toBe(10 * 60 * 60_000);
  });

  it("uses the device's own clock when the family has no zone, or one Intl does not know", () => {
    const now = new Date(NOW);
    for (const tz of [null, undefined, '', 'Not/AZone']) {
      const c = familyClock(NOW, tz as any);
      expect(c.timeZone).toBeNull();
      expect(c.dayOfWeek).toBe(now.getDay());
      expect(c.dayStartMs).toBe(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime());
      expect(c.msOfDay).toBe(NOW - c.dayStartMs);
    }
  });

  it('knows a zone only when Intl does', () => {
    expect(isKnownTimeZone('Europe/London')).toBe(true);
    expect(isKnownTimeZone('Mars/Olympus')).toBe(false);
    expect(isKnownTimeZone(null)).toBe(false);
  });
});
