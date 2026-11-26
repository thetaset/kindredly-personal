import {eduTagList, type EduValue, type IntentTag} from '../content.types';
import {CANONICAL_CATEGORY_IDS} from '../publishedCategoryMapping';

/**
 * A classifier version: everything that decides a page's Category that can change without new code
 * (CLS-2). The app ships one (`bundledClassifierVersion`), the server will keep the rest (CLS-3) and
 * send the active one to apps without a release (CLS-4).
 *
 * Deliberately not in a version: the sexual-content examples and margin that settle whether a page
 * is blocked (HAT-801), so activating a version can never weaken the adult filter; and the game
 * list, which drives the Games limit on every device, Guard and the computer app included.
 */
export const CLASSIFIER_VERSION_SCHEMA = 1;

/** The text-model label that settles adult blocking; a version may not hold its examples or rules. */
export const SEXUAL_LABEL = 'sexual_or_provocative';

export type ClassifierTextRule = {
  type: string;
  operator: string;
  values: string[];
  caseSensitive?: boolean;
  fields?: string[];
  negate?: boolean;
  weight?: number;
  wholeWord?: boolean;
};

export type ClassifierKeywordRules = {label: string; rules: ClassifierTextRule[]};

export type ClassifierEntityRule = {
  label: string;
  score?: number;
  domains?: string[];
  urlContains?: string[];
  titleContains?: string[];
  textContains?: string[];
  note: string;
};

export type ClassifierSiteDefault = {
  label: string;
  domains: string[];
  pathPrefixes?: string[];
  eduValue: EduValue;
  intent?: IntentTag;
  sourceNote: string;
  alwaysApply?: boolean;
};

/**
 * A YouTube channel's Category (CLS-22): every video and Short from it takes this Category, ahead of
 * the site defaults for youtube.com. Matched on the page's channel handle (no "@", any case), or on
 * its name when no handle is known.
 */
export type ClassifierYouTubeChannel = {
  handle?: string;
  name?: string;
  eduValue: EduValue;
};

/**
 * YouTube's own category for a video (CLS-23), as its page names it ("Education", "Gaming", "Howto &
 * Style"): a video from a channel the version doesn't list takes this Category, ahead of the site
 * defaults for youtube.com. Shorts are left to the site defaults unless `shorts` is true.
 */
export type ClassifierYouTubeGenre = {
  genre: string;
  eduValue: EduValue;
  shorts?: boolean;
};

export type ClassifierThresholds = {
  /** The text model names no label for a page whose best anchor scores under this. */
  embeddingMinScore: number;
  ruleMinScore: number;
  ruleUnknownDominant: number;
  ruleEntertainmentLow: number;
  ruleEntertainmentHigh: number;
  ruleTaskOrEduCeiling: number;
  ruleTaskMin: number;
  ruleEducationalMin: number;
  ruleUnknownFallbackScore: number;
  /**
   * Optional (CLS-13, W5): the text model names no Category when its best Category beats the next
   * by less than this. Left out, a close second never matters, as before.
   */
  unknownMargin?: number;
  /**
   * Optional (CLS-13, W3): a Junk answer from the text model must beat the best other Category by
   * this much, or that Category is taken instead. The junk examples are generic, so a near tie with
   * Junk is usually something else.
   */
  junkMargin?: number;
};

/**
 * How the app picks the topics a page counts under in Usage (CLS-11): the page's title and site
 * matched against each Topics tree topic's text. A version without it uses the app's own values,
 * `DEFAULT_TOPIC_SETTINGS`, so leaving it out changes nothing.
 */
export type ClassifierTopicSettings = {
  /** A page counts under no topic when its closest topic is less similar than this. */
  minSimilarity: number;
  /** The most topics one page counts under. */
  maxTopics: number;
  /** Words added to a topic's own text, by Topics tree General topic id. */
  extraText?: Record<string, string>;
};

