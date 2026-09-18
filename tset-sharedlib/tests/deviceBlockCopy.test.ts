/**
 * One decision, two screens, one set of words.
 *
 * The regression this file exists for: the Mac decided in `BlockReason` and handed that value to
 * the web block page, which had nothing that understood it and rendered it as the subtitle raw. A
 * child on a spent Steam budget was shown the literal string `budget-exhausted`.
 */
import {
  deviceBlockCopy,
  deviceBlockSubtitle,
  deviceNoun,
  downtimeUntilSentence,
  isDeviceBlockReason,
  localClock,
} from '../src/restrictions/deviceBlockCopy';

const NOON = Date.UTC(2026, 7, 19, 19); // 12:00 PDT
const PDT = -420;

const base = { appLabel: 'Steam', nowMs: NOON, tzOffsetMinutes: PDT };

describe('deviceBlockCopy', () => {
  it('leads with the reason, not the brand', () => {
    const copy = deviceBlockCopy({ ...base, reason: 'app-blocked' });
    expect(copy.headline).toBe('Steam is turned off');
    expect(copy.headline).not.toMatch(/Kindredly|Blocked by/);
  });

  it('names a category limit by its rule, and the overall one by what it is', () => {
    expect(deviceBlockCopy({ ...base, reason: 'budget-exhausted', ruleName: 'Games' }).headline).toBe(
      'Your time for Games is used up',
    );
    // "All Content" is the stored name and is fine in a parent's settings list. It is wrong on the
    // one screen whose whole job is telling a kid why their computer stopped.
    expect(
      deviceBlockCopy({ ...base, reason: 'budget-exhausted', ruleName: 'All Content', coversEverything: true }).headline,
    ).toBe('Your screen time is used up');
  });

  it('gives a real time when there is one and stays silent when there is not', () => {
    expect(deviceBlockCopy({ ...base, reason: 'outside-schedule', unlockAtMs: NOON + 2 * 3_600_000 }).detail).toBe(
      'Opens again at 14:00.',
    );
    // Tomorrow is named as tomorrow rather than as a clock time that has already passed today.
    expect(deviceBlockCopy({ ...base, reason: 'outside-schedule', unlockAtMs: NOON + 20 * 3_600_000 }).detail).toBe(
      'Opens again tomorrow.',
    );
    expect(deviceBlockCopy({ ...base, reason: 'budget-exhausted', unlockAtMs: null }).detail).toBe('It comes back tomorrow.');
  });

  it('sends an unprotected browser to the fix, not to a parent', () => {
    const copy = deviceBlockCopy({ ...base, appLabel: 'Brave', reason: 'browser-unprotected' });
    expect(copy.headline).toBe('Brave does not have Kindredly');
    // Names the browser: a child with three of them needs to know which one this is about.
    expect(copy.detail).toContain('Brave');
  });

  /**
   * Safari is the reason this exists. Under browser lockdown it is closed because nothing can put
   * Kindredly into it — macOS will not let anything outside read or restrict its extensions — so
   * "ask a parent to add Kindredly to Safari" is advice nobody in the house can follow.
   */
  it('names a browser the child can actually use instead of a fix that does not exist', () => {
    const copy = deviceBlockCopy({
      ...base,
      appLabel: 'Safari',
      reason: 'browser-unprotected',
      allowedBrowsers: ['Google Chrome'],
    });
    expect(copy.detail).toBe('Use Google Chrome instead.');
    expect(copy.detail).not.toContain('add Kindredly to Safari');
  });

  it('lists a couple of ways out, and stops at three', () => {
    const detail = (allowedBrowsers: string[]) =>
      deviceBlockCopy({ ...base, appLabel: 'Safari', reason: 'browser-unprotected', allowedBrowsers }).detail;

    expect(detail(['Google Chrome', 'Firefox'])).toBe('Use Google Chrome or Firefox instead.');
    // A shield is read in one glance; six browsers would make the way out a list to parse.
    expect(detail(['Google Chrome', 'Firefox', 'Brave Browser', 'Chromium', 'Microsoft Edge'])).toBe(
      'Use Google Chrome, Firefox or Brave Browser instead.',
    );
  });

  /** A Companion built before this sent the field says what it always said. */
  it('falls back to the old advice when it knows of nowhere to send them', () => {
    for (const allowedBrowsers of [undefined, [], ['', '  ']]) {
      const copy = deviceBlockCopy({ ...base, appLabel: 'Brave', reason: 'browser-unprotected', allowedBrowsers });
      expect(copy.detail).toBe('Use a browser with Kindredly in it, or ask a parent to add Kindredly to Brave.');
    }
  });

  it('never renders a bare app id when the label is missing', () => {
    expect(deviceBlockCopy({ ...base, appLabel: '', reason: 'app-blocked' }).headline).toBe('This app is turned off');
  });
});

