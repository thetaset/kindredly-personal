import {createHmac, randomBytes, timingSafeEqual} from 'crypto';

/**
 * Authenticator codes (RFC 6238 TOTP: HMAC-SHA1, 30-second steps, 6 digits), the kind every
 * authenticator app reads from a base32 key. Used for the admin sign-in's second step
 * (docs/guides/admin-lockdown.md).
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_STEP_SECONDS = 30;

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Not a base32 key.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The code for one time step. `digits` is 6 for authenticator apps; the RFC's vectors use 8. */
export function totpAt(secret: Buffer, step: number, digits = 6): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', secret).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function currentStep(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
}

/**
 * The step a code belongs to, when it matches the current step or one either side (a phone clock a
 * little off); otherwise null. The caller refuses a step it has already accepted, so a code can't
 * be used twice.
 */
export function matchTotp(base32Secret: string, code: string, nowMs = Date.now(), window = 1): number | null {
  const digits = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(digits)) return null;
  const secret = base32Decode(base32Secret);
  const now = currentStep(nowMs);
  for (let delta = -window; delta <= window; delta++) {
    const expected = Buffer.from(totpAt(secret, now + delta));
    if (timingSafeEqual(expected, Buffer.from(digits))) return now + delta;
  }
  return null;
}

/** The link an authenticator app or Apple Passwords opens to add the key. */
export function otpauthUri(base32Secret: string, account: string, issuer = 'Kindredly admin'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${base32Secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${TOTP_STEP_SECONDS}`;
}
