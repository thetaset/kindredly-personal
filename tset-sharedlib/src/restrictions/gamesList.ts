/**
 * The games list (HAT-634 step 3, docs/proposals/games-as-content.md): each game children play most,
 * with its sites and its app on each platform, so one limit counts a game in the browser, on the
 * phone and on the computer together.
 *
 * A limit names a game with a `game` condition whose values are ids from this list. The web matcher
 * (`ActivityUtils.checkConditionList`) counts a page on one of its sites, and an app session whose
 * app is one of its apps; the device rule compiler hands its apps to the Companion. Editing an entry
 * changes what every limit on that game counts, so add only ids that are certain.
 *
 * App ids are rule ids (`toDeviceAppId`): an Android package, a Mac bundle id, a Windows program name
 * (lower case, no `.exe`), a Linux desktop id, or `steam:<app id>` for a game run from Steam on any
 * computer. iPhone apps are named by a Screen Time selection, not an id, so none are listed.
 */
import { parseDeviceAppId, platformPrefixOf, toDeviceAppId } from './deviceAppIds'

/** A limit condition naming games from this list. */
export const GAME_CONDITION_TYPE = 'game'

export type GameEntry = {
  id: string
  name: string
  /** Other names a parent might use ("GTA", "Wild Rift"). */
  aliases?: string[]
  /** Domains, each with its subdomains. */
  sites: string[]
  /** Rule ids of its apps on each platform. */
  apps: string[]
}

