

export default  interface UserFile {
  _id?: string;

  accountId?: string | null;

  userId?: string | null;

  refId?: string | null;

  refType?: string | null;

  filename?: string | null;

  fileType?: string | null;

  fileSize?: number | null;

  


  lastViewedAt?: Date | null;

  deletedAt?: Date | null;

  createdAt?: Date | null;

  updatedAt?: Date | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;
}
