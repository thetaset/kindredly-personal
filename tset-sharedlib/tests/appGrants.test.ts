import {
  appGrantUntil,
  appPlatformLabel,
  appRequestSubject,
  deviceAppGrants,
  MAX_APP_GRANT_MS,
  normalizeAppGrants,
  withAppGrant,
} from '../src/restrictions/appGrants';

/** A guardian's yes to one blocked app, for a while (HAT-178). */
const NOW = Date.UTC(2026, 9, 3, 2, 0, 0);

describe('normalizeAppGrants', () => {
  it('keeps valid grants, the latest end per app, sorted by app id', () => {
    expect(
      normalizeAppGrants([
        {appId: 'macos:com.valvesoftware.steam', until: NOW + 60_000},
        {appId: 'linux:org.gnome.Software', until: NOW + 1},
        {appId: 'linux:org.gnome.Software', until: NOW + 5},
        {appId: 'no platform', until: NOW + 5},
        {appId: 'linux:x', until: 'soon'},
        null,
      ]),
    ).toEqual([
      {appId: 'linux:org.gnome.Software', until: NOW + 5},
      {appId: 'macos:com.valvesoftware.steam', until: NOW + 60_000},
    ]);
  });

  it('drops ended grants only when told the time', () => {
    const ended = [{appId: 'linux:a', until: NOW - 1}];
    expect(normalizeAppGrants(ended, NOW)).toEqual([]);
    // The device settings comparison cannot read the clock, so it keeps them.
    expect(deviceAppGrants(ended)).toEqual(ended);
  });
});

describe('withAppGrant', () => {
  it('replaces the same app, drops ended grants, and never grants more than a day', () => {
    const existing = [
      {appId: 'linux:a', until: NOW + 1000},
      {appId: 'linux:old', until: NOW - 1},
    ];
    const out = withAppGrant(existing, {appId: 'linux:a', until: NOW + 10 * MAX_APP_GRANT_MS, grantedBy: 'u_p'}, NOW);
    expect(out).toEqual([{appId: 'linux:a', until: NOW + MAX_APP_GRANT_MS, grantedBy: 'u_p'}]);
  });
});

describe('appGrantUntil', () => {
  it('ends 15 minutes or an hour from now, or at the next local midnight', () => {
    expect(appGrantUntil(15, NOW, 0)).toBe(NOW + 15 * 60_000);
    expect(appGrantUntil(60, NOW, 0)).toBe(NOW + 60 * 60_000);
    // 02:00 UTC is 19:00 the day before in Los Angeles (UTC-7); midnight there is 07:00 UTC.
    expect(appGrantUntil('today', NOW, -420)).toBe(Date.UTC(2026, 9, 3, 7, 0, 0));
  });
});

describe('appRequestSubject', () => {
  it('reads the app and device from a request the block screen filed', () => {
    expect(appRequestSubject({srcType: 'app', srcId: 'linux:org.gnome.Software', srcTitle: 'Software'})).toEqual({
      appId: 'linux:org.gnome.Software',
      name: 'Software',
      platform: 'linux',
    });
    expect(appRequestSubject({srcType: 'url', url: 'https://example.com'})).toBeNull();
    expect(appRequestSubject({srcType: 'app', srcId: 'nonsense'})).toBeNull();
    expect(appPlatformLabel('macos')).toBe('Mac');
  });
});