export const DEFAULT_TOPIC_SETTINGS: ClassifierTopicSettings = {minSimilarity: 0.3, maxTopics: 3};
export const MAX_TOPICS_PER_PAGE = 5;
export const MAX_TOPIC_EXTRA_TEXT = 400;

export type ClassifierVersion = {
  schema: number;
  id: string;
  parent: string | null;
  /** The text model the version was scored with. */
  textModel: string;
  createdAt: string;
  notes: string;
  /** Example sentences per text-model label, in the order labels are scored (a tie goes to the first). */
  anchors: Record<string, string[]>;
  keywordRules: ClassifierKeywordRules[];
  entityRules: ClassifierEntityRule[];
  siteDefaults: ClassifierSiteDefault[];
  thresholds: ClassifierThresholds;
  /** Optional, so a version made before topics were versioned reads the same (CLS-11). */
  topics?: ClassifierTopicSettings;
  /** Optional (CLS-22): YouTube channels and their Categories. */
  youtubeChannels?: ClassifierYouTubeChannel[];
  /** Optional (CLS-23): YouTube's own categories and the Category each gives a video. */
  youtubeGenres?: ClassifierYouTubeGenre[];
};

const THRESHOLD_KEYS: Array<keyof ClassifierThresholds> = [
  'embeddingMinScore',
  'ruleMinScore',
  'ruleUnknownDominant',
  'ruleEntertainmentLow',
  'ruleEntertainmentHigh',
  'ruleTaskOrEduCeiling',
  'ruleTaskMin',
  'ruleEducationalMin',
  'ruleUnknownFallbackScore',
];

const OPTIONAL_THRESHOLD_KEYS: Array<keyof ClassifierThresholds> = ['unknownMargin', 'junkMargin'];

/** The highest `embeddingMinScore` a version may set: above it the text model would name almost no page's Category. */
export const MAX_EMBEDDING_MIN_SCORE = 0.5;

/**
 * The Category each text-model anchor label counts as. A label may also be a Category itself
 * (`eduval_*`), as the anchor optimizer's sets are. Before this one table the optimizer counted news
 * as Edutainment and shopping as Junk while the app counted them as Educational and Task (CLS-1).
 */
export const ANCHOR_LABEL_CATEGORY: Readonly<Record<string, EduValue>> = {
  educational: 'eduval_educational',
  news: 'eduval_educational',
  task: 'eduval_task',
  shopping: 'eduval_task',
  entertainment: 'eduval_fun',
  satire: 'eduval_fun',
  sports: 'eduval_fun',
  unknown: 'eduval_unknown',
  social: 'eduval_unknown',
  junk: 'eduval_junk',
  clickbait: 'eduval_junk',
  [SEXUAL_LABEL]: 'eduval_junk',
};

const EDU_VALUES: ReadonlySet<string> = new Set(eduTagList.map((tag) => tag.key));

/** The Category an anchor label counts as, or null for a label that has none. */
export function categoryForAnchorLabel(label: string): EduValue | null {
  return ANCHOR_LABEL_CATEGORY[label] ?? (EDU_VALUES.has(label) ? (label as EduValue) : null);
}

const RULE_TYPES = new Set(['contains', 'regex', 'equals']);
const RULE_OPERATORS = new Set(['and', 'or']);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');
const isOptionalStringArray = (value: unknown) => value === undefined || isStringArray(value);
const isFraction = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

function keywordRuleProblem(rule: ClassifierTextRule): string | null {
  if (!rule || typeof rule !== 'object') return 'not an object';
  if (!RULE_TYPES.has(rule.type)) return `type ${String(rule.type)}`;
  if (!RULE_OPERATORS.has(rule.operator)) return `operator ${String(rule.operator)}`;
  if (!isStringArray(rule.values) || rule.values.length === 0) return 'values must be a list of words';
  if (!isOptionalStringArray(rule.fields)) return 'fields must be a list';
  if (rule.weight !== undefined && !(typeof rule.weight === 'number' && Number.isFinite(rule.weight))) return 'weight must be a number';
  if (rule.type === 'regex') {
    for (const pattern of rule.values) {
      try {
        // The flags TextRuleClassifier compiles with.
        new RegExp(pattern, rule.caseSensitive ? 'm' : 'mi');
      } catch {
        return `regex ${pattern} does not compile`;
      }
    }
  }
  return null;
}

