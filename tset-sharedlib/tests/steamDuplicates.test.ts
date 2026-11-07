import { isInsideFolder, steamTitleKey, withoutSteamDuplicates } from '../src/deviceguard/steamDuplicates';

type App = { pkg: string; label: string; platform: string; path?: string; hint?: string };
const isSteam = (app: App) => app.platform === 'steam';

describe('Steam games listed twice (HAT-1045)', () => {
  it("drops Ubuntu's desktop shortcut that has the game's name and the Game tag", () => {
    const apps: App[] = [
      { pkg: '214490', label: 'Alien: Isolation', platform: 'steam', path: '/home/aidyn/.steam/steam/steamapps/common/Alien Isolation', hint: 'game' },
      { pkg: 'Alien Isolation', label: 'Alien: Isolation', platform: 'linux', path: '/home/aidyn/.local/share/applications/Alien Isolation.desktop', hint: 'game' },
      { pkg: 'org.gnome.Mines', label: 'Mines', platform: 'linux', hint: 'game' },
    ];
    expect(withoutSteamDuplicates(apps, isSteam).map((a) => a.pkg)).toEqual(['214490', 'org.gnome.Mines']);
  });

  it("drops a Windows shortcut whose program is inside the game's install folder, whatever the case", () => {
    const apps: App[] = [
      { pkg: '620', label: 'Portal 2', platform: 'steam', path: 'c:\\program files (x86)\\steam\\steamapps\\common\\Portal 2', hint: 'game' },
      { pkg: 'portal2', label: 'Portal 2', platform: 'windows', path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Portal 2\\portal2.exe' },
      { pkg: 'steam', label: 'Steam', platform: 'windows', path: 'C:\\Program Files (x86)\\Steam\\steam.exe' },
    ];
    expect(withoutSteamDuplicates(apps, isSteam).map((a) => a.pkg)).toEqual(['620', 'steam']);
  });

  it('keeps a native app of the same name that is not filed as a game', () => {
    const apps: App[] = [
      { pkg: '365670', label: 'Blender', platform: 'steam', path: '/home/a/.steam/steam/steamapps/common/Blender', hint: 'game' },
      { pkg: 'blender', label: 'Blender', platform: 'linux', path: '/usr/share/applications/blender.desktop' },
    ];
    expect(withoutSteamDuplicates(apps, isSteam)).toHaveLength(2);
  });

  it('keeps "Portal 2" when only "Portal" is installed, and leaves a list with no Steam game alone', () => {
    const apps: App[] = [
      { pkg: '400', label: 'Portal', platform: 'steam', path: '/s/steamapps/common/Portal', hint: 'game' },
      { pkg: 'portal2', label: 'Portal 2', platform: 'linux', path: '/s/steamapps/common/Portal 2/portal2.sh', hint: 'game' },
    ];
    expect(withoutSteamDuplicates(apps, isSteam)).toHaveLength(2);
    const noSteam = [apps[1]];
    expect(withoutSteamDuplicates(noSteam, isSteam)).toEqual(noSteam);
  });

  it('compares names without case, marks or punctuation, and folders by either separator', () => {
    expect(steamTitleKey('Portal™ 2')).toBe('portal 2');
    expect(steamTitleKey('Pokémon: Legends')).toBe('pokemon legends');
    expect(isInsideFolder('/a/Portal 2/x', '/a/Portal')).toBe(false);
    expect(isInsideFolder('/a/Portal/x', '/a/Portal/')).toBe(true);
    expect(isInsideFolder('C:/Games/Portal/p.exe', 'c:\\games\\portal')).toBe(true);
    expect(isInsideFolder('', '/a')).toBe(false);
  });
});
