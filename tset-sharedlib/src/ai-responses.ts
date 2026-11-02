/**
 * Chat Completions requests as Responses API requests (AIR-16, HAT-071).
 *
 * GPT-6 models on Chat Completions call tools only at `reasoning_effort: none`; the Responses API
 * has no such limit. These pure translations are shared by the server's chat stream
 * (`ai_responses_stream.ts`) and the eval harness, so a score measured on the harness is a
 * statement about what production sends.
 *
 * `store: false` is deliberate: Chat Completions stores nothing by default and the Responses API
 * stores every response unless told not to. A family's conversation is not kept at OpenAI.
 */

import type { AiReasoningEffort } from "./ai-task-models";

export type ReasoningEffortLevel = AiReasoningEffort;

type ChatToolCall = {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};
type ChatMessage = {
  role: string;
  content?: string | null | Array<{ type?: string; text?: string }>;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
};
type ChatTool = {
  type: "function";
  function: { name: string; description?: string; parameters?: any };
};

function textOf(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("");
  }
  return "";
}

/**
 * Chat Completions messages as Responses input items.
 *
 * An assistant turn that called a tool becomes a `function_call` item and its result a
 * `function_call_output` item, joined by the same call id the client already keeps. System
 * messages stay system messages wherever they sit: the envelope and the agent loop put tool
 * results and context there, and moving them would change what the model reads.
 */
export function toResponsesInput(messages: ChatMessage[]): any[] {
  const input: any[] = [];
  for (const message of messages || []) {
    if (!message || typeof message !== "object") continue;

    if (message.role === "tool") {
      input.push({
        type: "function_call_output",
        call_id: String(message.tool_call_id || ""),
        output: textOf(message.content),
      });
      continue;
    }

    if (
      message.role === "assistant" &&
      Array.isArray(message.tool_calls) &&
      message.tool_calls.length > 0
    ) {
      const text = textOf(message.content);
      if (text) input.push({ role: "assistant", content: text });
      for (const call of message.tool_calls) {
        input.push({
          type: "function_call",
          call_id: String(call?.id || ""),
          name: String(call?.function?.name || ""),
          arguments: String(call?.function?.arguments ?? "{}"),
        });
      }
      continue;
    }

    const role =
      message.role === "assistant" ||
      message.role === "system" ||
      message.role === "developer"
        ? message.role
        : "user";
    input.push({ role, content: textOf(message.content) });
  }
  return input;
}

/**
 * Chat Completions tool declarations as Responses function tools. `strict: false` because the
 * tool schemas were written for Chat Completions, where strict mode is off, and strict mode
 * rejects the optional properties most of them have.
 */
export function toResponsesTools(tools: ChatTool[]): any[] {
  return (tools || [])
    .filter((tool) => tool?.type === "function" && tool.function?.name)
    .map((tool) => ({
      type: "function",
      name: tool.function.name,
      ...(tool.function.description
        ? { description: tool.function.description }
        : {}),
      parameters: tool.function.parameters ?? {
        type: "object",
        properties: {},
      },
      strict: false,
    }));
}

export function toResponsesToolChoice(toolChoice: unknown): any {
  if (
    toolChoice === "none" ||
    toolChoice === "required" ||
    toolChoice === "auto"
  )
    return toolChoice;
  const named = (toolChoice as any)?.function?.name;
  if (typeof named === "string" && named)
    return { type: "function", name: named };
  return "auto";
}

/** The Responses request for a tool turn that reasons. */
export function buildResponsesRequest(input: {
  model: string;
  messages: ChatMessage[];
  tools: ChatTool[];
  toolChoice?: unknown;
  reasoningEffort: ReasoningEffortLevel;
  maxOutputTokens?: number;
  /** False for a one-shot call (the eval harness); the chat route streams. */
  stream?: boolean;
}): Record<string, any> {
  return {
    model: input.model,
    input: toResponsesInput(input.messages),
    tools: toResponsesTools(input.tools),
    tool_choice: toResponsesToolChoice(input.toolChoice),
    // One action per turn preserves the existing agent-loop model, as on Chat Completions.
    parallel_tool_calls: false,
    reasoning: { effort: input.reasoningEffort },
    ...(input.maxOutputTokens
      ? { max_output_tokens: input.maxOutputTokens }
      : {}),
    store: false,
    stream: input.stream ?? true,
  };
}

/**
 * Responses usage in the Chat Completions shape `recordScopedUsage` and `usageDetailsMeta` read.
 * Reasoning tokens are already inside `output_tokens`, as they are inside `completion_tokens`.
 */
export function chatUsageFromResponses(usage: any): any {
  if (!usage) return null;
  const prompt = Number(usage.input_tokens) || 0;
  const completion = Number(usage.output_tokens) || 0;
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: Number(usage.total_tokens) || prompt + completion,
    prompt_tokens_details: {
      cached_tokens: Number(usage.input_tokens_details?.cached_tokens) || 0,
    },
    completion_tokens_details: {
      reasoning_tokens:
        Number(usage.output_tokens_details?.reasoning_tokens) || 0,
    },
  };
}
