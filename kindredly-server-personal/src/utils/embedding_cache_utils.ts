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

export function validateEmbeddingArray(v: unknown): number[] {
  if (!Array.isArray(v)) throw new HttpException(400, 'Invalid embedding (must be number[])');
  if (!v.length) throw new HttpException(400, 'Invalid embedding (empty)');
  if (v.length > MAX_EMBEDDING_DIMS) {
    throw new HttpException(400, `Invalid embedding (max dims ${MAX_EMBEDDING_DIMS})`);
  }

  const out: number[] = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    const n = v[i];
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new HttpException(400, 'Invalid embedding (non-finite number)');
    }
    out[i] = n;
  }

  return out;
}

export function validatePutItems(v: unknown): Array<{cacheKey: string; embedding: number[]; dimensions?: number}> {
  if (!Array.isArray(v)) return [];
  const out: Array<{cacheKey: string; embedding: number[]; dimensions?: number}> = [];

  for (const raw of v) {
    if (!isPlainObject(raw)) throw new HttpException(400, 'Invalid items (must be array of objects)');

    const cacheKey = requireString(raw.cacheKey, 'cacheKey', {maxLen: MAX_CACHE_KEY_LEN});
    const embedding = validateEmbeddingArray(raw.embedding);

    let dimensions: number | undefined;
    if (raw.dimensions != null) {
      if (typeof raw.dimensions !== 'number' || !Number.isFinite(raw.dimensions)) {
        throw new HttpException(400, 'Invalid dimensions (must be number)');
      }
      const d = Math.floor(raw.dimensions);
      if (d <= 0 || d > MAX_EMBEDDING_DIMS) {
        throw new HttpException(400, `Invalid dimensions (1..${MAX_EMBEDDING_DIMS})`);
      }
      if (d !== embedding.length) {
        throw new HttpException(400, 'Invalid dimensions (must match embedding length)');
      }
      dimensions = d;
    }

    out.push({cacheKey, embedding, dimensions});
  }

  return out;
}
