
export default  interface Subscription {
  _id?: string;

  refType?: string | null;

  refId?: string | null;

  userId?: string | null;

  data?: Record<string,any> | null;

  statusCode?: number | null;

  createdAt?: Date | null;

  updatedAt?: Date | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;
}
