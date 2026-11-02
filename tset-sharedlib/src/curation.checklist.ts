/**
 * The curation review checklist: the fixed list of checks every catalog item goes through.
 *
 * One definition, read by everyone who touches a review:
 *  - the curator's review form (a person answers each check),
 *  - the AI draft job (the same `instructions` are its prompt),
 *  - the item page, where families read the answers,
 *  - /curationInfo, which shows families what is checked.
 *
 * The standard behind it is docs/architecture/19-EDITORIAL-CHARTER.md. The checks are that
 * standard written as questions; a person always makes the final call (docs/specs/curation-review.md).
 *
 * VERSIONING. A finalized review records the checklist version it was answered against, and old
 * versions stay here so an old review still reads correctly. Rewording a question or its
 * instructions is fine within a version. Adding or removing a check, renaming a key, or changing
 * what an answer means requires a new version; tests/curation.checklist.test.ts pins v1 so that
 * cannot happen by accident.
 */
import {
  adsTagList,
  aiFeatureTagList,
  costTagList,
  designTagList,
  eduTagList,
  flagOptions,
  freshnessTagList,
  minAgeTagList,
  normalizeEduValueAlias,
  privacyTagList,
} from './content.types';
import {DECLINE_REASONS, type DeclineReasonCode} from './publish.rules';

export const NOT_CHECKED = 'not_checked';

export type CurationVerdict = 'pass' | 'concern' | 'fail';
/** What an answer amounts to, whatever its kind. */
export type CurationAnswerStatus = CurationVerdict | typeof NOT_CHECKED;

export type CurationFacetAxis = 'eduValue' | 'minAgeGroup' | 'ads' | 'design' | 'freshness' | 'cost';
/** The multi-select `useCriteria` axes a review writes by marking boxes. */
export type CurationFlagsAxis = 'privacy' | 'aiFeatures';

export type CurationAnswerSpec =
  | {kind: 'verdict'; labels: Record<CurationVerdict, string>}
  | {
      kind: 'facet';
      axis: CurationFacetAxis;
      options: readonly string[];
      concernValues?: readonly string[];
      failValues?: readonly string[];
    }
  /**
   * Any of the options that were found. An empty list means none were found. `labels` names each
   * option; a check without them (Mature content) takes its names from `flagOptions`.
   *
   * With an `axis`, the options are `useCriteria` tags: finishing a review writes the marked ones
   * onto the item, and writes `noneTag` when the curator marked nothing, so "checked and clean"
   * can be told apart from "nobody has checked".
   */
  | {
      kind: 'flags';
      options: readonly string[];
      labels?: Readonly<Record<string, string>>;
      axis?: CurationFlagsAxis;
      noneTag?: string;
    };

export type CurationCheckGroup = 'basics' | 'learning' | 'distraction' | 'safety';

export type CurationCheck = {
  /** Stable forever. Stored in every review that answers it. */
  key: string;
  group: CurationCheckGroup;
  /** The short name families see beside the answer. */
  publicLabel: string;
  question: string;
  /** How to answer. Read by curators, by the AI draft job, and by families on /curationInfo. */
  instructions: string;
  answer: CurationAnswerSpec;
  /** A review cannot add an item to the catalog while this is unanswered. */
  required: boolean;
  /** `link`: only items with a URL. `collection`: only collections. */
  appliesTo: 'all' | 'link' | 'collection';
  /** `deterministic`: the server answers it without a model. `draft`: the AI may suggest an answer. */
  ai: 'draft' | 'deterministic' | 'human_only';
  /** The reason a family reads when a curator declines because this check failed. */
  declineReasonOnFail?: DeclineReasonCode;
  /** False: screenshots attached to this check are shown to curators only. */
  publicScreenshots: boolean;
};

export type CurationChecklist = {
  version: number;
  checks: readonly CurationCheck[];
};

/** In the order a curator answers them and a family reads them: what parents ask about first. */
export const CURATION_CHECK_GROUPS: ReadonlyArray<{key: CurationCheckGroup; label: string}> = [
  {key: 'distraction', label: 'Ads and distractions'},
  {key: 'safety', label: 'Safety and age'},
  {key: 'learning', label: 'Learning and trust'},
  {key: 'basics', label: 'The basics'},
];

/**
 * The key checks: what parents ask about first. Families read every answer in these groups, a pass
 * included; in the other groups they read only what was found, or a curator's note.
 */
export const CURATION_KEY_GROUPS: readonly CurationCheckGroup[] = ['distraction', 'safety'];

/**
 * Checks from checklists 1 to 3 that were the curator's own housekeeping. Families never read them,
 * on any version: the server opens the link and looks for the same item in the catalog itself, and
 * a wrong description is fixed on the item rather than recorded.
 */
export const CURATION_CURATOR_ONLY_CHECKS: readonly string[] = ['link_works', 'description_accurate', 'duplicate'];

export type CurationAnswer = {
  /** A verdict, a facet tag key, a list of flag keys, or `not_checked`. */
  value: string | string[];
  comment?: string | null;
  /** Public image filenames (see /curationReview/screenshot/upload). */
  screenshots?: string[];
};

export type CurationAnswers = Record<string, CurationAnswer>;

export type CurationOutcome = 'curate' | 'decline';

export type CurationItemContext = {hasUrl: boolean; isCollection: boolean};

export const CURATION_COMMENT_MAX = 1000;
export const CURATION_SUMMARY_MAX = 600;
export const CURATION_INTERNAL_NOTE_MAX = 2000;
export const CURATION_SCREENSHOTS_PER_CHECK = 3;
export const CURATION_REVIEW_AGAIN_MONTHS = [3, 6, 12, 24] as const;
export const CURATION_DEFAULT_REVIEW_AGAIN_MONTHS = 12;

const keysOf = (list: ReadonlyArray<{key: string}>, exclude: readonly string[] = []) =>
  list.map((tag) => tag.key).filter((key) => !exclude.includes(key));

