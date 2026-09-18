/**
 * Shared rules for "Assistant reviews requests" — the parent's guidelines, and the
 * identity of a request the assistant has already answered.
 *
 * Both halves live here because the client and the server each need them and must
 * not disagree. The settings normalizer previously existed in THREE copies (the
 * client's `contentFilters.ts`, the server's auto-approval service, and this
 * folder's `userSettingsCopy.ts`); they happened to agree, which is not the same
 * as being one rule.
 *
 * The URL key matters more than it looks. It is what stops a child asking the same
 * question until they get the answer they want: two addresses that normalize to the
 * same key are the same question, and the second one gets the first one's answer
 * rather than a fresh trip to the model.
 */

import type { AccessRequestAiDecision, AccessRequestAiReviewSource, LibraryAutoApprovalSettings } from '../api';
import { getSharedPlanPolicy } from '../plan-policy';

/**
 * `approverId` on a request the assistant decided. Not a real user id — no row in
 * `user` has it — so any code that resolves an approver to a person must treat it
 * as a special case rather than rendering "unknown".
 */
export const ASSISTANT_APPROVER_ID = 'assistant';

/**
 * One tickable line of guidance.
 *
 * These are NOT the retired criteria checkboxes. Those were filters: they gated a
 * keyword match against classifier categories, and nothing the parent wrote could
 * change the outcome. These compose the TEXT THE MODEL READS — the decision
 * procedure is still the parent's words, this is just a faster way to write them
 * than facing an empty box. Do not collapse the two; an empty textarea is the main
 * reason a feature like this goes unused, and a checkbox that only appends is a
 * checkbox you cannot untick.
 */
export type AssistantReviewPreset = {
  id: string;
  /** The sentence this contributes, verbatim, to the guidelines block. */
  sentence: string;
  /** Whether it widens or narrows what gets approved. Groups the UI, nothing more. */
  tone: 'allow' | 'exclude';
};

export const ASSISTANT_REVIEW_PRESETS: readonly AssistantReviewPreset[] = [
  {id: 'educational', sentence: 'Educational and reference sites are fine.', tone: 'allow'},
  {id: 'logic-games', sentence: 'Problem-solving and logic games are OK.', tone: 'allow'},
  {id: 'coding', sentence: 'Coding and programming resources are fine.', tone: 'allow'},
  {id: 'creative', sentence: 'Creative tools for drawing, music and writing are fine.', tone: 'allow'},
  {id: 'news', sentence: 'Age-appropriate news and current events are fine.', tone: 'allow'},
  {id: 'no-social', sentence: 'No social media or chat.', tone: 'exclude'},
  {id: 'no-streaming', sentence: 'No video streaming.', tone: 'exclude'},
  {id: 'no-violence', sentence: 'Nothing with violence.', tone: 'exclude'},
  {id: 'no-shopping', sentence: 'No shopping or in-app purchases.', tone: 'exclude'},
] as const;

/**
 * What the assistant never approves, whatever a parent writes.
 *
 * Not presets: there is no checkbox, because there is nothing to decide. A parent
 * writing "anything about health is fine" is not thereby asking for a pornography
 * site to be opened without them, and the feature would be indefensible if one
 * loosely-worded line could do that.
 *
 * The floor is not a block — the assistant has no power to deny (see the prompt's
 * rule 2). It means the request goes to the parent, which is exactly what happens
 * when no guideline covers a site. So the worst case of a false match here is a
 * parent tapping Approve themselves.
 *
 * Rendered verbatim in the editor and sent verbatim to the model as its own input
 * field, from service code rather than the admin-editable prompt overlay, so the
 * two cannot drift and an edited prompt cannot delete them.
 */
export const ASSISTANT_REVIEW_NEVER_APPROVED: readonly string[] = [
  'Sexual or adult content, including pornography and erotica.',
  'Dating and hookup sites.',
  'Gambling and real-money betting.',
  'Buying drugs, alcohol, tobacco, vaping or weapons.',
  'Self-harm, suicide and eating-disorder material.',
  'Extremist, hateful or graphically violent content.',
];

