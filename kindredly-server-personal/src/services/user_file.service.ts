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

class UserFileService {
  constructor(@inject(TYPES.UserFileAccessProvider) public fileAccessProvider: UserFileAccessProvider) {}

  private userFileRepo = new UserFileRepo();

  private permissionService = new PermissionService();

  private async getAccountUploadLimits(ctx: RequestContext) {
    const account = await ctx.getAccount();
    return getDetailsByAccountType(account?.accountType);
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
    let fileSize = fileInfo.fileData.length;

    if (fileInfo.previews && fileInfo.previews.length > 0) {
      for (const preview of fileInfo.previews) {
        fileSize += preview.data.length;
      }
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
  async getUserFileStreamById(ctx: RequestContext, id: string, previewId?: string) {
    // IDs are stored in database with file_ prefix (e.g., file_<uuid>)
    // No transformation needed - use ID as-is
    const userFile = await this._getUserFileDataById(ctx, id);
    try {
      // check if previewId is valid, it can be zero
      if (!!previewId && previewId != 'undefined') {
        return {
          userFile,
          stream: await this.fileAccessProvider.getUserDataStream(
            userFile.refType,
            userFile.refId,
            userFile.filename + '_preview_' + previewId,
          ),
        };
      }
    } catch (e) {}

    return {
      userFile,
      stream: await this.fileAccessProvider.getUserDataStream(userFile.refType, userFile.refId, userFile.filename),
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
