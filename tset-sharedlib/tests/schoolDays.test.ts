import {
  addDays,
  applySchoolDays,
  applySchoolDaysToRule,
  currentOrNextDayOff,
  dayOffOn,
  isDateKey,
  isSchoolDay,
  normalizeSchoolDays,
  pruneSchoolDays,
  weekdayOf,
  weekdaysFor,
} from '../src/restrictions/schoolDays';
import type { LimitRule, TimeLimit } from '../src/types/usage-limits.types';

const family = normalizeSchoolDays({
  week: [1, 2, 3, 4, 5],
  daysOff: [
    { id: 'winter', name: 'Winter break', from: '2026-12-21', to: '2027-01-01' },
    { id: 'mlk', name: 'Martin Luther King Jr. Day', from: '2027-01-18', to: '2027-01-18' },
  ],
});

function rule(timeLimits: TimeLimit[]): LimitRule {
  return { id: 'overall', name: 'Overall', type: 'all', timeLimits };
}
const school: TimeLimit = { hours: 2, daysOfWeek: [1, 2, 3, 4, 5], dayKind: 'school', timeRanges: [{ start: '07:00', end: '20:00' }] };
const notSchool: TimeLimit = { hours: 3, daysOfWeek: [0, 6], dayKind: 'notSchool' };
const todaysLimit = (r: LimitRule, dow: number) => r.timeLimits.find((tl) => tl.daysOfWeek.includes(dow));

describe('dates', () => {
  it('reads real calendar dates only', () => {
    expect(isDateKey('2027-02-28')).toBe(true);
    expect(isDateKey('2027-02-29')).toBe(false);
    expect(isDateKey('2027-2-1')).toBe(false);
  });
  it('moves across months and years and knows the weekday', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(weekdayOf('2026-12-22')).toBe(2); // a Tuesday
  });
});

describe('normalizeSchoolDays', () => {
  it('starts Mon–Fri with no days off', () => {
    expect(normalizeSchoolDays(undefined)).toMatchObject({ week: [1, 2, 3, 4, 5], daysOff: [] });
  });
  it('keeps a homeschool week of Mon–Thu', () => {
    expect(normalizeSchoolDays({ week: [4, 1, 2, 3, 3] }).week).toEqual([1, 2, 3, 4]);
  });
  it('falls back to Mon–Fri rather than a week with no school days', () => {
    expect(normalizeSchoolDays({ week: [] }).week).toEqual([1, 2, 3, 4, 5]);
  });
  it('drops days off it cannot use and sorts the rest', () => {
    const s = normalizeSchoolDays({
      daysOff: [
        { name: 'Spring break', from: '2027-03-22', to: '2027-03-26' },
        { name: '', from: '2027-01-04', to: '2027-01-04' },
        { name: 'Backwards', from: '2027-02-10', to: '2027-02-01' },
        { name: 'Not a date', from: '2027-02-30', to: '2027-03-01' },
        { name: 'Forever', from: '2027-01-01', to: '2027-12-31' },
        { name: 'Field trip', from: '2027-02-10' },
      ],
    });
    expect(s.daysOff.map((d) => d.name)).toEqual(['Field trip', 'Spring break']);
    expect(s.daysOff[0]).toMatchObject({ from: '2027-02-10', to: '2027-02-10' });
  });
  it('drops breaks long over', () => {
    expect(pruneSchoolDays(family, '2027-03-01').daysOff.map((d) => d.id)).toEqual([]);
    expect(pruneSchoolDays(family, '2027-01-20').daysOff.map((d) => d.id)).toEqual(['winter', 'mlk']);
  });
});

describe('school days', () => {
  it('a weekday in a break is not a school day; one in term is', () => {
    expect(isSchoolDay(family, '2026-12-22')).toBe(false);
    expect(isSchoolDay(family, '2027-01-14')).toBe(true);
    expect(isSchoolDay(family, '2027-01-16')).toBe(false); // Saturday
    expect(dayOffOn(family, '2027-01-01')?.name).toBe('Winter break');
  });
  it('names the break running now, else the next', () => {
    expect(currentOrNextDayOff(family, '2026-12-22')).toMatchObject({ now: true, dayOff: { id: 'winter' } });
    expect(currentOrNextDayOff(family, '2027-01-14')).toMatchObject({ now: false, dayOff: { id: 'mlk' } });
    expect(currentOrNextDayOff(family, '2027-02-01')).toBeNull();
  });
  it('Not school days are the rest of the week, less days a weekday schedule has', () => {
    expect(weekdaysFor('notSchool', family)).toEqual([0, 6]);
    expect(weekdaysFor('school', family, [5])).toEqual([1, 2, 3, 4]);
  });
});