const PRESET_BY_ID = new Map(ASSISTANT_REVIEW_PRESETS.map((p) => [p.id, p]));

export function isAssistantReviewPresetId(id: unknown): boolean {
  return typeof id === 'string' && PRESET_BY_ID.has(id);
}

/**
 * What a parent wrote, at one scope: the boxes they ticked plus their own words.
 *
 * Stored rather than the composed string, so unticking a box still works after the
 * parent has edited the free text. Composing on read means an edited preset
 * sentence cannot drift from the catalog either.
 */
export type AssistantReviewEntry = {
  presets: string[];
  customText: string;
};

export function normalizeAssistantReviewEntry(raw: unknown): AssistantReviewEntry {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  // Deduped and put back into catalog order, so the composed text reads the same
  // way whatever order the parent ticked them in — otherwise the guidelines hash
  // changes, and changing the hash throws away every cached verdict.
  const ticked = new Set(
    (Array.isArray(input.presets) ? input.presets : []).filter(isAssistantReviewPresetId) as string[],
  );
  const presets = ASSISTANT_REVIEW_PRESETS.filter((p) => ticked.has(p.id)).map((p) => p.id);

  const customText = typeof input.customText === 'string' ? input.customText.trim() : '';

  return {presets, customText};
}

/**
 * One line naming what a set of guidelines contains, for a row that stands in for the editor.
 *
 * Counts rather than sentences: the point of the line is to tell a parent at a glance whether
 * anything is written and roughly how much, not to reproduce nine sentences they can open.
 */
export function summarizeAssistantReviewEntry(entry: AssistantReviewEntry): string {
  const allowed = entry.presets.filter((id) => PRESET_BY_ID.get(id)?.tone === 'allow').length;
  const never = entry.presets.filter((id) => PRESET_BY_ID.get(id)?.tone === 'exclude').length;

  const parts: string[] = [];
  if (allowed) parts.push(`${allowed} allowed`);
  if (never) parts.push(`${never} never`);
  if (entry.customText) parts.push('your own note');

  if (!parts.length) return 'Nothing written yet, so nothing gets checked.';
  return parts.join(', ');
}

/** The parent's guidelines as one block: ticked sentences first, then their own words. */
export function composeAssistantGuidelines(entry: AssistantReviewEntry): string {
  const lines = entry.presets
    .map((id) => PRESET_BY_ID.get(id)?.sentence)
    .filter((s): s is string => !!s);

  if (entry.customText) lines.push(entry.customText);

  return lines.join('\n').trim().slice(0, ASSISTANT_GUIDELINES_MAX);
}

/** Matches the per-call cap the model prompt is built against. */
export const ASSISTANT_GUIDELINES_MAX = 1200;

/**
 * The child's note is quoted to the model as an untrusted claim. It is capped well
 * below the guidelines: it is a sentence of context, and a long one is either
 * padding or an attempt to out-argue the parent's own words.
 */
export const ASSISTANT_NOTE_MAX = 300;

/**
 * Read whatever is stored at `filters.autoApprovalSettings` into today's shape.
 *
 * Reads the retired `criteria.customPolicyPrompt` into `guidelines` so a parent who
 * wrote guidance under the old experimental UI keeps it. The old criteria flags
 * (`requireEducational`, `requireTrustedDomain`, `trustedDomains`, `allowedAgeBands`)
 * are deliberately dropped rather than migrated: they gated a keyword match that no
 * longer runs, and the guidelines text expresses all of them better than a checkbox
 * did. `enabled` is NOT carried across on its own — see below.
 */
