// /*eslint-disable no-unused-vars*/
import fs from 'fs';
import {Blob} from 'buffer';

export function saveURLDatatoFile(dataURI, filename) {
  if (dataURI.startsWith('data:')) {
    dataURI = dataURI.split(',')[1];
  }
  const buffer = Buffer.from(dataURI, 'base64');
  fs.writeFileSync(filename, new Uint8Array(buffer));
}
export function dataURItoBlob(dataURI) {
  if (dataURI.startsWith('data:')) {
    dataURI = dataURI.split(',')[1];
  }
  const binary = Buffer.from(dataURI, 'base64');
  const array = [];
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.toString().charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
}
/**
 * Decoded byte length of a base64 payload, without decoding it.
 *
 * Upload paths that carry `fileData` as base64 used to measure the *string* and call that
 * the file size, which over-counted every plan and storage check by 33% — a 30MB video read
 * as 40MB and was refused against a 35MB limit. Mirrors the client's `base64ByteSize`
 * (tset-client/src/app/file_utils.ts) so both ends agree on what a file "weighs".
 *
 * Tolerates a data: URI prefix and whitespace, both of which appear in real payloads.
 */
export function base64ByteSize(base64: string | null | undefined): number {
  let normalized = String(base64 || '');
  if (!normalized) return 0;

  const commaIndex = normalized.indexOf(',');
  if (normalized.startsWith('data:') && commaIndex !== -1) {
    normalized = normalized.slice(commaIndex + 1);
  }

  normalized = normalized.replace(/\s/g, '');
  if (!normalized) return 0;

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

export async function streamToBase64(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
  });
}
