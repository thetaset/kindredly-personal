/**
 * The hosted text models Kindredly AI can run, and which of them each plan may reach.
 *
 * One list, read by the server (as a ceiling on what a request may ask for) and by any screen
 * that offers a model choice, so a Standard family is never shown a model the server will
 * quietly replace. Order matters: [0] is the default and the fallback, cheapest first.
 *
 * Ollama, the browser's built-in model and a family's own API key never reach this list: they
 * do not run on Kindredly's account.
 */
export const AI_MODEL_ALLOWLIST = ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.4'] as const;

export type AiTextModelId = (typeof AI_MODEL_ALLOWLIST)[number];

/**
 * The hosted models each plan may reach, cheapest first.
 *
 * The assistant itself is on every plan (`readiness.aiChat` in plan-policy). What the plan buys
 * is this list and a larger hosted AI limit, so a free family gets the assistant on the fastest
 * model.
 */
export const AI_MODEL_ALLOWLIST_BY_PLAN = {
  standard: ['gpt-5.4-nano'],
  plus: ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.4'],
} as const satisfies Record<'standard' | 'plus', readonly AiTextModelId[]>;

/**
 * How fast each hosted model uses a family's AI requests, compared with the Fast model.
 *
 * Families see these multiples, never what a request costs Kindredly (founder decision 2026-09-15,
 * PLN-7); the request's dollar size lives only on the server (`AI_REQUEST_UNIT_USD`). Round on
 * purpose: at list prices the three are about 1×, 3.6× and 12×.
 */
export const AI_MODEL_REQUEST_MULTIPLE: Record<AiTextModelId, number> = {
  'gpt-5.4-nano': 1,
  'gpt-5.4-mini': 3,
  'gpt-5.4': 10,
};

/** `superplus` normalizes to `plus`, matching `getSharedPlanPolicy`. */
export function modelsForAccountType(accountType: string | null | undefined): readonly string[] {
  return accountType === 'plus' || accountType === 'superplus'
    ? AI_MODEL_ALLOWLIST_BY_PLAN.plus
    : AI_MODEL_ALLOWLIST_BY_PLAN.standard;
}

/**
 * The model a request on this plan runs: the requested one when the plan allows it, otherwise
 * the plan's cheapest. A ceiling, not a default, so a client cannot spend Plus money on a
 * Standard account by naming a model.
 */
export function resolvePlanModel(accountType: string | null | undefined, requested?: unknown): string {
  const allowed = modelsForAccountType(accountType);
  const name = typeof requested === 'string' ? requested.trim() : '';
  return name && allowed.includes(name) ? name : allowed[0];
}
