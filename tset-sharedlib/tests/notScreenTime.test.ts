import { compileNotCountedAppIds, isNotScreenTimeApp, NOT_SCREEN_TIME_ANDROID } from '../src/deviceguard/notScreenTime';

/** The Clock, calls, Settings, the keyboard, Calculator and Camera count toward no limit (HAT-952). */
const filedCamera = {
  version: 1,
  blockedCategories: [],
  entries: { 'com.google.android.GoogleCamera': { pkg: 'com.google.android.GoogleCamera', eduValue: 'eduval_fun', updatedAt: 1 } },
  updatedAt: 1,
} as any;

describe('not screen time (HAT-952)', () => {
  it('covers the listed apps and whatever the phone names as its clock, only on Android', () => {
    expect(isNotScreenTimeApp({ pkg: 'com.google.android.deskclock' })).toBe(true);
    expect(isNotScreenTimeApp({ pkg: 'com.vendor.clock', notScreenTime: true })).toBe(true);
    expect(isNotScreenTimeApp({ pkg: 'com.roblox.client' })).toBe(false);
    expect(isNotScreenTimeApp({ pkg: 'com.google.android.deskclock', platform: 'macos' })).toBe(false);
  });

  it('counts an app again once the parent gives it a usage type', () => {
    expect(isNotScreenTimeApp({ pkg: 'com.google.android.GoogleCamera' }, filedCamera)).toBe(false);
    const ids = compileNotCountedAppIds([{ pkg: 'com.vendor.clock', label: 'Clock', notScreenTime: true }], filedCamera);
    expect(ids).toContain('com.vendor.clock');
    expect(ids).toContain('com.google.android.deskclock');
    expect(ids).not.toContain('com.google.android.GoogleCamera');
    expect(ids).toEqual([...ids].sort());
  });

  it('leaves out an uninstalled app the phone had named, and lists each package once', () => {
    const ids = compileNotCountedAppIds([
      { pkg: 'com.vendor.clock', label: 'Clock', notScreenTime: true, removed: true },
      { pkg: 'com.google.android.deskclock', label: 'Clock', notScreenTime: true },
    ]);
    expect(ids).not.toContain('com.vendor.clock');
    expect(ids.length).toBe(new Set(NOT_SCREEN_TIME_ANDROID).size);
  });
});
