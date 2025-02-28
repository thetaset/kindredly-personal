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
}export async function streamToBase64(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
  });
}

