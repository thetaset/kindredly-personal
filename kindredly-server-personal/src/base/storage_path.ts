import path from 'path';

/**
 * Resolve `segments` under `root` and refuse anything that lands outside it.
 *
 * Shared by every storage seam that turns a name into a filesystem path — the user/image file
 * provider (`user_fileaccess.provider.fs.ts`) and the local backup target
 * (`backup_target.fs.ts`). It lives here rather than in either of them because a containment
 * check that exists twice is a check that gets fixed once.
 *
 * Containment is verified on the RESOLVED path rather than by rejecting `..` in the input,
 * because legitimate names are derived (`<name>__chunk_3`, `blobs/3f/3f2a…`) and a blacklist both
 * misses encodings and breaks real names. `path.resolve` also absorbs an absolute segment —
 * `resolve(root, '/etc/passwd')` is `/etc/passwd` — which the same check catches.
 */
export function resolveWithinRoot(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(String(root));

  for (const segment of segments) {
    if (segment === undefined || segment === null || segment === '') {
      throw new Error('Invalid storage path: empty segment');
    }
  }

  const fullpath = path.resolve(resolvedRoot, ...segments.map(String));

  if (fullpath !== resolvedRoot && !fullpath.startsWith(resolvedRoot + path.sep)) {
    // Deliberately does not echo the resolved path back to the caller.
    throw new Error('Invalid storage path: resolves outside the storage root');
  }

  return fullpath;
}