const CHECKLIST_V1: CurationChecklist = {
  version: 1,
  checks: [
    // ── The basics ──────────────────────────────────────────────────────────────────────────
    {
      key: 'link_works',
      group: 'basics',
      publicLabel: 'Link works',
      question: 'Does the link open the page it describes?',
      instructions:
        'Open the link. Pass: it loads the page or resource described, without an error. ' +
        'Concern: it redirects to a different page or site than described, or only works after getting past a pop-up. ' +
        'Fail: it shows an error or "page not found", a parked or for-sale domain, or a different site altogether. ' +
        'If a login or a bot check stops you from seeing anything, answer Not checked and say so.',
      answer: {kind: 'verdict', labels: {pass: 'Works', concern: 'Works with problems', fail: 'Broken'}},
      required: true,
      appliesTo: 'link',
      ai: 'deterministic',
      declineReasonOnFail: 'broken',
      publicScreenshots: true,
    },
    {
      key: 'description_accurate',
      group: 'basics',
      publicLabel: 'Description and picture',
      question: 'Do the title, description and picture match what it really is?',
      instructions:
        'Compare the title, description and picture with what you find. ' +
        'Pass: they describe it accurately in plain words, with no marketing claims the site does not back up. ' +
        'Concern: small inaccuracies, an out-of-date description, or a picture that does not show the item. ' +
        'Fail: misleading, promotional, or describing something else. ' +
        'For a collection, judge its name, description and picture against the items inside.',
      answer: {kind: 'verdict', labels: {pass: 'Accurate', concern: 'Partly accurate', fail: 'Misleading'}},
      required: true,
      appliesTo: 'all',
      ai: 'draft',
      declineReasonOnFail: 'presentation',
      publicScreenshots: true,
    },
    {
      key: 'duplicate',
      group: 'basics',
      publicLabel: 'Not a duplicate',
      question: 'Is this already in the catalog?',
      instructions:
        'Look for the same page, the same site, or the same collection under another name. ' +
        'Pass: nothing else in the catalog covers it. ' +
        'Concern: a related item exists but this one adds something, such as a different section, format or age range; name the other item. ' +
        'Fail: the same page or the same collection is already in the catalog.',
      answer: {kind: 'verdict', labels: {pass: 'Not a duplicate', concern: 'Overlaps', fail: 'Duplicate'}},
      required: false,
      appliesTo: 'all',
      ai: 'draft',
      declineReasonOnFail: 'duplicate',
      publicScreenshots: true,
    },
    {
      key: 'collection_items',
      group: 'basics',
      publicLabel: 'Items inside',
      question: 'Does every item in the collection belong in the catalog?',
      instructions:
        "Open each item. Pass: every item would clear this checklist on its own and fits the collection's topic. " +
        'Concern: one or two weaker items; name them. ' +
        "Fail: several items would not clear the checklist, or several links are broken. " +
        "Items already in Kindredly's catalog have their own reviews and do not need checking again.",
      answer: {kind: 'verdict', labels: {pass: 'All belong', concern: 'Some weaker', fail: 'Several do not belong'}},
      required: true,
      appliesTo: 'collection',
      ai: 'draft',
      declineReasonOnFail: 'not_educational',
      publicScreenshots: true,
    },
    {
      key: 'signup',
      group: 'basics',
      publicLabel: 'Sign-up and paywall',
      question: 'Can a family use it without signing up or paying?',
      instructions:
        'Try to reach the main content. Pass: it is usable without an account or a payment. ' +
        'Concern: an account or payment unlocks part of it, or it asks for an email or personal details it does not need; say what is behind the wall. ' +
        'Fail: nothing useful can be reached before signing up or paying. ' +
        "A child's account that collects personal details is at least a concern.",
      answer: {kind: 'verdict', labels: {pass: 'Open to use', concern: 'Partly behind a sign-up', fail: 'Sign-up required'}},
      required: false,
      appliesTo: 'link',
      ai: 'draft',
      publicScreenshots: true,
    },
    {
      key: 'cost',
      group: 'basics',
      publicLabel: 'Cost',
      question: 'What does it cost?',
      instructions:
        'Free: everything useful is free. ' +
        'Partially free: a free part with paid upgrades, subscriptions or in-app purchases. ' +
        'Paid: it has to be bought before it can be used. ' +
        'Count in-app purchases and premium tiers as partially free.',
      answer: {kind: 'facet', axis: 'cost', options: keysOf(costTagList)},
      required: false,
      appliesTo: 'link',
      ai: 'draft',
      publicScreenshots: true,
    },
    {
      key: 'freshness',
      group: 'basics',
      publicLabel: 'Kept up to date',
      question: 'Is the source still maintained?',
      instructions:
        'Look for recent dates, updates, new posts or new releases. ' +
        'Actively updated: changed within the last year. ' +
        'Aging: updated infrequently; the newest material is one to three years old. ' +
        'Outdated: nothing new for more than three years, or it says it is no longer maintained. ' +
        'Timeless material, such as a classic book or a historical archive, can be outdated and still belong; say so in the comment.',
      answer: {
        kind: 'facet',
        axis: 'freshness',
        options: keysOf(freshnessTagList, ['fresh_unknown']),
        concernValues: ['fresh_outdated'],
      },
      required: false,
      appliesTo: 'link',
      ai: 'draft',
      publicScreenshots: true,
    },

    // ── Learning and trust (Charter pillars 1, 2 and 4, and sensitive topics) ────────────────
    {
      key: 'edu_value',
      group: 'learning',
      publicLabel: 'Learning value',
      question: 'What kind of value does it offer?',
      instructions:
        'The catalog is educational first. ' +
        'Educational: made to teach or explain, such as tutorials, courses, reference material and documentaries. ' +
        'Edu-tainment: mixes learning with entertainment and leads somewhere deeper, such as educational games and science shows. ' +
        'Task-related: a tool for getting something done; it belongs only when it supports learning or making things, so it is a concern. ' +
        'Entertainment: fun without a learning purpose. Junk: clickbait, compulsive or low-value. ' +
        'Entertainment and junk fail this check.',
      answer: {
        kind: 'facet',
        axis: 'eduValue',
        options: keysOf(eduTagList, ['eduval_unknown']),
        concernValues: ['eduval_task'],
        failValues: ['eduval_fun', 'eduval_junk'],
      },
      required: true,
      appliesTo: 'all',
      ai: 'draft',
      declineReasonOnFail: 'not_educational',
      publicScreenshots: true,
    },
    {
      key: 'source',
      group: 'learning',
      publicLabel: 'Trustworthy source',
      question: 'Is the source one we can stand behind?',
      instructions:
        'Judge who made it, not each claim it makes. ' +
        'Pass: an established, transparent publisher, such as a known institution, museum, university, public broadcaster, ' +
        'or a long-running creator with a clear record; it says who runs it. ' +
        "Concern: a newer or smaller source with no warning signs, or unclear ownership; say what you could not confirm. " +
        'Fail: anonymous with no track record, known for misinformation, satire presented as fact, or made mainly to sell something. ' +
        'When you cannot tell, answer Concern rather than guess.',
      answer: {kind: 'verdict', labels: {pass: 'Trustworthy', concern: 'Could not confirm', fail: 'Not trustworthy'}},
      required: true,
      appliesTo: 'all',
      ai: 'draft',
      declineReasonOnFail: 'source',
      publicScreenshots: true,
    },
    {
      key: 'critical_thinking',
      group: 'learning',
      publicLabel: 'Reasoned and sourced',
      question: 'Does it explain its reasoning and show where facts come from?',
      instructions:
        'Pass: claims are explained, evidence or sources are shown where they matter, and uncertainty is admitted. ' +
        'Concern: mostly sound but light on sources, or with some clickbait framing. ' +
        'Fail: unsupported claims presented as fact, heavy sensationalism, or pressure to believe rather than understand. ' +
        'For a tool or a game that makes no factual claims, answer Pass and say it does not apply.',
      answer: {kind: 'verdict', labels: {pass: 'Reasoned', concern: 'Light on sources', fail: 'Unsupported'}},
      required: false,
      appliesTo: 'all',
      ai: 'draft',
      declineReasonOnFail: 'source',
      publicScreenshots: true,
    },
    {
      key: 'sensitive_topics',
      group: 'learning',
      publicLabel: 'Study, not advocacy',
      question: 'If it covers religion, politics, health or a similar topic, does it teach about it rather than promote a position?',
      instructions:
        'These topics are welcome as study: history, comparing perspectives, philosophy, evidence-based explanation. ' +
        'They are not added as advocacy, doctrine presented as fact, or devotional or persuasion material. ' +
        'Pass: it teaches about the topic, or does not touch one. ' +
        'Concern: mostly study, with some one-sided framing; say where. ' +
        'Fail: its purpose is to persuade or recruit. ' +
        'An AI answer here is only a suggestion; a person always decides this one.',
      answer: {kind: 'verdict', labels: {pass: 'Study, or does not apply', concern: 'Some one-sided framing', fail: 'Advocacy'}},
      required: true,
      appliesTo: 'all',
      ai: 'draft',
      declineReasonOnFail: 'advocacy',
      publicScreenshots: true,
    },

    // ── Ads and distractions (Charter pillar 3) ─────────────────────────────────────────────
    {
      key: 'ads',
      group: 'distraction',
      publicLabel: 'Ads',
      question: 'How many ads does it show?',
      instructions:
        'Load a few pages the way a family would. No ads: none, including sponsored posts. ' +
        'Low: a few, clearly labeled, away from the content. ' +
        'Medium: ads beside or between the content on most pages, or ads that follow the reader down the page. ' +
        'High: pop-ups, video ads before the content, ads disguised as content, or ads that take over the page. ' +
        'Medium is a concern and High fails. Mention ads aimed at children, or for products unsuitable for them, in the comment.',
      answer: {
        kind: 'facet',
        axis: 'ads',
        options: keysOf(adsTagList),
        concernValues: ['ads_m'],
        failValues: ['ads_h'],
      },
      required: true,
      appliesTo: 'link',
      ai: 'draft',
      declineReasonOnFail: 'distracting',
      publicScreenshots: true,
    },
    {
      key: 'design',
      group: 'distraction',
      publicLabel: 'Design',
      question: 'Is the page focused, or visually noisy?',
      instructions:
        'Clean: a focused layout where the content comes first. Mostly clean: minor clutter. ' +
        'Somewhat distracting: a busy layout, with flashing or crowded elements competing with the content. ' +
        'Very distracting: cluttered, noisy and attention-grabbing throughout. ' +
        'Somewhat distracting is a concern; very distracting fails.',
      answer: {
        kind: 'facet',
        axis: 'design',
        options: keysOf(designTagList, ['design_unknown']),
        concernValues: ['design_busy'],
        failValues: ['design_noisy'],
      },
      required: false,
      appliesTo: 'link',
      ai: 'draft',
      declineReasonOnFail: 'distracting',
      publicScreenshots: true,
    },
    {
      key: 'attention_traps',
      group: 'distraction',
      publicLabel: 'Attention traps',
      question: 'Does it try to keep people on it longer than they meant to stay?',
      instructions:
        'Look for autoplay into the next video, infinite scroll, streaks or rewards for coming back, countdowns, ' +
        'nagging notifications, and recommendations that lead away from the content. ' +
        'Pass: none, or each one has an off switch that is easy to find. ' +
        'Concern: one or two, easy to ignore. ' +
        'Fail: the experience is built around them.',
      answer: {kind: 'verdict', labels: {pass: 'None found', concern: 'Some', fail: 'Built around them'}},
      required: false,
      appliesTo: 'all',
      ai: 'draft',
      declineReasonOnFail: 'distracting',
      publicScreenshots: true,
    },

    // ── Safety and age ──────────────────────────────────────────────────────────────────────
    {
      key: 'min_age',
      group: 'safety',
      publicLabel: 'Minimum age',
      question: 'What is the youngest age it is suitable for?',
      instructions:
        'Pick the floor for suitability, not for difficulty: the youngest age a parent could reasonably let use it alone. ' +
        'Consider language, themes, images, violence, and whether it links out to unsuitable places. ' +
        'Choose N/A only for material meant for adults by nature, such as a parenting guide. ' +
        'When unsure between two ages, pick the older one.',
      answer: {kind: 'facet', axis: 'minAgeGroup', options: keysOf(minAgeTagList, ['minage_unknown'])},
      required: true,
      appliesTo: 'all',
      ai: 'draft',
      publicScreenshots: true,
    },
    {
      key: 'mature_content',
      group: 'safety',
      publicLabel: 'Mature content',
      question: 'Does it contain any of these?',
      instructions:
        'Mark each one that appears anywhere a family would reasonably reach, including comments and linked pages on the same site. ' +
        'Mark nothing if you found none. A marked item is not automatically left out, but the minimum age has to fit it. ' +
        'Describe what you found in the comment instead of attaching a screenshot of it.',
      answer: {kind: 'flags', options: Object.keys(flagOptions)},
      required: true,
      appliesTo: 'all',
      ai: 'draft',
      publicScreenshots: false,
    },
    {
      key: 'user_contact',
      group: 'safety',
      publicLabel: 'Chat and strangers',
      question: 'Can people contact or chat with each other?',
      instructions:
        'Pass: no chat, comments, messaging or profiles, or only moderated comments that cannot be used to contact someone directly. ' +
        'Concern: open comments or forums, or chat limited to preset phrases; say where. ' +
        'Fail: open chat or direct messages with strangers, or it encourages sharing personal details.',
      answer: {kind: 'verdict', labels: {pass: 'None, or moderated', concern: 'Some', fail: 'Open chat'}},
      required: false,
      appliesTo: 'link',
      ai: 'draft',
      publicScreenshots: true,
    },
  ],
};

