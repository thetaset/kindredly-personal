import {config} from '@/config';
import fs from 'fs';
import path from 'path';
import {saveURLDatatoFile} from '../utils/binary_utils';
import {UserFileAccessProvider} from './user_fileaccess.provider';

/**
 * Resolve `segments` under `root` and refuse anything that lands outside it.
 *
 * Every path in this provider is built from client-supplied values: `filename` comes straight
 * off the URL or request body, and `refType`/`refId` are route params. `path.join` happily
 * normalises `..` away, so a request for `../../etc/passwd` used to resolve to a real file
 * outside the storage root — readable on the unauthenticated GET routes in
 * `user_filedata.route.ts`, and writable/deletable on the upload and remove paths.
 *
 * Containment is checked on the RESOLVED path rather than by rejecting `..` in the input,
 * because legitimate filenames are derived (`<name>__chunk_3`, `<name>_preview_<id>`) and a
 * blacklist both misses encodings and breaks real names. `path.resolve` also absorbs an
 * absolute segment — `resolve(root, '/etc/passwd')` is `/etc/passwd` — which the same check
 * catches.
 *
 * This affects the `fs` storage backend, used by self-hosted / personal-server and local dev.
 * Production runs `USER_STORAGE_TYPE=s3` (see `config.ts`), which resolves keys differently.
 */
function resolveWithinRoot(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(String(root));

  for (const segment of segments) {
    if (segment === undefined || segment === null || segment === '') {
      throw new Error('Invalid storage path: empty segment');
    }
  }

  const fullpath = path.resolve(resolvedRoot, ...segments.map(String));

  if (fullpath !== resolvedRoot && !fullpath.startsWith(resolvedRoot + path.sep)) {
    // Deliberately does not echo the resolved path back to the caller.
    throw new Error('Invalid storage path: resolves outside the storage root');
  }

  return fullpath;
}

/** Exported for tests. */
export const __resolveWithinRootForTests = resolveWithinRoot;

export class UserFileAccessProviderFS implements UserFileAccessProvider {
  private imageRoot() {
    return String(config.imageStorage.path);
  }

  private userRoot() {
    return String(config.userStorage.path);
  }

  async uploadImageDirect(imageData, filename, prefix) {
    const fpath = prefix ? resolveWithinRoot(this.imageRoot(), prefix) : path.resolve(this.imageRoot());

    await fs.promises.mkdir(fpath, {recursive: true}); //fs.mkdirSync
    const fullpath = resolveWithinRoot(fpath, filename);
    console.log('Saving file to ', fullpath);

    if (imageData.startsWith('data:')) {
      imageData = imageData.split(',')[1];
    }

    saveURLDatatoFile(imageData, fullpath);
    return filename;
  }

  async uploadUserFileData(data: any, refType: string, refId: string, filename: string) {
    const fpath = resolveWithinRoot(this.userRoot(), refType, refId);

    await fs.promises.mkdir(fpath, {recursive: true});
    const fullpath = resolveWithinRoot(fpath, filename);

    // clean data
    if (typeof data === 'string') {
      data = data.replace(/^data:image\/\w+;base64,/, '');
    }
    console.log('Saving user file to ', fullpath);

    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(fullpath, new Uint8Array(buffer));
    return filename;
  }

  async uploadUserFileBytes(data: Buffer | Uint8Array, refType: string, refId: string, filename: string) {
    const fpath = resolveWithinRoot(this.userRoot(), refType, refId);

    await fs.promises.mkdir(fpath, {recursive: true});
    const fullpath = resolveWithinRoot(fpath, filename);
    console.log('Saving user file (bytes) to ', fullpath);

    const buff = Buffer.isBuffer(data) ? data : Buffer.from(data);
    fs.writeFileSync(fullpath, buff);
    return filename;
  }

  async fileExists(filename) {
    const fullpath = resolveWithinRoot(this.imageRoot(), filename);
    return fs.existsSync(fullpath);
  }

  async readStorageFile(filename: string): Promise<string | null> {
    const fullpath = resolveWithinRoot(this.imageRoot(), filename);
    if (!fs.existsSync(fullpath)) return null;
    return fs.promises.readFile(fullpath, 'utf8');
  }

  async writeStorageFile(filename: string, contents: string): Promise<void> {
    const rootpath = path.resolve(this.imageRoot());
    const fullpath = resolveWithinRoot(rootpath, filename);
    await fs.promises.mkdir(rootpath, {recursive: true});
    await fs.promises.writeFile(fullpath, contents, 'utf8');
  }

  async deleteImage(filename: string): Promise<void> {
    const fullpath = resolveWithinRoot(this.imageRoot(), filename);
    await fs.promises.rm(fullpath, {force: true});
  }

  async getUserDataStream(refType: string, refId: string, filename: string) {
    const fullpath = resolveWithinRoot(this.userRoot(), refType, refId, filename);
    const s = fs.createReadStream(fullpath);
    return s;
  }

  async getImageStream(filename) {
    const fullpath = resolveWithinRoot(this.imageRoot(), filename);

    const s = fs.createReadStream(fullpath);
    return s;
  }

  async removeFile(refType: string, refId: string, filename: string) {
    const fullpath = resolveWithinRoot(this.userRoot(), refType, refId, filename);
    fs.unlinkSync(fullpath);
  }
}
