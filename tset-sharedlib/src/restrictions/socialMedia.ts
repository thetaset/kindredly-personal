/**
 * Block social media (SMB, docs/plans/social-media-and-shared-links-plan.md).
 *
 * One setting per person, on `user.options.socialMedia`: whether social media sites and apps are
 * blocked, and the social sites that open anyway (Exceptions). Its own options key, like Always
 * allowed, so the limits editor's whole-object saves cannot drop it.
 *
 * This file also says what social media is, for the block and for counting time:
 * - **A social site** is a host on `SOCIAL_MEDIA_DOMAINS`, a subdomain of one, or a Google Translate
 *   copy of one (`www-tiktok-com.translate.goog`), plus YouTube Shorts (`youtube.com/shorts/…`).
 * - **A specific link** is one post or one video on a social site (`tiktok.com/@u/video/123`), and
 *   the same post's embed page (`tiktok.com/embed/v2/123`). Everything else on a social site — its
 *   home, a feed, a profile, a hashtag, a subreddit, search — is **the site**.
 * - **A short link** (`vm.tiktok.com/…`, `pin.it/…`) says nothing until it is followed, so it is
 *   neither until resolved.
 */
import { SOCIAL_MEDIA_DOMAINS } from '../url.utils'
import type { LimitRule } from '../types/usage-limits.types'

export type SocialMediaSettings = {
  /** Social media sites and apps are blocked. Off: they open, under the Social media time limit. */
  blocked: boolean
  /** Social sites that open while the block is on: `tiktok.com`, or a part of one, `reddit.com/r/x`. */
  exceptions: string[]
  /**
   * Said once on the Social media page after a child's older rules were mapped to the setting
   * (SMB-16): `sites` when only the apps were blocked before and now the sites are too, `apps` the
   * other way round. Saving the page without it clears it.
   */
  notice?: 'sites' | 'apps'
}

export const SOCIAL_MEDIA_EXCEPTIONS_MAX = 50
const EXCEPTION_MAX_LENGTH = 300

/** The daily limit filled in when a guardian turns the block off (D6). */
export const SOCIAL_MEDIA_DEFAULT_DAILY_MINUTES = 10

/** Whatever is stored, as settings; `null` when nothing usable is (a client then behaves as before). */
export function normalizeSocialMediaSettings(raw: unknown): SocialMediaSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  if (typeof input.blocked !== 'boolean') return null
  const exceptions: string[] = []
  const seen = new Set<string>()
  for (const value of Array.isArray(input.exceptions) ? input.exceptions : []) {
    const entry = normalizeExceptionEntry(value)
    if (!entry || seen.has(entry)) continue
    seen.add(entry)
    exceptions.push(entry)
    if (exceptions.length >= SOCIAL_MEDIA_EXCEPTIONS_MAX) break
  }
  const notice = input.notice === 'sites' || input.notice === 'apps' ? input.notice : null
  return { blocked: input.blocked, exceptions, ...(notice ? { notice } : {}) }
}

/** `https://www.Reddit.com/r/x/?a=1` → `reddit.com/r/x`. Only a social site makes an exception. */
export function normalizeExceptionEntry(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = parseWebUrl(value.slice(0, EXCEPTION_MAX_LENGTH))
  if (!url) return null
  const site = socialSiteForUrl(url)
  if (!site) return null
  const path = url.pathname.toLowerCase().replace(/\/+$/, '')
  return path ? `${site}${path}` : site
}

// ---------------------------------------------------------------------------
// What a social site is

/** Hosts that only redirect to a post on a social site. Followed before anything is decided. */
export const SOCIAL_SHORT_LINK_HOSTS = ['vm.tiktok.com', 'vt.tiktok.com', 'pin.it', 'fb.watch', 'fb.me', 'instagr.am', 'redd.it'] as const

/** One name per site, so `twitter.com` and `x.com` are the same site and `fb.com` is Facebook. */
const SITE_ALIASES: Record<string, string> = {
  'twitter.com': 'x.com',
  'fb.com': 'facebook.com',
  'fb.watch': 'facebook.com',
  'fb.me': 'facebook.com',
  'instagr.am': 'instagram.com',
  'redd.it': 'reddit.com',
  'threads.net': 'threads.com',
  'pin.it': 'pinterest.com',
  'bsky.social': 'bsky.app',
}

