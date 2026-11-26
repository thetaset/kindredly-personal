import { HELPER_CHAT_MODE } from './helper-ai';

/**
 * Every hosted text model the server can price: the one offered, and those it no longer offers,
 * whose recorded usage still needs a price.
 */
export const AI_HOSTED_TEXT_MODELS = [
  'deepseek-flash',
  'gpt-6-luna',
  'deepseek-v4-pro',
  'gpt-6-sol',
  'deepseek-ai/DeepSeek-V4-Flash-0731',
] as const;

export type AiTextModelId = (typeof AI_HOSTED_TEXT_MODELS)[number];

/**
 * The hosted text models a request may ask for and a screen may offer. Order matters: [0] is the
 * default.
 *
 * GPT-6 Luna, OpenAI's cheapest model, and nothing else (founder, 2026-10-15, HAT-503: "let's keep
 * DeepSeek … for EnvoyTo. But for Kindredly, let's use OpenAI Luna … the cheapest"). DeepSeek's
 * terms don't rule out training on what it is sent, it offers no data agreement, and it stores data
 * in China; Kindredly's Privacy Policy promises service providers under data protection agreements.
 * A request that names another model, such as an older app's, is answered on Luna; the one
 * exception is a Helper AI helper's chat, on DeepSeek at DeepInfra (`resolveChatModel`).
 *
 * Ollama, the browser's built-in model and a family's own API key never reach this list: they
 * do not run on Kindredly's account.
 */
export const AI_MODEL_ALLOWLIST = ['gpt-6-luna'] as const satisfies readonly AiTextModelId[];

/**
 * Answers a request for a DeepSeek model when DeepSeek can't: this server has no DeepSeek key, or
 * DeepSeek is unreachable, out of credit or refusing the key (`hosted_ai_client.ts`). Kindredly
 * offers no DeepSeek model, so this only matters to the evals and to a request naming one directly.
 */
export const AI_BACKUP_MODEL: AiTextModelId = 'gpt-6-luna';

/**
 * How long the app waits for a model writing a lesson, a track item or another long answer in one
 * response (HAT-503), past the 60-second default; the load balancer allows 300.
 */
export const AI_WRITING_TIMEOUT_MS = 240_000;

/** The companies that run Kindredly AI's text models. DeepInfra runs open models, DeepSeek's among them. */
export type AiTextProvider = 'openai' | 'deepseek' | 'deepinfra';

/** Who runs each hosted model, which decides the key and address a call goes to. */
export const AI_MODEL_PROVIDER: Record<AiTextModelId, AiTextProvider> = {
  'deepseek-flash': 'deepseek',
  'gpt-6-luna': 'openai',
  'deepseek-v4-pro': 'deepseek',
  'gpt-6-sol': 'openai',
  'deepseek-ai/DeepSeek-V4-Flash-0731': 'deepinfra',
};

/** The provider for `model`, OpenAI for a name this list does not know. */
export function providerForModel(model: string | null | undefined): AiTextProvider {
  return (AI_MODEL_PROVIDER as Record<string, AiTextProvider>)[replaceRetiredModel(String(model || ''))] ?? 'openai';
}

/**
 * Models Kindredly used to host, and the one that answers in their place (2026-09-24, HAT-072).
 *
 * Installed apps keep sending these names until they update, and a family that picked the dearest
 * model keeps the dearest one rather than dropping to the plan's cheapest. gpt-5.4-mini has no
 * model of its own: gpt-6-luna scores above it.
 */
export const RETIRED_AI_MODELS: Readonly<Record<string, AiTextModelId>> = {
  'gpt-5.4-nano': 'gpt-6-luna',
  'gpt-5.4-mini': 'gpt-6-luna',
  'gpt-5.4': 'gpt-6-sol',
};

/** The model that answers for `name`: its replacement when it is retired, else `name`. */
export function replaceRetiredModel(name: string): string {
  return RETIRED_AI_MODELS[name] ?? name;
}

/**
 * The hosted models each plan may reach, the default first.
 *
 * The assistant itself is on every plan (`readiness.aiChat` in plan-policy). Every plan runs on
 * GPT-6 Luna (HAT-503); what Plus buys is a larger hosted AI limit.
 */
export const AI_MODEL_ALLOWLIST_BY_PLAN = {
  standard: ['gpt-6-luna'],
  plus: ['gpt-6-luna'],
} as const satisfies Record<'standard' | 'plus', readonly AiTextModelId[]>;

/**
 * How fast each hosted model uses a family's AI requests, compared with GPT-6 Luna, the one offered.
 *
 * Proportional to list price (founder, 2026-10-15, HAT-503). A family's usage is counted from what
 * each call costs at its model's price (`computeCostUsd`), so these are only the estimate a screen
 * shows; families see them, never what a request costs Kindredly (PLN-7). From `STAMPED_PRICING`
 * (checked 2026-10-15): DeepSeek Flash costs about twice Luna, DeepSeek V4 Pro about eight times,
 * GPT-6 Sol twenty.
 */
