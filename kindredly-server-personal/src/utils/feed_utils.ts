/**
 * Keep well-formed feed entries (object with a feedURL/url), de-duped by feedURL.
 * Shared by the admin content editor (`/admin/published/updateContentFields`) and the
 * content loader (`AdminContentLoaderManifestRecord.feeds`) so both write the same
 * `info.feeds[]` shape the client's `prepItemFeeds` reads.
 */
export function sanitizeFeeds(values: unknown): Record<string, any>[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: Record<string, any>[] = [];
  for (const raw of values) {
    if (!raw || typeof raw !== 'object') continue;
    const feed = raw as Record<string, any>;
    const feedURL =
      typeof feed.feedURL === 'string' ? feed.feedURL.trim() : typeof feed.url === 'string' ? feed.url.trim() : '';
    if (!feedURL || seen.has(feedURL)) continue;
    seen.add(feedURL);
    const feedId =
      typeof feed.feedId === 'string' && feed.feedId.trim() ? feed.feedId.trim() : `feed-${out.length + 1}`;
    out.push({...feed, feedId, feedURL});
  }
  return out;
}