/**
 * Version 2 (2026-09-17) removes checks that asked the same thing twice. "Reasoned and sourced" is
 * folded into "Trustworthy source"; sign-up no longer asks about paying, which Cost asks; Design
 * judges the layout only, not ads or attention traps; and Mature content comes before Minimum age,
 * which is set from it. Every other check, and every answer shape, is unchanged from version 1.
 */
const V2_CHANGES: Readonly<Record<string, Partial<CurationCheck>>> = {
  signup: {
    publicLabel: 'Sign-up',
    question: 'Can a family use it without making an account?',
    instructions:
      'Try to reach the main content. Pass: it is usable without an account. ' +
      'Concern: an account unlocks part of it, or it asks for an email or personal details it does not need; say what is behind the sign-up. ' +
      'Fail: nothing useful can be reached before signing up. ' +
      "Whether it costs money is the Cost check. A child's account that collects personal details is at least a concern.",
    answer: {kind: 'verdict', labels: {pass: 'No account needed', concern: 'Partly behind a sign-up', fail: 'Sign-up required'}},
  },
  source: {
    question: 'Can we stand behind who made it and what it claims?',
    instructions:
      'Judge who made it and whether it backs up what it says. ' +
      'Pass: an established, transparent publisher, such as a known institution, museum, university, public broadcaster, ' +
      'or a long-running creator with a clear record; it says who runs it, and it shows where facts come from when they matter. ' +
      'Concern: a newer or smaller source with no warning signs, unclear ownership, or light on sources; say what you could not confirm. ' +
      'Fail: anonymous with no track record, known for misinformation, unsupported claims or satire presented as fact, or made mainly to sell something. ' +
      'A tool or game that makes no claims is judged on who made it. When you cannot tell, answer Concern rather than guess.',
  },
  design: {
    question: 'Is the layout focused, or cluttered?',
    instructions:
      'Judge the layout only: ads are the Ads check, and autoplay or streaks are Attention traps. ' +
      'Clean: a focused layout where the content comes first. Mostly clean: minor clutter. ' +
      'Somewhat distracting: a busy layout, with crowded or flashing elements competing with the content. ' +
      'Very distracting: cluttered throughout. ' +
      'Somewhat distracting is a concern; very distracting fails.',
  },
  min_age: {
    instructions:
      'Pick the floor for suitability, not for difficulty: the youngest age a parent could reasonably let use it alone. ' +
      'Base it on what you marked under Mature content, and on whether it links out to unsuitable places. ' +
      'Choose N/A only for material meant for adults by nature, such as a parenting guide. ' +
      'When unsure between two ages, pick the older one.',
  },
};

