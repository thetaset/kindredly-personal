/**
 * Item type requirements — what each type *needs* in order to deliver what its
 * experience contract *promises*.
 *
 * `getItemExperienceContract` in content.types.ts declares that a `podcast` has
 * `experienceKind: 'audio'` and `supportsMediaProviders`. Nothing used to declare
 * that a podcast therefore needs a feed, so any link could be labelled a podcast
 * and claim a player with nothing to play.
 *
 * ## The one rule that keeps this honest
 *
 * **A requirement may only test the same signal the feature itself reads, and may
 * only report a failure it can prove.**
 *
 * The first version of this file broke both halves. It required
 * `feed.mediaKind === 'audio'` — a label written once at save time that *nothing*
 * in the playback path consults (the player parses the feed live and looks for
 * audio enclosures per episode). And it treated "we have not checked this" as a
 * problem worth reporting. The result was a warning on every working podcast.
 *
 * So: check what the renderer checks, and stay silent unless the thing is
 * demonstrably absent. Never warn from an unverified cache, a stale label, or the
 * absence of a check. A false alarm costs far more trust than a missed one.
 *
 * This file is pure data plus type declarations — no imports — so it can be read
 * from the client, the background, and the server. The evaluator is in
 * item.readiness.ts.
 */

/**
 * The closed vocabulary. Deliberately small and non-composable — there are no
 * and/or/not combinators. If a type ever needs "A or B", add a kind that names
 * that specific fact rather than growing a rules engine here.
 */
export type ItemRequirementKind =
  | 'url-present'
  | 'feed-present'
  | 'schema-present'
  | 'identifier-present';

export type ItemRequirement = {
  /** Stable and namespaced. */
  id: string;
  kind: ItemRequirementKind;
  /** Noun phrase naming what is missing, e.g. "Episode feed". */
  label: string;
  /** Input label used when asking for it during creation or repair. */
  prompt: string;
  placeholder?: string;
  /**
   * Honest one-liner shown when the supplied input didn't resolve. The save
   * still succeeds, so this is never phrased as an error.
   */
  fallbackNote?: string;
  /** Render the creation input as a textarea (map embed snippets). */
  multiline?: boolean;
  /** Resolver key; absent means there is no automatic repair for this. */
  repair?: ItemRequirementRepair;
  /**
   * Input-time strictness: when the user attaches a feed for this requirement,
   * demand that it actually yields playable audio, and refuse it otherwise.
   *
   * Deliberately separate from the condition that produces a warning on an
   * existing item, which is far looser. We can be strict about what we let *in*
   * — there we have just fetched the feed and know the answer — without being
   * strict about items we never fetched. Conflating the two is what made the
   * first version warn on every working podcast.
   */
  requirePlayableAudioOnAttach?: boolean;

  // kind-specific parameters
  schemaId?: string;
  identifier?: ItemRequirementIdentifier;
};

export type ItemRequirementRepair =
  | 'probeFeed'
  | 'resolveYouTubeChannel'
  | 'resolveMap'
  | 'refreshMetadata';

export type ItemRequirementIdentifier = 'videoId' | 'youtubeChannelId';

/** Map embed schema id, duplicated as a literal to keep this file import-free. */
const MAP_EMBED_SCHEMA_ID = 'kindredly.mapEmbed.v1';

/**
 * Keyed by the same `lookupType` that `getItemExperienceContract` switches on —
 * the normalized subType when there is one, else the primary type.
 *
 * Each entry names the signal the type's renderer uses. Deviating from that is
 * how false positives get in.
 */
