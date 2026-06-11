/**
 * File storage and upload types
 */

import type { EncInfo } from './encryption.types';

export interface FileRefInfo {
  _id: string;
  filename: string;
  filesize: number;
  mimetype?: string;
  url?: string;
  createdAt: string;
}

export interface FilePreview {
  id: string;
  type: string;
  data?: string;
}

export interface FileUploadRequest {
  ufId?: string;
  refId: string;
  refType: string;
  filename: string;
  fileType: string;
  fileData: string;
  previews?: FilePreview[];
  encInfo?: EncInfo | null;
  secure?: boolean;
}

export interface FileUploadPrepData {
  filename: string;
  fileType: string;
  fileData: string;
  filesize: number;
  imagePreview?: string;
  imageType?: string;
  meta?: Record<string, any>;
  urlPrefix?: string;
  objData?: Record<string, any>;
}
