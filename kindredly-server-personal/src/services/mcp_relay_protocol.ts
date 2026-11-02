/**
 * The relay's MCP endpoint (HAT-616, docs/proposals/connected-ai-apps.md): stateless Streamable HTTP
 * with JSON responses, the same skeleton as `_internal/curation_mcp.ts`. It answers nothing about the
 * family itself — `tools/list` and `tools/call` go to one of the adult's open devices through
 * `McpRelayService.call`, and the device decides what is offered and allowed, the same way Kinbot's
 * gate does. While no device answers, `tools/list` gives the tools a device would offer an adult,
 * and a call says why it cannot run (HAT-812, HAT-878).
 *
 * Nothing here logs. See the header of `mcp_relay.service.ts`.
 */
import type {McpJsonRpcMessage, McpJsonRpcResponse} from 'tset-sharedlib/api';
import type {McpRelayChannelRow} from '@/db/mcp_relay_channel.repo';
import {McpRelayError, type McpRelayRefusal} from '@/services/mcp_relay.service';
import {MCP_RELAY_TOOLS} from 'tset-sharedlib/api/mcp-relay-tools.generated';

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const SERVER_INFO = {name: 'kindredly', title: 'Kindredly', version: '1.0.0'};

const INSTRUCTIONS =
  "Kindredly is a family's private library and parental controls app. These tools look things up in " +
  "the signed-in person's Kindredly. If the person allowed it, a few also make small changes that end " +
  "on their own (extra time, a pause, tonight's curfew); those tools say so, and anything bigger is " +
  "refused. A call works only while Kindredly is open on one of the person's devices; if a tool says " +
  'it is not open, ask them to open it. When you save something to their library, pass what they ' +
  'asked for (request) and, for something you made, a two-line summary, so they can find it again.';

export type McpRelayCall = (
  op: 'listTools' | 'callTool',
  name?: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;

type JsonRpcId = McpJsonRpcResponse['id'];

function negotiateVersion(requested: unknown): string {
  return typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : SUPPORTED_PROTOCOL_VERSIONS[0];
}

function result(id: JsonRpcId, value: unknown): McpJsonRpcResponse {
  return {jsonrpc: '2.0', id, result: value};
}

function error(id: JsonRpcId, code: number, message: string): McpJsonRpcResponse {
  return {jsonrpc: '2.0', id, error: {code, message}};
}

/** What the device sends for `listTools`, kept to MCP's tool shape. */
function toolsFrom(answer: unknown): unknown[] {
  const tools = (answer as {tools?: unknown})?.tools;
  return Array.isArray(tools) ? tools : [];
}

/**
 * While no device gives a list, the tools a device would offer an adult (HAT-812). An AI app does
 * not show the model an error from `tools/list`, so an error there read as a connector with no tools
 * and no reason. Listed instead, a call says why it cannot run ("open Kindredly"), and runs once a
 * device answers, in the same conversation. The change tools are listed too (HAT-878): the AI app
 * keeps this list for the whole chat, and a chat usually starts before the adult taps Agree.
 *
 * Only the read tools when the server refused for a reason no device can change (Connected AI apps
 * off, Family AI not On, not an adult, not granted): naming change tools that can never run reads as
 * the app being broken (MCP-5), and the read tools carry the reason when called.
 */
const REFUSED_FOR_GOOD: ReadonlySet<McpRelayRefusal> = new Set(['not_granted', 'ai_off', 'switch_off', 'not_adult']);

function offeredWithoutDevice(refusal?: unknown): unknown[] {
  const tools = MCP_RELAY_TOOLS as unknown as Array<{annotations?: {readOnlyHint?: boolean}}>;
  const forGood = refusal instanceof McpRelayError && REFUSED_FOR_GOOD.has(refusal.reason);
  return forGood ? tools.filter((t) => t.annotations?.readOnlyHint === true) : tools;
}

export async function handleRelayMcpMessage(
  message: McpJsonRpcMessage,
  call: McpRelayCall,
  /** Told what the AI app says it is (`initialize`'s `clientInfo`); a failure never fails the reply. */
  onClientInfo?: (clientInfo: unknown) => Promise<void>,
): Promise<McpJsonRpcResponse | null> {
  const id: JsonRpcId = message?.id ?? null;
  const method = message?.method;
  if (!method || typeof method !== 'string') return error(id, -32600, 'Invalid Request: missing method.');
  const isNotification = message.id === undefined || message.id === null;

  switch (method) {
    case 'initialize':
      if (onClientInfo) await onClientInfo(message.params?.clientInfo).catch(() => undefined);
      return result(id, {
        protocolVersion: negotiateVersion(message.params?.protocolVersion),
        capabilities: {tools: {listChanged: false}},
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;
    case 'ping':
      return result(id, {});
    case 'tools/list':
      try {
        // An empty list reads as a broken connector too; a call then says why it cannot run.
        const tools = toolsFrom(await call('listTools'));
        return result(id, {tools: tools.length > 0 ? tools : offeredWithoutDevice()});
      } catch (e) {
        return result(id, {tools: offeredWithoutDevice(e)});
      }
    case 'tools/call': {
      const name = message.params?.name;
      const args = (message.params?.arguments || {}) as Record<string, unknown>;
      if (!name || typeof name !== 'string') return error(id, -32602, 'Invalid params: tool name is required.');
      try {
        return result(id, await call('callTool', name, args));
      } catch (e) {
        // A failed call is a result with isError, so the AI app reads the sentence and acts on it.
        const text = e instanceof McpRelayError ? e.message : 'Kindredly could not run this request.';
        return result(id, {content: [{type: 'text', text: `Error: ${text}`}], isError: true});
      }
    }
    default:
      if (isNotification) return null;
      return error(id, -32601, `Method not found: ${method}`);
  }
}

/** Binds a connection to the relay call `handleRelayMcpMessage` needs. */
export function relayCallFor(
  channel: McpRelayChannelRow,
  relay: {
    call: (
      c: McpRelayChannelRow,
      op: 'listTools' | 'callTool',
      n?: string,
      a?: Record<string, unknown>,
    ) => Promise<unknown>;
  },
): McpRelayCall {
  return (op, name, args) => relay.call(channel, op, name, args);
}
