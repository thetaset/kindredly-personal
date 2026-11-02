/**
 * UNL-6: the client names a passkey's unlock copy and the server removes it by the same name, in
 * two runtimes. If the two ever disagree, removing a passkey leaves its copy behind, or a new
 * passkey's copy lands on another's.
 */
import {createHash} from 'crypto';

import {
  credentialTagFromDigest,
  isPasskeyKeyId,
  passkeyKeyId,
  passkeyKeyIdsForCredential,
  passkeyKeyVariant,
} from '../src/passkey-unlock-keys';

const tagOf = (credentialId: string) => credentialTagFromDigest(createHash('sha256').update(credentialId).digest());

describe('passkey unlock keys', () => {
  it('names a passkey copy after the passkey, in the key id format the client writes', () => {
    const tag = tagOf('cred-A');
    expect(tag).toMatch(/^[0-9a-f]{16}$/);
    expect(passkeyKeyId('u1', 'discoverable', tag)).toBe(`user:u1:sym_passkeyDiscoverable-${tag}.v0`);
    expect(passkeyKeyId('u1', 'legacy', tag)).toBe(`user:u1:sym_passkey-${tag}.v0`);
  });

  it('keeps the shared names from before UNL-6', () => {
    expect(passkeyKeyId('u1', 'legacy')).toBe('user:u1:sym_passkey.v0');
    expect(passkeyKeyId('u1', 'discoverable')).toBe('user:u1:sym_passkeyDiscoverable.v0');
  });

  it('gives two passkeys different names', () => {
    expect(tagOf('cred-A')).not.toBe(tagOf('cred-B'));
  });

  it('says which salt a copy was made with, shared or per passkey', () => {
    const tag = tagOf('cred-A')
    expect(passkeyKeyVariant('u1', `user:u1:sym_passkeyDiscoverable-${tag}.v0`)).toBe('discoverable')
    expect(passkeyKeyVariant('u1', 'user:u1:sym_passkeyDiscoverable.v0')).toBe('discoverable')
    expect(passkeyKeyVariant('u1', `user:u1:sym_passkey-${tag}.v0`)).toBe('legacy')
    expect(passkeyKeyVariant('u1', 'user:u1:sym_default.v0')).toBeNull()
  });

  it('recognises this person’s passkey keys, shared or per passkey, and nothing else', () => {
    const tag = tagOf('cred-A');
    for (const id of [...passkeyKeyIdsForCredential('u1', tag), 'user:u1:sym_passkey.v0', 'user:u1:sym_passkeyDiscoverable.v0']) {
      expect(isPasskeyKeyId('u1', id)).toBe(true);
    }
    for (const id of [
      'userPassword',
      'user:u1:sym_default.v0',
      'user:u1:sym_recovery.v0',
      `user:u2:sym_passkey-${tag}.v0`,
      'user:u1:sym_passkey-notHex.v0',
      'user:u1:sym_passkeyDiscoverable-abc.v0',
      undefined,
    ]) {
      expect(isPasskeyKeyId('u1', id)).toBe(false);
    }
  });
});
