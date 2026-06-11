
export default  interface Comment {
  _id?: string;

  refType?: string | null;

  refId?: string | null;

  userId?: string | null;

  parentId?: string | null;

  data?: Record<string,any> | null;


  deletedAt?: Date | null;

  deleteReason?: string | null;

  editedAt?: Date | null;

  /** Default value: CURRENT_TIMESTAMP */
  createdAt?: Date | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;
}
