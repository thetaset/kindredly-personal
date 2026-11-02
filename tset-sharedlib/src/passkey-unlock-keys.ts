/**
 * Each passkey gets its own unlock copy of a person's secret key (UNL-6,
 * docs/trackers/new-device-unlock-tracker.md). The key that wraps it is named after the passkey, so
 * adding a passkey never replaces another passkey's copy, and removing one removes only its own.
 *
 * The name carries a tag: the first 16 hex characters of SHA-256 of the credential id. The client
 * computes it with Web Crypto when it saves a copy; the server with node:crypto when a passkey is
 * removed. Both build the id with `passkeyKeyId`, in the format `CryptoUtils.keyFieldsToId` writes.
 *
 * Before UNL-6 every passkey shared the two names without a tag, so each new one replaced the last
 * one's copy. Those copies still unlock.
 */
export type PasskeyKeyVariant = 'legacy' | 'discoverable';

const PASSKEY_KEY_NAME = /^(passkey|passkeyDiscoverable)(-[0-9a-f]{16})?$/;

export function passkeyKeyName(variant: PasskeyKeyVariant, credentialTag?: string): string {
  const base = variant === 'discoverable' ? 'passkeyDiscoverable' : 'passkey';
  return credentialTag ? `${base}-${credentialTag}` : base;
}

export function passkeyKeyId(userId: string, variant: PasskeyKeyVariant, credentialTag?: string): string {
  return `user:${userId}:sym_${passkeyKeyName(variant, credentialTag)}.v0`;
}

/** Both ids a passkey's copies are wrapped with, for removing them along with the passkey. */
export function passkeyKeyIdsForCredential(userId: string, credentialTag: string): string[] {
  return [passkeyKeyId(userId, 'legacy', credentialTag), passkeyKeyId(userId, 'discoverable', credentialTag)];
}

/** Whether a wrapping key id is one of this person's passkey keys: a shared one or a passkey's own. */
export function isPasskeyKeyId(userId: string, keyId: string | null | undefined): boolean {
  return passkeyKeyVariant(userId, keyId) !== null;
}

/** Which PRF salt a passkey key's copy was made with, or null when it isn't this person's passkey key. */
export function passkeyKeyVariant(userId: string, keyId: string | null | undefined): PasskeyKeyVariant | null {
  const prefix = `user:${userId}:sym_`;
  if (!keyId || !keyId.startsWith(prefix) || !keyId.endsWith('.v0')) return null;
  const match = PASSKEY_KEY_NAME.exec(keyId.slice(prefix.length, -'.v0'.length));
  if (!match) return null;
  return match[1] === 'passkeyDiscoverable' ? 'discoverable' : 'legacy';
}

/** The tag from SHA-256 of the credential id: its first 8 bytes as hex. */
export function credentialTagFromDigest(sha256OfCredentialId: Uint8Array): string {
  return Array.from(sha256OfCredentialId.subarray(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
