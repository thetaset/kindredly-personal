
export default  interface Following {
  id?: number;

  userId?: string | null;

  refType?: string | null;

  refId?: string | null;

  statusCode?: number | null;

  createdAt?: Date;

  updatedAt?: Date;

}
