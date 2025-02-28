
export default  interface UserChangeLog {
  /** Default value: nextval('user_change_log_id_seq'::regclass) */
  id?: number;

  userId?: string | null;

  sourceId?: string | null;

  data?: unknown | null;

  /** Default value: CURRENT_TIMESTAMP */
  createdAt?: Date;

  /** Default value: CURRENT_TIMESTAMP */
  updatedAt?: Date;
}