/** An http(s) address, with or without its scheme; `null` for anything else. */
function parseWebUrl(raw: string | null | undefined): URL | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

function cleanHost(hostname: string): string {
  return (hostname || '').toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
}

/** `www-tiktok-com.translate.goog` → `www.tiktok.com`; any other host unchanged. */
export function untranslatedHost(hostname: string): string {
  const host = cleanHost(hostname)
  const match = /^([a-z0-9-]+)\.translate\.goog$/.exec(host)
  if (!match) return host
  // Google writes `.` as `-` and a real `-` as `--`.
  return cleanHost(match[1].replace(/--/g, '\u0000').replace(/-/g, '.').replace(/\u0000/g, '-'))
}

/** The social site a host belongs to (`m.facebook.com` → `facebook.com`), or `null`. */
export function socialSiteForHost(hostname: string | null | undefined): string | null {
  if (!hostname) return null
  const host = untranslatedHost(hostname)
  const domain = (SOCIAL_MEDIA_DOMAINS as readonly string[]).find((d) => host === d || host.endsWith(`.${d}`))
  return domain ? SITE_ALIASES[domain] ?? domain : null
}

function isYouTubeHost(host: string): boolean {
  return host === 'youtube.com' || host.endsWith('.youtube.com')
}

/** The social site an address is on; on YouTube only Shorts are one. */
function socialSiteForUrl(url: URL): string | null {
  const host = untranslatedHost(url.hostname)
  if (isYouTubeHost(host)) return /^\/shorts(?:\/|$)/.test(url.pathname) ? 'youtube.com' : null
  return socialSiteForHost(host)
}

export type SocialUrlKind = 'post' | 'site' | 'shortLink'

export type SocialUrlInfo = {
  /** The site, one name each (`twitter.com` is `x.com`, `fb.com` is `facebook.com`); `youtube.com` for Shorts. */
  site: string
  kind: SocialUrlKind
  /** For a post: the id that stays the same across its page, its embed page and its share link. */
  postId?: string
  /** For a post: this address is its embed page. */
  isEmbed?: boolean
}

type PostRule = { re: RegExp; embed?: boolean; query?: string }

/** Share links that live on the site itself and only redirect to a post. */
const SHORT_LINK_PATHS: Record<string, RegExp> = {
  'tiktok.com': /^\/t\/[A-Za-z0-9]+/,
  'facebook.com': /^\/share\/(?:[a-z]\/)?[A-Za-z0-9]+/,
  'reddit.com': /^\/r\/[^/]+\/s\/[A-Za-z0-9]+/,
}

