/**
 * Evaluates an item against its type's requirements — see item.requirements.ts.
 *
 * Pure and synchronous: no network, no DOM, no clock. That is what lets the same
 * function run in the editor, in list rendering, in the server's published
 * dry-run, and in tests without mocks. Probing lives in the client-only resolver
 * (`itemRequirementResolvers.ts`), which returns a patch it never applies itself.
 *
 * Two states only: satisfied, or missing. There is deliberately no "unverified"
 * middle state. An earlier version stored probe results and reported items with
 * no record as unchecked — which is every pre-existing item, so a library of
 * working podcasts filled with warnings. Whether a feed was ever fetched says
 * nothing about whether the item works, so it is not something to report.
 *
 * Verification still happens, at the point where it is honest: pasting a feed at
 * creation or repair time fetches it, and one with no playable episodes is
 * refused outright. What no longer happens is retroactive judgement of feeds we
 * never fetched.
 */
import { normalizeSubTypeForType } from './content.types';
import { getMapEmbedSchemaV1 } from './map.utils';
import { extractYoutubeVideoId } from './url.utils';
import {
  getItemRequirementsForType,
  hasFeedOfKind,
  type ItemRequirement,
} from './item.requirements';
import type { ItemDetailsInfo, ItemFeed, ItemMeta } from './types/item.types';

/**
 * `feeds` is required rather than derived from `info.feeds` on purpose.
 *
 * Nothing in the app reads `info.feeds` directly — it reads `prepItemFeeds()`,
 * which also synthesizes a feed from YouTube channel metadata and promotes
 * feed-typed entries out of `info.additionalLinks`. Making this required means
 * TypeScript forces every call site to pass the resolved list, so the check and
 * the renderer see the same feeds.
 */
export type ItemReadinessInput = {
  type?: string | null;
  subType?: string | null;
  url?: string | null;
  info?: ItemDetailsInfo | null;
  meta?: ItemMeta | null;
  feeds: ItemFeed[];
};

export type RequirementCheck = {
  requirement: ItemRequirement;
  satisfied: boolean;
};

export type ItemReadinessStatus = 'ok' | 'incomplete' | 'not-applicable';

export type ItemReadiness = {
  status: ItemReadinessStatus;
  /** The type the requirements were looked up under. */
  lookupType: string;
  checks: RequirementCheck[];
};

/* ------------------------------------------------------------------------- */
/* Grounded predicates                                                        */
/* ------------------------------------------------------------------------- */

/** `openExternalLink` takes `item.url` verbatim, so any non-empty value opens. */
function hasUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Re-validating readers keyed by schema id. Reusing `getMapEmbedSchemaV1` is the
 * model for the whole file: `MapEmbed` renders from exactly this call, so the
 * check and the renderer cannot disagree — and a tampered embed host fails here
 * for free, with no duplicated allowlist logic.
 */
const SCHEMA_VALIDATORS: Record<string, (info: ItemDetailsInfo | null | undefined) => boolean> = {
  'kindredly.mapEmbed.v1': (info) => !!getMapEmbedSchemaV1({ info }),
};

const IDENTIFIER_EXTRACTORS: Record<string, (input: ItemReadinessInput) => string | null> = {
  // Matches ItemInfo.vue's `youtubeVideoId` computed exactly: the raw extractor,
  // with no isYTVideoURL gate. Gating here but not there would reject a URL the
  // player happily accepts.
  videoId: (input) => {
    const fromMeta = input.meta?.tsExtractedInfo?.videoId;
    if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();
    return extractYoutubeVideoId(input.url || '') || null;
  },
  // prepItemFeeds synthesizes a channel feed when it can resolve an identifier,
  // so a resolved feed is itself proof. Fall back to the stored identifiers.
  youtubeChannelId: (input) => {
    if (hasFeedOfKind(input.feeds)) return 'feed';
    const extracted = input.meta?.tsExtractedInfo;
    const candidates = [
      extracted?.channelId,
      extracted?.handleId,
      Array.isArray(extracted?.youtubeChannelIds) ? extracted?.youtubeChannelIds[0] : undefined,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return null;
  },
};

function isSatisfied(requirement: ItemRequirement, input: ItemReadinessInput): boolean {
  switch (requirement.kind) {
    case 'url-present':
      return hasUrl(input.url);
    case 'feed-present':
      // No mediaKind filter — see the warning on findFeedOfKind.
      return hasFeedOfKind(input.feeds);
    case 'schema-present': {
      const validator = requirement.schemaId ? SCHEMA_VALIDATORS[requirement.schemaId] : undefined;
      return validator ? validator(input.info) : true;
    }
    case 'identifier-present': {
      const extractor = requirement.identifier ? IDENTIFIER_EXTRACTORS[requirement.identifier] : undefined;
      return extractor ? !!extractor(input) : true;
    }
    default:
      // Fail open. An older client must never flag an item over a requirement
      // kind it doesn't understand — the item would look broken for no reason
      // the user could act on.
      return true;
  }
}

/**
 * The type an item's requirements are looked up under.
 *
 * ⚠️ Uses the **stored** subType, never `resolveDisplaySubType`. That function
 * *derives* `podcast` from the presence of an audio feed, so routing it back into
 * a feed requirement is circular — the check could never fail for a derived
 * podcast, because the feed is the very thing that made it one. It would also be
 * wrong in the other direction: an item with a feed and no subType has claimed
 * nothing, and prompting its owner about a podcast they never declared is noise.
 */
export function getReadinessLookupType(input: {
  type?: string | null;
  subType?: string | null;
}): string {
  return normalizeSubTypeForType(input.type, input.subType) || input.type || 'default';
}

export function evaluateItemRequirements(
  input: ItemReadinessInput | null | undefined,
): ItemReadiness {
  const lookupType = input ? getReadinessLookupType(input) : 'default';
  const requirements = getItemRequirementsForType(lookupType);

  if (!input || requirements.length === 0) {
    return { status: 'not-applicable', lookupType, checks: [] };
  }

  const checks = requirements.map((requirement) => ({
    requirement,
    satisfied: isSatisfied(requirement, input),
  }));

  return {
    status: checks.every((check) => check.satisfied) ? 'ok' : 'incomplete',
    lookupType,
    checks,
  };
}

/** First unmet requirement — what the UI should ask for. */
export function getPrimaryUnmetCheck(readiness: ItemReadiness): RequirementCheck | null {
  return readiness.checks.find((check) => !check.satisfied) || null;
}
