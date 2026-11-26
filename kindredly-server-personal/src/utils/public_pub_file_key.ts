import path from 'path';

/**
 * Paths in the published file store that /pubfile/get (and its older name /published/file/get)
 * never serves. That route hands any signed-in user the file at `pubId/filename`, and the same store
 * holds the classifier versions under `classifier/` (CLS-3): drafts that were never activated, and
 * the admins' notes. Apps read a version through /data/classifier/get, admins through
 * /admin/classifier/versions/get. The same kind of rule keeps ai-config.json off /image/get
 * (public_image_name.ts, SL-555).
 */
const WITHHELD_PREFIXES = ['classifier/'];

/**
 * Whether the public published-file route may serve `pubId/filename`. The path is normalized the way
 * the disk store joins it, so `x/../classifier/...` and `./classifier/...` are refused too, and so
 * is any path that climbs out of the store.
 */
export function isServablePubFileKey(pubId: unknown, filename: unknown): boolean {
  if (typeof pubId !== 'string' || typeof filename !== 'string' || !pubId || !filename) return false;
  // The leading slash goes before normalizing: the store joins `/x` under its root, so `/../x`
  // climbs out of it rather than staying at `/`.
  const key = path.posix.normalize(`${pubId}/${filename}`.replace(/\\/g, '/').replace(/^\/+/, '')).toLowerCase();
  if (key === '..' || key.startsWith('../')) return false;
  return !WITHHELD_PREFIXES.some((prefix) => key === prefix.slice(0, -1) || key.startsWith(prefix));
}