function entityRuleProblem(rule: ClassifierEntityRule): string | null {
  if (!rule || typeof rule !== 'object' || typeof rule.label !== 'string' || typeof rule.note !== 'string') return 'needs a label and a note';
  if (rule.label === SEXUAL_LABEL) return 'the sexual label stays in the app (HAT-801)';
  if (categoryForAnchorLabel(rule.label) === null) return `label ${rule.label} has no Category`;
  const lists = [rule.domains, rule.urlContains, rule.titleContains, rule.textContains];
  if (!lists.every(isOptionalStringArray)) return 'domains, urlContains, titleContains and textContains must be lists';
  if (!lists.some((list) => Array.isArray(list) && list.some((entry) => entry.trim().length > 0))) return 'matches nothing';
  if (rule.score !== undefined && !isFraction(rule.score)) return 'score must be between 0 and 1';
  return null;
}

function siteDefaultProblem(rule: ClassifierSiteDefault): string | null {
  if (!rule || typeof rule !== 'object' || typeof rule.label !== 'string' || typeof rule.sourceNote !== 'string') return 'needs a label and a source note';
  if (!isStringArray(rule.domains) || rule.domains.length === 0) return 'needs at least one domain';
  if (!isOptionalStringArray(rule.pathPrefixes)) return 'pathPrefixes must be a list';
  if (!EDU_VALUES.has(rule.eduValue)) return `Category ${String(rule.eduValue)}`;
  if (rule.intent !== undefined && typeof rule.intent !== 'string') return 'intent must be a word';
  if (rule.alwaysApply !== undefined && typeof rule.alwaysApply !== 'boolean') return 'alwaysApply must be true or false';
  return null;
}

/**
 * Whether `value` is a version this code can use. The app checks before it uses one, and the server
 * before it saves one, so a version no app can load is refused where it is made. Every field a
 * classifier reads is checked, because one malformed rule would fail every page's classification.
 */
