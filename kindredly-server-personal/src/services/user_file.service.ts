import { config } from "@/config";
import { UserFileRepo } from "@/db/user_file.repo";
import UserFile from "@/schemas/public/UserFile";
import { TYPES } from "@/types";
import { inject } from "inversify";
import { FileUploadInfo } from "tset-sharedlib/shared.types";
import { v4 as uuidv4 } from "uuid";
import { RequestContext } from "../base/request_context";
import { UserFileAccessProvider } from "../base/user_fileaccess.provider";
import PermissionService from "./permission.service";



class UserFileService {


 constructor(@inject(TYPES.UserFileAccessProvider) public fileAccessProvider: UserFileAccessProvider) {}

  private userFileRepo = new UserFileRepo();

  private permissionService = new PermissionService();


  // ROUTE-METHOD
  async uploadFile(ctx: RequestContext, fileInfo: FileUploadInfo) {

    if (fileInfo.refType == "item") {
      if (
        !(await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, fileInfo.refId))
      ) {
        throw new Error("Not authorized");
      }
    }
    return await this._upload(ctx, fileInfo);
  }

  async _upload(ctx: RequestContext, fileInfo: FileUploadInfo) {
    let fileSize = fileInfo.fileData.length;

    // verify not too large
    if (fileSize > config.maxFileSize) {
      let limit = config.maxFileSize / 1024 / 1024;
      throw new Error(`File too large. File size limit is ${limit} MB. Current Size is ${fileSize / 1024 / 1024} MB`);
    }
    if (fileInfo.previews && fileInfo.previews.length > 0) {
      for (const preview of fileInfo.previews) {
        fileSize += preview.data.length;
      }
    }

    let ufId = fileInfo.ufId;

    let existingUserFile: UserFile | null;
    if (ufId)
      existingUserFile = await this.userFileRepo.findById(fileInfo.ufId);
    if (!existingUserFile) {
      existingUserFile = await this.userFileRepo.findByRef(
        fileInfo.refId,
        fileInfo.refType,
        fileInfo.filename
      );
    }

    const now = new Date();
    let isNew: boolean;
    if (!existingUserFile) {

      ufId = "file_" + uuidv4();
      isNew = true;
    } else {
      // TODO: verify permissions, do better
      if (existingUserFile.accountId !== ctx.accountId) {
        throw new Error(`UserFile with id ${fileInfo.ufId} not found. `);
      }
      fileInfo.filename = existingUserFile.filename;
      fileInfo.refType = existingUserFile.refType;
      fileInfo.refId = existingUserFile.refId;

      ufId = existingUserFile._id;
      isNew = false;
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
      console.log("creating user file");
      //create
      info["createdAt"] = now;
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
        fileInfo.filename
      );
      if (fileInfo.previews && fileInfo.previews.length > 0) {
        for (const preview of fileInfo.previews) {
          await this.fileAccessProvider.uploadUserFileData(
            preview.data,
            fileInfo.refType,
            fileInfo.refId,
            fileInfo.filename + "_preview_" + preview.id
          );
        }
      }
    } catch (e) {
      await this.userFileRepo.deleteWithId(ufId);
      throw e;
    }
    return ufId;
  }

  // ROUTE-METHOD
  async listFilesByRef(ctx: RequestContext, refId: string, refType: string) {
    if (refType == "item") {
      if (
        !(await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, refId))
      ) {
        throw new Error("Not authorized");
      }
    }
    const userFiles = await this.userFileRepo.listByRef(refId, refType);
    return userFiles;
  }

  // ROUTE-METHOD
  async listFilesForUser(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    const userFiles = await this.userFileRepo.listForUser(
      targetUserId,
      "updatedAt",
      "desc"
    );
    return userFiles;
  }


  // ROUTE-METHOD
  async getUserFileStreamById(
    ctx: RequestContext,
    id: string,
    previewId?: string
  ) {
    if (id.startsWith("uf_")) {
      id = id.replace("uf_", "");
    }
    const userFile = await this._getUserFileDataById(ctx, id);
    try {
      // check if previewId is valid, it can be zero
      if (!!previewId && previewId != "undefined") {
        return {
          userFile,
          stream: await this.fileAccessProvider.getUserDataStream(
            userFile.refType,
            userFile.refId,
            userFile.filename + "_preview_" + previewId
          ),
        };
      }
    } catch (e) { }

    return {
      userFile,
      stream: await this.fileAccessProvider.getUserDataStream(
        userFile.refType,
        userFile.refId,
        userFile.filename
      ),
    };
  }

  async _removeUserFileById(ctx: RequestContext, id: string) {
    const userFile = await this._getUserFileDataById(ctx, id);
    if (!userFile) {
      throw new Error("UserFile not found");
    }
    await ctx.verifySelfOrAdmin(userFile.userId);

    await this.fileAccessProvider.removeFile(
      userFile.refType,
      userFile.refId,
      userFile.filename
    );
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
