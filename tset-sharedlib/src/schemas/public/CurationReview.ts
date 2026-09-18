/**
 * Database schema for `curation_review`: one review of a catalog row against the checklist in
 * tset-sharedlib/src/curation.checklist.ts. Hand-written to match
 * tset-server/knex/migrations/20260915120000_curation_review.ts.
 *
 * `aiDraft` and `internalNote` are curators only, and `curatorId` is not shown to families; the
 * public view is built by the server, never by returning this row.
 */
export default interface CurationReview {
  _id?: string;
  /** Canonical published `_id`. */
  publishedId?: string;
  checklistVersion?: number;
  /** 'open' | 'finalized' | 'closed' */
  status?: string;
  /** 'report' | 'scheduled' | 'backfill' | 'suggestion' | 'curator' */
  openReason?: string;
  underReview?: boolean;
  answers?: Record<string, any> | null;
  aiDraft?: Record<string, any> | null;
  /** 'curate' | 'decline' */
  outcome?: string | null;
  declineReason?: string | null;
  summary?: string | null;
  internalNote?: string | null;
  reviewAgainMonths?: number | null;
  nextReviewAt?: Date | null;
  /** Curators who had to agree, recorded when it was decided. Null: decided by one curator. */
  signoffsRequired?: number | null;
  curatorId?: string | null;
  openedAt?: Date | null;
  finalizedAt?: Date | null;
  version?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
