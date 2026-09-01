/**
 * AI capabilities and their engine routing.
 *
 * Every distinct AI task the product performs is a capability, and each one
 * names an ORDERED CHAIN of engine ids rather than a single provider. That
 * shape is deliberate:
 *
 *   ['hosted:gpt-5.4-nano', 'hosted:gpt-4o-mini']   cheap first, fallback
 *   ['browser:gemini-nano', 'hosted:gpt-4o-mini']   on-device first, degrades
 *   ['browser:gemini-nano']                          never leaves the device
 *
 * A local/remote boolean cannot express any of those, and a single global
 * provider switch moves every task at once — which is exactly wrong here,
 * because the tasks differ enormously in how much model they need. Chat sends
 * ~40 tool declarations and plans multi-step; suggesting an image prompt sends
 * four short fields and wants one sentence back. The first is a poor fit for a
 * 2-3B on-device model and the second is a great one.
 *
 * `fit` records that honestly and is surfaced in the UI, so choosing a small
 * engine for `chat` is an informed decision rather than a surprise.
 *
 * DEFAULTS ARE HOSTED-ONLY, everywhere. Adding an on-device engine to a chain
 * is always a deliberate act.
 *
 * Mirrors the mechanics of the client's agentCapabilityGroups.ts, which is the
 * codebase's proven recipe for this: registry const, pref-key function, an
 * exported key list spread into the prefs loader, and validation at
 * registration so a typo fails loudly instead of silently misrouting.
 */

/** How well a small (~0.5-3B) on-device model handles this task. */
export type CapabilityFit = 'good' | 'marginal' | 'poor';

export type AICapability = {
  /** Stable id; used in call sites, pref keys, chains and cache keys. */
  id: string;
  label: string;
  description: string;
  /** Ordered engine ids; the first available one wins. */
  defaultChain: string[];
  fit: CapabilityFit;
  /** Why the fit is what it is. Shown in the settings UI. */
  fitNote: string;
  /** Input cap in characters, applied regardless of engine. */
  inputBudgetChars?: number;
  /** Tighter cap when the resolved engine has a small context window. */
  smallModelInputBudgetChars?: number;
};

const HOSTED_DEFAULT = 'hosted:gpt-4o-mini';

