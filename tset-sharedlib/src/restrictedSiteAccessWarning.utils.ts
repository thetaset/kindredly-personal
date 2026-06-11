import { SOCIAL_MEDIA_DOMAINS, isRootWebsiteURL } from './url.utils'

export const RESTRICTED_SITE_ACCESS_WARNING_RULESET_VERSION = '2026-03-30.v1'

export type RestrictedSiteAccessWarningReasonCode =
  | 'search-engine'
  | 'broad-social-platform'
  | 'broad-video-platform'
  | 'conversational-ai-platform'

export type RestrictedSiteAccessWarningScopeType = 'root-url' | 'broad-pattern'

export type RestrictedSiteAccessWarningRule = {
  id: string
  displayName: string
  reasonCode: RestrictedSiteAccessWarningReasonCode
  domains: string[]
}

export type RestrictedSiteAccessWarningResult = {
  shouldWarn: boolean
  rulesetVersion: string
  warningId: string | null
  domainFamily: string | null
  displayName: string | null
  reasonCode: RestrictedSiteAccessWarningReasonCode | null
  scopeType: RestrictedSiteAccessWarningScopeType | null
  matchedPattern: string | null
  matchedHostname: string | null
}

const CURATED_RULES: RestrictedSiteAccessWarningRule[] = [
  {
    id: 'google',
    displayName: 'Google',
    reasonCode: 'search-engine',
    domains: ['google.com'],
  },
  {
    id: 'bing',
    displayName: 'Bing',
    reasonCode: 'search-engine',
    domains: ['bing.com'],
  },
  {
    id: 'duckduckgo',
    displayName: 'DuckDuckGo',
    reasonCode: 'search-engine',
    domains: ['duckduckgo.com'],
  },
  {
    id: 'youtube',
    displayName: 'YouTube',
    reasonCode: 'broad-video-platform',
    domains: ['youtube.com', 'youtu.be'],
  },
  {
    id: 'chatgpt-openai',
    displayName: 'ChatGPT / OpenAI',
    reasonCode: 'conversational-ai-platform',
    domains: ['chatgpt.com', 'openai.com', 'chat.openai.com'],
  },
  {
    id: 'x',
    displayName: 'X',
    reasonCode: 'broad-social-platform',
    domains: ['x.com', 'twitter.com'],
  },
  {
    id: 'reddit',
    displayName: 'Reddit',
    reasonCode: 'broad-social-platform',
    domains: ['reddit.com', 'redd.it'],
  },
  {
    id: 'instagram',
    displayName: 'Instagram',
    reasonCode: 'broad-social-platform',
    domains: ['instagram.com'],
  },
  {
    id: 'facebook',
    displayName: 'Facebook',
    reasonCode: 'broad-social-platform',
    domains: ['facebook.com', 'fb.com'],
  },
  {
    id: 'tiktok',
    displayName: 'TikTok',
    reasonCode: 'broad-social-platform',
    domains: ['tiktok.com'],
  },
  {
    id: 'discord',
    displayName: 'Discord',
    reasonCode: 'broad-social-platform',
    domains: ['discord.com'],
  },
]

function normalizeHostname(hostname: string | null | undefined): string | null {
  if (!hostname) return null
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\*\./, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '')
}

function hostnameMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function titleCaseHostname(hostname: string): string {
  return hostname
    .split('.')
    .map((segment) => (segment.length > 0 ? segment[0].toUpperCase() + segment.slice(1) : segment))
    .join('.')
}

function getHeuristicRuleForHostname(hostname: string): RestrictedSiteAccessWarningRule | null {
  const socialDomain = SOCIAL_MEDIA_DOMAINS.find((domain) => hostnameMatches(hostname, domain))
  if (!socialDomain) return null

  return {
    id: socialDomain,
    displayName: titleCaseHostname(socialDomain),
    reasonCode: 'broad-social-platform',
    domains: [socialDomain],
  }
}