const V2_ORDER_SWAP: readonly [string, string] = ['min_age', 'mature_content'];

function checklistV2(): CurationChecklist {
  const checks = CHECKLIST_V1.checks
    .filter((check) => check.key !== 'critical_thinking')
    .map((check) => ({...check, ...(V2_CHANGES[check.key] || {})}) as CurationCheck);
  const [first, second] = V2_ORDER_SWAP.map((key) => checks.findIndex((check) => check.key === key));
  [checks[first], checks[second]] = [checks[second], checks[first]];
  return {version: 2, checks};
}

const CHECKLIST_V2 = checklistV2();

/**
 * Version 3 (2026-09-19, HAT-021) adds two checks parents asked about, answered by marking what was
 * found, like Mature content. Privacy: what a child is asked for, tracking for advertising, and no
 * privacy policy. AI and homework: chat with an AI, an AI friend, and tools that do the thinking for
 * the child ("cognitive offloading"). A marked box is a concern and never a fail, so neither check
 * keeps an item out of the catalog. Chat and strangers becomes Chat and posting and counts posts and
 * uploads others can see; Sign-up leaves what it asks a child for to Privacy. Every other check, and
 * every existing answer shape, is unchanged from version 2. The sources are in docs/specs/curation-review.md.
 */
/**
 * The boxes are `useCriteria` tags, so a finished review writes them onto the item and families read
 * them in the details table beside Ads and Cost. The names come from the tag lists, so the review
 * and the item page never call the same tag two different things. `priv_none` and `ai_none` are not
 * boxes a curator marks: `mergeReviewFacets` writes one when the curator marked nothing.
 */
const labelsFor = (list: ReadonlyArray<{key: string; name: string}>, exclude: readonly string[]) =>
  Object.fromEntries(list.filter((tag) => !exclude.includes(tag.key)).map((tag) => [tag.key, tag.name]));

const PRIVACY_NONE = 'priv_none';
const AI_NONE = 'ai_none';
const PRIVACY_OPTIONS = labelsFor(privacyTagList, [PRIVACY_NONE]);
const AI_AND_HOMEWORK_OPTIONS = labelsFor(aiFeatureTagList, [AI_NONE]);

