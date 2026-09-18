/**
 * What a public publish (a suggestion to Kindredly) has to carry before it can be submitted.
 *
 * One rule, read by the publish form and enforced by the server. The form used to be the only
 * place this lived, so a direct request could submit a public collection with no category, no
 * picture and a two-letter name. No imports: this is read from the client, the background and
 * the server alike.
 */
export const PUBLIC_PUBLISH_MIN_NAME_LENGTH = 6;

export type PublicPublishFields = {
  name?: string | null;
  categories?: string[] | null;
  useCriteria?: string[] | null;
  imageFilename?: string | null;
};

const AGE_GROUP_PREFIX = 'minage_';
const USAGE_TYPE_PREFIX = 'eduval_';

/** Everything still missing, in the words the form shows. Empty means nothing is missing. */
export function missingPublicRequirements(fields: PublicPublishFields): string[] {
  const missing: string[] = [];
  const tags = Array.isArray(fields.useCriteria) ? fields.useCriteria : [];
  if (!fields.categories || fields.categories.length === 0) missing.push('at least one category');
  if (!fields.name || fields.name.length < PUBLIC_PUBLISH_MIN_NAME_LENGTH)
    missing.push(`a name of at least ${PUBLIC_PUBLISH_MIN_NAME_LENGTH} characters`);
  // The form's label for this has always been "an age group and usage type"; the tags are
  // minage_* and eduval_*. It used to be a count of six tags, which most real collections
  // never reach (they carry three to five).
  const hasAgeGroup = tags.some((tag) => typeof tag === 'string' && tag.startsWith(AGE_GROUP_PREFIX));
  const hasUsageType = tags.some((tag) => typeof tag === 'string' && tag.startsWith(USAGE_TYPE_PREFIX));
  if (!hasAgeGroup && !hasUsageType) missing.push('an age group and usage type');
  else if (!hasAgeGroup) missing.push('an age group');
  else if (!hasUsageType) missing.push('a usage type');
  if (!fields.imageFilename || fields.imageFilename.length === 0) missing.push('an image');
  return missing;
}

/**
 * Why a curator did not add a suggestion. A short closed list, so the family reads a reason a
 * person chose rather than free text, and the curator picks in seconds.
 */
export const DECLINE_REASONS = [
  {code: 'not_educational', label: 'Not educational'},
  {code: 'source', label: "A source we can't vouch for"},
  {code: 'distracting', label: 'Too many ads or distractions'},
  {code: 'advocacy', label: 'Advocacy, not study'},
  {code: 'duplicate', label: 'Already in the catalog'},
  {code: 'presentation', label: 'Needs a better description or picture'},
  // The curation review's "Link works" check fails to this (tset-sharedlib/src/curation.checklist.ts).
  {code: 'broken', label: "The link doesn't work"},
] as const;

export type DeclineReasonCode = (typeof DECLINE_REASONS)[number]['code'];

export function declineReasonLabel(code: string | null | undefined): string | null {
  const found = DECLINE_REASONS.find((reason) => reason.code === code);
  return found ? found.label : null;
}

export function isDeclineReasonCode(value: unknown): value is DeclineReasonCode {
  return typeof value === 'string' && DECLINE_REASONS.some((reason) => reason.code === value);
}

/**
 * Whether a catalog row may be recommended: offered by search, category chips, galleries, the
 * Knowledge Map, starter bundles or the Activity Finder. A row an open curation review has taken
 * out (`underReviewAt` set) is not, though its page still opens and a family's own choices stand.
 *
 * The SQL twin is the literal `"underReviewAt" IS NULL` in the server's published read paths;
 * this is for rows already in memory.
 */
export function isRecommendable(row: {underReviewAt?: Date | string | null} | null | undefined): boolean {
  return !!row && (row.underReviewAt === null || row.underReviewAt === undefined);
}

/**
 * A contributor is an ordinary family account the admin marked as one in user_public.verifiedType:
 * a teacher, an expert, an invited parent. Nothing else is granted; a contributor publishes
 * collections the way every family does, and the badge sits beside the byline once a curator
 * has curated one. 'official' is Kindredly's own publisher profile and is never set on a real account.
 */
export const CONTRIBUTOR_VERIFIED_TYPE = 'contributor';

export function isContributor(verifiedType: string | null | undefined): boolean {
  return verifiedType === CONTRIBUTOR_VERIFIED_TYPE;
}
