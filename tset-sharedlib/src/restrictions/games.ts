/**
 * Games as a kind of content (HAT-634, docs/proposals/games-as-content.md).
 *
 * The Games limit is a pinned limit, like Video: one `attribute` condition whose value is `game`.
 * - On the web it matches a page on one of the sites below. Decided 2026-10-19: Kindredly's list
 *   only, the AI's `ct_game` tag later, so nothing is a game by a wrong guess. A site that is not
 *   listed still counts as whatever category it already has (usually Entertainment).
 * - On phones and computers the rule compiler turns it into every app of the Games app type
 *   (`deviceRuleCompiler.expandGameAppIds`), as Social media's condition becomes the Social apps.
 * - Every game counts, educational ones too (decided 2026-10-19); a parent can make one Always allowed.
 */

/** The activity attribute the Games limit matches: a page or app that is a game. */
export const GAME_ATTRIBUTE = 'game'

/**
 * Sites that are games, or are where a game is played: browser-game sites, the `.io` games, and the
 * web home of games children play as apps. Each covers its subdomains (`*.itch.io`).
 *
 * Left out on purpose: classroom quiz games (Kahoot, Blooket, Gimkit), which schools set as work,
 * and sites that only sell or discuss games among other things.
 */
export const GAME_SITE_DOMAINS = [
  // Browser-game sites
  'poki.com',
  'crazygames.com',
  'coolmathgames.com',
  'miniclip.com',
  'kongregate.com',
  'armorgames.com',
  'addictinggames.com',
  'y8.com',
  'friv.com',
  'kizi.com',
  'agame.com',
  'silvergames.com',
  'lagged.com',
  'gamepix.com',
  'gamejolt.com',
  'itch.io',
  'girlsgogames.com',
  'iogames.space',
  'mathplayground.com',
  'abcya.com',
  'funbrain.com',
  'prodigygame.com',
  'nitrotype.com',
  'geoguessr.com',
  'chess.com',
  'lichess.org',
  // .io and other browser games
  'survev.io',
  'surviv.io',
  'slither.io',
  'agar.io',
  'diep.io',
  'krunker.io',
  'shellshock.io',
  'paper-io.com',
  'paperio.site',
  'hole-io.com',
  'zombsroyale.io',
  'moomoo.io',
  'skribbl.io',
  'smashkarts.io',
  'bloxd.io',
  'venge.io',
  'ev.io',
  '1v1.lol',
  'narrow.one',
  'tetr.io',
  'jstris.jezevec10.com',
  'powerline.io',
  'wormate.io',
  // Games children mostly play as apps, at their web homes
  'roblox.com',
  'minecraft.net',
  'fortnite.com',
  'animaljam.com',
  'neopets.com',
  'poptropica.com',
  'wizard101.com',
] as const

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/** The listed game site a host belongs to, or null. */
export function gameSiteForHost(hostname: string | null | undefined): string | null {
  if (!hostname) return null
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return (GAME_SITE_DOMAINS as readonly string[]).find((d) => host === d || host.endsWith(`.${d}`)) ?? null
}

/** Whether an address is on a listed game site. */
export function isGameUrl(url: string | null | undefined): boolean {
  return gameSiteForHost(hostOf(url)) !== null
}

/** Whether a rule's conditions include the Games attribute. */
export function hasGameAttribute(conditions: Array<{ type?: string; values?: string[] }> | null | undefined): boolean {
  return (conditions ?? []).some((c) => c?.type === 'attribute' && (c.values ?? []).includes(GAME_ATTRIBUTE))
}
