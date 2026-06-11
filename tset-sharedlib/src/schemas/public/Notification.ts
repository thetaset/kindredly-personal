
export default  interface Notification {
  _id?: string;

  accountId?: string | null;

  type?: string | null;

  senderId?: string | null;

  targetKey?: string | null;

  data?: unknown | null;

  createdAt?: Date | null;

  readAt?: Date | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;
}