const V3_NEW_CHECKS: readonly CurationCheck[] = [
  {
    key: 'ai_and_homework',
    group: 'safety',
    publicLabel: 'AI and homework',
    question: 'Does it have any of these?',
    instructions:
      'Mark each one a child could reach. ' +
      'Chat with an AI: a chatbot a child can type anything to. A help bot that only answers questions about the site does not count, ' +
      'and an AI playing a character for a lesson counts here and nowhere else. ' +
      'AI friend or companion: an AI that acts as a friend, companion or confidant. ' +
      'Does the thinking for them: it hands over finished answers, writing or solutions in place of the child working them out, ' +
      'whether or not it uses AI, such as answer sites, essay writers and solvers that show only the answer. ' +
      'Hints, questions back, calculators, dictionaries and search do not count. ' +
      'Mark nothing if you found none.',
    answer: {
      kind: 'flags',
      options: Object.keys(AI_AND_HOMEWORK_OPTIONS),
      labels: AI_AND_HOMEWORK_OPTIONS,
      axis: 'aiFeatures',
      noneTag: AI_NONE,
    },
    required: false,
    appliesTo: 'link',
    ai: 'draft',
    publicScreenshots: true,
  },
  {
    key: 'privacy',
    group: 'safety',
    publicLabel: 'Privacy',
    question: 'Does it do any of these?',
    instructions:
      'Mark each one you found. ' +
      'Asks a child for personal details: a name, email, phone number, photo or voice, address or location, on a form or in a chatbot. ' +
      'Do not mark it when a parent has to approve first. ' +
      "Tracks for advertising: ad trackers on the page, or ads chosen from what someone does. The site's own analytics alone do not count. " +
      'No privacy policy: mark it only when the site asks for details or tracks; a site that collects nothing does not need one. ' +
      'Mark nothing if you found none.',
    answer: {
      kind: 'flags',
      options: Object.keys(PRIVACY_OPTIONS),
      labels: PRIVACY_OPTIONS,
      axis: 'privacy',
      noneTag: PRIVACY_NONE,
    },
    required: false,
    appliesTo: 'link',
    ai: 'draft',
    publicScreenshots: true,
  },
];

const V3_CHANGES: Readonly<Record<string, Partial<CurationCheck>>> = {
  signup: {
    instructions:
      'Try to reach the main content. Pass: it is usable without an account. ' +
      'Concern: an account unlocks part of it; say what is behind the sign-up. ' +
      'Fail: nothing useful can be reached before signing up. ' +
      'Whether it costs money is the Cost check, and what it asks a child for is the Privacy check.',
  },
  user_contact: {
    publicLabel: 'Chat and posting',
    question: 'Can people contact each other, or post where others can see it?',
    instructions:
      'Pass: no chat, comments, messaging, public profiles or uploads, or only moderated comments that cannot be used to contact someone directly. ' +
      'Concern: open comments or forums, chat limited to preset phrases, or posts, uploads or a profile that others can see; say where. ' +
      'Fail: open chat or direct messages with strangers, or it encourages sharing personal details. ' +
      'A chatbot is not a person: it belongs to the AI and homework check.',
  },
};

function checklistV3(): CurationChecklist {
  const checks = CHECKLIST_V2.checks.map((check) => ({...check, ...(V3_CHANGES[check.key] || {})}) as CurationCheck);
  checks.splice(checks.findIndex((check) => check.key === 'user_contact') + 1, 0, ...V3_NEW_CHECKS);
  return {version: 3, checks};
}

const CHECKLIST_V3 = checklistV3();

/**
 * Version 4 (2026-09-21) leaves out the curator's housekeeping and makes the key checks the ones a
 * review cannot skip. Link works is measured by the server when a review opens and shown to the
 * curator only when something is wrong; Not a duplicate is a warning the server works out from the
 * catalog; Description and picture is fixed on the item's Details tab rather than recorded. Every
 * check in Ads and distractions and in Safety and age is required. Aging is a concern, as Outdated
 * is, so families hear when a source is going stale. AI and homework is AI and answer tools: an
 * answer site does the thinking without any AI. Every other check, and every answer shape, is
 * unchanged from version 3.
 */
const V4_REMOVED: readonly string[] = CURATION_CURATOR_ONLY_CHECKS;

const V4_CHANGES: Readonly<Record<string, Partial<CurationCheck>>> = {
  freshness: {
    instructions:
      'Look for recent dates, updates, new posts or new releases. ' +
      'Actively updated: changed within the last year. ' +
      'Aging: updated infrequently; the newest material is one to three years old. ' +
      'Outdated: nothing new for more than three years, or it says it is no longer maintained. ' +
      'Aging and Outdated are concerns, and families read them; Actively updated is not shown. ' +
      'Timeless material, such as a classic book or a historical archive, can be outdated and still belong; say so in the note.',
    answer: {
      kind: 'facet',
      axis: 'freshness',
      options: keysOf(freshnessTagList, ['fresh_unknown']),
      concernValues: ['fresh_aging', 'fresh_outdated'],
    },
  },
  design: {required: true},
  attention_traps: {required: true},
  user_contact: {required: true},
  ai_and_homework: {publicLabel: 'AI and answer tools', required: true},
  privacy: {required: true},
};

function checklistV4(): CurationChecklist {
  const checks = CHECKLIST_V3.checks
    .filter((check) => !V4_REMOVED.includes(check.key))
    .map((check) => ({...check, ...(V4_CHANGES[check.key] || {})}) as CurationCheck);
  return {version: 4, checks};
}

const CHECKLIST_V4 = checklistV4();

export const CURATION_CHECKLISTS: Readonly<Record<number, CurationChecklist>> = {
  1: CHECKLIST_V1,
  2: CHECKLIST_V2,
  3: CHECKLIST_V3,
  4: CHECKLIST_V4,
};
export const CURRENT_CURATION_CHECKLIST_VERSION = 4;

/**
 * An open review's answers moved to the current checklist: answers to checks it no longer has are
 * dropped, the rest are kept. A finished review is never moved; it keeps the version it was
 * answered against.
 */
