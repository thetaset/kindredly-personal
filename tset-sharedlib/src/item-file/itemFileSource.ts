// Where the parts of a Kindredly item file are, read a slice at a time (IFX-15). A file can hold
// attachments of hundreds of megabytes, so nothing here needs a whole file in memory: a slice of
// the opened `.kindredly` file, a download arriving in pieces, or plain bytes all look the same.

/** Bytes that can be read a slice at a time. `read` returns bytes `start` (inclusive) to `end`. */
export interface ItemFileSource {
  readonly size: number;
  read(start: number, end: number): Promise<Uint8Array>;
}

/** Files are checked, and named, 2 MB at a time. */
export const ITEM_FILE_PIECE_BYTES = 2 * 1024 * 1024;

export function isItemFileSource(value: unknown): value is ItemFileSource {
  return !!value && typeof value === 'object' && typeof (value as ItemFileSource).read === 'function' &&
    typeof (value as ItemFileSource).size === 'number';
}

/** Plain bytes as a source. */
export function bytesSource(bytes: Uint8Array): ItemFileSource {
  return { size: bytes.byteLength, read: async (start, end) => bytes.subarray(start, end) };
}

export function asItemFileSource(value: Uint8Array | ItemFileSource): ItemFileSource {
  return isItemFileSource(value) ? value : bytesSource(value);
}

/** The whole of a source. Only for parts that are small: the JSON, a note, a preview. */
export async function readWholeSource(source: ItemFileSource): Promise<Uint8Array> {
  return source.read(0, source.size);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** ZIP's CRC-32, carried on from `crc` over more bytes. Start with 0. */
export function crc32Update(crc: number, bytes: Uint8Array): number {
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource));
}

/**
 * A file's check value, read 2 MB at a time: the SHA-256 of its pieces' SHA-256s, in order. The
 * browser can only hash a whole buffer at once, so a whole-file hash would mean holding the whole
 * file. The ZIP's CRC-32 comes from the same pass.
 */
export async function hashItemFileSource(source: ItemFileSource): Promise<{ hash: string; crc32: number }> {
  const pieces = Math.ceil(source.size / ITEM_FILE_PIECE_BYTES);
  const digests = new Uint8Array(pieces * 32);
  let crc = 0;
  for (let i = 0; i < pieces; i++) {
    const start = i * ITEM_FILE_PIECE_BYTES;
    const piece = await source.read(start, Math.min(source.size, start + ITEM_FILE_PIECE_BYTES));
    if (piece.byteLength !== Math.min(ITEM_FILE_PIECE_BYTES, source.size - start)) throw new Error('A file part ended early');
    digests.set(await sha256(piece), i * 32);
    crc = crc32Update(crc, piece);
  }
  return { hash: hex(await sha256(digests)), crc32: crc };
}

/** SHA-256 of the whole source, as format version 1 named its files. Those files are at most 250 MB. */
export async function sha256HexOfSource(source: ItemFileSource): Promise<string> {
  return hex(await sha256(await readWholeSource(source)));
}
