
export default  interface EventLog {
  /** Default value: nextval('event_log__id_seq'::regclass) */
  _id?: number;

  eventName?: string;

  eventVersion?: string | null;

  eventType?: string;

  experimentId?: string | null;

  source?: string | null;

  /** Default value: CURRENT_TIMESTAMP */
  createdAt?: Date;

  eventInfo?: unknown | null;

  clientInfo?: unknown | null;

  /** Default value: false */
  anonymized?: boolean | null;

  userId?: string | null;

  accountId?: string | null;
}
