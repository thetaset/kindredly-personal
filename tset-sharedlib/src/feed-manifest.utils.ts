/**
 * Feed manifest validation (kindredly.admin-content-loader-manifest.v1).
 *
 * Single source of truth for the subscribable-feed post format, shared by:
 *  - scripts/validate-feed-manifest.mjs (offline CLI pre-flight)
 *  - the server feed-generation service (validate before returning a manifest)
 *  - the admin Generate tab (client-side pre-flight before Import)
 *
 * Post body format (see docs/guides/feed-content-standard.md):
 *   1–2 sentence intro (plain prose, no header)
 *   blank line, then bullet facts (no section headers)
 *   `## Sources` — the ONLY header allowed, always last
 */
import { tagOptionsMap } from './content.types';
import { CANONICAL_CATEGORY_IDS } from './publishedCategoryMapping';

export const FEED_MANIFEST_SCHEMA = 'kindredly.admin-content-loader-manifest.v1';

const PACE_PRESETS = new Set([0, 1, 3, 7]);

const KNOWN_TAGS: Set<string> = new Set(Object.values(tagOptionsMap).flat() as string[]);
const MINAGE_TAGS: Set<string> = new Set((tagOptionsMap.minAgeGroup || []) as string[]);

export type FeedManifestValidation = { errors: string[]; warnings: string[] };

function identityOf(r: any): string | undefined {
  return r.easyId || r.sourceItemId || r.url || r.itemId || r.localId;
}