describe('Family Downtime until', () => {
  const at = (hoursFromNoon: number) => ({ ...base, reason: 'family-downtime' as const, unlockAtMs: NOON + hoursFromNoon * 3_600_000 });

  // A weekend one-off used to say "Until tomorrow." on Friday.
  it('says the day when it does not end today', () => {
    expect(downtimeUntilSentence(at(6))).toBe('Until 18:00.');
    expect(downtimeUntilSentence(at(19))).toBe('Until tomorrow at 07:00.');
    expect(downtimeUntilSentence(at(54))).toBe('Until Friday at 18:00.'); // 2026-08-19 is a Wednesday
    expect(downtimeUntilSentence(at(10 * 24))).toBe('Until Aug 29 at 12:00.');
    expect(downtimeUntilSentence({ ...base, reason: 'family-downtime' })).toBe('');
  });
});

describe('deviceBlockSubtitle', () => {
  it('never hands a child a raw reason token', () => {
    // The bug. `budget-exhausted` reached the page as `blockReason` and went straight to the
    // subtitle, because nothing on that side knew the vocabulary.
    const subtitle = deviceBlockSubtitle({ ...base, reason: 'budget-exhausted' });
    expect(subtitle).toBe("Ask a parent if you'd like more time.");
    expect(subtitle).not.toContain('budget-exhausted');
  });

  it('falls back to written copy for a reason it does not recognise', () => {
    // `blockReason` arrives as an untrusted query string. A newer device sending a newer reason
    // must degrade to a true sentence, never to the token itself.
    const subtitle = deviceBlockSubtitle({ ...base, reason: 'quantum-flux' as any, platform: 'macos' });
    expect(subtitle).toBe('A parent chooses which apps can be used on this computer.');
    expect(subtitle).not.toContain('quantum-flux');
  });

  it('says computer on a computer and phone on a phone', () => {
    // "A parent chooses which apps can be used on this phone" was shown on a Mac.
    expect(deviceBlockSubtitle({ ...base, reason: 'app-blocked', platform: 'macos' })).toContain('this computer');
    expect(deviceBlockSubtitle({ ...base, reason: 'app-blocked', platform: 'steam' })).toContain('this computer');
    expect(deviceBlockSubtitle({ ...base, reason: 'app-blocked', platform: 'android' })).toContain('this phone');
    // Unknown platform is a phone, which is what every pre-desktop block meant.
    expect(deviceBlockSubtitle({ ...base, reason: 'app-blocked', platform: null })).toContain('this phone');
  });

  it('prefers a real unlock time over a generic ask', () => {
    expect(deviceBlockSubtitle({ ...base, reason: 'budget-exhausted', unlockAtMs: NOON + 3_600_000 })).toBe(
      'Opens again at 13:00.',
    );
  });
});

describe('isDeviceBlockReason', () => {
  it('accepts what the device sends and refuses everything else', () => {
    expect(isDeviceBlockReason('budget-exhausted')).toBe(true);
    expect(isDeviceBlockReason('browser-unprotected')).toBe(true);
    // A web ReasonCode is a different vocabulary and must not pass as a device one.
    expect(isDeviceBlockReason('time-exceeded')).toBe(false);
    expect(isDeviceBlockReason('')).toBe(false);
    expect(isDeviceBlockReason(null)).toBe(false);
  });
});

describe('localClock', () => {
  it('reads in the family timezone, never the machine one', () => {
    // The machine's timezone is a thing a child can change; the family's is not.
    expect(localClock(NOON, PDT)).toBe('12:00');
    expect(localClock(NOON, 0)).toBe('19:00');
  });
});

describe('deviceNoun', () => {
  it('is the single place that decides computer vs phone', () => {
    expect(deviceNoun('macos')).toBe('this computer');
    expect(deviceNoun('windows')).toBe('this computer');
    expect(deviceNoun('linux')).toBe('this computer');
    expect(deviceNoun('steam')).toBe('this computer');
    expect(deviceNoun('android')).toBe('this phone');
    expect(deviceNoun('ios')).toBe('this phone');
  });
});
