/**
 * AI agent system types for chat, actions, and sessions
 */

export interface AIInputMessage {
  input?: string;
  ctx?: any;
  actionResult?: AIActionResult;
}

export interface AIActionCall {
  actionId: string;
  params: any;
}

export interface AIActionResult {
  actionId: string;
  params: any;
  results: any;
}

export interface AIResponseMsg {
  respToUser?: string;
  respToUserData?: any;
  action?: AIActionCall;
  doNotWaitForUser?: boolean;
}

export interface AgentInput {
  id: string;
  sessionId?: number;
  type: 'userMessage' | 'actionResult' | 'error' | 'done' | 'userCommand';
  data?: any;
  options?: any;
  done: boolean;
}

export interface AgentResponse {
  id: string;
  srcId?: string;
  srcType?: string;
  responseMsg?: AIResponseMsg;
}

export interface AgentHistoryRecord {
  response: AgentResponse;
  input: AgentInput;
  /**
   * Per-step agent activity within this turn (tool calls + their results),
   * in order. Older records without it stay readable — never migrate stored
   * sessions. Results are size-capped at write time.
   */
  steps?: Array<{
    kind: 'assistant_text' | 'tool_call' | 'tool_result';
    callId?: string;
    name?: string;
    arguments?: any;
    text?: string;
    result?: any;
    truncated?: boolean;
  }>;
}

export interface AgentSession {
  id: string;
  response: AgentResponse;
  history: AgentHistoryRecord[];
  step: number;
  done: boolean;
  /** Explicit display name (app-editor sessions use the app's item name). */
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}