export function checkClassifierVersion(value: unknown): {ok: true; version: ClassifierVersion} | {ok: false; reason: string} {
  const fail = (reason: string) => ({ok: false as const, reason});
  const v = value as Partial<ClassifierVersion> | null;
  if (!v || typeof v !== 'object') return fail('not an object');
  if (v.schema !== CLASSIFIER_VERSION_SCHEMA) return fail(`schema ${String(v.schema)}, this app reads ${CLASSIFIER_VERSION_SCHEMA}`);
  if (typeof v.id !== 'string' || !v.id) return fail('no id');
  if (typeof v.textModel !== 'string' || !v.textModel) return fail('no text model');

  const anchors = v.anchors as Record<string, unknown> | undefined;
  if (!anchors || typeof anchors !== 'object' || Array.isArray(anchors)) return fail('anchors are missing');
  const anchorLabels = Object.keys(anchors);
  if (anchorLabels.length === 0) return fail('no anchors');
  if (SEXUAL_LABEL in anchors) return fail('the sexual label stays in the app (HAT-801)');
  for (const label of anchorLabels) {
    if (!isStringArray(anchors[label])) return fail(`anchors for ${label} are not a list of sentences`);
    if (categoryForAnchorLabel(label) === null) return fail(`anchor label ${label} has no Category`);
  }

  if (!Array.isArray(v.keywordRules)) return fail('keyword rules are missing');
  for (const entry of v.keywordRules) {
    if (!entry || typeof entry.label !== 'string' || !Array.isArray(entry.rules)) return fail('keyword rules are malformed');
    if (entry.label === SEXUAL_LABEL) return fail('the sexual label stays in the app (HAT-801)');
    if (categoryForAnchorLabel(entry.label) === null) return fail(`keyword label ${entry.label} has no Category`);
    for (const rule of entry.rules) {
      const problem = keywordRuleProblem(rule);
      if (problem) return fail(`keyword rule for ${entry.label}: ${problem}`);
    }
  }

  if (!Array.isArray(v.entityRules)) return fail('entity rules are missing');
  for (const rule of v.entityRules) {
    const problem = entityRuleProblem(rule);
    if (problem) return fail(`entity rule ${String(rule?.note ?? '')}: ${problem}`);
  }

  if (!Array.isArray(v.siteDefaults)) return fail('site defaults are missing');
  for (const rule of v.siteDefaults) {
    const problem = siteDefaultProblem(rule);
    if (problem) return fail(`site default ${String(rule?.label ?? '')}: ${problem}`);
  }

  const thresholds = v.thresholds as Record<string, unknown> | undefined;
  const badThresholds = THRESHOLD_KEYS.filter((key) => !isFraction(thresholds?.[key]));
  if (badThresholds.length) return fail(`thresholds must be between 0 and 1: ${badThresholds.join(', ')}`);
  if ((thresholds!.embeddingMinScore as number) > MAX_EMBEDDING_MIN_SCORE) {
    return fail(`embeddingMinScore above ${MAX_EMBEDDING_MIN_SCORE}`);
  }
  const badOptional = OPTIONAL_THRESHOLD_KEYS.filter((key) => thresholds![key] !== undefined && !isFraction(thresholds![key]));
  if (badOptional.length) return fail(`thresholds must be between 0 and 1: ${badOptional.join(', ')}`);
  if (v.topics !== undefined) {
    const problem = topicSettingsProblem(v.topics);
    if (problem) return fail(`topics: ${problem}`);
  }
  if (v.youtubeChannels !== undefined) {
    if (!Array.isArray(v.youtubeChannels)) return fail('youtubeChannels must be a list');
    for (const channel of v.youtubeChannels) {
      const named = typeof channel?.handle === 'string' || typeof channel?.name === 'string';
      if (!channel || !named || !EDU_VALUES.has(channel.eduValue)) {
        return fail(`YouTube channel ${String(channel?.handle ?? channel?.name ?? '')}: needs a handle or a name, and a Category`);
      }
    }
  }
  if (v.youtubeGenres !== undefined) {
    if (!Array.isArray(v.youtubeGenres)) return fail('youtubeGenres must be a list');
    for (const rule of v.youtubeGenres) {
      const ok =
        rule && typeof rule.genre === 'string' && rule.genre.trim() && EDU_VALUES.has(rule.eduValue) &&
        (rule.shorts === undefined || typeof rule.shorts === 'boolean');
      if (!ok) return fail(`YouTube category ${String(rule?.genre ?? '')}: needs a name and a Category`);
    }
  }
  return {ok: true, version: v as ClassifierVersion};
}

function topicSettingsProblem(topics: unknown): string | null {
  const t = topics as Partial<ClassifierTopicSettings> | null;
  if (!t || typeof t !== 'object' || Array.isArray(t)) return 'not an object';
  if (!isFraction(t.minSimilarity)) return 'minSimilarity must be between 0 and 1';
  if (!Number.isInteger(t.maxTopics) || (t.maxTopics as number) < 1 || (t.maxTopics as number) > MAX_TOPICS_PER_PAGE) {
    return `maxTopics must be a whole number from 1 to ${MAX_TOPICS_PER_PAGE}`;
  }
  if (t.extraText === undefined) return null;
  if (!t.extraText || typeof t.extraText !== 'object' || Array.isArray(t.extraText)) return 'extraText must be an object';
  for (const [id, text] of Object.entries(t.extraText)) {
    if (!CANONICAL_CATEGORY_IDS.has(id)) return `extraText names ${id}, which is not a Topics tree topic`;
    if (typeof text !== 'string' || text.length > MAX_TOPIC_EXTRA_TEXT) {
      return `extraText for ${id} must be words, at most ${MAX_TOPIC_EXTRA_TEXT} characters`;
    }
  }
  return null;
}
