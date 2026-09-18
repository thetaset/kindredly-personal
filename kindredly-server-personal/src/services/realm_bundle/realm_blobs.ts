import {Knex} from 'knex';

import {UserFileAccessProvider} from '@/base/user_fileaccess.provider';
import {BlobHashCache} from './blob_hash_cache';
import {BlobSource} from './bundle_writer';
import {ExtractedRealm} from './realm_extractor';

/**
 * Every blob a realm owns, and how to open it.
 *
 * **The database is the index, not the storage.** `UserFileAccessProvider` has no `list` and no
 * existence check for user files, so there is no way to enumerate the disk. The consequence is
 * worth stating rather than discovering: a file on disk with no `user_file` row is not backed up.
 * Sweeping orphans is a different job and does not belong in a backup.
 *
 * Two namespaces, both required (format doc §6.2):
 *
 *   userFile   the `user_file` table, reached by (refType, refId, filename)
 *   image      filenames held in referencing columns, reached by filename alone
 */

export type ChunkedParent = {
  entry: {namespace: 'userFile'; fileId: string; size: number; encrypted?: boolean};
  chunkFilenames: string[];
  refType: string;
  refId: string;
};

export class RealmBlobs {
  /** Tokens seen this run, so `BlobHashCache.flush` can drop entries for files that no longer exist. */
  readonly seenTokens = new Set<string>();

  constructor(
    private readonly db: Knex,
    private readonly files: UserFileAccessProvider,
    private readonly hashes?: BlobHashCache,
  ) {}

  /**
   * Blob sources for the realm, plus the chunked parents that must be recorded after their parts.
   *
   * Soft-deleted `user_file` rows are skipped. The row itself still travels as a record, so a
   * restore knows the file existed and was deleted; copying gigabytes of deleted bytes into every
   * snapshot forever is the wrong trade, and a restore has nothing to do with them.
   */
  async *sources(realm: ExtractedRealm, batchSize = 200): AsyncIterable<BlobSource | {chunkedParent: ChunkedParent}> {
    yield* this.userFileSources(realm, batchSize);
    yield* this.imageSources(realm, batchSize);
  }

  private async *userFileSources(realm: ExtractedRealm, batchSize: number) {
    if (!realm.userIds.length) return;
    let cursor: string | null = null;

    for (;;) {
      let query = this.db('user_file')
        .whereIn('userId', realm.userIds)
        .whereNull('deletedAt')
        .orderBy('_id')
        .limit(batchSize);
      if (cursor) query = query.where('_id', '>', cursor);
      const rows: Array<Record<string, any>> = await query;
      if (!rows.length) return;

      for (const row of rows) {
        const {_id: fileId, refType, refId, filename, encInfo, encrypted, fileSize} = row;
        const chunked = encInfo?.chunked;

        if (chunked && Number(chunked.chunkCount) > 0) {
          // A chunked file has no base object on disk, so its parts are the blobs and the parent
          // is an index entry naming them. `chunkCount` rides in encInfo, written by the client.
          const chunkFilenames: string[] = [];
          for (let i = 0; i < Number(chunked.chunkCount); i++) {
            const chunkName = `${filename}__chunk_${i}`;
            chunkFilenames.push(chunkName);
            yield this.userFileBlob(fileId, refType, refId, chunkName, encrypted, false, row);
          }
          yield {
            chunkedParent: {
              entry: {namespace: 'userFile' as const, fileId, size: Number(fileSize) || 0, encrypted: !!encrypted},
              chunkFilenames,
              refType,
              refId,
            },
          };
        } else {
          yield this.userFileBlob(fileId, refType, refId, filename, encrypted, false, row);
        }

        // Previews are separate objects with their own IVs, so they are separate blobs. A restore
        // without them shows a library of blank thumbnails, which reads as data loss.
        for (const previewId of Object.keys(encInfo?.previewMeta ?? {})) {
          yield this.userFileBlob(fileId, refType, refId, `${filename}_preview_${previewId}`, encrypted, true, row);
        }
      }

      cursor = rows[rows.length - 1]._id;
      if (rows.length < batchSize) return;
    }
  }

