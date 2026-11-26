/**
 * Names Helper AI's parts share across the client and server (HAT-1105,
 * docs/trackers/helper-ai-tracker.md). Constants only: the helper's rules live in the client's
 * `src/helper/`, reached only through the Helper AI page's `import()`.
 */

/**
 * The choices a helper's settings offer. Here, not in the client's `src/helper/`, because the
 * background declares the builder's `update_helper` tool with them and may not import `src/helper/`.
 */
export const HELPER_TYPES = ['homework', 'practice', 'reading', 'family', 'custom'] as const;
export type HelperType = (typeof HELPER_TYPES)[number];
export const HELPER_PERSONAS = ['pet', 'coach', 'buddy', 'character'] as const;
export type HelperPersona = (typeof HELPER_PERSONAS)[number];
export const HELPER_TEMPERAMENTS = ['calm', 'silly', 'curious'] as const;
export type HelperTemperament = (typeof HELPER_TEMPERAMENTS)[number];
export const HELPER_OFF_TOPIC = ['allow', 'redirect', 'refuse'] as const;
export type OffTopicPolicy = (typeof HELPER_OFF_TOPIC)[number];
export const HELPER_READING_LEVELS = ['simple', 'standard', 'advanced'] as const;
export type ReadingLevel = (typeof HELPER_READING_LEVELS)[number];
export const HELPER_RESPONSE_LENGTHS = ['short', 'medium', 'long'] as const;
export type ResponseLength = (typeof HELPER_RESPONSE_LENGTHS)[number];

/** A helper is a `thing` with this subtype; its settings are in `info.schemas[HELPER_SCHEMA_ID]`. */
export const HELPER_SUB_TYPE = 'helper';
export const HELPER_SCHEMA_ID = 'kindredly.helper.v1';

/** The chat mode of a helper's conversation, sent to the background and the server. */
export const HELPER_CHAT_MODE = 'helper';

/** A helper conversation's session id starts with this, then the helper's item id. */
export const HELPER_SESSION_PREFIX = 'HELPER_';

/**
 * The in-app usage marker for time on the Helper AI page (`useInAppUsageTracker`), apart from the
 * rest of Kindredly so a time-limit row can match it with a URL pattern.
 */
export const HELPER_MARKER_URL = 'https://kindredly.ai/helper';

/**
 * The child's Helper AI time-limit row (HAI-6): an ordinary written limit (`urlPatterns` matches by
 * substring) on the marker above, so the limits engine counts it as it counts any row, all of a
 * child's helpers together. The id has the time-limits editor's written-limit prefix, so the editor
 * reads it back as one. Browser-only like every `urlPatterns` row: Guard never limits Kindredly.
 */
export const HELPER_LIMIT_RULE_ID = 'simple-custom-helper-ai';
export const HELPER_LIMIT_URL_PATTERN = 'kindredly.ai/helper';

/** Where one person's progress with one helper is kept: user-scoped ref state on the helper item. */
export const HELPER_PROGRESS_STATE_KEY = 'helper_progress';

/**
 * A child's helper chats, as they saw them (HAI-10): one entry per conversation, keyed by its session
 * id, in the child's own encrypted ref state on the helper, so their guardians can read them. Kept
 * this many days, then deleted by whichever device next lists them.
 */
export const HELPER_CHAT_STATE_KEY = 'helper_chat';
export const HELPER_CHAT_KEEP_DAYS = 14;

/** A guardian's AI check of one chat, in the guardian's own ref state on the helper. */
export const HELPER_REVIEW_STATE_KEY = 'helper_review';

/**
 * A family helper's shared chat (HAI-8): one entry per message, in the family's ref state on the
 * helper, encrypted with the family's key so everyone the helper is for can read it. Each message's
 * key starts with its author's id followed by `_`; the server lets only its author write it, and its
 * author or a guardian delete it. Kept `HELPER_CHAT_KEEP_DAYS`.
 */
export const HELPER_FAMILY_CHAT_STATE_KEY = 'helper_family_chat';

/**
 * Whether an item view is a helper, or a child's request for one: opened on `/helper`, never listed
 * in the Library, its search or Shared with you, where it read as a plain thing.
 */
export function isHelperItem(view: { details?: { subType?: unknown } | null } | null | undefined): boolean {
  return view?.details?.subType === HELPER_SUB_TYPE;
}

/**
 * The longest prompt the background passes on for a helper's turn. The page builds it within this
 * (`src/helper/prompt.ts`), dropping what grows oldest first and keeping its last rules.
 */
export const HELPER_PROMPT_MAX_CHARS = 24000;

/**
 * A person option an adult sets on a child when a helper is made for them, so the server admits the
 * child's helper chat while their Kinbot and AI tools stay off (`aiCostGuard`). A setting, readable
 * like `aiChatEnabled`; what the helper is for stays in the encrypted item.
 */
export const HELPER_PERSON_OPTION = 'aiHelpersEnabled';

/**
 * Whether the server admits a person's helper chat while Kinbot and AI tools are both off for them:
 * only with `aiHelpersEnabled`. An adult with AI tools on is admitted before this is asked
 * (`personAllowsAnyAi`); one an admin turned both off for is refused here too, as for every other AI
 * request: before, any adult passed, so `mode: 'helper'` opened AI to them.
 */
export function personAllowsHelpers(person: { type?: string; options?: object | null } | null | undefined): boolean {
  return (person?.options as Record<string, unknown> | null | undefined)?.[HELPER_PERSON_OPTION] === true;
}

/**
 * The topic check's verdicts (HAI-3): a short model call reads a child's message before the helper
 * does. The device builds the check's prompt (`src/helper/gate.ts`); the server sends back only one
 * of these, never the model's text, so the check is never a free AI for a child with AI turned off.
 */
export const HELPER_TOPIC_VERDICTS = ['on_topic', 'off_topic', 'unsafe', 'injection'] as const;
export type HelperTopicVerdict = (typeof HELPER_TOPIC_VERDICTS)[number];

/** The longest check prompt or message the server reads; the rest is cut. */
export const HELPER_TOPIC_CHECK_MAX_CHARS = 8000;

/** The verdict in a model's reply (`{"verdict": "…"}`), or null unless it is exactly one of the four. */
export function helperTopicVerdictOf(text: string | null | undefined): HelperTopicVerdict | null {
  const match = /\{[^{}]*\}/.exec(String(text ?? ''));
  if (!match) return null;
  try {
    const verdict = JSON.parse(match[0])?.verdict;
    return (HELPER_TOPIC_VERDICTS as readonly string[]).includes(verdict) ? verdict : null;
  } catch {
    return null;
  }
}
