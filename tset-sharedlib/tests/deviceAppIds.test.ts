import {
  deviceAppMarkerUrl,
  isDesktopPlatform,
  parseDeviceAppId,
  parseDeviceAppMarkerUrl,
  platformPrefixOf,
  toDeviceAppId,
} from '../src/restrictions/deviceAppIds';
import { ALL_DEVICE_APPS } from '../src/types/device-guard.types';

describe('device app ids', () => {
  it('round-trips every platform and keeps the historical android shape', () => {
    expect(toDeviceAppId('android', 'com.roblox.client')).toBe('android:com.roblox.client');
    expect(toDeviceAppId('macos', 'com.valvesoftware.steam')).toBe('macos:com.valvesoftware.steam');
    expect(parseDeviceAppId('macos:com.valvesoftware.steam')).toEqual({ platform: 'macos', pkg: 'com.valvesoftware.steam' });
    expect(parseDeviceAppId('steam:620')).toEqual({ platform: 'steam', pkg: '620' });
    expect(parseDeviceAppId('ios:selection:abc-123')).toEqual({ platform: 'ios', pkg: 'selection:abc-123' });
  });

  it('treats a bare package (pre-platform rule) as android and the sentinel as platform-less', () => {
    expect(parseDeviceAppId('com.roblox.client')).toEqual({ platform: 'android', pkg: 'com.roblox.client' });
    expect(parseDeviceAppId(ALL_DEVICE_APPS)).toEqual({ platform: null, pkg: ALL_DEVICE_APPS });
    expect(parseDeviceAppId('')).toEqual({ platform: null, pkg: '' });
  });

  it('builds and parses marker urls, encoding odd package characters', () => {
    const url = deviceAppMarkerUrl('windows', 'steam.exe');
    expect(url).toBe('https://kindredly.ai/device-app/windows/steam.exe');
    expect(parseDeviceAppMarkerUrl(url)).toEqual({ platform: 'windows', pkg: 'steam.exe' });
    expect(parseDeviceAppMarkerUrl('https://kindredly.ai/device-app/android/com.x.y?utm=1')).toEqual({ platform: 'android', pkg: 'com.x.y' });
    expect(parseDeviceAppMarkerUrl('https://kindredly.ai/app/foo')).toBeNull();
    expect(parseDeviceAppMarkerUrl('https://kindredly.ai/device-app/nope/x')).toBeNull();
  });

  it('knows which platforms are computers', () => {
    expect(isDesktopPlatform('macos')).toBe(true);
    expect(isDesktopPlatform('android')).toBe(false);
    expect(isDesktopPlatform(undefined)).toBe(false);
  });
});

/**
 * An inventory reports bare packages and says once which platform it is. The exception is a Steam
 * game, which the Companion namespaces itself because the game is governed as a Steam app whatever
 * computer it runs on — so a prefix that IS a platform must win over the reporter's own.
 */
describe('platformPrefixOf', () => {
  it('reports only an explicit platform prefix, and never guesses one', () => {
    expect(platformPrefixOf('steam:620')).toBe('steam');
    expect(platformPrefixOf('macos:com.valvesoftware.steam')).toBe('macos');
    expect(platformPrefixOf('com.roblox.client')).toBeNull();
    expect(platformPrefixOf('notaplatform:thing')).toBeNull();
    expect(platformPrefixOf('')).toBeNull();
  });
});
