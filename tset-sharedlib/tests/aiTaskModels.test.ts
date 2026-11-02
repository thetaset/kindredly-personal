import {AI_CAPABILITIES} from '../src/ai-capabilities';
import {AI_MODEL_ALLOWLIST} from '../src/ai-text-models';
import {
  AI_MODEL_DISPLAY_NAMES,
  AI_MODEL_FIT,
  AI_TASKS,
  capabilityForChatMode,
  effectiveReasoningEffort,
  engineDisplayLabel,
  getAiTask,
  isModelAllowedForTask,
  modelClassForEngine,
  modelFitFor,
  parseReasoningEffort,
  taskForCapability,
} from '../src/ai-task-models';

/**
 * Which model each task runs on, and how much it reasons (HAT-071). The table is read by the
 * transport (to refuse a model its task cannot use) and by every model picker, so a gap here
 * is a picker that offers something the transport then refuses, or the other way round.
 */
describe('AI tasks and model fit', () => {
  it('routes only capabilities that exist, each in exactly one task', () => {
    const known = new Set(AI_CAPABILITIES.map((c) => c.id));
    const seen = new Map<string, string>();
    for (const task of AI_TASKS) {
      for (const capability of task.capabilities) {
        expect(known.has(capability)).toBe(true);
        expect(seen.get(capability)).toBeUndefined();
        seen.set(capability, task.id);
      }
    }
  });

  it('rates every hosted model, and every private kind, for every task', () => {
    for (const task of AI_TASKS) {
      for (const model of AI_MODEL_ALLOWLIST) {
        expect(AI_MODEL_FIT[task.id][`hosted:${model}` as keyof (typeof AI_MODEL_FIT)['chat']]).toBeDefined();
      }
      for (const kind of ['ollama', 'browser', 'browser-ff'] as const) {
        expect(AI_MODEL_FIT[task.id][kind].reason).not.toBe('');
      }
    }
  });

  it('names every hosted model beside Kindredly AI', () => {
    for (const model of AI_MODEL_ALLOWLIST) {
      expect(AI_MODEL_DISPLAY_NAMES[model]).toBeTruthy();
    }
    expect(engineDisplayLabel('hosted:gpt-6-luna')).toBe('Kindredly AI · GPT-6 Luna');
    expect(engineDisplayLabel('ollama:llama3.2')).toBe('Ollama · llama3.2');
  });

  it("never lets the browser's model build apps or run the assistant", () => {
    for (const engine of ['browser:gemini-nano', 'browser-ff:Mozilla/Qwen2.5-0.5B-Instruct']) {
      expect(isModelAllowedForTask('app-builder', engine)).toBe(false);
      expect(isModelAllowedForTask('chat', engine)).toBe(false);
    }
    // Every task Kindredly AI can do, its models can be chosen for.
    for (const task of AI_TASKS) {
      for (const model of AI_MODEL_ALLOWLIST) {
        expect(isModelAllowedForTask(task.id, `hosted:${model}`)).toBe(true);
      }
    }
  });

  it('keeps lessons on Kindredly AI, where the feature runs', () => {
    expect(getAiTask('lessons')?.hostedOnly).toBe(true);
    expect(isModelAllowedForTask('lessons', 'ollama:llama3.2')).toBe(false);
  });

  it('reads a retired model as the one that replaced it', () => {
    expect(modelClassForEngine('hosted:gpt-5.4')).toBe('hosted:gpt-6-sol');
    // Sol is no longer offered (HAT-503); a device that still names it is told so.
    expect(modelFitFor('lessons', 'hosted:gpt-5.4')).toMatchObject({
      fit: 'works',
      reason: expect.stringMatching(/^No longer offered/),
    });
    expect(modelClassForEngine('hosted:some-future-model')).toBe('hosted:other');
    expect(modelFitFor('chat', 'hosted:some-future-model').fit).toBe('works');
    expect(modelFitFor('chat', 'nonsense').fit).toBe('unsupported');
  });

  it('finds the task for a capability and for a chat mode', () => {
    expect(taskForCapability('app-editor')?.id).toBe('app-builder');
    expect(taskForCapability('thing-extract')?.id).toBe('quick');
    expect(taskForCapability('not-a-capability')).toBeNull();
    expect(capabilityForChatMode('app-editor')).toBe('app-editor');
    expect(capabilityForChatMode('guide')).toBe('chat');
    expect(capabilityForChatMode(undefined)).toBe('chat');
  });
});

describe('reasoning effort', () => {
  it('accepts only the levels a request may send', () => {
    expect(parseReasoningEffort('medium')).toBe('medium');
    expect(parseReasoningEffort('xhigh')).toBeUndefined();
    expect(parseReasoningEffort(3)).toBeUndefined();
  });

  it("uses this device's override, then the task's level, then the model's", () => {
    const appBuilder = getAiTask('app-builder');
    const quick = getAiTask('quick');
    expect(effectiveReasoningEffort(appBuilder, 'gpt-6-luna', 'high')).toBe('high');
    expect(effectiveReasoningEffort(appBuilder, 'gpt-6-luna', '')).toBe('low');
    expect(effectiveReasoningEffort(quick, 'gpt-6-luna', undefined)).toBe('low');
    expect(effectiveReasoningEffort(quick, 'gpt-6-sol', 'junk')).toBe('medium');
    // The server picks the model: nothing to go on but the task's own level.
    expect(effectiveReasoningEffort(quick, '', undefined)).toBeUndefined();
  });

  it('has the assistant reason a little, which answered more tasks in fewer steps', () => {
    expect(effectiveReasoningEffort(getAiTask('chat'), 'gpt-6-luna', undefined)).toBe('low');
    expect(effectiveReasoningEffort(getAiTask('chat'), 'gpt-6-luna', 'none')).toBe('none');
  });
});
