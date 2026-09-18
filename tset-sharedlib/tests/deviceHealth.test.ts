import { DEVICE_HEALTH_THRESHOLDS, deviceHealth, worstDeviceHealth } from '../src/deviceguard/deviceHealth';
import type { DeviceGuardStatus } from '../src/types/device-guard.types';

/**
 * DCP-10: one health verdict for every surface. Worst first: not heard from, stopped, behind, can't
 * block, web time not reported, protected. These pin the ladder and the facts that are not states.
 */
const NOW = 2_000_000_000_000;
const MIN = 60_000;

function status(over: Partial<DeviceGuardStatus> = {}): DeviceGuardStatus {
  return {
    deviceId: 'and-1',
    companionVersion: '0.2.0',
    serviceRunning: true,
    mainAppPresent: true,
    permissions: { usageAccess: true, notifications: true, batteryUnrestricted: true, overlay: true },
    ...over,
  } as DeviceGuardStatus;
}

describe('deviceHealth', () => {
  it('protected when heard from recently, running, current and able to block', () => {
    expect(deviceHealth(status(), NOW - MIN, NOW).state).toBe('protected');
  });

  it('not heard from: never, or past the quiet gap, measured from the SERVER receive time', () => {
    expect(deviceHealth(null, null, NOW)).toMatchObject({ state: 'not-heard-from', lastHeardAt: null });
    expect(deviceHealth(status(), NOW - DEVICE_HEALTH_THRESHOLDS.quietGapMs - 1, NOW).state).toBe('not-heard-from');
    // The device's own upload time is not the clock: a phone with a wrong clock stays judged by arrival.
    expect(deviceHealth(status({ lastUploadAt: 1 }), NOW - MIN, NOW).state).toBe('protected');
  });

  it('stopped: the monitor says so, or its last tick is stale against the receive time', () => {
    expect(deviceHealth(status({ serviceRunning: false }), NOW - MIN, NOW).state).toBe('stopped');
    const received = NOW - MIN;
    expect(
      deviceHealth(status({ lastTickAt: received - DEVICE_HEALTH_THRESHOLDS.tickStaleMs - 1 }), received, NOW).state,
    ).toBe('stopped');
    expect(deviceHealth(status({ lastTickAt: received - MIN }), received, NOW).state).toBe('protected');
  });

  it('behind: applied and latest versions both known and different', () => {
    expect(deviceHealth(status({ appliedSettingsVersion: 5 }), NOW - MIN, NOW, { latestSettingsVersion: 6 }).state).toBe(
      'behind',
    );
    // Lower on the server (a restore) is still not the same settings.
    expect(deviceHealth(status({ appliedSettingsVersion: 7 }), NOW - MIN, NOW, { latestSettingsVersion: 6 }).state).toBe(
      'behind',
    );
    expect(deviceHealth(status({ appliedSettingsVersion: 6 }), NOW - MIN, NOW, { latestSettingsVersion: 6 }).state).toBe(
      'protected',
    );
    // Unknown on either side is not behind: an old build, or a device that never fetched settings.
    expect(deviceHealth(status({ appliedSettingsVersion: -1 }), NOW - MIN, NOW, { latestSettingsVersion: 6 }).state).toBe(
      'protected',
    );
    expect(deviceHealth(status({ appliedSettingsVersion: 5 }), NOW - MIN, NOW).state).toBe('protected');
  });

  it("can't block: no usage access anywhere, or no overlay on a phone", () => {
    expect(
      deviceHealth(status({ permissions: { usageAccess: false } as any }), NOW - MIN, NOW),
    ).toMatchObject({ state: 'cant-block', missingPermission: 'usageAccess' });
    expect(
      deviceHealth(status({ permissions: { usageAccess: true, overlay: false } as any }), NOW - MIN, NOW),
    ).toMatchObject({ state: 'cant-block', missingPermission: 'overlay' });
  });

  it('web time not reported only once a device sends the seed age and it is stale', () => {
    expect(
      deviceHealth(status({ usageSeedAgeMs: DEVICE_HEALTH_THRESHOLDS.usageSeedStaleMs + 1 }), NOW - MIN, NOW).state,
    ).toBe('web-time-not-reported');
    expect(deviceHealth(status(), NOW - MIN, NOW).state).toBe('protected');
  });

  it('a computer with no browser open is a fact, never "removed", and not a fault', () => {
    const mac = status({ platform: 'macos', bridgeLive: false, mainAppPresent: false });
    expect(deviceHealth(mac, NOW - MIN, NOW)).toMatchObject({
      state: 'protected',
      noBrowserAttached: true,
      kindredlyMissing: false,
    });
  });

  it('a phone Kindredly was removed from says so as a fact', () => {
    expect(deviceHealth(status({ mainAppPresent: false }), NOW - MIN, NOW)).toMatchObject({ kindredlyMissing: true });
  });

  it('worst of several devices wins', () => {
    const ok = deviceHealth(status(), NOW - MIN, NOW);
    const stopped = deviceHealth(status({ serviceRunning: false }), NOW - MIN, NOW);
    expect(worstDeviceHealth([ok, stopped])?.state).toBe('stopped');
    expect(worstDeviceHealth([])).toBeNull();
  });
});
