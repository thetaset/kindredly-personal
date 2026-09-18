/**
 * Database schema for `curation_review_signoff`: one curator's own answers to a curation review.
 * Hand-written to match tset-server/knex/migrations/20260916120000_curation_review_signoff.ts.
 *
 * Adding an item takes several of these, from curators who agree (tset-sharedlib/src/curation.signoff.ts).
 * `internalNote` is curators only, and no curator's name reaches families; the public view is built
 * from the review the sign-offs decided, never from these rows.
 */
export default interface CurationReviewSignoff {
  _id?: string;
  reviewId?: string;
  /** Canonical published `_id`. */
  publishedId?: string;
  /** The curator's public profile id. */
  curatorId?: string;
  /** The account the curator belongs to: one family's sign-offs count once. */
  curatorAccountId?: string | null;
  /** 'curator' today. */
  curatorRole?: string;
  /** 'draft' | 'finished' | 'superseded' */
  status?: string;
  answers?: Record<string, any> | null;
  /** 'curate' | 'decline' */
  outcome?: string | null;
  declineReason?: string | null;
  summary?: string | null;
  internalNote?: string | null;
  reviewAgainMonths?: number | null;
  /** What the item looked like when this curator answered (curationItemFingerprint). */
  itemFingerprint?: string | null;
  version?: number;
  finishedAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
