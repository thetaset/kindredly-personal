import {config} from '@/config';
import fs from 'fs';
import path from 'path';
import {saveURLDatatoFile} from '../utils/binary_utils';
import {UserFileAccessProvider} from './user_fileaccess.provider';
import {resolveWithinRoot} from './storage_path';

/**
 * Path containment for this provider.
 *
 * Every path here is built from client-supplied values: `filename` comes straight off the URL or
 * request body, and `refType`/`refId` are route params. `path.join` happily normalises `..` away,
 * so a request for `../../etc/passwd` used to resolve to a real file outside the storage root —
 * readable on the unauthenticated GET routes in `user_filedata.route.ts`, and writable/deletable
 * on the upload and remove paths.
 *
 * The check itself now lives in `base/storage_path.ts` so the backup target shares it rather than
 * carrying a second copy. This affects the `fs` storage backend, used by self-hosted /
 * personal-server and local dev. Production runs `USER_STORAGE_TYPE=s3` (see `config.ts`), which
 * resolves keys differently.
 */

/** Exported for tests; the implementation is `base/storage_path.ts`. */
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

  async userFileExists(refType: string, refId: string, filename: string) {
    const fullpath = resolveWithinRoot(this.userRoot(), refType, refId, filename);
    try {
      await fs.promises.access(fullpath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
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