  private userFileBlob(
    fileId: string,
    refType: string,
    refId: string,
    filename: string,
    encrypted: boolean,
    optional = false,
    row?: Record<string, any>,
  ): BlobSource {
    // A cached hash means the writer never opens this blob: it checks the target by name and moves
    // on. That is the difference between a nightly backup and one a family switches off.
    const token = row?._id ? BlobHashCache.tokenForUserFile(row as {_id: string}, filename) : undefined;
    if (token) this.seenTokens.add(token);
    const cached = token ? this.hashes?.get(token) : null;

    return {
      entry: {namespace: 'userFile', fileId, ref: {refType, refId, filename}, encrypted: !!encrypted},
      cacheToken: token,
      knownHash: cached?.hash,
      knownSize: cached?.size,
      open: async () => {
        try {
          return await this.files.getUserDataStream(refType, refId, filename);
        } catch (e) {
          // An absent preview is a gap, not a corrupt realm — thumbnails are regenerated. An
          // absent primary object is a real fault and must reach the caller.
          if (optional) return emptyStream();
          throw e;
        }
      },
    };
  }

  /**
   * Images live in a flat namespace keyed by filename alone, referenced from columns rather than
   * from a table of their own — `item.imageFilename` and `user.profileImage`.
   */
  private async *imageSources(realm: ExtractedRealm, batchSize: number) {
    const seen = new Set<string>();
    let cursor: string | null = null;

    for (;;) {
      let query = this.db('item')
        .where({accountId: realm.realmId})
        .whereNotNull('imageFilename')
        .orderBy('_id')
        .limit(batchSize)
        .select('_id', 'imageFilename');
      if (cursor) query = query.where('_id', '>', cursor);
      const rows: Array<{_id: string; imageFilename: string}> = await query;
      if (!rows.length) break;

      for (const row of rows) {
        const name = imageStorageFilename(row.imageFilename);
        if (name && !seen.has(name)) {
          seen.add(name);
          yield this.imageBlob(name, {itemId: row._id});
        }
      }
      cursor = rows[rows.length - 1]._id;
      if (rows.length < batchSize) break;
    }

    if (realm.userIds.length) {
      const users: Array<{_id: string; profileImage: any}> = await this.db('user')
        .whereIn('_id', realm.userIds)
        .whereNotNull('profileImage')
        .select('_id', 'profileImage');
      for (const user of users) {
        const name = imageStorageFilename(profileImageFilename(user.profileImage));
        if (name && !seen.has(name)) {
          seen.add(name);
          yield this.imageBlob(name, {userId: user._id});
        }
      }
    }
  }

  private imageBlob(filename: string, ref: Record<string, string>): BlobSource {
    return {
      entry: {namespace: 'image', ref: {...ref, filename}},
      open: () => this.files.getImageStream(filename),
    };
  }
}

/**
 * Whether an `imageFilename` names an object in image storage — and not everything does.
 *
 * The column holds three different kinds of value (`tset-client/src/bg/services/FileService.ts:38-46`):
 *
 *   uf_<fileId>   a `user_file` reference, already enumerated by the user-file pass
 *   http…         an external URL; somebody else's bytes, not ours to back up
 *   <filename>    an object in the flat image namespace
 *
 * Reading the first two as image filenames is not a cosmetic mistake: `getImageStream('uf_file_x')`
 * raises, and a missing primary object fails the whole run — so a family with uploaded cover images
 * would have had no nightly backup at all, and the failure would have looked like a storage fault.
 */
export function imageStorageFilename(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith('uf_')) return null;
  if (/^https?:\/\//i.test(value)) return null;
  return value;
}

/** `profileImage` is a JSON blob whose filename key has varied; accept the shapes actually seen. */
export function profileImageFilename(profileImage: unknown): string | null {
  if (!profileImage) return null;
  if (typeof profileImage === 'string') return profileImage || null;
  const obj = profileImage as Record<string, unknown>;
  for (const key of ['filename', 'imageFilename', 'name', 'url']) {
    const value = obj[key];
    if (typeof value === 'string' && value) return value;
  }
  return null;
}

function emptyStream() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {Readable} = require('stream');
  return Readable.from([]);
}