/** One post or one video, per site. The first capture group is the post's id. */
const POST_RULES: Record<string, PostRule[]> = {
  'tiktok.com': [
    { re: /^\/@[^/]+\/(?:video|photo)\/(\d+)/ },
    { re: /^\/embed\/v2\/(\d+)/, embed: true },
    { re: /^\/embed\/(\d+)/, embed: true },
    { re: /^\/player\/v1\/(\d+)/, embed: true },
  ],
  'instagram.com': [
    { re: /^\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/embed/, embed: true },
    { re: /^\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/ },
  ],
  'x.com': [{ re: /^\/[^/]+\/status\/(\d+)/ }],
  'facebook.com': [
    { re: /^\/groups\/[^/]+\/(?:posts|permalink)\/(\d+)/ },
    { re: /^\/[^/]+\/posts\/([^/?#]+)/ },
    { re: /^\/[^/]+\/videos\/(?:[^/]+\/)?(\d+)/ },
    { re: /^\/reel\/(\d+)/ },
    { re: /^\/watch\/?$/, query: 'v' },
    { re: /^\/(?:permalink|story)\.php$/, query: 'story_fbid' },
    { re: /^\/photo(?:\.php)?\/?$/, query: 'fbid' },
  ],
  'reddit.com': [
    { re: /^\/r\/[^/]+\/comments\/([a-z0-9]+)/i },
    { re: /^\/comments\/([a-z0-9]+)/i },
  ],
  'pinterest.com': [{ re: /^\/pin\/(\d+)/ }],
  'threads.com': [{ re: /^\/@[^/]+\/post\/([A-Za-z0-9_-]+)/ }],
  'bsky.app': [{ re: /^\/profile\/[^/]+\/post\/([a-z0-9]+)/i }],
  'linkedin.com': [
    { re: /^\/posts\/([^/?#]+)/ },
    { re: /^\/feed\/update\/(urn:li:activity:\d+)/ },
  ],
  'tumblr.com': [{ re: /^\/[^/]+\/(\d+)/ }, { re: /^\/post\/(\d+)/ }],
  'snapchat.com': [{ re: /^\/spotlight\/([^/?#]+)/ }],
  'youtube.com': [{ re: /^\/shorts\/([A-Za-z0-9_-]+)/ }],
}

/**
 * Whether an address is social media and, if so, a specific post or the site. `null` when it is not
 * social media at all (a YouTube video, a news site).
 */
export function classifySocialMediaUrl(rawUrl: string | null | undefined): SocialUrlInfo | null {
  const url = parseWebUrl(rawUrl)
  if (!url) return null
  const host = untranslatedHost(url.hostname)

  if ((SOCIAL_SHORT_LINK_HOSTS as readonly string[]).includes(host)) {
    const site = SITE_ALIASES[host] ?? socialSiteForHost(host) ?? host
    // redd.it/<id> is already the post's own id.
    if (host === 'redd.it') {
      const id = url.pathname.replace(/^\/+|\/+$/g, '')
      return id ? { site, kind: 'post', postId: id.toLowerCase() } : { site, kind: 'site' }
    }
    return { site, kind: 'shortLink' }
  }

  const site = socialSiteForUrl(url)
  if (!site) return null
  if (SHORT_LINK_PATHS[site]?.test(url.pathname)) return { site, kind: 'shortLink' }

  for (const rule of POST_RULES[site] ?? []) {
    const match = rule.re.exec(url.pathname)
    if (!match) continue
    const id = rule.query ? url.searchParams.get(rule.query) : match[1]
    if (!id) continue
    return { site, kind: 'post', postId: site === 'reddit.com' ? id.toLowerCase() : id, ...(rule.embed ? { isEmbed: true } : {}) }
  }
  return { site, kind: 'site' }
}

/**
 * A link that is followed to its full address when an item is saved (SMB-4): a social short link,
 * or X's `t.co`, which leads anywhere, a post or another site.
 */
export function isShortLinkToResolve(rawUrl: string | null | undefined): boolean {
  const url = parseWebUrl(rawUrl)
  if (!url) return false
  if (untranslatedHost(url.hostname) === 't.co') return url.pathname.length > 1
  return classifySocialMediaUrl(rawUrl)?.kind === 'shortLink'
}

/**
 * The address a short link led to, as it is stored: without its query when the post is the same
 * without it (`tiktok.com/@u/video/123?_r=1&_t=x` → `tiktok.com/@u/video/123`), so the share's
 * tracking does not become part of the item. Kept as it is when the query names the post
 * (`facebook.com/watch?v=…`) or the address is not a post.
 */
export function tidyResolvedUrl(rawUrl: string): string {
  const url = parseWebUrl(rawUrl)
  if (!url) return rawUrl
  const info = classifySocialMediaUrl(url.href)
  if (info?.kind !== 'post' || (!url.search && !url.hash)) return url.href
  const bare = `${url.origin}${url.pathname}`
  const without = classifySocialMediaUrl(bare)
  return without?.kind === 'post' && without.postId === info.postId ? bare : url.href
}

/** Two addresses are the same post: a TikTok and its embed page, a reel and `/reel/<id>/embed`. */
export function isSameSocialPost(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = classifySocialMediaUrl(a)
  const right = classifySocialMediaUrl(b)
  return !!left && !!right && left.kind === 'post' && right.kind === 'post'
    && left.site === right.site && left.postId === right.postId
}

/**
 * The page that shows just this post, with no feed and no login wall (D12), or `null` when the site
 * has none. Opened as an ordinary page, never framed.
 */
export function socialEmbedUrl(rawUrl: string | null | undefined): string | null {
  const info = classifySocialMediaUrl(rawUrl)
  if (!info || info.kind !== 'post' || info.isEmbed || !info.postId) return null
  if (info.site === 'tiktok.com') return `https://www.tiktok.com/embed/v2/${info.postId}`
  if (info.site === 'instagram.com') {
    const isReel = /^\/(?:reel|reels)\//.test(parseWebUrl(rawUrl)?.pathname ?? '')
    return `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${info.postId}/embed`
  }
  return null
}

/** Whether an Exceptions entry lets this address through: the site and its subdomains, or a path and below it. */
export function socialExceptionMatches(exceptions: readonly string[] | null | undefined, rawUrl: string | null | undefined): boolean {
  if (!exceptions?.length) return false
  const url = parseWebUrl(rawUrl)
  if (!url) return false
  const site = socialSiteForUrl(url)
  if (!site) return false
  const path = url.pathname.toLowerCase().replace(/\/+$/, '')
  return exceptions.some((entry) => {
    const slash = entry.indexOf('/')
    const entrySite = slash === -1 ? entry : entry.slice(0, slash)
    const entryPath = slash === -1 ? '' : entry.slice(slash)
    if (entrySite !== site) return false
    return !entryPath || path === entryPath || path.startsWith(`${entryPath}/`)
  })
}

// ---------------------------------------------------------------------------
// The older form of the setting: the Social media time limit

/**
 * Build note, "one write, three forms": saving the setting also writes the Social media time limit,
 * at 0 minutes every day while the block is on, so every app in use, old or new, blocks the same way.
 * A client that reads `socialMedia` ignores that 0 while the block is on (Exceptions and shared links
 * open); one that does not still blocks every social site, as it always has.
 */
export const SOCIAL_TIME_LIMIT_RULE_ID = 'simple-social'
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

/** A limit on social media: the preset rule, or an older one per schedule. Never a guardian's own custom limit. */
export function isSocialTimeLimitRule(rule: LimitRule | null | undefined): boolean {
  if (!rule?.id || rule.id.startsWith('simple-custom-')) return false
  if (rule.id === SOCIAL_TIME_LIMIT_RULE_ID) return true
  return (rule.conditions || []).some((c) => c?.type === 'socialDesignation' && (c.values || []).includes('social'))
}

function socialDaysAtZero(rules: readonly LimitRule[]): Set<number> {
  const days = new Set<number>()
  for (const rule of rules) {
    for (const timeLimit of rule.timeLimits || []) {
      if (Math.round((timeLimit?.hours || 0) * 60) !== 0) continue
      for (const day of timeLimit.daysOfWeek || []) days.add(day)
    }
  }
  return days
}

/** The older form says blocked: a Social media limit of 0 minutes on every day of the week. */
export function socialBlockedByTimeLimits(rules: readonly LimitRule[] | null | undefined): boolean {
  const social = (rules || []).filter(isSocialTimeLimitRule)
  return social.length > 0 && socialDaysAtZero(social).size === ALL_DAYS.length
}

/**
 * A child's time limits with the Social media limit written for the block: 0 minutes on every day
 * while it is on; while it is off, 10 minutes a day where the limit was 0 or there was none (D6),
 * and a limit a guardian set left alone. Every other rule is untouched.
 */
export function withSocialTimeLimitForBlock(
  rules: readonly LimitRule[] | null | undefined,
  blocked: boolean,
  /** `noLimit` for a guardian's own block (D11): turning it off takes the 0 minutes away, and adds no 10. */
  unblocked: 'tenMinutes' | 'noLimit' = 'tenMinutes',
): LimitRule[] {
  const list = (rules || []).map((rule) => ({ ...rule, timeLimits: (rule.timeLimits || []).map((t) => ({ ...t })) }))
  const social = list.filter(isSocialTimeLimitRule)

  if (!blocked && unblocked === 'noLimit') {
    return socialBlockedByTimeLimits(social) ? list.filter((rule) => !isSocialTimeLimitRule(rule)) : list
  }

  if (blocked) {
    for (const rule of social) rule.timeLimits = rule.timeLimits.map((t) => ({ ...t, hours: 0 }))
    const covered = socialDaysAtZero(social)
    const missing = ALL_DAYS.filter((day) => !covered.has(day))
    if (!missing.length) return list
    if (social.length) {
      social[0].timeLimits.push({ hours: 0, daysOfWeek: missing })
      return list
    }
    return insertSocialRule(list, 0)
  }

  if (!social.length) return insertSocialRule(list, SOCIAL_MEDIA_DEFAULT_DAILY_MINUTES)
  if (!socialBlockedByTimeLimits(social)) return list
  for (const rule of social) {
    rule.timeLimits = rule.timeLimits.map((t) => ({ ...t, hours: SOCIAL_MEDIA_DEFAULT_DAILY_MINUTES / 60 }))
  }
  return list
}

/** Above the overall limit, which is the catch-all and has to stay last. */
function insertSocialRule(list: LimitRule[], minutes: number): LimitRule[] {
  const rule: LimitRule = {
    id: SOCIAL_TIME_LIMIT_RULE_ID,
    name: 'Social media',
    type: 'usage_only',
    conditions: [{ type: 'socialDesignation', values: ['social'] }],
    timeLimits: [{ hours: minutes / 60, daysOfWeek: [...ALL_DAYS] }],
  }
  const at = list.findIndex((r) => r.type === 'all')
  if (at === -1) list.push(rule)
  else list.splice(at, 0, rule)
  return list
}

/** App controls' Social app type, the form phones and computers read (`compileAppPolicy`). */
export const SOCIAL_APP_CATEGORY = 'social'

export function withSocialAppCategory(blockedCategories: readonly string[] | null | undefined, blocked: boolean): string[] {
  const rest = (blockedCategories || []).filter((c) => c !== SOCIAL_APP_CATEGORY)
  return blocked ? [...rest, SOCIAL_APP_CATEGORY].sort() : rest
}

// ---------------------------------------------------------------------------
// A restricted child's library holds posts, never sites (SMB-10)

const SOCIAL_SITE_NAMES: Record<string, string> = {
  'tiktok.com': 'TikTok',
  'instagram.com': 'Instagram',
  'facebook.com': 'Facebook',
  'x.com': 'X',
  'reddit.com': 'Reddit',
  'pinterest.com': 'Pinterest',
  'snapchat.com': 'Snapchat',
  'threads.com': 'Threads',
  'bsky.app': 'Bluesky',
  'tumblr.com': 'Tumblr',
  'linkedin.com': 'LinkedIn',
  'discord.com': 'Discord',
  'youtube.com': 'YouTube Shorts',
}

/** What a guardian calls the site: `TikTok`, `YouTube Shorts`; the address for one with no name here. */
export function socialSiteName(site: string): string {
  return SOCIAL_SITE_NAMES[site] ?? site
}

/** A saved pattern (`*.tiktok.com/@cat*`) as the address it stands for. */
function addressForPattern(pattern: string): string {
  return pattern.trim().replace(/^\*\./, '').replace(/\*+$/, '')
}

/**
 * The social site an item would open beyond one post: its address or any pattern is a site, a
 * profile, a feed or a search. `null` when it is one post or video, or not social media. A restricted
 * child's library never takes such an item; the site goes in Exceptions instead.
 */
export function socialSiteInScope(scope: { url?: string | null; patterns?: string[] | string | null }): { site: string; name: string } | null {
  const patterns = Array.isArray(scope.patterns)
    ? scope.patterns
    : typeof scope.patterns === 'string' ? scope.patterns.split('\n') : []
  for (const address of [scope.url, ...patterns.map(addressForPattern)]) {
    if (!address || !address.trim()) continue
    const info = classifySocialMediaUrl(address)
    if (info?.kind === 'site') return { site: info.site, name: socialSiteName(info.site) }
  }
  return null
}
