/**
 * Projects (HAT-973, AIM-13). A project is a tag on each item whose key is made once from the
 * project's first name and never changes; its display name and note live in one encrypted record
 * per project, so renaming touches no item. The raw tag is never shown.
 */

export const PROJECT_TAG_PREFIX = 'project:';

const PROJECT_NAME_MAX = 80;

export function isProjectTag(tag: unknown): tag is string {
  return typeof tag === 'string' && tag.startsWith(PROJECT_TAG_PREFIX) && tag.length > PROJECT_TAG_PREFIX.length;
}

/** A display name, trimmed and capped; empty when there is nothing to name. */
export function cleanProjectName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return name.replace(/\s+/g, ' ').trim().slice(0, PROJECT_NAME_MAX);
}

/** The key a new project's tag gets from its first name: `project:kitchen-remodel`. */
export function projectSlug(name: unknown): string {
  const slug = cleanProjectName(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'project';
}

/** A key not already in `taken`, adding -2, -3… when the slug is used. */
export function newProjectTag(name: unknown, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = `${PROJECT_TAG_PREFIX}${projectSlug(name)}`;
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Matching an AI app's project name to an existing one: case and spacing do not count. */
export function sameProjectName(a: unknown, b: unknown): boolean {
  const x = cleanProjectName(a).toLocaleLowerCase();
  return !!x && x === cleanProjectName(b).toLocaleLowerCase();
}

/** What a tag shows: the project's display name, or the tag itself for a plain tag. */
export function tagDisplayName(tag: string, projectNames: ReadonlyMap<string, string>): string {
  if (!isProjectTag(tag)) return tag;
  return projectNames.get(tag) || tag.slice(PROJECT_TAG_PREFIX.length).replace(/-/g, ' ');
}
