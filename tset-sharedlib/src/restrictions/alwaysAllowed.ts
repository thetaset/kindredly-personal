/**
 * A list of sites, library items and apps that stay open, and the one matcher that reads it.
 *
 * Two lists have this shape:
 * - **Always allowed** (HAT-152, docs/proposals/always-allowed.md): per person, on
 *   `user.options.alwaysAllowed`. Opens after every time limit has run out, outside a limit's
 *   hours, before the Daily Check-in is done, and during Family Downtime. Block all, Blocked apps,
 *   and Blocked sites and content filtering (which treat it as a library item) still apply.
 * - **Allowed during downtime**: the family's, on `account.options.familyDowntime.allow`. Lifts
 *   downtime only.
 *
 * Always allowed is its own key on the options, never inside `usageLimitsData`: the limits editor,
 * the reward system and the assistant each replace that whole object, so a list kept there would be
 * lost to the first save made from an older copy.
 *
 * Not encrypted, like every time limit and Blocked site: the server can read a site a guardian types.
 * A library item appears only as its id, and its link stays encrypted, which is why "does this
 * address belong to that item" is answered on the device (`itemIds` in the target below).
 */

export type AllowList = {
  urlPatterns: string[]
  itemIds: string[]
  /** `<platform>:<id>` device app ids, as custom limits store them. */
  appIds: string[]
}

export const ALLOW_LIST_MAX = 50
const ALLOW_ENTRY_MAX_LENGTH = 300

export function emptyAllowList(): AllowList {
  return { urlPatterns: [], itemIds: [], appIds: [] }
}

function entryList(raw: unknown): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of Array.isArray(raw) ? raw : []) {
    const entry = typeof value === 'string' ? value.trim().slice(0, ALLOW_ENTRY_MAX_LENGTH) : ''
    if (!entry || seen.has(entry)) continue
    seen.add(entry)
    out.push(entry)
    if (out.length >= ALLOW_LIST_MAX) break
  }
  return out
}

/** Whatever is stored, as a list: trimmed, deduplicated, at most `ALLOW_LIST_MAX` of each kind. */
export function normalizeAllowList(raw: unknown): AllowList {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    urlPatterns: entryList(input.urlPatterns),
    itemIds: entryList(input.itemIds),
    appIds: entryList(input.appIds),
  }
}

export function isAllowListEmpty(allow: AllowList | null | undefined): boolean {
  return !allow || (!allow.urlPatterns.length && !allow.itemIds.length && !allow.appIds.length)
}

/**
 * `calm.com` → site `calm.com`; `*.calm.com` and `.calm.com` the same; `https://www.pbskids.org/games/`
 * → site `pbskids.org`, path `/games`; `youtube.com/watch?v=abc` → also query `v=abc`. Null when the
 * text names no site.
 */
export function allowedSite(pattern: string): { host: string; path: string; query: [string, string][] } | null {
  const text = pattern.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  const cut = text.search(/[/?#]/)
  const host = (cut < 0 ? text : text.slice(0, cut))
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/^\*?\./, '')
    .replace(/^www\./, '')
  if (!host || /\s/.test(host)) return null
  const rest = cut < 0 ? '' : text.slice(cut).replace(/#.*$/, '')
  const q = rest.indexOf('?')
  const path = (q < 0 ? rest : rest.slice(0, q)).toLowerCase().replace(/\/+$/, '')
  const query = q < 0 ? [] : [...new URLSearchParams(rest.slice(q + 1))]
  return { host, path, query }
}

/** The site a page is on, as a list entry: `https://www.calendar.school.org/x` → `calendar.school.org`. */
export function allowListSiteForUrl(url: string | null | undefined): string | null {
  try {
    const parsed = new URL(url || '')
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return parsed.hostname.toLowerCase().replace(/^www\./, '') || null
  } catch {
    return null
  }
}

/**
 * Does the list keep this open?
 *
 * A site matches by its name, never as a piece of the address: `calm.com` opens `calm.com` and
 * `www.calm.com/sleep`, but not `notcalm.com` or `tiktok.com/?calm.com`, which a child could type to
 * get past it. An entry with a path (`pbskids.org/games`) opens only pages under it, and one with a
 * query (`youtube.com/watch?v=abc`) only addresses carrying it, so one allowed video is not all of
 * them.
 *
 * A library item matches by id: `itemId` is the item a Kindredly page is showing, and `itemIds` the
 * library items whose link or patterns match the address, which only the device can work out.
 */
export function allowListMatches(
  allow: AllowList | null | undefined,
  target: { url?: string | null; itemId?: string | null; itemIds?: readonly string[] | null },
): boolean {
  if (!allow) return false
  if (target.itemId && allow.itemIds.includes(target.itemId)) return true
  if (target.itemIds?.some((id) => allow.itemIds.includes(id))) return true
  let url: URL
  try {
    url = new URL(target.url || '')
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const pathname = url.pathname.toLowerCase().replace(/\/+$/, '')
  return allow.urlPatterns.some((pattern) => {
    const site = allowedSite(pattern)
    if (!site || (host !== site.host && !host.endsWith(`.${site.host}`))) return false
    if (site.path && pathname !== site.path && !pathname.startsWith(`${site.path}/`)) return false
    // The first value, the one a site reads: `watch?v=OTHER&v=abc` plays OTHER, so it must not match `v=abc`.
    return site.query.every(([key, value]) => url.searchParams.get(key) === value)
  })
}

export type AllowListKind = keyof AllowList

/** The list with one entry added, at the end. Unchanged when it is already there or the list is full. */
export function withAllowListEntry(allow: AllowList | null | undefined, kind: AllowListKind, value: string): AllowList {
  const next = normalizeAllowList(allow)
  const entry = value.trim()
  if (!entry || next[kind].includes(entry) || next[kind].length >= ALLOW_LIST_MAX) return next
  return { ...next, [kind]: [...next[kind], entry] }
}

/** The list with one entry removed. */
export function withoutAllowListEntry(allow: AllowList | null | undefined, kind: AllowListKind, value: string): AllowList {
  const next = normalizeAllowList(allow)
  return { ...next, [kind]: next[kind].filter((entry) => entry !== value) }
}
