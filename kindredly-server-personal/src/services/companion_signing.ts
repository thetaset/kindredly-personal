import crypto from 'crypto';
import {config} from '@/config';

/**
 * The server's ECDSA P-256 key for statements a linked computer's root service acts on (HAT-766).
 *
 * The Companion runs as the child, so anything it hands the guard could be the child's own writing.
 * A pause the guard lifts browser lockdown for is signed here instead, and the guard checks it with
 * the public key it recorded when a guardian linked the computer (`kindredly-companion-guard.sh`).
 *
 * ECDSA P-256 with SHA-256, signatures in DER: the one kind every computer can check with what it
 * already has. macOS's own `openssl` (LibreSSL 3.3) cannot load an Ed25519 key, and Windows
 * PowerShell's .NET has no Ed25519; both verify P-256, as Linux's OpenSSL does.
 *
 * The key is `COMPANION_SIGNING_KEY` (a 32-byte seed in base64) or, unset, derived from the JWT
 * secret with HKDF, so a server, a family's own box included, needs no new secret to sign.
 */

/** The order of P-256: a private key is a number from 1 to N - 1. */
const P256_N = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');

let cached: {privateKey: crypto.KeyObject; publicKeyPem: string} | null = null;

function seed(): Buffer {
  const configured = config.companionSigningKey.trim();
  if (configured) {
    const bytes = Buffer.from(configured, 'base64');
    if (bytes.length !== 32) throw new Error('COMPANION_SIGNING_KEY must be a 32-byte seed in base64');
    return bytes;
  }
  return Buffer.from(
    crypto.hkdfSync('sha256', config.jwtAccessTokenSecret, Buffer.alloc(0), 'kindredly-companion-signing-v1', 32),
  );
}

/** A P-256 private key from the seed: HKDF until the number is in range, which it is all but always. */
function privateKeyFromSeed(seedBytes: Buffer): crypto.KeyObject {
  for (let counter = 0; counter < 16; counter++) {
    const d = Buffer.from(crypto.hkdfSync('sha256', seedBytes, Buffer.alloc(0), `kindredly-p256-${counter}`, 32));
    const value = BigInt(`0x${d.toString('hex')}`);
    if (value === BigInt(0) || value >= P256_N) continue;
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(d);
    const point = ecdh.getPublicKey();
    return crypto.createPrivateKey({
      key: {
        kty: 'EC',
        crv: 'P-256',
        d: d.toString('base64url'),
        x: point.subarray(1, 33).toString('base64url'),
        y: point.subarray(33, 65).toString('base64url'),
      },
      format: 'jwk',
    });
  }
  throw new Error('could not derive a P-256 key');
}

function keys() {
  if (!cached) {
    const privateKey = privateKeyFromSeed(seed());
    const publicKeyPem = crypto.createPublicKey(privateKey).export({type: 'spki', format: 'pem'}).toString();
    cached = {privateKey, publicKeyPem};
  }
  return cached;
}

/** The public key a computer's guard records, as PEM. */
export function companionSigningPublicKey(): string {
  return keys().publicKeyPem;
}

/** The seed in use, in base64, for setting `COMPANION_SIGNING_KEY` before the JWT secret rotates. */
export function companionSigningSeedBase64(): string {
  return seed().toString('base64');
}

/** How far ahead a signed pause reaches. The Companion fetches its settings every 15 minutes at most. */
export const BROWSER_PAUSE_SIGNED_FOR_MS = 30 * 60 * 1000;

/**
 * "Browser lockdown may be lifted on this device until `untilMs`", signed. The guard reads exactly
 * this line, so its format is the contract: `kindredly-browser-pause:v1:<device>:<until>:<signed at>`.
 * `pauseUntilMs` 0 is a pause with no end; either way the statement lasts at most
 * BROWSER_PAUSE_SIGNED_FOR_MS, so an ended pause, or a computer that stopped asking, closes again.
 */
export function signBrowserPause(input: {deviceId: string; pauseUntilMs: number; nowMs: number}): {
  message: string;
  signature: string;
  untilMs: number;
} | null {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.deviceId)) return null;
  const cap = input.nowMs + BROWSER_PAUSE_SIGNED_FOR_MS;
  const untilMs = input.pauseUntilMs > 0 ? Math.min(input.pauseUntilMs, cap) : cap;
  if (untilMs <= input.nowMs) return null;
  const message = `kindredly-browser-pause:v1:${input.deviceId}:${Math.trunc(untilMs)}:${Math.trunc(input.nowMs)}`;
  const signature = crypto.sign('sha256', Buffer.from(message), keys().privateKey).toString('base64');
  return {message, signature, untilMs: Math.trunc(untilMs)};
}

/** For tests: forget the key, after changing config. */
export function resetCompanionSigningKeyForTests(): void {
  cached = null;
}