describe('applySchoolDays', () => {
  it('leaves rules with no school days schedule alone', () => {
    const rules = [rule([{ hours: 2, daysOfWeek: [1, 2, 3, 4, 5] }])];
    expect(applySchoolDays(rules, family, { dateKey: '2026-12-22' })).toBe(rules);
  });

  it('in term, school days get the School days amount', () => {
    const r = applySchoolDaysToRule(rule([school, notSchool]), family, { dateKey: '2027-01-11' }); // Monday
    expect(todaysLimit(r, 3)?.hours).toBe(2);
    expect(todaysLimit(r, 6)?.hours).toBe(3);
  });

  it('in a break, every weekday of the week ahead gets the Not school days amount', () => {
    const r = applySchoolDaysToRule(rule([school, notSchool]), family, { dateKey: '2026-12-22' }); // Tuesday
    for (const dow of [0, 1, 2, 3, 4, 5, 6]) expect(todaysLimit(r, dow)?.hours).toBe(3);
    expect(r.timeLimits.find((tl) => tl.dayKind === 'school')).toBeUndefined();
  });

  it('a break that ends mid-week moves only its own days', () => {
    // Wed Dec 30: Wed, Thu and Fri Jan 1 are in the break; Mon Jan 4 and Tue Jan 5 are school days.
    const r = applySchoolDaysToRule(rule([school, notSchool]), family, { dateKey: '2026-12-30' });
    expect([3, 4, 5].map((d) => todaysLimit(r, d)?.hours)).toEqual([3, 3, 3]);
    expect([1, 2].map((d) => todaysLimit(r, d)?.hours)).toEqual([2, 2]);
  });

  it('a single day off moves that day only', () => {
    const r = applySchoolDaysToRule(rule([school, notSchool]), family, { dateKey: '2027-01-14' }); // Thu, MLK Mon ahead
    expect(todaysLimit(r, 1)?.hours).toBe(3);
    expect(todaysLimit(r, 4)?.hours).toBe(2);
  });

  it('takes the family school week over the weekdays the schedule was saved with', () => {
    const home = normalizeSchoolDays({ week: [1, 2, 3, 4] });
    const r = applySchoolDaysToRule(rule([school, notSchool]), home, { dateKey: '2027-01-11' });
    expect(todaysLimit(r, 5)?.hours).toBe(3); // Friday is not a school day for them
    expect(todaysLimit(r, 4)?.hours).toBe(2);
  });

  it('with no Not school days schedule, a day off has no limit from this rule', () => {
    const r = applySchoolDaysToRule(rule([school]), family, { dateKey: '2026-12-22' });
    expect(todaysLimit(r, 2)).toBeUndefined();
    expect(r.timeLimits.every((tl) => tl.daysOfWeek.length > 0)).toBe(true);
  });

  it('keeps an ordinary weekday schedule on its days', () => {
    const fri: TimeLimit = { hours: 1, daysOfWeek: [5] };
    const r = applySchoolDaysToRule(rule([school, fri, notSchool]), family, { dateKey: '2027-01-11' });
    expect(todaysLimit(r, 5)?.hours).toBe(1);
    expect(r.timeLimits.filter((tl) => tl.daysOfWeek.includes(5))).toHaveLength(1);
  });

  it('keeps hours and other fields of the schedule it moves a day to', () => {
    const r = applySchoolDaysToRule(rule([school, { ...notSchool, timeRanges: [{ start: '08:00', end: '21:00' }] }]), family, { dateKey: '2026-12-22' });
    expect(todaysLimit(r, 2)).toMatchObject({ hours: 3, dayKind: 'notSchool', timeRanges: [{ start: '08:00', end: '21:00' }] });
  });
});