export function answersForChecklist<T>(answers: Record<string, T> | null | undefined, checklist: CurationChecklist): Record<string, T> {
  const keys = new Set(checklist.checks.map((check) => check.key));
  const kept: Record<string, T> = {};
  for (const [key, answer] of Object.entries(answers || {})) {
    if (keys.has(key)) kept[key] = answer;
  }
  return kept;
}

export function getCurationChecklist(version: number = CURRENT_CURATION_CHECKLIST_VERSION): CurationChecklist | null {
  return CURATION_CHECKLISTS[version] ?? null;
}

export function curationItemContext(item: {type?: string | null; url?: string | null}): CurationItemContext {
  return {
    hasUrl: typeof item.url === 'string' && item.url.trim().length > 0,
    isCollection: item.type === 'col',
  };
}

export function checkApplies(check: CurationCheck, context: CurationItemContext): boolean {
  if (check.appliesTo === 'collection') return context.isCollection;
  if (check.appliesTo === 'link') return context.hasUrl && !context.isCollection;
  return true;
}

export function checksFor(checklist: CurationChecklist, context: CurationItemContext): CurationCheck[] {
  return checklist.checks.filter((check) => checkApplies(check, context));
}

function facetPrefixes(axis: CurationFacetAxis): string[] {
  switch (axis) {
    case 'eduValue':
      return ['eduval_'];
    case 'minAgeGroup':
      return ['minage_'];
    case 'ads':
      // `ad_` is the older spelling; getUseCriteriaObjWithKeys reads both as the ads axis.
      return ['ads_', 'ad_'];
    case 'design':
      return ['design_'];
    case 'freshness':
      return ['fresh_'];
    case 'cost':
      return ['cost_'];
  }
}

/**
 * The useCriteria prefixes a review owns. A curator edits these in the review, nowhere else. Both
 * kinds of check that write tags count: a facet (eduval_, minage_, ads_, …) and marked boxes
 * (priv_, ai_). With no checklist given, every version's: an item may carry tags a review of any
 * version wrote, and none of them may be changed outside a review.
 */
let allVersionsPrefixes: string[] | null = null;

export function reviewOwnedCriteriaPrefixes(checklist?: CurationChecklist): string[] {
  // Called for every tag of every item edit; the checklists never change at run time.
  if (!checklist && allVersionsPrefixes) return allVersionsPrefixes;
  const prefixes = new Set<string>();
  for (const list of checklist ? [checklist] : Object.values(CURATION_CHECKLISTS)) {
    for (const check of list.checks) {
      if (check.answer.kind === 'facet') facetPrefixes(check.answer.axis).forEach((prefix) => prefixes.add(prefix));
      if (check.answer.kind === 'flags' && check.answer.axis) prefixes.add(flagsAxisPrefix(check.answer.axis));
    }
  }
  if (!checklist) allVersionsPrefixes = [...prefixes];
  return [...prefixes];
}

export function isReviewOwnedCriteriaTag(tag: string, checklist?: CurationChecklist): boolean {
  return reviewOwnedCriteriaPrefixes(checklist).some((prefix) => tag.startsWith(prefix));
}

/** The value an item already carries for a facet check, to start the form from. */
export function currentFacetValue(check: CurationCheck, useCriteria: readonly string[] | null | undefined): string | null {
  if (check.answer.kind !== 'facet' || !Array.isArray(useCriteria)) return null;
  const prefixes = facetPrefixes(check.answer.axis);
  const tag = useCriteria.find((t) => typeof t === 'string' && prefixes.some((prefix) => t.startsWith(prefix)));
  if (!tag) return null;
  const normalized = check.answer.axis === 'eduValue' ? normalizeEduValueAlias(tag) || tag : tag;
  return check.answer.options.includes(normalized) ? normalized : null;
}

/**
 * The boxes an item already carries for a marked-box check: the marked tags, or an empty list when
 * it carries the "none found" tag. Null when the item carries nothing for that axis, so a form can
 * tell "nobody has said" from "checked, nothing found".
 */
export function currentFlagValues(check: CurationCheck, useCriteria: readonly string[] | null | undefined): string[] | null {
  const spec = check.answer;
  if (spec.kind !== 'flags' || !spec.axis || !Array.isArray(useCriteria)) return null;
  const prefix = flagsAxisPrefix(spec.axis);
  const carried = useCriteria.filter((tag): tag is string => typeof tag === 'string' && tag.startsWith(prefix));
  if (carried.length === 0) return null;
  return carried.filter((tag) => spec.options.includes(tag));
}

/** The tag prefix a marked-box axis owns. */
export function flagsAxisPrefix(axis: CurationFlagsAxis): string {
  return axis === 'privacy' ? 'priv_' : 'ai_';
}

/**
 * The item's useCriteria after a finalized review. An answered facet check replaces its axis. An
 * answered box check replaces its axis with the boxes the curator marked, or with its "none found"
 * tag when they marked nothing. Unanswered checks and every other tag are left exactly as they were.
 */
export function mergeReviewFacets(
  useCriteria: readonly string[] | null | undefined,
  checklist: CurationChecklist,
  context: CurationItemContext,
  answers: CurationAnswers,
): string[] {
  let tags = Array.isArray(useCriteria) ? useCriteria.filter((t): t is string => typeof t === 'string') : [];
  const replaceAxis = (prefixes: readonly string[], written: readonly string[]) => {
    tags = tags.filter((tag) => !prefixes.some((prefix) => tag.startsWith(prefix)));
    tags.push(...written);
  };

  for (const check of checksFor(checklist, context)) {
    const spec = check.answer;
    const value = answers[check.key]?.value;

    if (spec.kind === 'facet') {
      if (typeof value !== 'string' || !spec.options.includes(value)) continue;
      replaceAxis(facetPrefixes(spec.axis), [value]);
      continue;
    }

    if (spec.kind === 'flags' && spec.axis && spec.noneTag) {
      // Not answered at all leaves whatever the item carries; "none found" is an answer, and writes a tag.
      if (!Array.isArray(value)) continue;
      const marked = value.filter((tag) => typeof tag === 'string' && spec.options.includes(tag));
      if (marked.length !== value.length) continue;
      replaceAxis([flagsAxisPrefix(spec.axis)], marked.length > 0 ? marked : [spec.noneTag]);
    }
  }
  return tags;
}

