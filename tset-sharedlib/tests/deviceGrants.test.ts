/**
 * Grants arrive over the network. A malformed entry must drop itself rather than take the
 * well-formed ones with it — a device that throws while parsing these stops enforcing.
 */
import { activeGrants, isDeviceGrant } from '../src/restrictions/deviceGrants';

const NOW = 1_760_000_000_000;

describe('isDeviceGrant', () => {
  it('accepts the two kinds that exist', () => {
    expect(isDeviceGrant({kind: 'rule-budget', ruleId: 'games', budgetMsToday: 60_000, until: NOW})).toBe(true);
    expect(isDeviceGrant({kind: 'app-unblock', appId: 'macos:steam', until: NOW})).toBe(true);
  });

  it('refuses a grant with no end', () => {
    // A grant with no expiry is a policy change wearing a grant's clothes.
    expect(isDeviceGrant({kind: 'app-unblock', appId: 'macos:steam'})).toBe(false);
    expect(isDeviceGrant({kind: 'app-unblock', appId: 'macos:steam', until: Number.NaN})).toBe(false);
    expect(isDeviceGrant({kind: 'app-unblock', appId: 'macos:steam', until: Infinity})).toBe(false);
  });

  it('refuses a kind nobody implemented', () => {
    expect(isDeviceGrant({kind: 'app-block', appId: 'macos:steam', until: NOW})).toBe(false);
    expect(isDeviceGrant({kind: 'rule-tighten', ruleId: 'games', until: NOW})).toBe(false);
  });

  it('refuses a grant missing the field its kind is about', () => {
    expect(isDeviceGrant({kind: 'rule-budget', budgetMsToday: 60_000, until: NOW})).toBe(false);
    expect(isDeviceGrant({kind: 'rule-budget', ruleId: 'games', until: NOW})).toBe(false);
    expect(isDeviceGrant({kind: 'app-unblock', appId: '', until: NOW})).toBe(false);
  });

  it('refuses junk without throwing', () => {
    for (const junk of [null, undefined, 0, '', 'grant', [], {}]) {
      expect(isDeviceGrant(junk)).toBe(false);
    }
  });
});

describe('activeGrants', () => {
  it('keeps only grants that have not expired', () => {
    const out = activeGrants(
      [
        {kind: 'app-unblock', appId: 'live', until: NOW + 1},
        {kind: 'app-unblock', appId: 'dead', until: NOW - 1},
        {kind: 'app-unblock', appId: 'exactly-now', until: NOW},
      ],
      NOW,
    );
    expect(out.map((g) => g.appId)).toEqual(['live']);
  });

  it('drops a malformed entry without dropping its neighbours', () => {
    const out = activeGrants(
      [{kind: 'nonsense'}, {kind: 'app-unblock', appId: 'good', until: NOW + 1}, null],
      NOW,
    );
    expect(out.map((g) => g.appId)).toEqual(['good']);
  });

  it('treats anything that is not a list as no grants at all', () => {
    for (const junk of [null, undefined, {}, 'grants', 7]) {
      expect(activeGrants(junk, NOW)).toEqual([]);
    }
  });
});
