/**
 * Connected AI apps, end-to-end encrypted connections (HAT-616, MCP-13…16;
 * docs/proposals/connected-ai-apps.md → The sealed channel). The server forwards these envelopes and
 * cannot open them; `tset-client/src/crypto/sealedChannel/sealedChannel.ts` seals and opens them.
 */

/** One sealed call or reply. `rid` is the program's own request id; the reply carries the same. */
export interface McpRelaySealedEnvelope {
  format: 'mcprelay-v1';
  alg: 'AES-GCM';
  rid: string;
  iv: string;
  data: string;
}

/** A sealed call, sent down the answering device's stream as the `mcpRelayFrame` event. */
export interface McpRelaySealedFrame {
  frameId: string;
  replyTo: string;
  connectionId: string;
  /** The adult the connection belongs to; see `McpRelayFrame.userId`. */
  userId?: string;
  sealed: true;
  op: 'sealed';
  envelope: McpRelaySealedEnvelope;
}

/** What `/mcpRelay/pairing/redeem` gives the program: its token and the device's public key. */
export interface McpRelayPairingRedeemed {
  connectionId: string;
  /** The program's credential (`kmr_…`), shown only here. */
  token: string;
  extPub: string;
}

/**
 * A file an AI app sends by link (HAT-964). `waiting`: nothing sent yet; `received`: held on the
 * server until a Kindredly of the adult takes it; `done`: in the library; `failed`: it could not be
 * added. A link that has run out reads as `expired`.
 */
export type McpUploadStatus = 'waiting' | 'received' | 'done' | 'failed' | 'expired';

/** One upload link as the adult's Kindredly reads it. `blob` is what it is for, encrypted with their key. */
export interface McpUploadView {
  _id: string;
  blob: string;
  status: Exclude<McpUploadStatus, 'expired'>;
  filename?: string;
  fileType?: string;
  size?: number;
  expiresAt: string;
}

/** A sent file, taken by one Kindredly to file it: the view and the bytes, base64. */
export interface McpUploadClaim extends McpUploadView {
  data: string;
}
