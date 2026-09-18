import {
  HISTORY_RETENTION_CHOICES,
  effectiveHistoryRetentionDays,
  historyRetentionChoicesFor,
} from '../src/plan-policy';

/**
 * "Keep history for" (founder decision 2026-09-15, PLN-9). The server's purge, the server's write
 * and the History page all read these, so a person's history is kept for the same number of days
 * whichever one asks.
 */
describe('history retention', () => {
  it('offers Standard 1, 7 or 14 days and Plus up to a year', () => {
    expect(historyRetentionChoicesFor('standard')).toEqual([1, 7, 14]);
    expect(historyRetentionChoicesFor('plus')).toEqual([...HISTORY_RETENTION_CHOICES]);
    expect(historyRetentionChoicesFor('superplus')).toEqual([...HISTORY_RETENTION_CHOICES]);
    expect(historyRetentionChoicesFor(null)).toEqual([1, 7, 14]);
  });

  it('keeps 14 days on both plans when nothing usable is saved', () => {
    for (const plan of ['standard', 'plus', null]) {
      expect(effectiveHistoryRetentionDays(plan, undefined)).toBe(14);
      expect(effectiveHistoryRetentionDays(plan, null)).toBe(14);
      expect(effectiveHistoryRetentionDays(plan, 'soon')).toBe(14);
      expect(effectiveHistoryRetentionDays(plan, 0)).toBe(14);
      expect(effectiveHistoryRetentionDays(plan, -5)).toBe(14);
    }
  });

  it("caps a saved value at the plan's maximum, so a family that moved to Standard keeps 14", () => {
    expect(effectiveHistoryRetentionDays('standard', 365)).toBe(14);
    expect(effectiveHistoryRetentionDays('plus', 365)).toBe(365);
  });

  it('snaps a value between choices down to the choice below it, never up', () => {
    expect(effectiveHistoryRetentionDays('plus', 60)).toBe(30);
    expect(effectiveHistoryRetentionDays('standard', 10)).toBe(7);
    expect(effectiveHistoryRetentionDays('plus', 1.5)).toBe(1);
    expect(effectiveHistoryRetentionDays('plus', '90')).toBe(90);
  });
});
