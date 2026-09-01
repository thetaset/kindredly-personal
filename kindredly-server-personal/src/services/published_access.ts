import {config} from '@/config';
import type {RequestContext} from '@/base/request_context';
import type Published from 'tset-sharedlib/schemas/public/Published';

/**
 * The published-catalog reads that open services do.
 *
 * `services/_internal/internal_published.service.ts` is withheld from the
 * published Kindredly Personal repo, but `setup_catalog.service.ts` and
 * `content_bundle.service.ts` are not - both are reachable from a route the box
 * registers. A top-level import of the withheld service in either one is a
 * MODULE_NOT_FOUND at boot.
 *
 * A self-hosted server has no published catalog at all, so the stand-in is an
 * empty one rather than a lazy getter that throws the first time a parent opens
 * the page. A getter would only move the crash from boot to request time, which
 * is worse - it turns a failure that shows up in one place into one that shows
 * up per feature. Every call site stays unchanged, and "this box has no
 * community content" reads as an empty list instead of a 500.
 */
export interface PublishedReader {
  getPublishedWithIds(ids: string[]): Promise<Published[]>;
  getPublishedWithIdsForView(ctx: RequestContext, ids: string[]): Promise<Published[]>;
  filteredSearchPublished(
    ctx: RequestContext,
    searchData: unknown,
    pageInfo?: unknown,
  ): Promise<{rows: Published[]; moreAvailable: boolean}>;
}

/** Nothing published here, and that is not an error - there is nothing to read. */
const EMPTY_CATALOG: PublishedReader = {
  async getPublishedWithIds() {
    return [];
  },
  async getPublishedWithIdsForView() {
    return [];
  },
  async filteredSearchPublished() {
    return {rows: [], moreAvailable: false};
  },
};

export function publishedReader(): PublishedReader {
  if (config.privateServer) return EMPTY_CATALOG;
  // personal-optional: guarded, never reached on a self-hosted server
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Service = require('./_internal/internal_published.service').default;
  return new Service() as PublishedReader;
}
