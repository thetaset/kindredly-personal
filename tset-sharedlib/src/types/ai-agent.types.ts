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
}

export interface AgentSession {
  id: string;
  response: AgentResponse;
  history: AgentHistoryRecord[];
  step: number;
  done: boolean;
}
