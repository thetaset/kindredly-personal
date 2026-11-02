/**
 * Which model each AI task runs on, and how much it reasons (HAT-071, AIR-16…AIR-20).
 *
 * Read by the server (to validate what a request asks for) and by the client (to resolve a task's
 * model and reasoning level on this device, and to explain each choice in the pickers).
 *
 * A task here is what a person recognises ("App Builder", "Quick tasks"); each one groups the
 * capabilities in `ai-capabilities.ts` that serve it. A person's choice for a task is stored per
 * capability, in the keys `ai-capabilities.ts` already defines (`ai.route.<capability>.chain`),
 * so there is one settings vocabulary, not two.
 */
import {AI_MODEL_REASONING_EFFORT, replaceRetiredModel} from './ai-text-models';

/**
 * How much a hosted model reasons before it answers. `none` answers at once; each step up spends
 * more output tokens, which count against the family's AI limits like any other output.
 */
export const AI_REASONING_EFFORTS = ['none', 'low', 'medium', 'high'] as const;

export type AiReasoningEffort = (typeof AI_REASONING_EFFORTS)[number];

/** A level a request may ask for, or undefined for anything else (a typo, an old client, junk). */
export function parseReasoningEffort(value: unknown): AiReasoningEffort | undefined {
  return typeof value === 'string' && (AI_REASONING_EFFORTS as readonly string[]).includes(value)
    ? (value as AiReasoningEffort)
    : undefined;
}