function findRuleForHostname(hostname: string): RestrictedSiteAccessWarningRule | null {
  const normalized = normalizeHostname(hostname)
  if (!normalized) return null

  for (const rule of CURATED_RULES) {
    if (rule.domains.some((domain) => hostnameMatches(normalized, domain))) {
      return rule
    }
  }

  return getHeuristicRuleForHostname(normalized)
}

function parsePattern(pattern: string): { hostname: string | null; pathPart: string } {
  const trimmed = (pattern || '').trim().toLowerCase()
  if (!trimmed) {
    return { hostname: null, pathPart: '' }
  }

  const noProtocol = trimmed.replace(/^https?:\/\//, '')
  const [hostPartRaw, ...pathParts] = noProtocol.split('/')
  const hostPart = normalizeHostname(hostPartRaw)
  const pathPart = pathParts.length > 0 ? `/${pathParts.join('/')}` : ''

  return {
    hostname: hostPart,
    pathPart,
  }
}

function isBroadPatternPath(pathPart: string): boolean {
  return pathPart === '' || pathPart === '/' || pathPart === '/*' || pathPart === '*' || pathPart === '/**'
}

export function normalizeWarningPatterns(patterns: string[] | string | null | undefined): string[] {
  if (!patterns) return []

  const list = Array.isArray(patterns) ? patterns : patterns.split('\n')
  return list.map((pattern) => pattern.trim()).filter((pattern) => pattern.length > 0)
}

export function evaluateRestrictedSiteAccessWarning(input: {
  url?: string | null
  patterns?: string[] | string | null
}): RestrictedSiteAccessWarningResult {
  const normalizedPatterns = normalizeWarningPatterns(input.patterns)

  for (const pattern of normalizedPatterns) {
    const { hostname, pathPart } = parsePattern(pattern)
    if (!hostname || !isBroadPatternPath(pathPart)) continue

    const rule = findRuleForHostname(hostname)
    if (!rule) continue

    return {
      shouldWarn: true,
      rulesetVersion: RESTRICTED_SITE_ACCESS_WARNING_RULESET_VERSION,
      warningId: rule.id,
      domainFamily: rule.domains[0],
      displayName: rule.displayName,
      reasonCode: rule.reasonCode,
      scopeType: 'broad-pattern',
      matchedPattern: pattern,
      matchedHostname: hostname,
    }
  }

  const url = input.url || null
  if (!url || !isRootWebsiteURL(url)) {
    return {
      shouldWarn: false,
      rulesetVersion: RESTRICTED_SITE_ACCESS_WARNING_RULESET_VERSION,
      warningId: null,
      domainFamily: null,
      displayName: null,
      reasonCode: null,
      scopeType: null,
      matchedPattern: null,
      matchedHostname: null,
    }
  }

  try {
    const hostname = normalizeHostname(new URL(url).hostname)
    if (!hostname) {
      throw new Error('invalid hostname')
    }

    const rule = findRuleForHostname(hostname)
    if (!rule) {
      return {
        shouldWarn: false,
        rulesetVersion: RESTRICTED_SITE_ACCESS_WARNING_RULESET_VERSION,
        warningId: null,
        domainFamily: null,
        displayName: null,
        reasonCode: null,
        scopeType: null,
        matchedPattern: null,
        matchedHostname: null,
      }
    }

    return {
      shouldWarn: true,
      rulesetVersion: RESTRICTED_SITE_ACCESS_WARNING_RULESET_VERSION,
      warningId: rule.id,
      domainFamily: rule.domains[0],
      displayName: rule.displayName,
      reasonCode: rule.reasonCode,
      scopeType: 'root-url',
      matchedPattern: null,
      matchedHostname: hostname,
    }
  } catch {
    return {
      shouldWarn: false,
      rulesetVersion: RESTRICTED_SITE_ACCESS_WARNING_RULESET_VERSION,
      warningId: null,
      domainFamily: null,
      displayName: null,
      reasonCode: null,
      scopeType: null,
      matchedPattern: null,
      matchedHostname: null,
    }
  }
}