export function normalizeAssistantReviewSettings(raw: unknown): LibraryAutoApprovalSettings {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const criteria =
    input.criteria && typeof input.criteria === 'object' ? (input.criteria as Record<string, unknown>) : {};

  const guidelinesRaw =
    typeof input.guidelines === 'string'
      ? input.guidelines
      : typeof criteria.customPolicyPrompt === 'string'
        ? criteria.customPolicyPrompt
        : '';

  const guidelines = guidelinesRaw.trim().slice(0, ASSISTANT_GUIDELINES_MAX);

  // Guidelines are the whole decision procedure now, so "on with nothing written"
  // is not a state the feature can act in — the old shape could be enabled with an
  // empty prompt and still approve, because the checkboxes did the deciding. An
  // upgraded account therefore reads as OFF until a parent writes something, which
  // is also the honest reading of a switch whose criteria no longer exist.
  const enabled = input.enabled === true && guidelines.length > 0;

  return { enabled, guidelines };
}

/**
 * The whole family's guidelines: one shared entry, plus a replacement for any child
 * the parent wants judged differently.
 *
 * Lives on the ACCOUNT, not on the child, and that is a security property rather
 * than a filing preference. `updateUserPrefs` authorizes with `verifySelfOrAdmin`,
 * which counts a restricted user editing their own prefs as "self" — so the
 * guidelines' previous home let the child they govern rewrite them to "approve
 * everything", and read them to learn exactly what to claim. `user.options` is
 * admin-write but still ships to the child in full. The account record is the only
 * place with a single read boundary to defend, which is why both the family entry
 * and the per-child overrides live here together.
 *
 * See `appCapabilityGrants` and `emailAllowedSenders` in `types/user.types.ts` for
 * the same lesson learned twice before this.
 */
export type AssistantReviewConfig = AssistantReviewEntry & {
  /** Keyed by the child's user id. Absent (or empty) means the family entry applies. */
  overrides?: Record<string, AssistantReviewEntry>;
  /**
   * Guidelines a parent saved to reuse on another child.
   *
   * Here rather than on the user record for the same reason the guidelines are: this whole
   * block is withheld from non-admins by `toClientAccount`, and a template is the same text
   * a child must not be able to read.
   */
  templates?: AssistantReviewTemplate[];
};

/** A saved set of guidelines, named by the parent, ready to apply to a child. */
export type AssistantReviewTemplate = {
  id: string;
  name: string;
  entry: AssistantReviewEntry;
};

export const ASSISTANT_TEMPLATE_NAME_MAX = 60;

/** How many a parent may keep. A picker is not a filing cabinet. */
export const ASSISTANT_TEMPLATE_MAX = 12;

/**
 * Offered alongside a parent's own, so the first child is not set up from an empty box.
 *
 * NOT stored. They are composed from `ASSISTANT_REVIEW_PRESETS` at read time, so editing a
 * preset sentence updates every starter at once and none of them can drift from the catalog.
 * Picking one fills the editor; it becomes a saved template only if the parent saves it.
 */
export const ASSISTANT_REVIEW_STARTER_TEMPLATES: readonly AssistantReviewTemplate[] = [
  {
    id: 'starter-younger',
    name: 'Younger child',
    entry: {
      presets: ['educational', 'logic-games', 'creative', 'no-social', 'no-streaming', 'no-violence', 'no-shopping'],
      customText: '',
    },
  },
  {
    id: 'starter-school-age',
    name: 'School age',
    entry: {
      presets: ['educational', 'logic-games', 'coding', 'creative', 'no-social', 'no-violence', 'no-shopping'],
      customText: '',
    },
  },
  {
    id: 'starter-teen',
    name: 'Teen',
    entry: {
      // `no-social` is on every starter, teens included. The assistant approving a
      // social or chat site unattended is the one outcome a parent is most likely to
      // be surprised by, and the screen-time guidance asks for an adult alongside
      // social media through the early teens. A parent can still untick it.
      presets: ['educational', 'logic-games', 'coding', 'creative', 'news', 'no-social', 'no-violence'],
      customText: '',
    },
  },
] as const;

export function isAssistantReviewStarterTemplateId(id: string): boolean {
  return ASSISTANT_REVIEW_STARTER_TEMPLATES.some((template) => template.id === id);
}