export const AI_REASONING_EFFORT_LABELS: Record<AiReasoningEffort, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Setting key holding a capability's reasoning level on this device, beside its engine chain. */
export function capabilityEffortSettingKey(capabilityId: string): string {
  return `ai.route.${capabilityId}.effort`;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type AiTaskId = 'chat' | 'app-builder' | 'lessons' | 'feeds' | 'create' | 'wikipedia' | 'quick';

export type AiTask = {
  id: AiTaskId;
  label: string;
  /** What the task covers, when the label alone does not say. */
  description?: string;
  /** The capabilities in `AI_CAPABILITIES` this task routes. The first one is read back for the UI. */
  capabilities: string[];
  /**
   * Kindredly's reasoning level for the task. Absent = the model's own level
   * (`AI_MODEL_REASONING_EFFORT`), which is right for most tasks.
   */
  defaultEffort?: AiReasoningEffort;
  /** Runs only on Kindredly AI: the feature calls the server directly and has no local path. */
  hostedOnly?: boolean;
};

export const AI_TASKS: readonly AiTask[] = [
  {
    id: 'chat',
    label: 'Assistant chat',
    capabilities: ['chat', 'chat-suggestions'],
    // Measured 2026-09-24 on the assistant eval (32 tasks, gpt-6-luna): none 29/32, mean 97%, 99 tool
    // calls, 1.21M tokens; low 31/32, mean 100%, 90 calls, 1.13M tokens. The tools it sends mean a
    // level above none runs on the Responses API (AIR-16).
    defaultEffort: 'low',
  },
  {
    id: 'app-builder',
    label: 'App Builder',
    capabilities: ['app-editor'],
    // Measured 2026-09-24 on the App Builder eval (5 apps, gpt-6-luna): none 5/5, mean 99%, 27 tool
    // calls, 210k tokens; low 5/5, 98%, 17 calls, 125k tokens; medium 5/5, 96%, 21 calls, 163k.
    // Low builds as well in fewer steps, so it costs less overall. The tools it sends mean this runs
    // on the Responses API (AIR-16).
    defaultEffort: 'low',
  },
  {
    id: 'lessons',
    label: 'Lessons',
    description: 'Making lessons, Kinbot in Lesson Builder, and grading written answers',
    capabilities: ['lesson-gen', 'grade-answer', 'lesson-builder'],
    // Lesson Builder's chat sends tools, so without a level it would run at none (HAT-762); Low is
    // GPT-6 Luna's own level, which the lesson's writing already runs at.
    defaultEffort: 'low',
    hostedOnly: true,
  },
  {
    // HAT-761: its own task, so the device's Assistant chat choice (a model on this computer, say)
    // can't stop the feed builder, whose tools need Kindredly AI.
    id: 'feeds',
    label: 'Learning feeds',
    description: 'Kinbot in the feed builder, and writing the feed',
    capabilities: ['feed-builder', 'track-gen'],
    // The chat sends tools, so without a level it would run at none; it passed the feed builder
    // eval at low, the assistant's level, which it ran on before it had a task of its own.
    defaultEffort: 'low',
    hostedOnly: true,
  },
  {
    id: 'create',
    label: 'Create with AI',
    description: 'New collections and suggested items',
    capabilities: ['collection-gen', 'item-suggest'],
  },
  {
    id: 'wikipedia',
    label: 'Wikipedia deep dive',
    capabilities: ['wiki-plan', 'wiki-draft', 'wiki-verify'],
  },
  {
    id: 'quick',
    label: 'Quick tasks',
    description: 'Names, tags, image prompts, and pulling details from a page',
    capabilities: [
      'image-prompt',
      'image-vet',
      'summarize',
      'thing-extract',
      'entity-suggest',
      'attr-improve',
      'text-rewrite',
      'content-extract',
    ],
  },
];

export function getAiTask(id: string): AiTask | null {
  return AI_TASKS.find((t) => t.id === id) ?? null;
}

/** The task a capability belongs to. Every routed capability is in exactly one. */
export function taskForCapability(capabilityId: string): AiTask | null {
  return AI_TASKS.find((t) => t.capabilities.includes(capabilityId)) ?? null;
}

/** The capability a chat surface runs under, from the mode it sends. */
export function capabilityForChatMode(
  mode: string | null | undefined,
): 'app-editor' | 'feed-builder' | 'lesson-builder' | 'chat' {
  if (mode === 'app-editor') return 'app-editor';
  if (mode === 'feed-builder') return 'feed-builder';
  if (mode === 'lesson-builder') return 'lesson-builder';
  return 'chat';
}

// ---------------------------------------------------------------------------
// Models: names and fit
// ---------------------------------------------------------------------------

/** The name a hosted model goes by beside "Kindredly AI" (founder, 2026-09-24: picker and settings only). */
export const AI_MODEL_DISPLAY_NAMES: Record<string, string> = {
  'deepseek-flash': 'DeepSeek Flash',
  'gpt-6-luna': 'GPT-6 Luna',
  'deepseek-v4-pro': 'DeepSeek V4 Pro',
  'gpt-6-sol': 'GPT-6 Sol',
};

export function hostedModelDisplayName(modelId: string): string {
  const current = replaceRetiredModel(modelId);
  return AI_MODEL_DISPLAY_NAMES[current] || current;
}

/** What a model is called in a picker, a setting and a refusal: "Kindredly AI · GPT-6 Luna". */
export function engineDisplayLabel(engineId: string): string {
  const sep = engineId.indexOf(':');
  const kind = sep < 0 ? engineId : engineId.slice(0, sep);
  const model = sep < 0 ? '' : engineId.slice(sep + 1);
  if (kind === 'hosted') return `Kindredly AI · ${hostedModelDisplayName(model)}`;
  if (kind === 'ollama') return `Ollama · ${model}`;
  if (kind === 'browser') return 'Chrome’s built-in model';
  if (kind === 'browser-ff') return 'Firefox’s built-in model';
  if (kind === 'own') return model ? `Your own AI · ${model}` : 'Your own AI';
  return engineId;
}

/**
 * - `recommended`: the choice we would make.
 * - `works`: does the job; the reason says what it costs or lacks.
 * - `not-recommended`: can be chosen under Advanced, with the reason beside it; never a default.
 * - `unsupported`: cannot be chosen for this task, and a request is refused if it arrives there.
 */
export type AiModelFit = 'recommended' | 'works' | 'not-recommended' | 'unsupported';

export type AiModelFitEntry = {fit: AiModelFit; reason: string};

/**
 * Which kind of model an engine id is, for the fit table. Hosted models are rated one by one;
 * the rest by kind, because the model inside them is whatever the person runs.
 */
export type AiModelClass =
  | 'hosted:deepseek-flash'
  | 'hosted:gpt-6-luna'
  | 'hosted:deepseek-v4-pro'
  | 'hosted:gpt-6-sol'
  | 'ollama'
  | 'browser'
  | 'browser-ff'
  | 'own';

/** The hosted models the fit table rates one by one. */
const RATED_HOSTED_MODELS: readonly string[] = ['deepseek-flash', 'gpt-6-luna', 'deepseek-v4-pro', 'gpt-6-sol'];

export function modelClassForEngine(engineId: string): AiModelClass | 'hosted:other' | null {
  const sep = engineId.indexOf(':');
  const kind = sep < 0 ? engineId : engineId.slice(0, sep);
  if (kind === 'hosted') {
    const model = replaceRetiredModel(engineId.slice(sep + 1));
    return RATED_HOSTED_MODELS.includes(model) ? (`hosted:${model}` as AiModelClass) : 'hosted:other';
  }
  if (kind === 'ollama' || kind === 'browser' || kind === 'browser-ff' || kind === 'own') return kind;
  return null;
}

// Kindredly runs on GPT-6 Luna only (founder, 2026-10-15, HAT-503); the others are rated for a device
// that still names one, which the server answers on Luna.
const NOT_OFFERED: AiModelFitEntry = {fit: 'works', reason: 'No longer offered; answered on GPT-6 Luna.'};
const HOSTED_ONLY_REASON = 'Runs on Kindredly AI only.';
const BROWSER_TOO_SMALL = 'Too small to use the assistant’s tools safely.';
/** A family's own AI account (HAT-966): whatever model the family chose, not measured by Kindredly. */
const OWN_AI_WORKS: AiModelFitEntry = {fit: 'works', reason: 'Your family’s own AI account; results depend on the model.'};

/**
 * Per task, per model: how well it does and why.
 *
 * Evidence, written once rather than measured in the product (founder, 2026-09-24): the eval
 * reports in `tset-client/evals/reports` (chat and App Builder suites) and the model makers'
 * published benchmarks. On 2026-09-24 gpt-6-luna passed 29 of 32 assistant tasks (mean 97%) and all
 * 5 App Builder tasks at every reasoning level; gpt-6-sol passed the same 5 with a lower mean (96%
 * against 99%) and 29 of the 32 assistant tasks, where Luna reasoning at low passed 31. Chrome's built-in model was measured on 2026-09-11:
 * it called `blockallaccess` when asked how much time a child had left, and built a to-do list when
 * asked for a reading log. Update a row when an eval run says otherwise; run the harness with
 * `--engine hosted:<model>@<level>` to measure a reasoning level.
 *
 * DeepSeek Flash was the default from 2026-10-09 (HAT-288) to 2026-10-15, when Kindredly went back to
 * GPT-6 Luna alone (HAT-503): DeepSeek's terms don't rule out training on what it is sent and it
 * offers no data agreement. Measured that day: the assistant on Flash passed 69 of 70 runs. Lessons
 * on two Wikipedia topics, each checked against its source: GPT-6 Luna wrote them in 15 to 16
 * seconds and the check removed nothing; DeepSeek Flash took 51 to 105 seconds, the check removed a
 * sentence or two from each, and one of four came back with no quiz; DeepSeek V4 Pro took 124
 * seconds and the check removed four sentences and a question.
 */
export const AI_MODEL_FIT: Record<AiTaskId, Record<AiModelClass, AiModelFitEntry>> = {
  chat: {
    'hosted:deepseek-flash': NOT_OFFERED,
    'hosted:gpt-6-luna': {fit: 'recommended', reason: 'Handles the assistant’s tools and answers quickly.'},
    'hosted:deepseek-v4-pro': NOT_OFFERED,
    'hosted:gpt-6-sol': NOT_OFFERED,
    ollama: {fit: 'not-recommended', reason: 'Runs without tool calling; small models get steps wrong.'},
    browser: {fit: 'unsupported', reason: BROWSER_TOO_SMALL},
    'browser-ff': {fit: 'unsupported', reason: BROWSER_TOO_SMALL},
    own: OWN_AI_WORKS,
  },
  'app-builder': {
    'hosted:deepseek-flash': NOT_OFFERED,
    'hosted:gpt-6-luna': {fit: 'recommended', reason: 'Builds apps well, in few steps.'},
    'hosted:deepseek-v4-pro': NOT_OFFERED,
    'hosted:gpt-6-sol': NOT_OFFERED,
    ollama: {fit: 'not-recommended', reason: 'Only large coding models manage app code.'},
    browser: {fit: 'unsupported', reason: 'Can’t build apps: it copies the examples instead of writing code.'},
    'browser-ff': {fit: 'unsupported', reason: 'Can’t build apps: too small to write code.'},
    own: OWN_AI_WORKS,
  },
  lessons: {
    'hosted:deepseek-flash': NOT_OFFERED,
    'hosted:gpt-6-luna': {fit: 'recommended', reason: 'Writes a lesson in about 15 seconds, close to its sources.'},
    'hosted:deepseek-v4-pro': NOT_OFFERED,
    'hosted:gpt-6-sol': NOT_OFFERED,
    ollama: {fit: 'unsupported', reason: HOSTED_ONLY_REASON},
    browser: {fit: 'unsupported', reason: HOSTED_ONLY_REASON},
    'browser-ff': {fit: 'unsupported', reason: HOSTED_ONLY_REASON},
    own: {fit: 'unsupported', reason: HOSTED_ONLY_REASON},
  },
  // Measured 2026-10-25 on the feed builder eval (--suite feeds, 8 tasks): gpt-6-luna 8/8.
  feeds: {
    'hosted:deepseek-flash': NOT_OFFERED,
    'hosted:gpt-6-luna': {fit: 'recommended', reason: 'Plans and writes a feed close to its sources.'},
    'hosted:deepseek-v4-pro': NOT_OFFERED,
    'hosted:gpt-6-sol': NOT_OFFERED,
    ollama: {fit: 'unsupported', reason: HOSTED_ONLY_REASON},
    browser: {fit: 'unsupported', reason: HOSTED_ONLY_REASON},
    'browser-ff': {fit: 'unsupported', reason: HOSTED_ONLY_REASON},
    own: {fit: 'unsupported', reason: HOSTED_ONLY_REASON},
  },
  create: {
    'hosted:deepseek-flash': NOT_OFFERED,
    'hosted:gpt-6-luna': {fit: 'recommended', reason: 'Writes many items without losing the thread.'},
    'hosted:deepseek-v4-pro': NOT_OFFERED,
    'hosted:gpt-6-sol': NOT_OFFERED,
    ollama: {fit: 'not-recommended', reason: 'Long output; small models drift or repeat themselves.'},
    browser: {fit: 'unsupported', reason: 'Too small for long output with many items.'},
    'browser-ff': {fit: 'unsupported', reason: 'Too small for long output with many items.'},
    own: OWN_AI_WORKS,
  },
  wikipedia: {
    'hosted:deepseek-flash': NOT_OFFERED,
    'hosted:gpt-6-luna': {fit: 'recommended', reason: 'Quotes its sources accurately.'},
    'hosted:deepseek-v4-pro': NOT_OFFERED,
    'hosted:gpt-6-sol': NOT_OFFERED,
    ollama: {fit: 'not-recommended', reason: 'Small models misquote sources, and the check rejects them.'},
    browser: {fit: 'unsupported', reason: 'Can’t quote sources word for word.'},
    'browser-ff': {fit: 'unsupported', reason: 'Can’t quote sources word for word.'},
    own: OWN_AI_WORKS,
  },
  quick: {
    'hosted:deepseek-flash': NOT_OFFERED,
    'hosted:gpt-6-luna': {fit: 'recommended', reason: 'Fast and accurate for short tasks.'},
    'hosted:deepseek-v4-pro': NOT_OFFERED,
    'hosted:gpt-6-sol': NOT_OFFERED,
    ollama: {fit: 'works', reason: 'Private, on your own model.'},
    browser: {fit: 'works', reason: 'Private and free; long pages are shortened first.'},
    'browser-ff': {fit: 'unsupported', reason: 'Can’t return the structured answers these tasks need.'},
    own: OWN_AI_WORKS,
  },
};

/**
 * How well `engineId` does `taskId`. A hosted model the table does not name yet counts as working,
 * so adding a model to the allowlist never makes a task refuse it.
 */
export function modelFitFor(taskId: AiTaskId, engineId: string): AiModelFitEntry {
  const cls = modelClassForEngine(engineId);
  if (!cls) return {fit: 'unsupported', reason: 'Not a model Kindredly knows how to use.'};
  if (cls === 'hosted:other') return {fit: 'works', reason: ''};
  return AI_MODEL_FIT[taskId][cls];
}

/** True when a person may pick this model for this task. `not-recommended` stays pickable. */
export function isModelAllowedForTask(taskId: AiTaskId, engineId: string): boolean {
  return modelFitFor(taskId, engineId).fit !== 'unsupported';
}

/**
 * The reasoning level a hosted request for this task is sent with: the person's override on this
 * device, else the task's own, else the model's (undefined = let the model's level apply).
 */
export function effectiveReasoningEffort(
  task: AiTask | null,
  modelId: string,
  override?: unknown,
): AiReasoningEffort | undefined {
  return (
    parseReasoningEffort(override) ??
    task?.defaultEffort ??
    (AI_MODEL_REASONING_EFFORT as Record<string, AiReasoningEffort>)[replaceRetiredModel(modelId)]
  );
}
