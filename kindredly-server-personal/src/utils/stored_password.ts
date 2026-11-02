import crypto from 'crypto';
import {hashString, secureCompareSecrets} from '@/utils/crypto_util';

/**
 * Stored passwords and PINs, read in either of two forms (HAT-848).
 *
 * - **v1**, every row today: `hashString(sent)`. PBKDF2-SHA512, 1,000 rounds, one salt for everyone, hex.
 * - **v2**: `v2$<rounds>$<salt hex>$<hash hex>`. PBKDF2-SHA512 of the v1 value, with that person's own
 *   salt and many more rounds. Because it starts from the stored v1 value, a row can be changed
 *   without the person's password, and the apps keep sending exactly what they send today.
 *
 * Writing v2 is off until the founder turns on `STORED_SECRET_V2` (`services/stored_secret.service.ts`).
 * While it is off every write stores v1, so a server without this code can still read every row.
 */
const V2_PREFIX = 'v2$';
/** For the upgrade, when it's turned on: OWASP's figure for PBKDF2-SHA512, to be measured on our servers. */
export const V2_ROUNDS = 210_000;
const MIN_ROUNDS = 1_000;
const MAX_ROUNDS = 5_000_000;
const HEX = /^[0-9a-f]+$/;

function pbkdf2Hex(input: string, saltHex: string, rounds: number): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(input, Buffer.from(saltHex, 'hex'), rounds, 64, 'sha512', (error, key) =>
      error ? reject(error) : resolve(key.toString('hex')),
    );
  });
}

function parseV2(stored: string): {rounds: number; saltHex: string; hashHex: string} | null {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'v2') return null;
  const rounds = Number(parts[1]);
  const [, , saltHex, hashHex] = parts;
  if (!Number.isInteger(rounds) || rounds < MIN_ROUNDS || rounds > MAX_ROUNDS) return null;
  if (saltHex.length < 32 || !HEX.test(saltHex) || hashHex.length !== 128 || !HEX.test(hashHex)) return null;
  return {rounds, saltHex, hashHex};
}

export function isV2StoredSecret(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(V2_PREFIX);
}

/**
 * Whether `sent` (what the app sent: its hash of the password, or a PIN) matches the stored value,
 * in either form. A v1 row gives exactly the answer the old `secureCompareSecrets(stored, hashString(sent))`
 * gave. Never throws: a row it can't read doesn't match.
 */
export async function storedSecretMatches(
  stored: string | null | undefined,
  sent: string | null | undefined,
): Promise<boolean> {
  if (!stored || sent == null) return false;
  const v1 = hashString(String(sent));
  if (!isV2StoredSecret(stored)) return secureCompareSecrets(stored, v1);

  return isWrapOf(stored, v1);
}

/** Whether a v2 row was made from this v1 value. Never throws. */
export async function isWrapOf(v2: string, v1: string): Promise<boolean> {
  const parsed = parseV2(v2);
  if (!parsed || !v1) return false;
  try {
    return secureCompareSecrets(parsed.hashHex, await pbkdf2Hex(v1, parsed.saltHex, parsed.rounds));
  } catch {
    return false;
  }
}

/** The salt in a v2 row, which names that one wrap; null for anything else. */
export function v2SaltOf(stored: string | null | undefined): string | null {
  return isV2StoredSecret(stored) ? (parseV2(stored as string)?.saltHex ?? null) : null;
}

/** The v2 form of a stored v1 value. Only `stored_secret.service.ts` calls it, after keeping the v1. */
export async function wrapStoredSecret(v1: string, rounds = V2_ROUNDS): Promise<string> {
  if (!v1 || isV2StoredSecret(v1)) throw new Error('wrapStoredSecret takes a v1 value');
  // A row with rounds outside what parseV2 reads could never be checked again.
  if (!Number.isInteger(rounds) || rounds < MIN_ROUNDS || rounds > MAX_ROUNDS) {
    throw new Error(`wrapStoredSecret: rounds must be ${MIN_ROUNDS}–${MAX_ROUNDS}`);
  }
  const saltHex = crypto.randomBytes(16).toString('hex');
  return `${V2_PREFIX}${rounds}$${saltHex}$${await pbkdf2Hex(v1, saltHex, rounds)}`;
}