/**
 * One stored template, or nothing.
 *
 * A template whose entry composes to nothing is dropped, on the same rule overrides use: an
 * empty template is a name in a picker that does nothing when you pick it. The name falls back
 * to the id rather than to a blank row, so a template can never become unpickable.
 */
export function normalizeAssistantReviewTemplate(raw: unknown): AssistantReviewTemplate | null {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (!id) return null;

  const entry = normalizeAssistantReviewEntry(input.entry);
  if (entry.presets.length === 0 && !entry.customText) return null;

  const rawName = typeof input.name === 'string' ? input.name.trim() : '';
  const name = (rawName || id).slice(0, ASSISTANT_TEMPLATE_NAME_MAX);

  return {id, name, entry};
}

export function normalizeAssistantReviewConfig(raw: unknown): AssistantReviewConfig {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const base = normalizeAssistantReviewEntry(input);

  const rawOverrides =
    input.overrides && typeof input.overrides === 'object'
      ? (input.overrides as Record<string, unknown>)
      : {};

  const overrides: Record<string, AssistantReviewEntry> = {};
  for (const [userId, value] of Object.entries(rawOverrides)) {
    const entry = normalizeAssistantReviewEntry(value);
    // An override that composes to nothing is not an override — it would silently
    // turn the feature off for that child rather than falling back to the family
    // text, which is not what emptying a box means.
    if (entry.presets.length > 0 || entry.customText) overrides[userId] = entry;
  }

  const templates: AssistantReviewTemplate[] = [];
  const seenTemplateIds = new Set<string>();
  for (const value of Array.isArray(input.templates) ? input.templates : []) {
    const template = normalizeAssistantReviewTemplate(value);
    // First write wins on a duplicate id, so a retried save cannot produce two rows a parent
    // sees as one.
    if (!template || seenTemplateIds.has(template.id)) continue;
    seenTemplateIds.add(template.id);
    templates.push(template);
    if (templates.length >= ASSISTANT_TEMPLATE_MAX) break;
  }

  return {...base, overrides, templates};
}

/**
 * The guidelines that actually govern one child, as a single block.
 *
 * An override REPLACES the family text rather than adding to it. Merging would mean
 * a parent could never relax a family-wide "no games" for one child, which is the
 * main reason to want a per-child override at all.
 *
 * Returns '' when nothing is written anywhere, which every caller treats as "the
 * feature has nothing to act on" — the same rule as the retired shape's
 * on-with-an-empty-box.
 */
export function resolveAssistantGuidelines(
  config: AssistantReviewConfig | null | undefined,
  targetUserId: string,
): string {
  if (!config) return '';
  const override = config.overrides?.[targetUserId];
  if (override) {
    const composed = composeAssistantGuidelines(override);
    if (composed) return composed;
  }
  return composeAssistantGuidelines(config);
}


/**
 * What actually happened, in a sentence a parent can read.
 *
 * `source` is recorded for every outcome precisely so a parent can tell "the
 * assistant looked and was not sure" from "the assistant never looked" — and for
 * its first months nothing rendered it, so the distinction existed only in the
 * database. This is the one place that turns it into words, shared rather than
 * written at the call site so a screen, an email and a push cannot end up
 * describing the same row three different ways.
 *
 * Deliberately about the *process*, not the page. The page's own reasoning is
 * `reasonForParent`, which sits beside this and says something different.
 */
export function assistantReviewSourceSummary(
  source: AccessRequestAiReviewSource | null | undefined,
  decision?: AccessRequestAiDecision | null,
): string {
  switch (source) {
    case 'model':
      if (decision === 'approve') return 'The AI checked this against your guidelines.';
      if (decision === 'reclassify') return 'The AI read this as study material and changed what it counts as.';
      return 'The AI looked and was not sure, so it left it for you.';
    case 'cached':
      return 'Not re-checked — this is the answer from a recent ask for the same site.';
    case 'cooldown':
      return 'Not checked — this site was already sent to you in the last day.';
    case 'weekly-cap':
      return "Not checked — this week's AI checks are used up.";
    case 'budget':
      return "Not checked — the family's AI limit is used up for now.";
    case 'unsafe-cache':
      return "Not checked — Kindredly's own content check had already flagged this site.";
    case 'error':
      return 'The AI could not check this one, so it left it for you.';
    default:
      return 'The AI did not look at this one.';
  }
}

