import { Readable } from "stream";

export interface UserFileAccessProvider {
  uploadImageDirect(imageData, filename: string, prefix?:string): Promise<string>;

  uploadUserFileData(
    data,
    refType: string,
    refId: string,
    filename: string
  ): Promise<string>;

  fileExists(filename: string): Promise<boolean>;

  getUserDataStream(
    refType: string,
    refId: string,
    filename: string
  ): Promise<Readable>;

  getImageStream(filename): Promise<Readable>;

  removeFile(refType: string, refId: string, filename: string): Promise<void>;
}
