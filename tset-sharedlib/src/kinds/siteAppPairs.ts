/**
 * Well-known services that are both a website and a phone app.
 *
 * For GROUPING only (BTL-4): the "Block a site or app" search puts youtube.com and the YouTube app
 * under one heading so a parent can see they are two things, and choose each separately (decision
 * D1 — blocking the app leaves the site open, where Kindredly still filters it). Nothing here
 * blocks anything, and nothing is guessed: a service missing from this list is still reachable as a
 * typed address or as an installed app, just without the pairing.
 *
 * Packages are Android package names, the id Guard enforces by. Keep the list short and certain.
 */
export type SiteAppPair = {
  /** The name a parent searches for. */
  service: string
  /** The site, as a family rule stores a domain target. */
  domain: string
  /** Android packages for the same service. */
  packages: string[]
}

export const SITE_APP_PAIRS: SiteAppPair[] = [
  { service: 'YouTube', domain: 'youtube.com', packages: ['com.google.android.youtube'] },
  { service: 'TikTok', domain: 'tiktok.com', packages: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill'] },
  { service: 'Instagram', domain: 'instagram.com', packages: ['com.instagram.android'] },
  { service: 'Snapchat', domain: 'snapchat.com', packages: ['com.snapchat.android'] },
  { service: 'Facebook', domain: 'facebook.com', packages: ['com.facebook.katana'] },
  { service: 'X', domain: 'x.com', packages: ['com.twitter.android'] },
  { service: 'Reddit', domain: 'reddit.com', packages: ['com.reddit.frontpage'] },
  { service: 'Pinterest', domain: 'pinterest.com', packages: ['com.pinterest'] },
  { service: 'Discord', domain: 'discord.com', packages: ['com.discord'] },
  { service: 'Roblox', domain: 'roblox.com', packages: ['com.roblox.client'] },
  { service: 'Twitch', domain: 'twitch.tv', packages: ['tv.twitch.android.app'] },
  { service: 'Netflix', domain: 'netflix.com', packages: ['com.netflix.mediaclient'] },
  { service: 'Spotify', domain: 'spotify.com', packages: ['com.spotify.music'] },
  { service: 'WhatsApp', domain: 'whatsapp.com', packages: ['com.whatsapp'] },
]

/** The pair a package belongs to, if it is a well-known one. */
export function siteAppPairForPackage(pkg: string | null | undefined): SiteAppPair | undefined {
  if (!pkg) return undefined
  return SITE_APP_PAIRS.find((pair) => pair.packages.includes(pkg))
}

/** The pair a domain belongs to, subdomains included (m.youtube.com → YouTube). */
export function siteAppPairForDomain(domain: string | null | undefined): SiteAppPair | undefined {
  const host = String(domain || '').toLowerCase().replace(/^www\./, '')
  if (!host) return undefined
  return SITE_APP_PAIRS.find((pair) => host === pair.domain || host.endsWith(`.${pair.domain}`))
}
