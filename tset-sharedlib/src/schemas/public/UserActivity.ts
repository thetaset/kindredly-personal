

export default  interface UserActivity {
  
  _id?: string;

  url?: string | null;

  info?: null | Record<string, any>;

  activityType?: string | null;

  userId?: string | null;

  blocked?: boolean | null;

  context?: unknown | null;

  createdAt?: Date | null;

  encrypted?: boolean;

  encInfo?: null | Record<string, any>;
}
