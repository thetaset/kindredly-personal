import { newAppsWaiting, withNewAppsBlocked } from '../src/deviceguard/newApps';

/** NAP-6: New apps start blocked. */
describe('new apps that wait for a guardian', () => {
  const base = { version: 1 as const, blockedCategories: [] as string[], entries: {}, updatedAt: 1 };
  const apps = [
    { pkg: 'org.gnome.Mines', label: 'Mines', platform: 'linux' as any, firstSeenAt: 1_000 },
    { pkg: 'discord', label: 'Discord', platform: 'linux' as any, firstSeenAt: 5_000 },
    { pkg: '945360', label: 'Among Us', platform: 'steam' as any, firstSeenAt: 6_000 },
    { pkg: 'org.gnome.Settings', label: 'Settings', platform: 'linux' as any, firstSeenAt: 6_000, isSystem: true },
    { pkg: 'gone', label: 'Gone', platform: 'linux' as any, firstSeenAt: 6_000, removed: true },
  ];

  it('blocks nothing while the switch is off', () => {
    expect(newAppsWaiting(apps, base)).toEqual([]);
    expect(withNewAppsBlocked(undefined, apps, base)).toBeUndefined();
  });

  it("blocks what arrived after the switch and after the device's first list, and nothing that came with it", () => {
    expect(newAppsWaiting(apps, {...base, newAppsBlockedAt: 2_000})).toEqual(['linux:discord', 'steam:945360']);
    // Turned on after Discord arrived: Discord opens, as it did.
    expect(newAppsWaiting(apps, {...base, newAppsBlockedAt: 5_500})).toEqual(['steam:945360']);
  });

  it('stops once a guardian blocks, allows, leaves it open, or marks all seen', () => {
    const on = {...base, newAppsBlockedAt: 2_000};
    expect(newAppsWaiting(apps, {...on, seenApps: {'steam:945360': 7_000}})).toEqual(['linux:discord']);
    expect(newAppsWaiting(apps, {...on, entries: {'linux:discord': {pkg: 'discord', decision: 'allow', updatedAt: 7_000}}})).toEqual(['steam:945360']);
    expect(newAppsWaiting(apps, {...on, reviewedAt: 6_500})).toEqual([]);
  });

  it("never blocks a phone's own screens", () => {
    const phone = [
      { pkg: 'com.x', label: 'X', firstSeenAt: 1 },
      { pkg: 'com.google.android.deskclock', label: 'Clock', firstSeenAt: 9 },
      { pkg: 'com.roblox.client', label: 'Roblox', firstSeenAt: 9 },
    ];
    expect(newAppsWaiting(phone, {...base, newAppsBlockedAt: 2})).toEqual(['android:com.roblox.client']);
  });

  it('adds the waiting apps to the compiled blocks, by each spelling, and names them', () => {
    const compiled = withNewAppsBlocked({blocked: ['com.tiktok'], scopedBlocked: ['android:com.tiktok']}, apps, {...base, newAppsBlockedAt: 2_000});
    expect(compiled).toEqual({
      blocked: ['com.tiktok', 'linux:discord', 'steam:945360'],
      scopedBlocked: ['android:com.tiktok', 'linux:discord', 'steam:945360'],
      newApps: ['linux:discord', 'steam:945360'],
    });
  });

  it('names only the apps blocked for nothing but being new', () => {
    const compiled = withNewAppsBlocked({blocked: ['linux:discord'], scopedBlocked: ['linux:discord']}, apps, {...base, newAppsBlockedAt: 2_000});
    expect(compiled?.newApps).toEqual(['steam:945360']);
    const allBlocked = {blocked: ['linux:discord', 'steam:945360'], scopedBlocked: ['linux:discord', 'steam:945360']};
    expect(withNewAppsBlocked(allBlocked, apps, {...base, newAppsBlockedAt: 2_000})).toBe(allBlocked);
  });

  // NAP-8: a phone's app arrives when Android says it was installed; Guard keeps no list.
  it("reads a phone app's install time over its first sighting", () => {
    const phone = [
      { pkg: 'com.whatsapp', label: 'WhatsApp', firstSeenAt: 1_000, installedAt: 500 },
      // Installed after the switch, seen by Kindredly's list read later still.
      { pkg: 'com.roblox.client', label: 'Roblox', firstSeenAt: 9_000, installedAt: 3_000 },
      // Installed before the switch, first read after it: it opens, as Guard decides.
      { pkg: 'com.duolingo', label: 'Duolingo', firstSeenAt: 9_000, installedAt: 1_500 },
    ];
    expect(newAppsWaiting(phone, {...base, newAppsBlockedAt: 2_000})).toEqual(['android:com.roblox.client']);
  });

  it('reads a Steam game stored under a computer list as steam:<appid>', () => {
    const stored = [
      { pkg: 'mines', label: 'Mines', firstSeenAt: 1 },
      { pkg: 'steam:945360', label: 'Among Us', firstSeenAt: 9 },
    ];
    expect(newAppsWaiting(stored as any, {...base, newAppsBlockedAt: 2})).toEqual(['steam:945360']);
  });
});