export const GAMES_LIST: GameEntry[] = [
  {
    id: 'roblox',
    name: 'Roblox',
    sites: ['roblox.com'],
    apps: ['android:com.roblox.client', 'macos:com.roblox.RobloxPlayer', 'windows:robloxplayerbeta', 'linux:org.vinegarhq.Sober'],
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    sites: ['minecraft.net'],
    apps: [
      'android:com.mojang.minecraftpe',
      'macos:com.mojang.minecraftlauncher',
      'windows:minecraft.windows',
      'windows:minecraftlauncher',
      'windows:minecraft',
      'linux:minecraft-launcher',
      'linux:com.mojang.Minecraft',
      'linux:org.prismlauncher.PrismLauncher',
    ],
  },
  { id: 'fortnite', name: 'Fortnite', sites: ['fortnite.com'], apps: ['android:com.epicgames.fortnite', 'windows:fortniteclient-win64-shipping'] },
  { id: 'among-us', name: 'Among Us', sites: [], apps: ['android:com.innersloth.spacemafia', 'steam:945360'] },
  { id: 'brawl-stars', name: 'Brawl Stars', sites: [], apps: ['android:com.supercell.brawlstars'] },
  { id: 'clash-of-clans', name: 'Clash of Clans', sites: [], apps: ['android:com.supercell.clashofclans'] },
  { id: 'clash-royale', name: 'Clash Royale', sites: [], apps: ['android:com.supercell.clashroyale'] },
  { id: 'candy-crush', name: 'Candy Crush', sites: [], apps: ['android:com.king.candycrushsaga', 'android:com.king.candycrushsodafarm'] },
  { id: 'subway-surfers', name: 'Subway Surfers', sites: [], apps: ['android:com.kiloo.subwaysurf'] },
  { id: 'call-of-duty-mobile', name: 'Call of Duty: Mobile', aliases: ['Call of Duty', 'COD Mobile'], sites: [], apps: ['android:com.activision.callofduty.shooter'] },
  { id: 'free-fire', name: 'Free Fire', sites: [], apps: ['android:com.dts.freefireth'] },
  { id: 'pubg', name: 'PUBG', aliases: ['PUBG Mobile', 'PUBG: Battlegrounds'], sites: [], apps: ['android:com.tencent.ig', 'steam:578080'] },
  { id: '8-ball-pool', name: '8 Ball Pool', sites: [], apps: ['android:com.miniclip.eightballpool'] },
  { id: 'homescapes', name: 'Homescapes', sites: [], apps: ['android:com.playrix.homescapes'] },
  { id: 'gardenscapes', name: 'Gardenscapes', sites: [], apps: ['android:com.playrix.gardenscapes'] },
  { id: 'pokemon-go', name: 'Pokémon GO', aliases: ['Pokemon GO'], sites: [], apps: ['android:com.nianticlabs.pokemongo'] },
  { id: 'fruit-ninja', name: 'Fruit Ninja', sites: [], apps: ['android:com.halfbrick.fruitninjafree'] },
  { id: 'my-talking-tom-friends', name: 'My Talking Tom Friends', aliases: ['Talking Tom'], sites: [], apps: ['android:com.outfit7.mytalkingtomfriends'] },
  { id: 'ea-sports-fc-mobile', name: 'EA Sports FC Mobile', aliases: ['FIFA Mobile', 'FC Mobile'], sites: [], apps: ['android:com.ea.gp.fifamobile'] },
  { id: 'monopoly-go', name: 'Monopoly GO', sites: [], apps: ['android:com.scopely.monopolygo'] },
  { id: 'geometry-dash', name: 'Geometry Dash', sites: [], apps: ['android:com.robtopx.geometryjump', 'steam:322170'] },
  { id: 'mobile-legends', name: 'Mobile Legends', sites: [], apps: ['android:com.mobile.legends'] },
  {
    id: 'league-of-legends',
    name: 'League of Legends',
    aliases: ['Wild Rift', 'LoL'],
    sites: ['leagueoflegends.com'],
    apps: ['android:com.riotgames.league.wildrift', 'windows:leagueclient'],
  },
  { id: 'angry-birds-2', name: 'Angry Birds 2', aliases: ['Angry Birds'], sites: [], apps: ['android:com.rovio.baba'] },
  { id: 'mario-kart-tour', name: 'Mario Kart Tour', sites: [], apps: ['android:com.nintendo.zaka'] },
  { id: 'chess-com', name: 'Chess.com', sites: ['chess.com'], apps: ['android:com.chess'] },
  // Played from Steam on a computer
  { id: 'terraria', name: 'Terraria', sites: [], apps: ['steam:105600'] },
  { id: 'stardew-valley', name: 'Stardew Valley', sites: [], apps: ['steam:413150'] },
  { id: 'rocket-league', name: 'Rocket League', sites: [], apps: ['steam:252950'] },
  { id: 'fall-guys', name: 'Fall Guys', sites: [], apps: ['steam:1097150'] },
  { id: 'counter-strike-2', name: 'Counter-Strike 2', aliases: ['Counter-Strike', 'CS2', 'CS:GO'], sites: [], apps: ['steam:730'] },
  { id: 'dota-2', name: 'Dota 2', sites: [], apps: ['steam:570'] },
  { id: 'team-fortress-2', name: 'Team Fortress 2', aliases: ['TF2'], sites: [], apps: ['steam:440'] },
  { id: 'apex-legends', name: 'Apex Legends', sites: [], apps: ['steam:1172470'] },
  { id: 'valheim', name: 'Valheim', sites: [], apps: ['steam:892970'] },
  { id: 'lethal-company', name: 'Lethal Company', sites: [], apps: ['steam:1966720'] },
  { id: 'gta-v', name: 'Grand Theft Auto V', aliases: ['GTA V', 'GTA 5', 'GTA'], sites: [], apps: ['steam:271590'] },
  { id: 'portal-2', name: 'Portal 2', sites: [], apps: ['steam:620'] },
  { id: 'garrys-mod', name: "Garry's Mod", aliases: ['Gmod'], sites: [], apps: ['steam:4000'] },
  { id: 'overwatch-2', name: 'Overwatch 2', aliases: ['Overwatch'], sites: [], apps: ['steam:2357570'] },
  { id: 'palworld', name: 'Palworld', sites: [], apps: ['steam:1623730'] },
  { id: 'hollow-knight', name: 'Hollow Knight', sites: [], apps: ['steam:367520'] },
  { id: 'undertale', name: 'Undertale', sites: [], apps: ['steam:391540'] },
  { id: 'phasmophobia', name: 'Phasmophobia', sites: [], apps: ['steam:739630'] },
  { id: 'brawlhalla', name: 'Brawlhalla', sites: [], apps: ['steam:291550'] },
  { id: 'warframe', name: 'Warframe', sites: [], apps: ['steam:230410'] },
  { id: 'the-sims-4', name: 'The Sims 4', aliases: ['Sims'], sites: [], apps: ['steam:1222670'] },
  { id: 'subnautica', name: 'Subnautica', sites: [], apps: ['steam:264710'] },
  { id: 'sea-of-thieves', name: 'Sea of Thieves', sites: [], apps: ['steam:1172620'] },
  { id: 'marvel-rivals', name: 'Marvel Rivals', sites: [], apps: ['steam:2767030'] },
  { id: 'baldurs-gate-3', name: "Baldur's Gate 3", aliases: ['BG3'], sites: [], apps: ['steam:1086940'] },
  // Played in a browser
  { id: 'survev', name: 'Survev.io', aliases: ['Surviv.io'], sites: ['survev.io', 'surviv.io'], apps: [] },
  { id: 'slither-io', name: 'Slither.io', sites: ['slither.io'], apps: ['android:air.com.hypah.io.slither'] },
  { id: 'krunker', name: 'Krunker', sites: ['krunker.io'], apps: [] },
  { id: 'shell-shockers', name: 'Shell Shockers', sites: ['shellshock.io'], apps: [] },
  { id: 'agar-io', name: 'Agar.io', sites: ['agar.io'], apps: [] },
  { id: 'bloxd-io', name: 'Bloxd.io', sites: ['bloxd.io'], apps: [] },
  { id: '1v1-lol', name: '1v1.LOL', sites: ['1v1.lol'], apps: [] },
  { id: 'smash-karts', name: 'Smash Karts', sites: ['smashkarts.io'], apps: [] },
  { id: 'skribbl-io', name: 'Skribbl.io', sites: ['skribbl.io'], apps: [] },
  { id: 'geoguessr', name: 'GeoGuessr', sites: ['geoguessr.com'], apps: [] },
  { id: 'animal-jam', name: 'Animal Jam', sites: ['animaljam.com'], apps: [] },
  { id: 'prodigy', name: 'Prodigy', sites: ['prodigygame.com'], apps: [] },
]

