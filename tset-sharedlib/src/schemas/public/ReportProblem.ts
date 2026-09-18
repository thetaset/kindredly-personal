export default  interface ReportProblem {
 
  _id?: number;

  category?: string;

  details?: Record<string, any> | null;

  sourceType?: string;

  sourceId?: string | null;

  userId?: string | null;

  adminStatus?: string | null;

  adminStatusInfo?: Record<string, any> | null;

  /** The curation review a catalog report opened or joined. */
  curationReviewId?: string | null;

  /** Default value: CURRENT_TIMESTAMP */
  createdAt?: Date;
}
