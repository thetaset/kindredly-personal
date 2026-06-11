export function normalizeEncInfoVersion(encInfo: any): 1 | 2 {
  const v = typeof encInfo?.v === 'number' ? encInfo.v : 1;
  return v >= 2 ? 2 : 1;
}

function looksLikeCiphertextString(val: string): boolean {
  const trimmed = val.trim();
  // AES-GCM ciphertext base64 is not tiny; this avoids false positives.
  if (trimmed.length < 24) return false;
  return /^[A-Za-z0-9+/_-]*={0,2}$/.test(trimmed);
}

function looksLikeEncryptedValue(val: unknown): boolean {
  if (typeof val === 'string') {
    return looksLikeCiphertextString(val);
  }
  if (val && typeof val === 'object') {
    const obj = val as any;
    const cipher =
      typeof obj.encryptedData === 'string'
        ? obj.encryptedData
        : typeof obj.encrypted === 'string'
          ? obj.encrypted
          : null;
    if (typeof cipher === 'string' && looksLikeCiphertextString(cipher)) return true;

    // Common pattern: { encryptedData, iv } wrappers nested in payloads.
    for (const v of Object.values(obj)) {
      if (looksLikeEncryptedValue(v)) return true;
    }
  }
  if (Array.isArray(val)) {
    for (const v of val) {
      if (looksLikeEncryptedValue(v)) return true;
    }
  }
  return false;
}

export function payloadContainsCiphertext(payload: any): boolean {
  return looksLikeEncryptedValue(payload);
}

function encInfoKeyFingerprint(key: any): string {
  // Preserve exact wrapped key bytes; changing an existing entry is effectively a rekey.
  return JSON.stringify({
    unwrappingKeyId: key?.unwrappingKeyId ?? null,
    wrappedEncKey: key?.wrappedEncKey ?? null,
  });
}

export function assertEncryptedUpdateHasEncInfo(params: {currentEncInfo: any; nextEncInfo: any; context: string}) {
  const {currentEncInfo, nextEncInfo, context} = params;
  if (currentEncInfo && nextEncInfo == null) {
    throw new Error(`${context} is encrypted, cannot update without encInfo`);
  }
}

/**
 * Safe-by-default server guardrail.
 *
 * Core idea (Proposal A):
 * - If a write includes ciphertext (rewrite), encInfo may legitimately change (version/iv/keys).
 * - If a write does NOT include ciphertext (patch/metadata-only), encInfo must not change in ways
 *   that can corrupt existing ciphertext (no version/iv changes; keys additive-only).
 */
export function assertEncInfoUpdateIsSafe(params: {
  currentEncInfo: any;
  nextEncInfo: any;
  context: string;
  payloadForCiphertextCheck?: any;
}) {
  const {currentEncInfo, nextEncInfo, context, payloadForCiphertextCheck} = params;
  if (!currentEncInfo || typeof currentEncInfo !== 'object') return;
  if (nextEncInfo == null) {
    throw new Error(`${context} is encrypted, cannot update without encInfo`);
  }
  if (typeof nextEncInfo !== 'object') {
    throw new Error(`Invalid encInfo update for ${context} (missing encInfo object)`);
  }

  const ciphertextPresent = payloadForCiphertextCheck != null && payloadContainsCiphertext(payloadForCiphertextCheck);

  // If ciphertext is present, we assume the client is rewriting encrypted bytes to match encInfo.
  // Do not block on version/iv/key rotation.
  if (ciphertextPresent) return;

  // Patch/metadata-only update: enforce strict immutability to avoid corruption.
  const currentV = normalizeEncInfoVersion(currentEncInfo);
  const nextV = normalizeEncInfoVersion(nextEncInfo);
  if (currentV !== nextV) {
    throw new Error(
      `Unsafe encInfo update for ${context}: version change ${currentV} -> ${nextV} is not allowed without ciphertext rewrite`,
    );
  }

  if (currentV === 1) {
    const currentIv = typeof currentEncInfo?.iv === 'string' ? currentEncInfo.iv : null;
    const nextIv = typeof (nextEncInfo as any)?.iv === 'string' ? (nextEncInfo as any).iv : null;
    if (currentIv && nextIv && currentIv !== nextIv) {
      throw new Error(`Unsafe encInfo update for ${context}: iv change is not allowed without ciphertext rewrite`);
    }
  }

  const currentKeys: any[] = Array.isArray((currentEncInfo as any)?.keys) ? (currentEncInfo as any).keys : [];
  const nextKeys: any[] = Array.isArray((nextEncInfo as any)?.keys) ? (nextEncInfo as any).keys : [];

  const nextFingerprints = new Set(nextKeys.map(encInfoKeyFingerprint));
  for (const k of currentKeys) {
    if (!nextFingerprints.has(encInfoKeyFingerprint(k))) {
      throw new Error(
        `Unsafe encInfo update for ${context}: cannot remove or modify existing wrapping keys without ciphertext rewrite`,
      );
    }
  }
}