export const AI_CAPABILITIES: AICapability[] = [
  // --- Good fits: short input, short structured output, little reasoning ---
  {
    id: 'image-prompt',
    label: 'Image prompt suggestion',
    description: 'Turn an item\'s name and description into one image-generation prompt.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'good',
    fitNote: 'Four short fields in, one sentence out. The lowest-risk on-device task here.',
  },
  {
    id: 'image-vet',
    label: 'Image relevance check',
    description: 'Decide whether a candidate image actually matches an article.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'good',
    fitNote: 'A yes/no plus a reason, from a couple of hundred tokens. Already fails closed.',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Summarize an article or page. Long inputs are chunked and recombined.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'good',
    fitNote: 'The task small models are genuinely best at.',
    inputBudgetChars: 60_000,
    smallModelInputBudgetChars: 12_000,
  },
  {
    id: 'grade-answer',
    label: 'Grade a free-response answer',
    description: 'Score a learner\'s answer against a rubric and give feedback.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'good',
    fitNote: 'Short in, a score and a sentence out. The bar is "helpful", not correctness-critical.',
  },
  {
    id: 'thing-extract',
    label: 'Extract things from a page',
    description: 'Identify the films, shows, or books a page is about.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'good',
    fitNote: 'Structured and capped at three results, with a parser that drops bad rows.',
    inputBudgetChars: 16_000,
    // The hosted budget is a real context load for a 2-3B model; precision holds
    // at a quarter of it.
    smallModelInputBudgetChars: 4_000,
  },
  {
    id: 'entity-suggest',
    label: 'Suggest entities from a page',
    description: 'Pull the notable named entities out of page text.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'good',
    fitNote: 'Same shape as thing extraction; output is a plain list the caller normalizes.',
    inputBudgetChars: 16_000,
    smallModelInputBudgetChars: 4_000,
  },
  {
    id: 'attr-improve',
    label: 'Improve item name, description and tags',
    description: 'Tighten an item\'s short attributes.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'good',
    fitNote:
      'Constrained output: a name, a description under 150 characters, and tags. ' +
      'Note this is separate from full-body rewriting, which is a poor fit.',
  },

  // --- Marginal: worth trying, expect some regression ---
  {
    id: 'chat-suggestions',
    label: 'Follow-up question suggestions',
    description: 'Propose the next questions to ask in a chat.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'marginal',
    fitNote: 'Tiny output, but it currently sends the whole message log. Cap the history and it becomes a good fit.',
  },
  {
    id: 'text-rewrite',
    label: 'Rewrite or extend item text',
    description: 'Rewrite or append to an item\'s full markdown body.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'marginal',
    fitNote: 'Long-form generation. Quality falls off quickly below a few billion parameters.',
  },

  // --- Poor fits: long input, long output, or multi-step reasoning ---
  {
    id: 'chat',
    label: 'AI Chat',
    description: 'The general assistant, including tool use and multi-step actions.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'poor',
    fitNote:
      'Around 40 tool declarations, multi-step planning, and approval flows. ' +
      'A small on-device model will not do this well — expect a conversational toy, not an agent.',
  },
  {
    id: 'app-editor',
    label: 'App Creator',
    description: 'The app-building agent that writes and patches app files.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'poor',
    fitNote: 'Kilobytes of code in context and full-file rewrites. A small model will corrupt files.',
  },
  {
    id: 'item-suggest',
    label: 'Suggest collection items',
    description: 'Generate new items for a collection.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'poor',
    fitNote: 'Input grows with the collection and the output is many fully-populated items.',
  },
  {
    id: 'collection-gen',
    label: 'Generate a collection',
    description: 'Author a multi-chapter collection from a topic.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'poor',
    fitNote: 'Long-form authored content that has to stay factually grounded.',
  },
  {
    id: 'lesson-gen',
    label: 'Generate a lesson',
    description: 'Build a lesson with steps and questions from source material.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'poor',
    fitNote: 'Worst case in both directions: very large input and very large structured output.',
  },
  {
    id: 'wiki-plan',
    label: 'Wiki deep dive planning',
    description: 'Choose pages and paragraphs for a deep dive.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'poor',
    fitNote: 'Small models hallucinate titles outside the candidate list.',
  },
  {
    id: 'wiki-draft',
    label: 'Wiki deep dive drafting',
    description: 'Write a post from a source excerpt, with verbatim evidence quotes.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'poor',
    fitNote: 'Verbatim quote fidelity is exactly what small models fail at, and the validator rejects them.',
  },
  {
    id: 'wiki-verify',
    label: 'Wiki deep dive verification',
    description: 'Check a drafted post against its source excerpt.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'poor',
    fitNote: 'Adversarial factual entailment. A weak verifier is worse than none, since it gates drafting.',
  },
  {
    id: 'content-extract',
    label: 'Extract from page content',
    description: 'Pull requested details out of arbitrary page text during an agent run.',
    defaultChain: [HOSTED_DEFAULT],
    fit: 'marginal',
    fitNote: 'Output is capped and it already retries on bad JSON, but the input is arbitrary web content.',
    inputBudgetChars: 16_000,
    smallModelInputBudgetChars: 4_000,
  },
];

export const AI_CAPABILITY_IDS: ReadonlySet<string> = new Set(AI_CAPABILITIES.map((c) => c.id));

export function getAICapability(id: string): AICapability | null {
  return AI_CAPABILITIES.find((c) => c.id === id) ?? null;
}

/**
 * Setting key holding a capability's engine chain (a JSON string array).
 *
 * DEVICE-SCOPED, stored alongside `ai.provider` and `ai.ollama.*` rather than
 * in synced user prefs. Which engines exist is a property of the device — the
 * built-in model is desktop-only, Ollama depends on what the user is running
 * locally — so a chain synced from a laptop would name engines a phone does not
 * have. The resolver degrades gracefully in that case, but storing it per
 * device means the setting means what it says on the device you set it on.
 */
export function capabilityChainSettingKey(capabilityId: string): string {
  return `ai.route.${capabilityId}.chain`;
}

/**
 * Throw if a capability id isn't registered.
 *
 * Call sites pass ids as strings, so a typo would otherwise route silently to
 * the default forever — the failure would look like "the setting doesn't work"
 * rather than "the id is wrong". Mirrors AIActionRegistry's registration-time
 * validation of `capabilityGroup` tags.
 */
export function assertAICapability(id: string): string {
  if (!AI_CAPABILITY_IDS.has(id)) {
    throw new Error(
      `Unknown AI capability "${id}". Add it to AI_CAPABILITIES in tset-sharedlib/src/ai-capabilities.ts.`,
    );
  }
  return id;
}

/** Capabilities grouped by fit, good first — the order the settings UI renders. */
export function capabilitiesByFit(): Record<CapabilityFit, AICapability[]> {
  return {
    good: AI_CAPABILITIES.filter((c) => c.fit === 'good'),
    marginal: AI_CAPABILITIES.filter((c) => c.fit === 'marginal'),
    poor: AI_CAPABILITIES.filter((c) => c.fit === 'poor'),
  };
}
