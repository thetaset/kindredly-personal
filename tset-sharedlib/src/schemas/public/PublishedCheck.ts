/**
 * Database schema for `published_check`: what the catalog monitor last saw at one address of a
 * catalog item (MON-1, docs/trackers/catalog-monitor-tracker.md). One row per item and kind, kept
 * current. Hand-written to match tset-server/knex/migrations/20261030140000_published_check.ts.
 *
 * Public page text only: the monitor reads what anyone can read, never a family's data.
 */
export default interface PublishedCheck {
  /** `<publishedId>:<kind>` */
  _id?: string;
  publishedId?: string;
  kind?: PublishedCheckKind;
  url?: string;
  checkedAt?: Date | null;
  nextCheckAt?: Date | null;
  /** 'ok' read; 'not_modified' the site said unchanged; 'not_checked' refused; 'failed' did not load. */
  result?: 'ok' | 'not_modified' | 'not_checked' | 'failed';
  reason?: string | null;
  httpStatus?: number | null;
  finalUrl?: string | null;
  etag?: string | null;
  lastModified?: string | null;
  title?: string | null;
  /** The readable text of the last read, clipped; null for a feed. */
  text?: string | null;
  textHash?: string | null;
  textLength?: number | null;
  /** Outside hosts of the page's scripts and frames. */
  scriptHosts?: string[] | null;
  /** A feed's newest post. */
  newestPostAt?: Date | null;
  /** Reads in a row that did not load. */
  failures?: number | null;
  /** When the text last changed, and by how much (0–1). */
  changedAt?: Date | null;
  changeRatio?: number | null;
  /** The text and title from before the last change, for saying what changed. */
  previousText?: string | null;
  previousTitle?: string | null;
  findings?: PublishedCheckFinding[] | null;
}

export type PublishedCheckKind = 'page' | 'feed' | 'privacy' | 'terms';

export type PublishedCheckFindingCode =
  | 'broken'
  | 'unreachable'
  | 'domain_moved'
  | 'parked'
  | 'major_change'
  /** A privacy policy's or terms page's text changed (MON-4). */
  | 'policy_changed'
  | 'title_changed'
  | 'new_ads'
  | 'new_trackers'
  | 'feed_quiet';

export type PublishedCheckFinding = {
  code: PublishedCheckFindingCode;
  /** When the monitor first saw it; kept while it lasts. */
  since: string;
  detail?: Record<string, any>;
};