export const AI_MODEL_REQUEST_MULTIPLE: Record<AiTextModelId, number> = {
  'deepseek-flash': 2,
  'gpt-6-luna': 1,
  'deepseek-v4-pro': 8,
  'gpt-6-sol': 20,
  // $0.06 in and $0.18 out a million tokens at DeepInfra (2026-11-13), against Luna's $0.10 and $0.50.
  'deepseek-ai/DeepSeek-V4-Flash-0731': 0.4,
};

/**
 * How much each hosted model reasons before it answers, when the request does not say.
 *
 * GPT-6 models reason at `medium` unless told otherwise, where the GPT-5.4 models did not reason at
 * all, so the level is chosen here rather than left to the provider. A request that sends tools
 * runs at `none` whatever this says: on Chat Completions these models call tools only then.
 *
 * DeepSeek reasons at `high` unless told otherwise. With tools it must run at `none` too, for a
 * different reason: DeepSeek requires every earlier turn's reasoning to be sent back with the next
 * request, and the chat history keeps only the text and the tool calls.
 */
export const AI_MODEL_REASONING_EFFORT: Record<AiTextModelId, 'none' | 'low' | 'medium' | 'high'> = {
  'deepseek-flash': 'low',
  'gpt-6-luna': 'low',
  // The careful model reasons more, as Sol did.
  'deepseek-v4-pro': 'medium',
  'gpt-6-sol': 'medium',
  // A helper chat calls tools, and answered well without reasoning in HAI-7's live run.
  'deepseek-ai/DeepSeek-V4-Flash-0731': 'none',
};

/**
 * A completion request with its reasoning level set, for every caller that reaches OpenAI: the
 * server's hosted client and the eval harness.
 *
 * - Tools in the request: `none`, whatever the caller or the model's own level says.
 * - A level the caller set: kept.
 * - Otherwise: the model's level from `AI_MODEL_REASONING_EFFORT`. A model not listed there gets
 *   no level, so the provider's default applies.
 */
export function withReasoningEffortParams<P extends Record<string, any> | null | undefined>(params: P): P {
  if (!params) return params;
  const hasTools = Array.isArray(params.tools) && params.tools.length > 0;
  if (hasTools) return params.reasoning_effort === 'none' ? params : {...params, reasoning_effort: 'none'};
  if (params.reasoning_effort != null) return params;
  const level = (AI_MODEL_REASONING_EFFORT as Record<string, string>)[params.model];
  return level ? {...params, reasoning_effort: level} : params;
}

/** `superplus` normalizes to `plus`, matching `getSharedPlanPolicy`. */
export function modelsForAccountType(accountType: string | null | undefined): readonly string[] {
  return accountType === 'plus' || accountType === 'superplus'
    ? AI_MODEL_ALLOWLIST_BY_PLAN.plus
    : AI_MODEL_ALLOWLIST_BY_PLAN.standard;
}

/**
 * The model a request on this plan runs: the requested one when the plan allows it, otherwise
 * the plan's default. A ceiling, not a default, so a client cannot spend Plus money on a
 * Standard account by naming a model.
 */
export function resolvePlanModel(accountType: string | null | undefined, requested?: unknown): string {
  const allowed = modelsForAccountType(accountType);
  const name = replaceRetiredModel(typeof requested === 'string' ? requested.trim() : '');
  return name && allowed.includes(name) ? name : allowed[0];
}

/**
 * What a Helper AI helper's chat runs on (founder, 2026-11-13: "the app too for now"): DeepSeek's
 * V4 Flash, hosted by DeepInfra rather than DeepSeek, on every plan. The pinned snapshot keeps eval
 * results comparable. A server without a DeepInfra key answers on GPT-6 Luna (`servableModel`).
 * Kindredly's other AI stays on Luna (HAT-503).
 */
export const HELPER_DEFAULT_MODEL: AiTextModelId = 'deepseek-ai/DeepSeek-V4-Flash-0731';

/**
 * GPT-6 Sol, for one Helper AI helper on Plus (HAI-9, HAT-1105). A parent picks it for a helper
 * that needs more careful answers. It uses AI limits twenty times faster than Luna
 * (`AI_MODEL_REQUEST_MULTIPLE`), so it is never the family's model and never runs outside a
 * helper's chat. OpenAI runs it under the same agreement as Luna.
 */
export const HELPER_PLUS_MODELS = ['gpt-6-sol'] as const satisfies readonly AiTextModelId[];

/**
 * The model one chat turn runs: `resolvePlanModel`, except a helper's chat, which runs on
 * `HELPER_DEFAULT_MODEL`, or on one of `HELPER_PLUS_MODELS` when a Plus family named it. The chat
 * route and the cost guard's estimate both use it, so a turn is admitted on the price of the model
 * it runs.
 */
export function resolveChatModel(accountType: string | null | undefined, requested: unknown, mode: unknown): string {
  if (mode !== HELPER_CHAT_MODE) return resolvePlanModel(accountType, requested);
  const name = replaceRetiredModel(typeof requested === 'string' ? requested.trim() : '');
  const plus = accountType === 'plus' || accountType === 'superplus';
  return plus && (HELPER_PLUS_MODELS as readonly string[]).includes(name) ? name : HELPER_DEFAULT_MODEL;
}