function isValidValue(check: CurationCheck, value: unknown): boolean {
  if (value === NOT_CHECKED) return true;
  const spec = check.answer;
  if (spec.kind === 'verdict') return value === 'pass' || value === 'concern' || value === 'fail';
  if (spec.kind === 'facet') return typeof value === 'string' && spec.options.includes(value);
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === 'string' && spec.options.includes(v)) &&
    new Set(value).size === value.length
  );
}

/** What an answer amounts to. An invalid or missing answer counts as not checked. */
export function answerStatus(check: CurationCheck, answer: CurationAnswer | null | undefined): CurationAnswerStatus {
  const value = answer?.value;
  if (value === undefined || value === NOT_CHECKED || !isValidValue(check, value)) return NOT_CHECKED;
  const spec = check.answer;
  if (spec.kind === 'verdict') return value as CurationVerdict;
  if (spec.kind === 'facet') {
    if (spec.failValues?.includes(value as string)) return 'fail';
    if (spec.concernValues?.includes(value as string)) return 'concern';
    return 'pass';
  }
  return (value as string[]).length === 0 ? 'pass' : 'concern';
}

/** The words a family reads for an answer. */
export function answerLabel(check: CurationCheck, answer: CurationAnswer | null | undefined): string {
  const status = answerStatus(check, answer);
  if (status === NOT_CHECKED) return 'Not checked';
  const spec = check.answer;
  if (spec.kind === 'verdict') return spec.labels[status];
  if (spec.kind === 'facet') return facetOptionLabel(spec.axis, answer!.value as string);
  const found = answer!.value as string[];
  if (found.length === 0) return 'None found';
  return found.map((key) => flagOptionLabel(spec, key)).join(', ');
}

const FACET_TAG_LISTS: Record<CurationFacetAxis, ReadonlyArray<{key: string; name: string; selectedName?: string}>> = {
  eduValue: eduTagList,
  minAgeGroup: minAgeTagList,
  ads: adsTagList,
  design: designTagList,
  freshness: freshnessTagList,
  cost: costTagList,
};

export function facetOptionLabel(axis: CurationFacetAxis, key: string): string {
  const tag = FACET_TAG_LISTS[axis].find((t) => t.key === key);
  return tag?.selectedName || tag?.name || key;
}

/** The name families read for one flag: the check's own label, else the Mature content name. */
export function flagOptionLabel(spec: Extract<CurationAnswerSpec, {kind: 'flags'}>, key: string): string {
  return spec.labels?.[key] || (flagOptions as Record<string, string>)[key] || key;
}

const FLAG_DESCRIPTIONS: Readonly<Record<string, string>> = Object.fromEntries(
  [...privacyTagList, ...aiFeatureTagList].filter((tag) => !!tag.description).map((tag) => [tag.key, tag.description!]),
);

/** One line on what a marked box means, for the boxes that have one (Privacy, AI and answer tools). */
export function flagOptionDescription(key: string): string | null {
  return FLAG_DESCRIPTIONS[key] ?? null;
}

/**
 * Whether families read this answer in a finished review. Never the curator's housekeeping, and a
 * check nobody answered only for the curator's note. A key check is read whatever it found; any
 * other check only when it found something, or carries a note.
 */
export function shownToFamilies(check: CurationCheck, answer: CurationAnswer | null | undefined): boolean {
  if (CURATION_CURATOR_ONLY_CHECKS.includes(check.key)) return false;
  const hasNote = !!answer?.comment || (answer?.screenshots?.length || 0) > 0;
  const status = answerStatus(check, answer);
  if (status === NOT_CHECKED) return hasNote;
  if (CURATION_KEY_GROUPS.includes(check.group)) return true;
  return status !== 'pass' || hasNote;
}

export type CurationValidationIssue = {key: string; message: string};

/** `key` is a check key, or one of these for the review as a whole. */
export const CURATION_REVIEW_FIELD = {
  outcome: '_outcome',
  declineReason: '_declineReason',
  summary: '_summary',
  internalNote: '_internalNote',
  reviewAgainMonths: '_reviewAgainMonths',
} as const;

export type CurationFinalizeFields = {
  outcome?: CurationOutcome | null;
  declineReason?: string | null;
  summary?: string | null;
  internalNote?: string | null;
  reviewAgainMonths?: number | null;
};

/**
 * Checks a review's answers. Saving a draft only rejects malformed answers; finalizing also
 * requires what a finished review must say. The server runs this before it writes, and the form
 * runs it to show each message beside the control it is about.
 */