/** All markdown header lines ("# ..." .. "###### ...") in a body. */
function headerLines(text: string): string[] {
  return text.split('\n').filter((line) => /^#{1,6}\s+/.test(line));
}

function isSourcesHeader(line: string): boolean {
  return /^#{1,6}\s*sources\b/i.test(line);
}

/** Rough sentence count for the intro-length warning (heuristic only). */
function roughSentenceCount(text: string): number {
  const matches = text.match(/[.!?]+(\s|$)/g);
  return matches ? matches.length : text.trim() ? 1 : 0;
}

/**
 * Validate a post's `textContent` against the single-level body format.
 * Split out so the generation service can check a body in isolation.
 *
 * `allowProseOnly` suppresses the intro+bullets shape warnings for special
 * content (verse/passage), where the body is a verbatim excerpt, not bullets.
 */
export function validateFeedPostBody(body: string, opts?: {allowProseOnly?: boolean}): FeedManifestValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allowProseOnly = opts?.allowProseOnly === true;

  const headers = headerLines(body);
  const sourcesHeaders = headers.filter(isSourcesHeader);
  const bannedHeaders = headers.filter((h) => !isSourcesHeader(h));

  for (const h of bannedHeaders) {
    errors.push(`body has a banned header "${h.trim()}" — the only header allowed is "## Sources" (use spacing and bullets, not section headers).`);
  }
  if (sourcesHeaders.length === 0) {
    errors.push('body has no "## Sources" section (every post ends with one).');
  } else if (sourcesHeaders.length > 1) {
    errors.push(`body has ${sourcesHeaders.length} Sources headers (expected exactly one, as the last section).`);
  }

  const lines = body.split('\n');
  const sourcesIdx = lines.findIndex((l) => /^#{1,6}\s+/.test(l) && isSourcesHeader(l));
  const beforeSources = sourcesIdx >= 0 ? lines.slice(0, sourcesIdx) : lines;

  const firstContentLine = beforeSources.find((l) => l.trim().length > 0);
  if (firstContentLine != null) {
    if (/^#{1,6}\s+/.test(firstContentLine)) {
      errors.push('body starts with a header — open with 1–2 plain sentences instead.');
    } else if (/^\s*[-*]\s+/.test(firstContentLine)) {
      errors.push('body starts with a bullet — open with 1–2 plain sentences before the fact bullets.');
    }
  } else {
    errors.push('body has no content before the Sources section.');
  }

  const bulletCount = beforeSources.filter((l) => /^\s*[-*]\s+/.test(l)).length;
  if (bulletCount === 0 && !allowProseOnly) {
    warnings.push('body has no bullet facts before Sources (the standard shape is intro + bullets; prose-only is for special content like verse).');
  }

  // Intro = the prose lines before the first bullet. Warn (only) when it runs long.
  // Skipped for prose-only content (a poem is many "sentences" by design).
  const firstBulletIdx = beforeSources.findIndex((l) => /^\s*[-*]\s+/.test(l));
  const introLines = (firstBulletIdx >= 0 ? beforeSources.slice(0, firstBulletIdx) : beforeSources)
    .filter((l) => l.trim().length > 0);
  const intro = introLines.join(' ');
  if (!allowProseOnly && roughSentenceCount(intro) > 2) {
    warnings.push('intro looks longer than 2 sentences — keep the opening short (the facts go in bullets).');
  }

  return { errors, warnings };
}

/**
 * Validate one loader manifest. Mirrors (does not replace) server-side import
 * validation. Returns errors ("must fix") and warnings ("should fix").
 */
export function validateFeedManifest(manifest: any): FeedManifestValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (id: string, m: string) => errors.push(`${id}: ${m}`);
  const warn = (id: string, m: string) => warnings.push(`${id}: ${m}`);

  if (!manifest || typeof manifest !== 'object') {
    return { errors: ['<manifest>: not an object.'], warnings };
  }
  if (manifest.schema !== FEED_MANIFEST_SCHEMA) {
    warnings.push(`<manifest>: schema is "${manifest.schema ?? '(missing)'}", expected "${FEED_MANIFEST_SCHEMA}" (loader is tolerant, but set it).`);
  }
  const records = manifest.records;
  if (!Array.isArray(records) || records.length === 0) {
    errors.push('<manifest>: `records` must be a non-empty array.');
    return { errors, warnings };
  }

  const localIds = new Set<string>();
  for (const r of records) {
    if (r && typeof r.localId === 'string') {
      if (localIds.has(r.localId)) errors.push(`${r.localId}: duplicate localId.`);
      localIds.add(r.localId);
    }
  }
  // Identity index for depth parentKey resolution.
  const identityIndex = new Set<string>();
  for (const r of records) {
    for (const key of [r.easyId, r.sourceItemId, r.itemId, r._id, r.localId]) {
      if (typeof key === 'string' && key) identityIndex.add(key);
    }
  }

  let feedColCount = 0;

  for (const r of records) {
    const id = (r && (r.localId || identityOf(r))) || '<record>';
    if (!r || typeof r !== 'object') { errors.push('<record>: not an object.'); continue; }

    // Required fields
    if (!r.type) err(id, 'missing `type`.');
    if (!r.name) err(id, 'missing `name`.');
    if (!identityOf(r)) err(id, 'needs at least one of easyId / sourceItemId / url / itemId.');

    const isPost = r.type === 'information';
    const isFeedCol = r.type === 'col' && r.publishType === 'feed';

    // Categories: canonical gen_* only
    const cats = Array.isArray(r.categories) ? r.categories : [];
    if ((isPost || isFeedCol) && cats.length === 0) err(id, 'no `categories` (use canonical gen_* ids).');
    for (const c of cats) {
      if (!CANONICAL_CATEGORY_IDS.has(c)) {
        err(id, `category "${c}" is not a canonical gen_* id${typeof c === 'string' && c.startsWith('cat_') ? ' (legacy cat_* — use the gen_* equivalent)' : ''}.`);
      }
    }

    // useCriteria: known tags; exactly one minage_* on posts and the feed col.
    const uc = Array.isArray(r.useCriteria) ? r.useCriteria : [];
    for (const t of uc) {
      if (typeof t !== 'string') { err(id, 'useCriteria contains a non-string entry.'); continue; }
      if (t.startsWith('level_')) {
        err(id, `useCriteria tag "${t}" — the multi-level system was removed; feeds are single-level (drop all level_* tags).`);
        continue;
      }
      if (!KNOWN_TAGS.has(t)) err(id, `unknown useCriteria tag "${t}".`);
    }
    const minages = uc.filter((t: any) => typeof t === 'string' && t.startsWith('minage_'));
    if (isPost || isFeedCol) {
      if (minages.length !== 1) err(id, `must have exactly one minage_* tag (found ${minages.length}: ${minages.join(', ') || 'none'}).`);
      else if (!MINAGE_TAGS.has(minages[0])) err(id, `minage tag "${minages[0]}" is not a valid minage_*.`);
      if (!uc.some((t: any) => typeof t === 'string' && t.startsWith('ta_'))) warn(id, 'no ta_* framing tag (recommended).');
    }

    // Removed multi-level leftovers
    const conceptKey = r.meta?.conceptKey ?? r.data?.meta?.conceptKey;
    if (conceptKey) err(id, 'meta.conceptKey — the multi-level system was removed; drop it.');

    // childLocalIds carry the collection's children; posts leave it empty. Only
    // a NON-empty array on a non-col is wrong (mirrors the server loader — an
    // empty [] on a post is fine and every generated post has one).
    if (Array.isArray(r.childLocalIds) && r.childLocalIds.length > 0) {
      if (r.type !== 'col') err(id, '`childLocalIds` is only allowed on `col` records.');
      for (const child of r.childLocalIds) {
        if (!localIds.has(child)) err(id, `childLocalIds references unknown localId "${child}".`);
      }
    }

    // childEasyIds (expansion): existing published children kept by reference —
    // resolvable only server-side, so just shape-check here.
    if (r.childEasyIds != null) {
      if (r.type !== 'col') err(id, '`childEasyIds` is only allowed on `col` records.');
      if (!Array.isArray(r.childEasyIds) || r.childEasyIds.some((c: any) => typeof c !== 'string' || !c.trim())) {
        err(id, '`childEasyIds` must be an array of non-empty easyId strings.');
      }
    }

    // Banners: https only; posts should have one
    for (const [field, val] of [['data.bannerUrl', r.data?.bannerUrl], ['meta.bannerImageSrcPath', r.meta?.bannerImageSrcPath]] as const) {
      if (val != null && !(typeof val === 'string' && val.startsWith('https://'))) {
        err(id, `${field} must be an https URL (got "${val}").`);
      }
    }
    if (isPost && !r.data?.bannerUrl && !r.meta?.bannerImageSrcPath) warn(id, 'no banner (data.bannerUrl / meta.bannerImageSrcPath).');

    // Depth posts: parentKey must resolve
    const depth = r.meta?.depth ?? r.data?.meta?.depth;
    if (depth) {
      const parentKey = r.meta?.parentKey ?? r.data?.meta?.parentKey;
      if (!parentKey) err(id, 'depth post is missing meta.parentKey.');
      else if (!identityIndex.has(parentKey)) err(id, `depth post meta.parentKey "${parentKey}" does not resolve to any record in this manifest.`);
    }

    // Post body format + provenance
    if (isPost) {
      if (typeof r.textContent !== 'string' || !r.textContent.trim()) {
        err(id, 'post has no textContent (markdown body).');
      } else {
        const postType = r.meta?.postType ?? r.data?.meta?.postType;
        const allowProseOnly = postType === 'verse' || postType === 'passage';
        const body = validateFeedPostBody(r.textContent, {allowProseOnly});
        for (const e of body.errors) err(id, e);
        for (const w of body.warnings) warn(id, w);
      }
      const hasSourceInfo = r.sourceInfo && Array.isArray(r.sourceInfo.sources) && r.sourceInfo.sources.length > 0;
      if (!hasSourceInfo) warn(id, 'no structured sourceInfo.sources[] (add provenance — see kindredly.provenance.v1).');
    }

    // Feed col: pacing shape
    if (isFeedCol) {
      feedColCount++;
      const childCount =
        (Array.isArray(r.childLocalIds) ? r.childLocalIds.length : 0) +
        (Array.isArray(r.childEasyIds) ? r.childEasyIds.length : 0);
      if (childCount === 0) err(id, 'feed col has no children (childLocalIds/childEasyIds — the release sequence).');
      const dcs = r.data?.defaultConsumeSettings;
      if (!dcs) warn(id, 'feed col has no data.defaultConsumeSettings (pacing default).');
      else {
        if (dcs.mode && !['whats_new', 'work_through'].includes(dcs.mode)) err(id, `defaultConsumeSettings.mode "${dcs.mode}" invalid.`);
        if (dcs.paceIntervalDays != null) {
          if (typeof dcs.paceIntervalDays !== 'number') err(id, 'defaultConsumeSettings.paceIntervalDays must be a number.');
          else if (!PACE_PRESETS.has(dcs.paceIntervalDays)) warn(id, `paceIntervalDays ${dcs.paceIntervalDays} is not a preset (0/1/3/7).`);
        }
        if (dcs.defaultLevel != null) err(id, 'defaultConsumeSettings.defaultLevel — the multi-level system was removed; drop it.');
      }
    }

    // published should be false for agent output
    if (r.published === true) warn(id, 'published:true — agent-authored records should be published:false (a human flips it on approve).');
  }

  if (feedColCount === 0) warnings.push('<manifest>: no `col` record with publishType:"feed" — this is not a feed manifest.');
  if (feedColCount > 1) warnings.push(`<manifest>: ${feedColCount} feed collections in one manifest (usually one per file).`);

  return { errors, warnings };
}