/**
 * How wide a grant was, for the parent reading the record.
 *
 * Matches the wording of the parent's own approval picker ("This page only" /
 * "Whole site"), because the same grant described two ways reads as two grants.
 */
export function assistantGrantScopeLabel(scope: 'specific' | 'site' | null | undefined): string | null {
  if (scope === 'specific') return 'This page only';
  if (scope === 'site') return 'Whole site';
  return null;
}


/**
 * The identity of the question "may I open this?".
 *
 * Everything that does not change what a parent is being asked is stripped: the
 * scheme (http and https are the same site to a child), `www.`, a default port,
 * the query string, the fragment, and a trailing slash. Path CASE is kept — plenty
 * of sites are case-sensitive below the host, and folding it would merge two real
 * pages into one verdict.
 *
 * Dropping the query is the deliberate trade. It means `?q=cats` and `?q=dogs` on a
 * search page share one answer, which is right for the dedupe (the site is the
 * thing being approved, not the search) and would be wrong if we were approving
 * exact addresses — which is why what gets ADDED to the library is derived from the
 * real URL through the normal scope rules, not from this key.
 *
 * Returns null for anything that is not an http(s) URL, which callers treat as
 * "not reviewable" rather than as an error.
 */
export function normalizeAccessRequestUrlKey(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  if (!host) return null;

  const path = parsed.pathname.replace(/\/+$/, '');
  return path && path !== '/' ? `${host}${path}` : host;
}

/**
 * The host a cooldown attaches to, after the assistant has left one page here for
 * a parent.
 *
 * The exact hostname, not the registrable domain: one verdict on
 * `sites.google.com` must not silence questions about `docs.google.com`, and a
 * shared host is where a child would otherwise probe page after page.
 */
export function assistantReviewHostKey(url: unknown): string | null {
  const key = normalizeAccessRequestUrlKey(url);
  if (!key) return null;
  const slash = key.indexOf('/');
  return slash === -1 ? key : key.slice(0, slash);
}

/**
 * Trim the child's note down to what the model is allowed to see.
 *
 * Three separate jobs, all of which have to happen before the text reaches a
 * prompt: undo the HTML escaping the add route applies (`&#x27;` back to `'`, so
 * the model reads a sentence rather than entities), remove anything that looks like
 * the delimiter that marks where the untrusted block ends, and collapse whitespace
 * so a wall of newlines cannot push the real instructions out of view.
 */
export function sanitizeAssistantRequesterNote(note: unknown): string {
  if (typeof note !== 'string') return '';
  return note
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<<<NOTE|NOTE>>>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ASSISTANT_NOTE_MAX);
}

/**
 * How many reviews one child gets in one week, on this account's plan.
 *
 * Reads the plan policy rather than an env var so the free/paid difference is
 * stated in the same place as every other plan difference, and so the client can
 * tell a parent the number without asking the server.
 */
export function getAssistantWeeklyAllowance(accountType: string | null | undefined): number {
  const allowance = getSharedPlanPolicy(accountType).assistantReview.weeklyPerChild;
  return Number.isFinite(allowance) && allowance > 0 ? allowance : 0;
}

/**
 * The bucket a review is counted against: ISO week, as `YYYY-Www`.
 *
 * A fixed calendar week rather than a rolling seven days, because the allowance
 * is small enough that a child will hit it, and "you get three more on Monday" is
 * something a nine-year-old can hold onto. A rolling window would refill at times
 * nobody can predict, which reads as arbitrary from the outside.
 *
 * ISO weeks start Monday and belong to the year containing their Thursday, so the
 * turn of the year does not produce two half-weeks sharing a key.
 */
export function assistantReviewWeekKey(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  // Thursday of this week decides the year.
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
