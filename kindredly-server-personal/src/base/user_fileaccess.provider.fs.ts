import { config } from "@/config";
import fs from "fs";
import path from "path";
import { saveURLDatatoFile } from "../utils/binary_utils";
import { UserFileAccessProvider } from "./user_fileaccess.provider";

export class UserFileAccessProviderFS implements UserFileAccessProvider {
 
  async uploadImageDirect(imageData, filename, prefix) {
    const rootpath = String(config.imageStorage.path);

    let fpath: string;
    if (prefix) fpath = path.join(rootpath, prefix);
    else fpath = rootpath;

    await fs.promises.mkdir(fpath, { recursive: true }); //fs.mkdirSync
    const fullpath = path.join(fpath, filename);
    console.log("Saving file to ", fullpath);

    if (imageData.startsWith("data:")) {
      imageData = imageData.split(",")[1];
    }

    saveURLDatatoFile(imageData, fullpath);
    return filename;
  }

  async uploadUserFileData(
    data: any,
    refType: string,
    refId: string,
    filename: string
  ) {
    let fpath: string;
    fpath = path.join(String(config.userStorage.path), refType, refId);

    await fs.promises.mkdir(fpath, { recursive: true });
    const fullpath = path.join(fpath, filename);

    // clean data
    if (typeof data === "string") {
      data = data.replace(/^data:image\/\w+;base64,/, "");
    }
    console.log("Saving user file to ", fullpath);

    const buffer = Buffer.from(data, "base64");
    fs.writeFileSync(fullpath, new Uint8Array(buffer));
    return filename;
  }

  async fileExists(filename) {
    const fpath = config.imageStorage.path;
    const fullpath = path.join(fpath, filename);
    return fs.existsSync(fullpath);
  }

  async getUserDataStream(refType: string, refId: string, filename: string) {
    let fpath: string;
    fpath = path.join(String(config.userStorage.path), refType, refId);
    const fullpath = path.join(fpath, filename);
    const s = fs.createReadStream(fullpath);
    return s;
  }

  async getImageStream(filename) {
    const fpath = String(config.imageStorage.path);
    const fullpath = path.join(fpath, filename);

    const s = fs.createReadStream(fullpath);
    return s;
  }

  async removeFile(refType: string, refId: string, filename: string) {
    let fpath: string;
    fpath = path.join(String(config.userStorage.path), refType, refId);
    const fullpath = path.join(fpath, filename);
    fs.unlinkSync(fullpath);
  }
}
