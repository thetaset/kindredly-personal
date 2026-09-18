import {config} from '@/config';
import {UserFileRepo} from '@/db/user_file.repo';
import UserFile from 'tset-sharedlib/schemas/public/UserFile';
import {TYPES} from '@/types';
import {inject} from 'inversify';
import {FileUploadRequest, FileRefInfo} from 'tset-sharedlib/shared.types';
import {v4 as uuidv4} from 'uuid';
import {RequestContext} from '../base/request_context';
import {UserFileAccessProvider} from '../base/user_fileaccess.provider';
import PermissionService from './permission.service';
import {getDetailsByAccountType} from '@/defaults/products_and_plans';
import {base64ByteSize} from '@/utils/binary_utils';

/**
 * A preview id off a query string or JSON body. `undefined`, `null`, empty, an array with no
 * entries and the literal "undefined" (a stringified query param) all mean "the original";
 * anything else is a logical id, including "0", which older uploads used.
 */
export function normalizeUserFilePreviewId(value: unknown): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  if (single === undefined || single === null) return null;
  const text = String(single).trim();
  if (text === '' || text === 'undefined' || text === 'null') return null;
  return text;
}

class UserFileService {
  constructor(@inject(TYPES.UserFileAccessProvider) public fileAccessProvider: UserFileAccessProvider) {}

  private userFileRepo = new UserFileRepo();

  private permissionService = new PermissionService();

  /**
   * Upload/storage limits for the caller's account, never undefined.
   *
   * `getDetailsByAccountType` is a bare lookup, so an account whose `accountType` is unset or
   * unrecognised returned undefined — and `assertUploadAllowed` then fell all the way through
   * to the 200MB config ceiling AND skipped the storage check entirely. An account with no
   * plan should get the free plan's limits, not no limits.
   *
   * Narrow on purpose: the same lookup gates item and collection limits elsewhere, and
   * tightening those is a separate decision.
   */
  private async getAccountUploadLimits(ctx: RequestContext) {
    const account = await ctx.getAccount();
    return getDetailsByAccountType(account?.accountType) ?? getDetailsByAccountType('standard');
  }

  private async assertUploadAllowed(ctx: RequestContext, fileSize: number, existingFileSize: number = 0) {
    const limits = await this.getAccountUploadLimits(ctx);
    const maxUploadBytes = Math.min(Number(limits?.maxUploadBytes ?? config.maxFileSize), config.maxFileSize);

    if (fileSize > maxUploadBytes) {
      const limit = maxUploadBytes / 1024 / 1024;
      throw new Error(`File too large. File size limit is ${limit} MB. Current Size is ${fileSize / 1024 / 1024} MB.`);
    }

    const maxVisibleStorageBytes = Number(limits?.maxVisibleStorageBytes ?? 0);
    if (!maxVisibleStorageBytes) {
      return;
    }

    const currentUsage = await this.userFileRepo.getVisibleStorageUsageForAccount(ctx.accountId);
    const nextUsage = currentUsage - existingFileSize + fileSize;
    if (nextUsage > maxVisibleStorageBytes) {
      const limitMb = (maxVisibleStorageBytes / 1024 / 1024).toFixed(2);
      const nextUsageMb = (nextUsage / 1024 / 1024).toFixed(2);
      throw new Error(
        `Storage limit reached. Account visible storage limit is ${limitMb} MB. New total would be ${nextUsageMb} MB. Delete files to free space before uploading more.`,
      );
    }
  }

  private _getChunkFilename(filename: string, chunkIndex: number) {
    return `${filename}__chunk_${chunkIndex}`;
  }

  /**
   * Confirm a caller-supplied fileId names a live file on the caller's own account.
   *
   * Needed wherever a client hands us a fileId it minted a moment earlier — post attachments
   * upload ahead of the post now, so the id arrives from outside instead of being generated
   * here. Deliberately stricter than read access (`isInNetwork`): naming a file in a post is
   * closer to owning it than to viewing it.
   */
  async assertFileOwnedByAccount(ctx: RequestContext, fileId: string): Promise<UserFile> {
    if (!fileId) throw new Error('Missing fileId');

    const userFile = await this.userFileRepo.findById(fileId);
    // Same message for missing and not-yours, so the check can't be used to probe which
    // file ids exist.
    if (!userFile || (userFile as any).deletedAt || userFile.accountId !== ctx.accountId) {
      throw new Error(`UserFile with id ${fileId} not found. `);
    }

    return userFile;
  }

