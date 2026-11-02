/**
 * "Pause all restrictions" as the device compile reads it. The shared decision fixtures (20-23) pin
 * an active, an expired and a cancelled pause against every evaluator; these are the edges of the
 * reading itself, which must stay line for line with the browser's `getRestrictionEffectiveStatus`.
 */
import { compileDeviceSettings, restrictionsPauseAt } from '../src/deviceguard/compileDeviceSettings';
import type { DeviceSettings } from '../src/types/device-guard.types';

const NOW = 1_789_491_600_000;
const MIN = 60_000;

function settings(accessControlSettings: DeviceSettings['accessControlSettings']): DeviceSettings {
  return {
    usageLimitsData: { contentUsageLimits: [], temporaryRules: [] },
    ruleOverrideSettings: { ruleOverrides: [] },
    accessControlSettings,
    appPolicy: null,
    appPolicyStatus: 'absent',
  } as DeviceSettings;
}

describe('restrictionsPauseAt', () => {
  it('is none when no pause was set', () => {
    expect(restrictionsPauseAt(settings({}), NOW)).toBeNull();
    expect(restrictionsPauseAt(settings({ disableRestrictions: false, disableRestrictionsExpires: NOW + MIN }), NOW)).toBeNull();
  });

  it('carries the end time while the pause is ahead of it', () => {
    expect(restrictionsPauseAt(settings({ disableRestrictions: true, disableRestrictionsExpires: NOW + 15 * MIN }), NOW))
      .toEqual({ untilMs: NOW + 15 * MIN });
  });

  it('is none from the instant it ends', () => {
    expect(restrictionsPauseAt(settings({ disableRestrictions: true, disableRestrictionsExpires: NOW }), NOW)).toBeNull();
  });

  it('means until turned off when it has no end', () => {
    expect(restrictionsPauseAt(settings({ disableRestrictions: true }), NOW)).toEqual({ untilMs: 0 });
    expect(restrictionsPauseAt(settings({ disableRestrictions: true, disableRestrictionsExpires: 0 }), NOW)).toEqual({ untilMs: 0 });
  });

  it('is none while "Block all access" is on — even an expired one, as the browser checks it first', () => {
    const pause = { disableRestrictions: true, disableRestrictionsExpires: NOW + 15 * MIN };
    expect(restrictionsPauseAt(settings({ ...pause, restrictAll: true, restrictAllExpires: 0 }), NOW)).toBeNull();
    expect(restrictionsPauseAt(settings({ ...pause, restrictAll: true, restrictAllExpires: NOW - MIN }), NOW)).toBeNull();
  });

  it('is not "Pause just usage limits", which is a different setting', () => {
    expect(restrictionsPauseAt(settings({ disableUsageLimits: true, disableUsageLimitsExpires: 0 }), NOW)).toBeNull();
  });
});

describe('compileDeviceSettings with a pause', () => {
  const compile = (access: DeviceSettings['accessControlSettings']) =>
    compileDeviceSettings({ settings: settings(access), nowMs: NOW, familyTimeZone: 'America/Los_Angeles', installedApps: [] });

  it('adds the pause to the ruleset only while it is in force', () => {
    expect(compile({ disableRestrictions: true, disableRestrictionsExpires: NOW + MIN }).restrictionsPause).toEqual({ untilMs: NOW + MIN });
    expect(compile({ disableRestrictions: true, disableRestrictionsExpires: NOW - MIN })).not.toHaveProperty('restrictionsPause');
    expect(compile({})).not.toHaveProperty('restrictionsPause');
  });
});
