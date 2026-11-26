/**
 * The `project:` tags of 3.1.6 (HAT-973, AIM-13). An AI app's project put a `project:` tag on each
 * item it saved, with the project's name and note in one encrypted record per person. Projects are
 * collections now (HAT-1064, PRJ-5): the tags stay on the items, out of sight, and the move copies
 * each one's items into a Project collection. Nothing makes a project tag any more.
 */

export const PROJECT_TAG_PREFIX = 'project:';

const PROJECT_NAME_MAX = 80;

export function isProjectTag(tag: unknown): tag is string {
  return typeof tag === 'string' && tag.startsWith(PROJECT_TAG_PREFIX) && tag.length > PROJECT_TAG_PREFIX.length;
}

/**
 * Whether a tag is shown wherever tags are: every tag but the `project:` ones, which are kept on
 * the items untouched and never shown or typed.
 */
export function isShownTag(tag: unknown): tag is string {
  return typeof tag === 'string' && !isProjectTag(tag);
}

/** A project name, trimmed and capped; empty when there is nothing to name. */
export function cleanProjectName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return name.replace(/\s+/g, ' ').trim().slice(0, PROJECT_NAME_MAX);
}
