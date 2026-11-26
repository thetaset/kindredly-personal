/**
 * AI as a kind of content (HAT-1359).
 *
 * The AI limit is a pinned limit, like Video and Games: one `attribute` condition whose value is `ai`.
 * - On the web it matches a page on one of the sites below: Kindredly's list only, so nothing is AI by
 *   a wrong guess. A site that is not listed still counts as whatever category it already has.
 * - It matches Helper AI, the child's helpers in Kindredly, by the marker their time is logged under.
 * - On phones and computers it matches an app session of one of the apps below.
 * - AI inside another product (the answer box on a search page, an assistant in a chat app) is not
 *   matched: it counts as the page it is on.
 * Like Video, AI is counted on top of a page's category, and whichever limit runs out first stops it.
 */
import { HELPER_LIMIT_RULE_ID, HELPER_LIMIT_URL_PATTERN } from '../helper-ai'

/** The activity attribute the AI limit matches: an AI chat page or app, or Helper AI. */
export const AI_ATTRIBUTE = 'ai'

/**
 * The AI limit's rule id. It is the Helper AI limit's (HAI-6), which the AI limit replaced, so an amount
 * and hours a guardian gave Helper AI carry over as the AI limit's without a migration.
 */
export const AI_LIMIT_RULE_ID = HELPER_LIMIT_RULE_ID

/**
 * Sites that are an AI chat. Each covers its subdomains. A product that is mostly something else
 * (a search engine, an office suite) is left out even where it has an assistant.
 */
export const AI_SITE_DOMAINS = [
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'gemini.google.com',
  'aistudio.google.com',
  'notebooklm.google.com',
  'copilot.microsoft.com',
  'perplexity.ai',
  'chat.deepseek.com',
  'grok.com',
  'meta.ai',
  'chat.mistral.ai',
  'poe.com',
  'pi.ai',
  'duck.ai',
  'character.ai',
  'replika.com',
] as const

/**
 * Apps that are an AI chat, as rule ids (`toDeviceAppId`). Add only ids that are certain. iPhone apps
 * are named by a Screen Time selection, not an id, so none are listed.
 */
export const AI_APP_IDS = [
  'android:com.openai.chatgpt',
  'android:com.anthropic.claude',
  'android:com.google.android.apps.bard',
  'android:com.microsoft.copilot',
  'android:ai.perplexity.app.android',
  'android:com.deepseek.chat',
  'android:ai.character.app',
  'macos:com.openai.chat',
  'macos:com.anthropic.claudefordesktop',
] as const

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/** The listed AI site a host belongs to, or null. */
export function aiSiteForHost(hostname: string | null | undefined): string | null {
  if (!hostname) return null
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return (AI_SITE_DOMAINS as readonly string[]).find((d) => host === d || host.endsWith(`.${d}`)) ?? null
}

/** Whether an address is Helper AI's usage marker. */
export function isHelperAiUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(HELPER_LIMIT_URL_PATTERN)
}

/** Whether an address is on a listed AI site, or is Helper AI. */
export function isAiUrl(url: string | null | undefined): boolean {
  return isHelperAiUrl(url) || aiSiteForHost(hostOf(url)) !== null
}

/** Whether an app, by its rule id, is a listed AI app. */
export function isAiAppId(appId: string | null | undefined): boolean {
  return !!appId && (AI_APP_IDS as readonly string[]).includes(appId.toLowerCase())
}

/** Whether a rule's conditions include the AI attribute. */
export function hasAiAttribute(conditions: Array<{ type?: string; values?: string[] }> | null | undefined): boolean {
  return (conditions ?? []).some((c) => c?.type === 'attribute' && (c.values ?? []).includes(AI_ATTRIBUTE))
}
