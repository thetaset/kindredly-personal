
export default  interface UserFeed {
  _id?: string;

  userId?: string | null;

  refId?: string | null;

  refType?: string | null;

  /** Default value: false */
  isRead?: boolean | null;

  info?: Record<string, any> | null;

  /** Default value: false */
  isDeleted?: boolean | null;

  /** Default value: CURRENT_TIMESTAMP */
  createdAt?: Date | null;

  updatedAt?: Date | null;

}