const BY_ID = new Map(GAMES_LIST.map((game) => [game.id, game]))

/** Lower case, letters and digits only: "Pokémon GO" and "pokemon-go" are the same name. */
function nameKey(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function gameById(id: string | null | undefined): GameEntry | undefined {
  return id ? BY_ID.get(id) : undefined
}

/** The game a parent named: its name, another name for it, its id, or one of its sites. Never a guess. */
export function findGameByName(query: string | null | undefined): GameEntry | undefined {
  const raw = String(query || '').trim()
  const key = nameKey(raw)
  if (!key) return undefined
  const named = GAMES_LIST.find((game) => [game.name, game.id, ...(game.aliases ?? [])].some((n) => nameKey(n) === key))
  if (named) return named
  const host = raw.toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]
  return GAMES_LIST.find((game) => game.sites.some((site) => host === site || host.endsWith(`.${site}`)))
}

/** Games whose name or another name holds the query, those that start with it first, for a picker. */
export function searchGames(query: string, limit = 8): GameEntry[] {
  const key = nameKey(query)
  if (!key) return []
  const names = (game: GameEntry) => [game.name, ...(game.aliases ?? [])].map(nameKey)
  const starts = GAMES_LIST.filter((game) => names(game).some((n) => n.startsWith(key)))
  const holds = GAMES_LIST.filter((game) => !starts.includes(game) && names(game).some((n) => n.includes(key)))
  return [...starts, ...holds].slice(0, limit)
}

/** `steam:620` inside a Mac's inventory arrives as `macos:steam:620`; both are the Steam id. */
function canonicalAppId(appId: string): string {
  const { platform, pkg } = parseDeviceAppId(appId)
  if (!platform) return pkg
  const inner = platformPrefixOf(pkg)
  return inner ? toDeviceAppId(inner, pkg.slice(inner.length + 1)) : toDeviceAppId(platform, pkg)
}

/** Whether an app session's app is one of this game's apps. */
export function isAppOfGame(game: GameEntry, appId: string | null | undefined): boolean {
  if (!appId) return false
  const id = canonicalAppId(appId)
  return game.apps.some((app) => canonicalAppId(app) === id)
}

/** Whether a page's host is one of this game's sites. */
export function isHostOfGame(game: GameEntry, hostname: string | null | undefined): boolean {
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '')
  return !!host && game.sites.some((site) => host === site || host.endsWith(`.${site}`))
}

/** The games a rule's `game` conditions name, unknown ids left out. */
export function gamesInConditions(conditions: Array<{ type?: string; values?: string[] }> | null | undefined): GameEntry[] {
  return (conditions ?? [])
    .filter((c) => c?.type === GAME_CONDITION_TYPE)
    .flatMap((c) => c.values ?? [])
    .map((id) => gameById(id))
    .filter((game): game is GameEntry => !!game)
}