  // ROUTE-METHOD
  async uploadFile(ctx: RequestContext, fileInfo: FileUploadRequest) {
    if (fileInfo.refType == 'item') {
      if (!(await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, fileInfo.refId))) {
        throw new Error('Not authorized');
      }
    }
    return await this._upload(ctx, fileInfo);
  }

  // ROUTE-METHOD
  async uploadFileBinary(
    ctx: RequestContext,
    fileInfo: Omit<FileUploadRequest, 'fileData' | 'previews'> & {previews?: any},
    fileBytes: Buffer,
  ) {
    // Basic permissions mirroring uploadFile()
    if (fileInfo.refType == 'item') {
      if (!(await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, fileInfo.refId))) {
        throw new Error('Not authorized');
      }
    }

    return await this._uploadBinary(ctx, fileInfo, fileBytes);
  }

  // ROUTE-METHOD
  /**
   * Attach a thumbnail to an already-uploaded file.
   *
   * Previews are small and travel as base64 JSON; the file itself does not. Stored under the
   * same `<filename>_preview_<id>` name `_upload` writes, so nothing on the read side changes.
   * The preview's bytes count toward the account's storage the same way `_upload` counts them.
   */
  async uploadPreview(
    ctx: RequestContext,
    {fileId, previewId, data, iv}: {fileId: string; previewId?: string; data: string; iv?: string},
  ) {
    if (!data) throw new Error('No preview data to upload.');

    const userFile = await this.assertFileOwnedByAccount(ctx, fileId);
    const id = String(previewId ?? '0');

    const existingEncInfo = (userFile as any).encInfo as Record<string, unknown> | null;
    const previewMeta = (existingEncInfo?.previewMeta as Record<string, {iv?: string; bytes?: number}>) || {};

    // What this preview weighed last time, so a re-upload REPLACES that number rather than
    // adding to it. Writing a thumbnail twice — replacing an item attachment's image, say —
    // otherwise grew the file's recorded size on every write, and that column is what the
    // account's storage quota is summed from.
    const previousPreviewSize = Number(previewMeta[id]?.bytes ?? 0);
    const previewSize = base64ByteSize(data);
    await this.assertUploadAllowed(ctx, previewSize, previousPreviewSize);

    await this.fileAccessProvider.uploadUserFileData(
      data,
      userFile.refType,
      userFile.refId,
      `${userFile.filename}_preview_${id}`,
    );

    const update: Record<string, unknown> = {updatedAt: new Date()};

    // Per-preview facts about the stored blob: its own iv, and what it weighs.
    //
    // The iv has to be its own — a v1 encInfo carries a single iv, so encrypting a thumbnail
    // under the file's would reuse a (key, iv) pair across two plaintexts, which AES-GCM does
    // not survive. Files written before this map existed keep decrypting with `encInfo.iv`.
    //
    // Only written when the file already has an encInfo: creating one for an unencrypted file
    // would make readers — which branch on `if (userFile.encInfo)` — try to decrypt plaintext.
    // Those files skip the size bookkeeping instead. Under-counting a thumbnail never wrongly
    // blocks an upload; double-counting one eventually does.
    if (existingEncInfo) {
      update.encInfo = {
        ...existingEncInfo,
        previewMeta: {...previewMeta, [id]: {...(iv ? {iv} : {}), bytes: previewSize}},
      };
      update.fileSize = Math.max(0, Number(userFile.fileSize ?? 0) - previousPreviewSize + previewSize);
    }

    await this.userFileRepo.updateWithId(userFile._id, update as any);

    return {fileId: userFile._id, previewId: id};
  }

  // ROUTE-METHOD
  async initChunkedUpload(
    ctx: RequestContext,
    fileInfo: Omit<FileUploadRequest, 'fileData' | 'previews'> & {
      fileSize: number;
      chunkSize: number;
      chunkCount: number;
    },
  ) {
    if (fileInfo.refType == 'item') {
      if (!(await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, fileInfo.refId))) {
        throw new Error('Not authorized');
      }
    }

    const fileSize = fileInfo.fileSize;

    let ufId: string = (fileInfo as any).ufId;

    let existingUserFile: UserFile | null;
    if (ufId) {
      existingUserFile = await this.userFileRepo.findById((fileInfo as any).ufId);
    }
    if (!existingUserFile) {
      existingUserFile = await this.userFileRepo.findByRef(fileInfo.refId, fileInfo.refType, fileInfo.filename);
    }

    await this.assertUploadAllowed(ctx, fileSize, Number(existingUserFile?.fileSize ?? 0));

    const now = new Date();
    let isNew: boolean;
    if (!existingUserFile) {
      ufId = 'file_' + uuidv4();
      isNew = true;
    } else {
      if (existingUserFile.accountId !== ctx.accountId) {
        throw new Error(`UserFile with id ${(fileInfo as any).ufId} not found. `);
      }

      if (existingUserFile.refId !== fileInfo.refId) {
        ufId = 'file_' + uuidv4();
        isNew = true;
      } else {
        fileInfo.filename = existingUserFile.filename;
        fileInfo.refType = existingUserFile.refType;
        fileInfo.refId = existingUserFile.refId;

        ufId = existingUserFile._id;
        isNew = false;
      }
    }

    const encrypted = !!fileInfo.encInfo ? true : false;

    const info = {
      _id: ufId,
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
      refId: fileInfo.refId,
      refType: fileInfo.refType,
      filename: fileInfo.filename,
      fileType: fileInfo.fileType,
      fileSize: fileSize,
      updatedAt: now,
      encInfo: fileInfo?.encInfo || null,
      encrypted,
      deletedAt: null,
    };

    if (isNew) {
      info['createdAt'] = now;
      await this.userFileRepo.create(info);
    } else {
      await this.userFileRepo.updateWithId(ufId, info);
    }

    const result: FileRefInfo = {
      _id: ufId,
      filename: fileInfo.filename,
      filesize: fileSize,
      mimetype: fileInfo.fileType,
      createdAt: now.toISOString(),
    };

    return result;
  }

  // ROUTE-METHOD
  async uploadChunkBytes(ctx: RequestContext, id: string, chunkIndex: number, chunkBytes: Buffer) {
    const userFile = await this._getUserFileDataById(ctx, id);
    await this.fileAccessProvider.uploadUserFileBytes(
      chunkBytes,
      userFile.refType,
      userFile.refId,
      this._getChunkFilename(userFile.filename, chunkIndex),
    );
    return {success: true} as const;
  }

  // ROUTE-METHOD
  async getUserFileChunkStreamById(ctx: RequestContext, id: string, chunkIndex: number) {
    const userFile = await this._getUserFileDataById(ctx, id);
    return {
      userFile,
      stream: await this.fileAccessProvider.getUserDataStream(
        userFile.refType,
        userFile.refId,
        this._getChunkFilename(userFile.filename, chunkIndex),
      ),
    };
  }

  // ROUTE-METHOD
  // Update a user file's encInfo (e.g., to add additional unwrap entries for sharing).
  async updateUserFileEncInfo(ctx: RequestContext, fileId: string, encInfo: any) {
    if (!fileId) throw new Error('Missing fileId');

    const userFile = await this.userFileRepo.findById(fileId);
    if (!userFile || (userFile as any).deletedAt) {
      throw new Error('UserFile not found');
    }

    if ((userFile as any).accountId !== ctx.accountId) {
      throw new Error('UserFile not found');
    }

    // Only allow updates when the caller can edit the referenced item.
    if ((userFile as any).refType === 'item') {
      const refId = (userFile as any).refId;
      if (!refId) throw new Error('UserFile missing refId');
      const canEdit = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, refId);
      if (!canEdit) {
        throw new Error('Not authorized');
      }
    } else {
      // Future: other ref types could be supported, but keep it strict for now.
      throw new Error('Not authorized');
    }

    const encrypted = !!encInfo ? true : false;
    await this.userFileRepo.updateWithId(fileId, {
      encInfo: encInfo || null,
      encrypted,
      updatedAt: new Date(),
    } as any);

    return {success: true} as const;
  }

  async _upload(ctx: RequestContext, fileInfo: FileUploadRequest) {
    if (!fileInfo.fileData) {
      throw new Error('No file data to upload.');
    }

    // A preview with no data is a caller bug, not a reason to fail the whole upload —
    // drop it here so one missing thumbnail can't take down a post or an item save.
    fileInfo.previews = (fileInfo.previews || []).filter((preview) => !!preview?.data);

    // Decoded bytes, not string length. `fileData` is base64, so measuring the string
    // over-counted every plan and storage check by 33% — a 30MB video read as 40MB and was
    // refused against a 35MB limit. `_uploadBinary` has always measured real bytes; this is
    // the base64 path catching up, so the two agree on what a file weighs.
    let fileSize = base64ByteSize(fileInfo.fileData);

    for (const preview of fileInfo.previews) {
      fileSize += base64ByteSize(preview.data);
    }

    let ufId: string = fileInfo.ufId;

    let existingUserFile: UserFile | null;
    if (ufId) {
      existingUserFile = await this.userFileRepo.findById(fileInfo.ufId);
    }
    if (!existingUserFile) {
      existingUserFile = await this.userFileRepo.findByRef(fileInfo.refId, fileInfo.refType, fileInfo.filename);
    }

    await this.assertUploadAllowed(ctx, fileSize, Number(existingUserFile?.fileSize ?? 0));

    const now = new Date();
    let isNew: boolean;
    if (!existingUserFile) {
      ufId = 'file_' + uuidv4();
      isNew = true;
    } else {
      // TODO: verify permissions, do better
      if (existingUserFile.accountId !== ctx.accountId) {
        throw new Error(`UserFile with id ${fileInfo.ufId} not found. `);
      }

      // CRITICAL: If the refId doesn't match, this file belongs to a different item
      // Create a new file instead of updating the existing one
      if (existingUserFile.refId !== fileInfo.refId) {
        ufId = 'file_' + uuidv4();
        isNew = true;
      } else {
        fileInfo.filename = existingUserFile.filename;
        fileInfo.refType = existingUserFile.refType;
        fileInfo.refId = existingUserFile.refId;

        ufId = existingUserFile._id;
        isNew = false;
      }
    }

    const encrypted = !!fileInfo.encInfo ? true : false;

    const info = {
      _id: ufId,
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
      refId: fileInfo.refId,
      refType: fileInfo.refType,
      filename: fileInfo.filename,
      fileType: fileInfo.fileType,
      fileSize: fileSize,
      updatedAt: now,
      encInfo: fileInfo?.encInfo || null,
      encrypted,
      deletedAt: null,
    };

    if (isNew) {
      //create
      info['createdAt'] = now;
      await this.userFileRepo.create(info);
    } else {
      //update
      ufId = existingUserFile._id;
      await this.userFileRepo.updateWithId(ufId, info);
    }

    try {
      await this.fileAccessProvider.uploadUserFileData(
        fileInfo.fileData,
        fileInfo.refType,
        fileInfo.refId,
        fileInfo.filename,
      );
      if (fileInfo.previews && fileInfo.previews.length > 0) {
        for (const preview of fileInfo.previews) {
          await this.fileAccessProvider.uploadUserFileData(
            preview.data,
            fileInfo.refType,
            fileInfo.refId,
            fileInfo.filename + '_preview_' + preview.id,
          );
        }
      }
    } catch (e) {
      await this.userFileRepo.deleteWithId(ufId);
      throw e;
    }
    let result: FileRefInfo = {
      _id: ufId,
      filename: fileInfo.filename,
      filesize: fileSize,
      mimetype: fileInfo.fileType,
      createdAt: now.toISOString(),
    };
    return result;
  }

  private async _uploadBinary(
    ctx: RequestContext,
    fileInfo: Omit<FileUploadRequest, 'fileData' | 'previews'>,
    fileBytes: Buffer,
  ) {
    let fileSize = fileBytes.length;

    let ufId: string = (fileInfo as any).ufId;

    let existingUserFile: UserFile | null;
    if (ufId) {
      existingUserFile = await this.userFileRepo.findById((fileInfo as any).ufId);
    }
    if (!existingUserFile) {
      existingUserFile = await this.userFileRepo.findByRef(fileInfo.refId, fileInfo.refType, fileInfo.filename);
    }

    await this.assertUploadAllowed(ctx, fileSize, Number(existingUserFile?.fileSize ?? 0));

    const now = new Date();
    let isNew: boolean;
    if (!existingUserFile) {
      ufId = 'file_' + uuidv4();
      isNew = true;
    } else {
      if (existingUserFile.accountId !== ctx.accountId) {
        throw new Error(`UserFile with id ${(fileInfo as any).ufId} not found. `);
      }

      // If refId doesn't match, create a new file rather than overwriting.
      if (existingUserFile.refId !== fileInfo.refId) {
        ufId = 'file_' + uuidv4();
        isNew = true;
      } else {
        fileInfo.filename = existingUserFile.filename;
        fileInfo.refType = existingUserFile.refType;
        fileInfo.refId = existingUserFile.refId;

        ufId = existingUserFile._id;
        isNew = false;
      }
    }

    const encrypted = !!fileInfo.encInfo ? true : false;

    const info = {
      _id: ufId,
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
      refId: fileInfo.refId,
      refType: fileInfo.refType,
      filename: fileInfo.filename,
      fileType: fileInfo.fileType,
      fileSize: fileSize,
      updatedAt: now,
      encInfo: fileInfo?.encInfo || null,
      encrypted,
      deletedAt: null,
    };

    if (isNew) {
      info['createdAt'] = now;
      await this.userFileRepo.create(info);
    } else {
      await this.userFileRepo.updateWithId(ufId, info);
    }

    try {
      await this.fileAccessProvider.uploadUserFileBytes(fileBytes, fileInfo.refType, fileInfo.refId, fileInfo.filename);
    } catch (e) {
      await this.userFileRepo.deleteWithId(ufId);
      throw e;
    }

    const result: FileRefInfo = {
      _id: ufId,
      filename: fileInfo.filename,
      filesize: fileSize,
      mimetype: fileInfo.fileType,
      createdAt: now.toISOString(),
    };

    return result;
  }

  // ROUTE-METHOD
  async listFilesByRef(ctx: RequestContext, refId: string, refType: string) {
    if (refType == 'item') {
      if (!(await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, refId))) {
        throw new Error('Not authorized');
      }
    }
    const userFiles = await this.userFileRepo.listByRef(refId, refType);
    return userFiles;
  }

  // ROUTE-METHOD
  async listFilesForUser(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    const userFiles = await this.userFileRepo.listForUser(targetUserId, 'updatedAt', 'desc');
    return userFiles;
  }

  // ROUTE-METHOD
  /**
   * Streams a user file, or one of its logical previews when `previewId` names one that exists.
   * `resolvedPreviewId` says which bytes came back: the preview's id, or null for the original.
   * A client picks its AES-GCM iv from that, never from what it asked for.
   */
  async getUserFileStreamById(ctx: RequestContext, id: string, previewId?: unknown) {
    // IDs are stored in database with file_ prefix (e.g., file_<uuid>)
    // No transformation needed - use ID as-is
    const userFile = await this._getUserFileDataById(ctx, id);

    // Chunked userfiles are stored as separate chunk objects with no base object on disk.
    // Streaming the (non-existent) base filename would emit a 200 with headers and then error
    // mid-stream, leaving clients waiting on a truncated body. Fail fast and clearly instead;
    // chunked files must be read via getUserFileChunkStreamById / getCiphertextChunkRange.
    if ((userFile as any)?.encInfo?.chunked) {
      throw new Error(
        'UserFile is chunked and has no base object; read it via /userfile/getCiphertextChunkRange instead.',
      );
    }

    const requestedPreviewId = normalizeUserFilePreviewId(previewId);
    if (requestedPreviewId !== null) {
      const previewFilename = userFile.filename + '_preview_' + requestedPreviewId;
      // Existence is decided before the response commits. The old try/catch around opening the
      // stream never fired — both providers hand back streams that only error once read — so a
      // missing preview used to become a 200 whose body stopped after the JSON part.
      const previewExists = await this.fileAccessProvider.userFileExists(
        userFile.refType,
        userFile.refId,
        previewFilename,
      );
      if (previewExists) {
        return {
          userFile,
          stream: await this.fileAccessProvider.getUserDataStream(userFile.refType, userFile.refId, previewFilename),
          requestedPreviewId,
          resolvedPreviewId: requestedPreviewId as string | null,
        };
      }
    }

    return {
      userFile,
      stream: await this.fileAccessProvider.getUserDataStream(userFile.refType, userFile.refId, userFile.filename),
      requestedPreviewId,
      resolvedPreviewId: null as string | null,
    };
  }

  // ROUTE-METHOD
  async getUserFileMetaById(ctx: RequestContext, id: string, previewId?: string) {
    // previewId is ignored for metadata for now, but included for a stable API.
    void previewId;
    return await this._getUserFileDataById(ctx, id);
  }

  async _removeUserFileById(ctx: RequestContext, id: string) {
    const userFile = await this._getUserFileDataById(ctx, id);
    if (!userFile) {
      throw new Error('UserFile not found');
    }
    await ctx.verifySelfOrAdmin(userFile.userId);

    await this.fileAccessProvider.removeFile(userFile.refType, userFile.refId, userFile.filename);
    await this.userFileRepo.deleteWithId(id);
  }

  // ROUTE-METHOD
  private async _getUserFileDataById(ctx: RequestContext, id: string, skipAccessCheck = false) {
    const userFile = await this.userFileRepo.findById(id);
    if (!userFile) {
      throw new Error(`UserFile with id ${id} not found. `);
    }

    if (!skipAccessCheck) {
      let accessible = await ctx.isInNetwork(userFile.userId);
      if (!accessible) {
        throw new Error(`UserFile with id ${id} not accessible. `);
      }
    }

    return userFile;
  }
}

export default UserFileService;
