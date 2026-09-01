import {HttpException} from '@/exceptions/HttpException';

export const DEFAULT_NAMESPACE = 'default';
export const MAX_NAMESPACE_LEN = 64;
export const MAX_MODEL_ID_LEN = 128;
export const MAX_CACHE_KEY_LEN = 256;
export const MAX_GET_KEYS = 2000;
export const MAX_PUT_ITEMS = 500;
export const MAX_EMBEDDING_DIMS = 4096;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function requireString(v: unknown, field: string, opts?: {maxLen?: number; allowEmpty?: boolean}): string {
  if (typeof v !== 'string') throw new HttpException(400, `Invalid ${field} (must be string)`);
  const trimmed = v.trim();
  if (!opts?.allowEmpty && !trimmed) throw new HttpException(400, `Invalid ${field} (empty)`);
  if (opts?.maxLen && trimmed.length > opts.maxLen) {
    throw new HttpException(400, `Invalid ${field} (too long)`);
  }
  return trimmed;
}

export function normalizeNamespace(v: unknown): string {
  const ns = typeof v === 'string' && v.trim() ? v.trim() : DEFAULT_NAMESPACE;
  if (ns.length > MAX_NAMESPACE_LEN) {
    throw new HttpException(400, `Invalid namespace (max ${MAX_NAMESPACE_LEN})`);
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(ns)) {
    throw new HttpException(400, 'Invalid namespace (allowed: a-zA-Z0-9._-)');
  }
  return ns;
}

export function normalizeCacheKeys(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of v) {
    if (typeof raw !== 'string') continue;
    const key = raw.trim();
    if (!key) continue;
    if (key.length > MAX_CACHE_KEY_LEN) {
      throw new HttpException(400, `Invalid cacheKey (max ${MAX_CACHE_KEY_LEN})`);
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

export const MAX_ENCRYPTED_EMBEDDING_LEN = 1_048_576; // 1 MB ciphertext ceiling per item

/**
 * Validate an encrypted embedding blob. The server is crypto-blind: it never sees the plaintext
 * vector, so it only checks the opaque ciphertext shape, never the numeric contents.
 */
export function validateEncryptedEmbedding(v: unknown): {encryptedData: string; iv: string} {
  if (!isPlainObject(v)) throw new HttpException(400, 'Invalid embedding (must be encrypted blob)');
  const encryptedData = requireString(v.encryptedData, 'embedding.encryptedData', {
    maxLen: MAX_ENCRYPTED_EMBEDDING_LEN,
  });
  const iv = requireString(v.iv, 'embedding.iv', {maxLen: 512});
  return {encryptedData, iv};
}

export type ValidatedPutItem = {
  cacheKey: string;
  embedding: {encryptedData: string; iv: string};
  dimensions: number;
  encInfo: Record<string, unknown>;
  encrypted: true;
};

export function validatePutItems(v: unknown): ValidatedPutItem[] {
  if (!Array.isArray(v)) return [];
  const out: ValidatedPutItem[] = [];

  for (const raw of v) {
    if (!isPlainObject(raw)) throw new HttpException(400, 'Invalid items (must be array of objects)');

    const cacheKey = requireString(raw.cacheKey, 'cacheKey', {maxLen: MAX_CACHE_KEY_LEN});
    const embedding = validateEncryptedEmbedding(raw.embedding);

    // dimensions is required: it cannot be derived from an opaque ciphertext blob.
    if (typeof raw.dimensions !== 'number' || !Number.isFinite(raw.dimensions)) {
      throw new HttpException(400, 'Invalid dimensions (required number)');
    }
    const dimensions = Math.floor(raw.dimensions);
    if (dimensions <= 0 || dimensions > MAX_EMBEDDING_DIMS) {
      throw new HttpException(400, `Invalid dimensions (1..${MAX_EMBEDDING_DIMS})`);
    }

    // encInfo (wrapped key + iv) is required so the vector can be decrypted on read.
    if (!isPlainObject(raw.encInfo)) throw new HttpException(400, 'Invalid encInfo (required)');

    if (raw.encrypted !== true) throw new HttpException(400, 'Invalid item (must be encrypted)');

    out.push({cacheKey, embedding, dimensions, encInfo: raw.encInfo, encrypted: true});
  }

  return out;
}
