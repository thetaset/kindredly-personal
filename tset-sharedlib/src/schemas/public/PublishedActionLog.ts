/**
 * Database schema for `published_action_log`: one action a curator (or the admin console, the
 * curation AI or the catalog monitor) took on a catalog item. Hand-written to match
 * tset-server/knex/migrations/20261030130000_published_action_log.ts (CWS-3).
 *
 * Curators only: the curator page lists these. `detail` holds field names, states and reasons,
 * never page content.
 */
export default interface PublishedActionLog {
  _id?: string;
  /** Canonical published `_id`. No foreign key: the record outlives a deleted item. */
  publishedId?: string;
  actorKind?: PublishedActionActorKind;
  /** The curator's public profile id; null for the monitor. */
  actorPublicId?: string | null;
  actorUserId?: string | null;
  action?: PublishedAction;
  detail?: Record<string, any> | null;
  createdAt?: Date;
}

export type PublishedActionActorKind = 'curator' | 'admin' | 'ai' | 'monitor';

export type PublishedAction =
  | 'edited'
  | 'readable_id'
  | 'curated'
  | 'uncurated'
  | 'choice'
  | 'unchoice'
  | 'declined'
  | 'proposal_applied'
  | 'proposal_rejected'
  | 'review_finished'
  | 'added'
  | 'approved'
  | 'archived'
  | 'restored'
  | 'deleted'
  | 'blocked'
  | 'unblocked'
  | 'type_changed'
  | 'manifest_updated'
  | 'under_review';
