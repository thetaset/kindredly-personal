

/** Represents the initializer for the table public.user_activity_log */
export default  interface UserActivityLog {
  _id?: string;
  userId?: string | null;
  uid?: string | null;
  clientId?: string | null;
  monitorId?: string | null;
  data?: null | Record<string, any>;
  type?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  complete?: boolean;
  encrypted?: boolean;
  encInfo?: null | Record<string, any>;
}
