import {Readable} from 'stream';

/**
 * Whether a stored object name belongs to `filename`: the file itself, or one of its pieces.
 * A large file is stored as `<filename>__chunk_<n>` and nothing under `<filename>`, so deleting a
 * file has to delete the pieces too (HAT-1007).
 */
export function isFileGroupMember(name: string, filename: string): boolean {
  return name === filename || name.startsWith(`${filename}__chunk_`);
}

export interface UserFileAccessProvider {
  uploadImageDirect(imageData, filename: string, prefix?: string): Promise<string>;

  uploadUserFileData(data, refType: string, refId: string, filename: string): Promise<string>;

  uploadUserFileBytes(data: Buffer | Uint8Array, refType: string, refId: string, filename: string): Promise<string>;

  fileExists(filename: string): Promise<boolean>;

  /** Read a plain (non-image) file from image storage; null if it does not exist. */
  readStorageFile(filename: string): Promise<string | null>;

  /** Write a plain (non-image) UTF-8 file to image storage. */
  writeStorageFile(filename: string, contents: string): Promise<void>;

  /** Delete a file (image or plain) from image storage; no-op if missing. */
  deleteImage(filename: string): Promise<void>;

  getUserDataStream(refType: string, refId: string, filename: string): Promise<Readable>;

  /**
   * Whether a user-file object exists. Checked before a response commits: both implementations
   * return streams that only error once read, so a missing object cannot be detected by opening
   * it, and a missing preview must fall back to the original rather than truncate a 200.
   */
  userFileExists(refType: string, refId: string, filename: string): Promise<boolean>;

  getImageStream(filename): Promise<Readable>;

  removeFile(refType: string, refId: string, filename: string): Promise<void>;

  /**
   * Delete a file and every part stored beside it. A file sent in pieces (a large attachment) is
   * stored as `<filename>__chunk_<n>` objects and has no object under `<filename>` at all, so
   * `removeFile` left every chunk behind (HAT-1007).
   */
  removeFileGroup(refType: string, refId: string, filename: string): Promise<void>;
}