export const ITEM_REQUIREMENTS: Partial<Record<string, ItemRequirement[]>> = {
  // Opening a link hands `item.url` to openExternalLink as-is, so any non-empty
  // url works — including non-http schemes. Do not tighten to http(s).
  link: [
    {
      id: 'link.url',
      kind: 'url-present',
      label: 'Link address',
      prompt: 'Link address',
      placeholder: 'https://',
    },
  ],
  website: [
    {
      id: 'website.url',
      kind: 'url-present',
      label: 'Site address',
      prompt: 'Site address',
      placeholder: 'https://',
    },
  ],
  // The episode list renders from any feed with a feedURL; whether an individual
  // episode plays is decided live, per entry, from its audio enclosure. So the
  // only thing knowable synchronously — and the only thing worth warning about —
  // is whether the item has a feed at all. `mediaKind` is deliberately NOT tested:
  // it is a save-time label that the player never reads, and requiring it flagged
  // every working podcast.
  podcast: [
    {
      id: 'podcast.feed',
      kind: 'feed-present',
      label: 'Episode feed',
      prompt: 'Podcast feed or show page URL',
      placeholder: 'https://…/feed.xml, or the show page',
      fallbackNote: "No feed found — it'll be saved as a link you can set up later.",
      repair: 'probeFeed',
      requirePlayableAudioOnAttach: true,
    },
  ],
  yt_video: [
    {
      id: 'ytVideo.videoId',
      kind: 'identifier-present',
      identifier: 'videoId',
      label: 'Video link',
      prompt: 'YouTube video link',
      placeholder: 'https://youtube.com/watch?v=…',
      fallbackNote: "Not a recognized YouTube video — it'll be saved as a plain link.",
      repair: 'refreshMetadata',
    },
  ],
  yt_channel: [
    {
      id: 'ytChannel.channelId',
      kind: 'identifier-present',
      identifier: 'youtubeChannelId',
      label: 'Channel link',
      prompt: 'YouTube channel link',
      placeholder: 'https://youtube.com/@…',
      fallbackNote: "Not a recognized YouTube channel — it'll be saved as a plain link.",
      repair: 'resolveYouTubeChannel',
    },
  ],
  map: [
    {
      id: 'map.embed',
      kind: 'schema-present',
      schemaId: MAP_EMBED_SCHEMA_ID,
      label: 'Map',
      prompt: 'Map link or embed code',
      placeholder: 'Paste a Google Maps / OpenStreetMap link, or a map embed code',
      // Preserved verbatim from the hard-coded map branch it replaced.
      fallbackNote: "Couldn't recognize a map — it'll be saved as a plain link.",
      multiline: true,
      repair: 'resolveMap',
    },
  ],
};

export function getItemRequirementsForType(lookupType: string | null | undefined): ItemRequirement[] {
  if (!lookupType) return [];
  return ITEM_REQUIREMENTS[lookupType] ?? [];
}

/* ------------------------------------------------------------------------- */
/* Shared feed predicate                                                      */
/* ------------------------------------------------------------------------- */

/**
 * The first feed carrying a real `feedURL`, optionally narrowed to a media kind.
 *
 * Lives here — in the file with no imports — so both the display derivation
 * (`getSubTypeFromFeeds`) and the `feed-present` requirement can use it without a
 * circular import.
 *
 * ⚠️ The `mediaKind` filter exists for `getSubTypeFromFeeds`, which asks "should
 * this display as a podcast?". Requirements must NOT pass it: `mediaKind` is a
 * save-time label, absent on every item saved before 2026-04-13 and on every feed
 * synthesized from `additionalLinks` or YouTube metadata, while the player
 * ignores it entirely.
 */
export function findFeedOfKind(
  feeds: Array<{ feedURL?: string | null; mediaKind?: string | null }> | null | undefined,
  mediaKind?: string | null,
): { feedURL: string; mediaKind?: string | null } | null {
  if (!Array.isArray(feeds)) return null;

  for (const feed of feeds) {
    const feedURL = typeof feed?.feedURL === 'string' ? feed.feedURL.trim() : '';
    if (!feedURL) continue;
    if (mediaKind && feed?.mediaKind !== mediaKind) continue;
    return { feedURL, mediaKind: feed?.mediaKind };
  }

  return null;
}

export function hasFeedOfKind(
  feeds: Array<{ feedURL?: string | null; mediaKind?: string | null }> | null | undefined,
  mediaKind?: string | null,
): boolean {
  return findFeedOfKind(feeds, mediaKind) !== null;
}