export function validateCurationAnswers(
  checklist: CurationChecklist,
  context: CurationItemContext,
  answers: CurationAnswers,
  finalize?: CurationFinalizeFields,
): {errors: CurationValidationIssue[]; warnings: CurationValidationIssue[]} {
  const errors: CurationValidationIssue[] = [];
  const warnings: CurationValidationIssue[] = [];
  const applicable = checksFor(checklist, context);
  const byKey = new Map(checklist.checks.map((check) => [check.key, check]));

  for (const [key, answer] of Object.entries(answers || {})) {
    const check = byKey.get(key);
    if (!check) {
      errors.push({key, message: 'This check is not on the checklist.'});
      continue;
    }
    if (!checkApplies(check, context)) {
      if (answer?.value !== NOT_CHECKED) errors.push({key, message: 'This check does not apply to this item.'});
      continue;
    }
    if (!answer || !isValidValue(check, answer.value)) {
      errors.push({key, message: 'Pick one of the listed answers.'});
      continue;
    }
    if (typeof answer.comment === 'string' && answer.comment.length > CURATION_COMMENT_MAX) {
      errors.push({key, message: `Keep the comment under ${CURATION_COMMENT_MAX} characters.`});
    }
    if (answer.screenshots !== undefined) {
      if (!Array.isArray(answer.screenshots) || answer.screenshots.some((s) => typeof s !== 'string')) {
        errors.push({key, message: 'Screenshots are not in the expected form.'});
      } else if (answer.screenshots.length > CURATION_SCREENSHOTS_PER_CHECK) {
        errors.push({key, message: `Attach at most ${CURATION_SCREENSHOTS_PER_CHECK} screenshots.`});
      }
    }
  }

  if (finalize) {
    const F = CURATION_REVIEW_FIELD;
    if (typeof finalize.summary === 'string' && finalize.summary.length > CURATION_SUMMARY_MAX) {
      errors.push({key: F.summary, message: `Keep the summary under ${CURATION_SUMMARY_MAX} characters.`});
    }
    if (typeof finalize.internalNote === 'string' && finalize.internalNote.length > CURATION_INTERNAL_NOTE_MAX) {
      errors.push({key: F.internalNote, message: `Keep the note under ${CURATION_INTERNAL_NOTE_MAX} characters.`});
    }
    // Only an item going into the catalog is checked again; a declined one has nothing to re-check.
    if (
      finalize.outcome === 'curate' &&
      !(CURATION_REVIEW_AGAIN_MONTHS as readonly number[]).includes(finalize.reviewAgainMonths as number)
    ) {
      errors.push({key: F.reviewAgainMonths, message: 'Pick when to check it again.'});
    }

    if (finalize.outcome !== 'curate' && finalize.outcome !== 'decline') {
      errors.push({key: F.outcome, message: 'Choose whether it goes in the catalog.'});
    }

    // A comment is never required: the answer stands on its own, and a note is added when there is more to say.
    for (const check of applicable) {
      const answer = answers?.[check.key];
      const status = answerStatus(check, answer);
      if (finalize.outcome === 'curate') {
        if (check.required && status === NOT_CHECKED) {
          errors.push({key: check.key, message: 'Answer this before adding it to the catalog.'});
        }
        if (status === 'fail') {
          errors.push({key: check.key, message: 'A failed check cannot go in the catalog. Change the answer or do not add it.'});
        }
      }
    }

    if (finalize.outcome === 'decline') {
      if (!DECLINE_REASONS.some((reason) => reason.code === finalize.declineReason)) {
        errors.push({key: F.declineReason, message: 'Pick the reason families will read.'});
      }
    }

    const minAge = checklist.checks.find((check) => check.key === 'min_age');
    const mature = checklist.checks.find((check) => check.key === 'mature_content');
    const flags = mature ? answers?.[mature.key]?.value : undefined;
    const age = minAge ? answers?.[minAge.key]?.value : undefined;
    if (Array.isArray(flags) && flags.length > 0 && (age === 'minage_prek' || age === 'minage_kids')) {
      warnings.push({key: 'min_age', message: 'Mature content is marked, but the minimum age is under 10.'});
    }
  }

  return {errors, warnings};
}

/** The decline reason a failed check points to, first failure in checklist order. */
export function suggestedDeclineReason(
  checklist: CurationChecklist,
  context: CurationItemContext,
  answers: CurationAnswers,
): DeclineReasonCode | null {
  for (const check of checksFor(checklist, context)) {
    if (check.declineReasonOnFail && answerStatus(check, answers[check.key]) === 'fail') return check.declineReasonOnFail;
  }
  return null;
}

/** When to look again: sooner for sources that change or are going stale. */
export function suggestedReviewAgainMonths(
  answers: CurationAnswers,
  item: {publishType?: string | null; subType?: string | null} = {},
): number {
  if (item.publishType === 'feed' || item.subType === 'podcast') return 3;
  const freshness = answers.freshness?.value;
  if (freshness === 'fresh_aging' || freshness === 'fresh_outdated') return 6;
  return CURATION_DEFAULT_REVIEW_AGAIN_MONTHS;
}

export function addMonths(from: Date, months: number): Date {
  const next = new Date(from.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

function allowedValuesText(check: CurationCheck): string {
  const spec = check.answer;
  if (spec.kind === 'verdict') {
    return `"pass" (${spec.labels.pass}), "concern" (${spec.labels.concern}), "fail" (${spec.labels.fail}), or "${NOT_CHECKED}"`;
  }
  if (spec.kind === 'facet') {
    const options = spec.options.map((key) => `"${key}" (${facetOptionLabel(spec.axis, key)})`).join(', ');
    return `one of ${options}, or "${NOT_CHECKED}"`;
  }
  const options = spec.options.map((key) => `"${key}" (${flagOptionLabel(spec, key)})`).join(', ');
  return `a list of any of ${options}; an empty list means none found; or "${NOT_CHECKED}"`;
}

/**
 * The checklist as text for the AI draft job. The job's editable prompt holds only framing; the
 * checks always come from here, so a prompt override cannot drift from what curators answer.
 */
export function renderCurationChecklistForPrompt(checklist: CurationChecklist, context: CurationItemContext): string {
  const lines: string[] = [`Curation checklist v${checklist.version}.`];
  for (const group of CURATION_CHECK_GROUPS) {
    const checks = checksFor(checklist, context).filter((check) => check.group === group.key);
    if (checks.length === 0) continue;
    lines.push('', `## ${group.label}`);
    for (const check of checks) {
      lines.push(
        '',
        `### ${check.key}: ${check.publicLabel}`,
        `Question: ${check.question}`,
        `How to answer: ${check.instructions}`,
        `Allowed values: ${allowedValuesText(check)}.`,
      );
    }
  }
  return lines.join('\n');
}

/**
 * The reasons a family can give when reporting a catalog item. `pulls`: the report takes the item
 * out of recommendations until a curator finishes the review it opens (founder decision D4).
 */
export const CATALOG_REPORT_REASONS = [
  {code: 'broken', label: 'Broken link', pulls: true},
  {code: 'inappropriateContentOrAds', label: 'Inappropriate content or ads', pulls: true},
  {code: 'incorrectMetadata', label: 'Wrong description or details', pulls: false},
  {code: 'other', label: 'Something else', pulls: false},
] as const;

export type CatalogReportReasonCode = (typeof CATALOG_REPORT_REASONS)[number]['code'];

export function catalogReportReason(code: unknown) {
  return CATALOG_REPORT_REASONS.find((reason) => reason.code === code) ?? null;
}
