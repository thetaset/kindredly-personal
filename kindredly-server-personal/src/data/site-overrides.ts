import type {SiteOverrideRule} from 'tset-sharedlib/content.types';

/**
 * Curated "domain -> classification" overrides (code = source of truth).
 *
 * This list is served to clients via `/data/siteOverrides/getActive`, cached locally,
 * and merged into the deterministic site-classification layer so it OVERRIDES the local
 * ML classifier for known edge-case sites. It updates without an app release: edit this
 * file and deploy — clients pick up the new content hash (version) within the refresh TTL.
 *
 * To add a site:
 *  - `domains`: bare host(s); subdomains match unless `includeSubdomains: false`.
 *  - `pathPrefixes`: optional, scope to a path (e.g. ['/shorts']). More specific = higher priority.
 *  - `eduValue`: the corrected category. `alwaysApply: true` forces it over a stronger signal.
 *  - `reason`: a short human-readable justification.
 *  - `restricted` is reserved for a future block axis and is NOT enforced yet.
 *
 * The first five entries mirror the client's hardcoded baseline (so this list is the single
 * source going forward); the hardcoded baseline remains the offline fallback.
 */
export const SITE_OVERRIDE_RULES: SiteOverrideRule[] = [
  {
    id: 'youtube-shorts',
    label: 'YouTube Shorts',
    domains: ['youtube.com'],
    pathPrefixes: ['/shorts'],
    eduValue: 'eduval_junk',
    intent: 'intent_play',
    reason: 'YouTube Shorts pages default to Junk unless a stronger category already exists.',
    alwaysApply: true,
  },
  {
    id: 'netflix',
    label: 'Netflix',
    domains: ['netflix.com'],
    eduValue: 'eduval_fun',
    intent: 'intent_play',
    reason: 'Netflix pages default to Entertainment unless a stronger category already exists.',
  },
  {
    id: 'prime-video',
    label: 'Prime Video',
    domains: ['primevideo.com', 'amazonvideo.com'],
    eduValue: 'eduval_fun',
    intent: 'intent_play',
    reason: 'Prime Video pages default to Entertainment unless a stronger category already exists.',
  },
  {
    id: 'prime-video-amazon',
    label: 'Prime Video',
    domains: ['amazon.com'],
    pathPrefixes: ['/gp/video'],
    eduValue: 'eduval_fun',
    intent: 'intent_play',
    reason: 'Prime Video pages default to Entertainment unless a stronger category already exists.',
  },
  {
    id: 'amazon',
    label: 'Amazon',
    domains: ['amazon.com'],
    eduValue: 'eduval_task',
    intent: 'intent_task',
    reason: 'Amazon pages default to Task unless a stronger category already exists.',
  },

  // --- Edge-case sites the ML classifier tends to mislabel (edit freely) ---
  {
    id: '9gag',
    label: '9GAG',
    domains: ['9gag.com'],
    eduValue: 'eduval_junk',
    intent: 'intent_doomscroll',
    reason: 'Endless meme/aggregator feed optimized for infinite scroll; no learning or task value.',
    alwaysApply: true,
  },
  {
    id: 'boredpanda',
    label: 'Bored Panda',
    domains: ['boredpanda.com'],
    eduValue: 'eduval_junk',
    intent: 'intent_relax',
    reason: 'Clickbait listicle/curiosity feed; low signal, designed for time-spend not learning.',
  },
];
