/**
 * A Steam game listed a second time under another id (HAT-320, HAT-1045).
 *
 * A device lists each Steam game as `steam:<appid>`, which is the id a block names and the id the
 * Companion records the running game under. The same game can also turn up as an ordinary app on
 * that device: Ubuntu's desktop shortcut for it, a Windows Start menu shortcut to its program inside
 * `steamapps\common`, or the game's own `.app` copied into Applications. The parent's App controls
 * then showed both, side by side under Games, and blocking the second one did nothing.
 *
 * One rule for both places that read a list: the Companion's own scan (so a new-app notice does not
 * name a game twice) and the parent's merge (so a list stored before this rule clears at once,
 * without waiting for that computer to send its list again). Within ONE device's list only: a
 * computer and a phone can both have a game of the same name, and those are two installs.
 *
 * An app is the game's second listing when either
 *  - its path is inside the game's install folder, or
 *  - it is tagged a game and has the game's name. The tag keeps a native Blender from folding into
 *    Steam's Blender: Ubuntu's Blender is filed under Graphics, Steam's shortcut for it under Game.
 */

export type SteamFoldable = { pkg: string; label?: string; path?: string; hint?: string }

/** A game's name compared without case, marks or punctuation: "Portal™ 2" is "portal 2". */
export function steamTitleKey(label: string | undefined): string {
  // The marks go first: NFKD spells ™ as the letters "TM".
  return String(label || '')
    .replace(/[™®©]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Is `child` inside the folder `parent`? Either separator, and a Windows path (`C:\…`) without regard
 * to case, as Windows compares it. The separator after the folder is what keeps "Portal" from
 * containing "Portal 2".
 */
export function isInsideFolder(child: string | undefined, parent: string | undefined): boolean {
  let c = String(child || '').trim()
  let p = String(parent || '').trim()
  if (!c || !p) return false
  const windows = /^[a-zA-Z]:[\\/]/.test(p) || /^[a-zA-Z]:[\\/]/.test(c)
  c = c.replace(/\\/g, '/')
  p = p.replace(/\\/g, '/').replace(/\/+$/, '')
  if (windows) {
    c = c.toLowerCase()
    p = p.toLowerCase()
  }
  return Boolean(p) && (c === p || c.startsWith(`${p}/`))
}

/**
 * One device's apps without the second listings of its Steam games. `isSteam` says which entries are
 * the games: a scan marks them with `platform: 'steam'`, a stored list with a `steam:` package.
 * The input order is kept; nothing is dropped when the device has no Steam game.
 */
export function withoutSteamDuplicates<T extends SteamFoldable>(apps: readonly T[], isSteam: (app: T) => boolean): T[] {
  const games = apps.filter(isSteam)
  if (!games.length) return [...apps]
  const folders = games.map((g) => String(g.path || '').trim()).filter(Boolean)
  const titles = new Set(games.map((g) => steamTitleKey(g.label)).filter(Boolean))
  return apps.filter((app) => {
    if (isSteam(app)) return true
    if (app.path && folders.some((folder) => isInsideFolder(app.path, folder))) return false
    if (app.hint === 'game' && titles.has(steamTitleKey(app.label))) return false
    return true
  })
}
