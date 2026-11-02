// Making a learning track with AI (docs/trackers/learning-tracks-tracker.md, TRK-13…TRK-17).
//
// The request and response shapes of the three routes, the default prompts, the critic's six
// criteria, and the request estimate the track page shows. The server runs every call under
// aiCostGuard and a Plus check; nothing here is saved on the server.

import type { TrackItemKind, TrackItemV1, TrackCriterion, TrackItemValidation } from './track-item';
import type { TrackKind, TrackVoiceKey } from './track';
import type { AiReasoningEffort } from './ai-task-models';

// ---------------------------------------------------------------------------
// What the maker gives
// ---------------------------------------------------------------------------

/** Something the maker drops in: a link, pasted text, a library item's text, or a PDF. */
export type TrackSourceRef =
  | { kind: 'url'; url: string }
  | { kind: 'text'; text: string; title?: string; origin?: 'pasted' | 'library'; url?: string }
  | { kind: 'pdf'; dataBase64: string; filename?: string };

/** The model a track is made on: GPT-6 Luna, the one Kindredly offers (HAT-503). */
export const DEFAULT_TRACK_MODEL = 'gpt-6-luna';

/** The Model menu on the track page, the default first; the plan decides which are offered. */
export const TRACK_MODELS: Array<{ id: string; label: string }> = [
  { id: 'gpt-6-luna', label: 'Standard' },
];

/** What the page sends of a dropped-in source for one item: well inside the route's input cap. */
export const TRACK_ITEM_SOURCE_SEND_CHARS = 300_000;

/**
 * The largest PDF the page sends: base64 grows it by a third, and the server takes request bodies
 * up to 10 MB.
 */
export const TRACK_MAX_DROPPED_PDF_BYTES = 7 * 1024 * 1024;

/**
 * The server refused the Learning feed builder's chat (HAT-757): it is for an adult, on Plus, with AI
 * tools on. The refusal's message says which.
 */
export const FEED_BUILDER_UNAVAILABLE = 'FEED_BUILDER_UNAVAILABLE';

/** The chat mode, as the client sends it to `/ai/sendMessageStream`. */
export const FEED_BUILDER_CHAT_MODE = 'feed-builder';

/** How many sources of their own a maker can add to one feed (HAT-761). */
export const TRACK_MAX_OWN_SOURCES = 5;

export const TRACK_LENGTH_MIN = 3;
export const TRACK_LENGTH_MAX = 30;

export interface TrackSyllabusRequest {
  /** "Quantum mechanics for curious beginners". Optional when a source is dropped in. */
  subject?: string;
  /** One source of the maker's own: what older pages send. `sources` wins when both are sent. */
  source?: TrackSourceRef;
  /** The maker's own sources (HAT-761), up to TRACK_MAX_OWN_SOURCES, each its id by place: s1, s2… */
  sources?: TrackSourceRef[];
  /**
   * With sources of the maker's own: plan from them alone (the default, as with one source before),
   * or false to search Wikipedia, Wikisource and Project Gutenberg as well.
   */
  onlyMySources?: boolean;
  kind: TrackKind;
  /** Items, TRACK_LENGTH_MIN…TRACK_LENGTH_MAX. */
  length: number;
  /** Who it is for, in the maker's words. */
  audience?: string;
  voice: TrackVoiceKey;
  model?: string;
  /** The Learning feeds task's reasoning level on the maker's device (HAT-761); absent, the model's own. */
  reasoningEffort?: AiReasoningEffort;
}

/** A source the syllabus found and fetched, as the page lists it. */
export interface TrackSourceSummary {
  /** "s1", "s2": how items point at it. */
  id: string;
  title: string;
  url?: string;
  license?: string;
  revisionId?: string;
  kind: string;
  /** The headings a dropped-in source was walked by. */
  sections?: string[];
}

export interface TrackSyllabusSection {
  key: string;
  title: string;
  parentKey?: string;
}

export interface TrackSyllabusItem {
  /** Stable within the syllabus; the maker can reorder and edit. */
  key: string;
  title: string;
  kind: TrackItemKind;
  sourceId: string;
  /** Where in the source: a section heading, a chapter. */
  locator?: string;
  /** One line on what the item covers. */
  angle?: string;
  /** What to search Wikimedia Commons for, for a Page or a Visual. */
  imageQuery?: string;
  /** The section this item starts or falls under. */
  sectionKey?: string;
}

export interface TrackSyllabusResponse {
  title: string;
  description: string;
  kind: TrackKind;
  voice: TrackVoiceKey;
  sections: TrackSyllabusSection[];
  items: TrackSyllabusItem[];
  sources: TrackSourceSummary[];
  /**
   * The maker's sources the plan uses, with their text, so each item can be written from its section
   * without sending the file again. Absent for sources found on the web, which are fetched per item.
   */
  droppedSources?: TrackDroppedSource[];
  /** The same, for older pages: set only when the plan's one source is the maker's own. */
  droppedSource?: TrackDroppedSource;
  warnings: string[];
}

/** A source of the maker's own, read: its text and where its headings fall. */
export interface TrackDroppedSource {
  id: string;
  title: string;
  text: string;
  sections: Array<{ title: string; start: number; end: number }>;
}

/** The maker's sources a plan uses: `droppedSources`, or an older answer's one `droppedSource`. */
export function droppedSourcesOf(syllabus: Pick<TrackSyllabusResponse, 'droppedSources' | 'droppedSource'> | null | undefined): TrackDroppedSource[] {
  if (!syllabus) return [];
  if (syllabus.droppedSources?.length) return syllabus.droppedSources;
  return syllabus.droppedSource ? [syllabus.droppedSource] : [];
}

/**
 * The part of a dropped-in source one item is written from, for `sourceText`: from the heading its
 * locator names to the end (the server keeps that section and its subsections), or from the start
 * when no heading matches.
 */
export function droppedSourceTextFor(dropped: TrackDroppedSource, locator?: string): string {
  const norm = (v: string) => v.toLowerCase().replace(/[=#*_]/g, ' ').replace(/\s+/g, ' ').trim();
  const want = norm(locator || '');
  const section = want
    ? dropped.sections.find((s) => norm(s.title) === want) || dropped.sections.find((s) => norm(s.title).includes(want))
    : undefined;
  const start = section ? section.start : 0;
  return dropped.text.slice(start, start + TRACK_ITEM_SOURCE_SEND_CHARS);
}

export interface TrackContext {
  title: string;
  kind: TrackKind;
  voice: TrackVoiceKey;
  audience?: string;
  subject?: string;
}

export interface TrackWriteItemRequest {
  track: TrackContext;
  item: TrackSyllabusItem;
  source: TrackSourceSummary;
  /** The dropped-in source's text for this item's section; web sources are fetched by the server. */
  sourceText?: string;
  /** 0-based place in the track. */
  position: number;
  total: number;
  /** The item before, for a course's recap line. */
  previous?: { title: string; summary?: string };
  /** Copy an image for a Page or a Visual (default true for those kinds). */
  withImage?: boolean;
  model?: string;
  reasoningEffort?: AiReasoningEffort;
}

export interface TrackWriteItemResponse {
  title: string;
  item: TrackItemV1;
  /** One sentence: what the reader now understands. The next course item's recap picks up from it. */
  summary?: string;
  /** The copied image's bytes as a data URL; the client saves it with the item. */
  imageData?: string;
  validation: TrackItemValidation;
  warnings: string[];
}

export interface TrackImproveRequest {
  track: TrackContext;
  title: string;
  item: TrackItemV1;
  position: number;
  previous?: { title: string; summary?: string };
  /** The source text the item was written from; fetched again from its first source when absent. */
  sourceText?: string;
  /** Score only; no rewrite. */
  critiqueOnly?: boolean;
  model?: string;
  reasoningEffort?: AiReasoningEffort;
}

export interface TrackImproveResponse {
  /** As it came in. */
  before: { title: string; item: TrackItemV1 };
  /** The best-scoring version after the rewrite rounds; the same as `before` when nothing was below 4 or no rewrite beat it. */
  after: { title: string; item: TrackItemV1 };
  /** The kept version's scores: the best-scoring of the item and its rewrites. */
  scores: Partial<Record<TrackCriterion, number>>;
  /** The item's scores as it came in, when it was rewritten. */
  firstScores?: Partial<Record<TrackCriterion, number>>;
  notes: string[];
  /** Rewrite rounds run, whichever version was kept. */
  rounds: number;
  /** Still below 4 after the rounds: one line saying why. */
  flag?: string;
  changed: boolean;
}

// ---------------------------------------------------------------------------
// The critic's criteria and the rules every item follows (HAT-058)
// ---------------------------------------------------------------------------

/** The question the critic answers for each criterion, 1–5. */
export const TRACK_CRITERION_QUESTIONS: Record<TrackCriterion, string> = {
  keepsReading: 'Would someone who didn’t already care keep reading past the first paragraph?',
  oneIdea: 'Can the reader say, in one sentence, what they understand now that they didn’t before?',
  standsAloneOrFollows:
    'Theme: does it stand alone? Light course: does it pick up cleanly from the previous item?',
  satisfyingEnd: 'Does it end on something satisfying rather than mid-thought?',
  tracedToSource: 'Is every factual claim traceable to the fetched source?',
  voice: 'Does it respect the reader’s intelligence and match the voice sample?',
};

/** Below this on any criterion, an item is rewritten (at most TRACK_IMPROVE_MAX_ROUNDS times). */
export const TRACK_PASSING_SCORE = 4;
export const TRACK_IMPROVE_MAX_ROUNDS = 2;

export const TRACK_AVOID = [
  'filler and padding',
  'vague, plausible-sounding text',
  'manufactured urgency',
  'engagement bait and cliffhangers engineered for compulsion',
  'any claim you can’t point to in the source',
];

export const TRACK_ITEM_KIND_GUIDES: Record<TrackItemKind, string> = {
  page: '250–450 words and one image. One idea, a strong image, intriguing, substantive enough that the reader genuinely understands one thing, not exhaustive. A satisfying close.',
  reading:
    'A passage from a public-domain book, story or poem, exactly as written, with 100–200 words of framing before it and a line or two after. Never rewrite or trim the passage.',
  visual: 'An openly licensed artwork, photo or diagram, with 150–300 words that teach the reader how to look at it.',
  exercise: 'A puzzle or thinking prompt with a short setup, and the answer or a reflection revealed at the end.',
};

// ---------------------------------------------------------------------------
// Default prompts (editable in Admin AI Tools once the keys are registered)
// ---------------------------------------------------------------------------

export type TrackPromptKey = 'trackSearch' | 'trackSyllabus' | 'trackWrite' | 'trackCritic';

export const DEFAULT_TRACK_PROMPTS: Record<TrackPromptKey, { system: string; prompt: string }> = {
  trackSearch: {
    system:
      'You find the sources for a learning track for Kindredly. Respond ONLY with a JSON object. ' +
      'Name only Wikipedia articles and published works you are sure exist, with their exact titles.',
    prompt:
      'TASK: A track of INPUT.length items on INPUT.subject, for INPUT.audience, as INPUT.trackKind, needs sources to be written from. ' +
      'articles: up to 8 exact English Wikipedia article titles, the most central first, each specific enough to carry one or two items ' +
      '(for quantum mechanics: "Quantum mechanics", "Double-slit experiment", "Uncertainty principle"; never a list, an outline or a disambiguation page). ' +
      'texts: up to 4 public-domain works whose own words are worth reading, when the subject has them: poems, stories, speeches, letters, diaries or classic books published before 1929, ' +
      'each with its title and author; an empty list when the subject has none. For a subject that is itself about poems, stories or a book, name those works. ' +
      'FORMAT: {"articles":["<title>"],"texts":[{"title":"<title>","author":"<author>"}]}; INPUT:',
  },
  trackSyllabus: {
    system:
      'You plan a learning track for Kindredly, a family app whose feeds are meant to be good for the people who read them. ' +
      'Respond ONLY with a JSON object. A track is delivered one short item at a time. ' +
      'A theme is standalone items within one area: every item is complete on its own and any order works. ' +
      'A light course is a gentle sequence that goes somewhere: items build on earlier ones, with a clear thread and an ending; not a syllabus with homework. ' +
      'Every item must name one source from INPUT.sources, INPUT.droppedSources or INPUT.droppedSource by its id; never invent a source, a URL or a fact about a source.',
    prompt:
      'TASK: Plan a track of exactly INPUT.length items on INPUT.subject for INPUT.audience, as INPUT.trackKind. ' +
      'Use only INPUT.sources (each has id, title, kind, license and a snippet or its section headings); leave out any source that is off the subject. ' +
      'Item kinds: page (one idea from an article), reading (a passage quoted exactly, only from a source of kind wikisource or gutenberg; when the track is about poems, stories or a book, most items are readings), ' +
      'visual (a painting, photograph, map or diagram to look at closely, when the subject has something worth seeing; give imageQuery), exercise (only where a puzzle or prompt genuinely helps; most tracks have one or none). ' +
      'When a work is in INPUT.sources both as its own text (kind wikisource or gutenberg) and as a Wikipedia article about it, an item about that work is a reading from its text; the article can carry a page on something else. ' +
      'A track reads best with some variety: use a reading or a visual wherever the sources and the subject allow one. ' +
      'Give a page an imageQuery too: a short image search, the words for one strong, specific picture of what the item is about (no site name). ' +
      'For a light course, order items so understanding builds and the last one is a real ending. ' +
      'When INPUT.droppedSource is present, walk it in its own order: one or more items per section, sections named after its headings, locator = the heading. ' +
      'INPUT.droppedSources are the family\'s own sources: use each that is on the subject, walking it in its own order (locator = the heading); with INPUT.sources as well, weave them in by subject. ' +
      'Group a course into sections only when it helps (parentKey makes a subsection); a theme usually has none. ' +
      'FORMAT: {"title":"<track title>","description":"<one or two sentences>","sections":[{"key":"<k>","title":"<t>","parentKey":"<optional>"}],' +
      '"items":[{"title":"<item title>","kind":"page|reading|visual|exercise","sourceId":"<id>","locator":"<section or chapter, optional>",' +
      '"angle":"<one line on what this item covers>","imageQuery":"<optional>","sectionKey":"<optional>"}]}; INPUT:',
  },
  trackWrite: {
    system:
      'You write one item of a learning track for Kindredly. Respond ONLY with a JSON object. ' +
      'Write only from INPUT.sourceText; never from memory, and never add a fact the source does not state. ' +
      'The reader never sees the source: never mention "the source" or "this account", or say what it leaves out; when it does not give something, leave that thing out. ' +
      'INPUT.voice.sample is the exemplar: match its voice as closely as you can. It matters more than any rule here. ' +
      'Clear, warm, curious, never patronising. Concrete beats abstract; one specific example beats a general claim. ' +
      'Open with a hook that is true, not clickbait, and end at a deliberate stopping point. Each item is a satisfying session even when the track continues. ' +
      'How the best items are built. The opening follows INPUT.voice.description: Story first opens on one specific moment from the source (who, where, when), or, when the source has none, on one concrete thing a reader can picture; ' +
      'Straight to the point states the idea in one plain sentence, then gives its most striking evidence at once; Friendly and curious talks to the reader about one specific thing. ' +
      'Never open on a general statement about the subject, a definition, or "Imagine". ' +
      'Carry the idea with one or two well-chosen specifics from the source (a name, a place, a number, a quotation), not a list of them: a reader remembers one striking figure, not five. ' +
      'Use words the audience knows; explain a technical term in the sentence where it first appears. ' +
      'The last sentence lands on something concrete from the source (a consequence, an image, a fact that turns the idea around), never a summary or a claim about why it matters.',
    prompt:
      'TASK: Write INPUT.item (its kind, title, angle and locator) from INPUT.sourceText, for INPUT.audience. ' +
      'The body is INPUT.words.min to INPUT.words.max words (INPUT.kindGuide): a body shorter than INPUT.words.min leaves the reader short-changed, so develop the one idea with the source\'s own specifics until it is. ' +
      'A light course item after the first opens with a recap: one sentence picking up from INPUT.previous. A theme item assumes nothing and has no recap. ' +
      'Avoid: INPUT.avoid. Use markdown for the body (paragraphs, occasional emphasis); no headings, no bullet lists unless the source is a list. ' +
      'For a reading, do not type the passage: give passageStart and passageEnd, the first and last few words of the passage exactly as they appear in the source, and write the framing as the body and the line or two after as passageAfter. ' +
      'INPUT.images are pictures found for this item, each with what it shows: set image to the id of the one that shows what this item is about, or "none" when none of them does; a picture of something else is worse than no picture. ' +
      'For a visual, write about the image you chose: teach the reader to look at what it shows, and describe nothing it does not show. ' +
      'For an exercise, put the answer or a reflection in answer. Add a check (one multiple choice or true/false question with an explanation) only when it genuinely helps; most items have none. ' +
      'When INPUT.revise is present, rewrite the item so that every note in INPUT.revise.notes is answered: each note is a change to make, not a suggestion. ' +
      'A note about the opening means a new first sentence; a note about the ending means a new last sentence; a note about a word means explaining or replacing it. ' +
      'Keep what no note mentions, and keep the body within INPUT.words. ' +
      'FORMAT: {"title":"<title>","recap":"<course items after the first only>","body":"<markdown>","passageStart":"<reading only>","passageEnd":"<reading only>",' +
      '"passageSource":"<reading only: whose words and the work, e.g. Charles Dickens, Great Expectations (1861)>","passageLocator":"<reading only, optional>","passageAfter":"<reading only, optional>",' +
      '"answer":"<exercise only>","check":{"type":"multiple_choice|true_false","prompt":"<q>","choices":["<a>","<b>"],"correctIndex":<n>,"correct":<true|false>,"explanation":"<why>"},' +
      '"image":"<the id of the chosen INPUT.images picture, or none>","summary":"<one sentence: what the reader now understands>"}; INPUT:',
  },
  trackCritic: {
    system:
      'You are the critic for a learning track. You did not write the item. Respond ONLY with a JSON object. ' +
      'Score each criterion 1–5 honestly: 5 only when there is nothing to improve, 3 when a reader would notice the problem. ' +
      'Check every factual claim against INPUT.sourceText; a claim the source does not support scores tracedToSource 2 or lower. ' +
      'The recap restates the item before (INPUT.previous), so it is judged for picking up cleanly, not against INPUT.sourceText. ' +
      'Judge the voice against INPUT.voice.sample. For a visual, INPUT.item.imageShows is the image beside the text: text about anything else fails oneIdea.',
    prompt:
      'TASK: Score INPUT.item (INPUT.title, its recap, body and any passage) on each of INPUT.criteria, for INPUT.audience, as item INPUT.position of a INPUT.trackKind. ' +
      'For each score below 5, write one short, specific note saying what to change. ' +
      'FORMAT: {"scores":{"keepsReading":<1-5>,"oneIdea":<1-5>,"standsAloneOrFollows":<1-5>,"satisfyingEnd":<1-5>,"tracedToSource":<1-5>,"voice":<1-5>},' +
      '"notes":["<note>"],"unsupportedClaims":["<a claim the source does not support>"]}; INPUT:',
  },
};

// ---------------------------------------------------------------------------
// Request estimate
// ---------------------------------------------------------------------------

/**
 * AI requests each call uses on GPT-6 Luna: the syllabus, writing an item, and the critic's check.
 * Measured against one request's size (about 6,000 input and 800 output tokens): an item's call
 * reads a source excerpt and the voice sample and writes a few hundred words.
 */
export const TRACK_REQUESTS_AT_FAST = { syllabus: 1, write: 1, critique: 1 };
/** About a quarter of items need an improve round (a rewrite and another check). */
export const TRACK_EXPECTED_IMPROVE_SHARE = 0.25;

/** About how many AI requests making a track uses, on a model `multiple` times GPT-6 Luna's. */
export function estimateTrackRequests(options: { items: number; multiple?: number }): number {
  const items = Math.max(0, Math.round(options.items));
  const multiple = options.multiple && options.multiple > 0 ? options.multiple : 1;
  const perItem = TRACK_REQUESTS_AT_FAST.write + TRACK_REQUESTS_AT_FAST.critique;
  const improve = items * TRACK_EXPECTED_IMPROVE_SHARE * (TRACK_REQUESTS_AT_FAST.write + TRACK_REQUESTS_AT_FAST.critique);
  const raw = (TRACK_REQUESTS_AT_FAST.syllabus + items * perItem + improve) * multiple;
  // A round number: an estimate that reads as exact would be a claim we can't make.
  return raw < 20 ? Math.max(1, Math.round(raw)) : Math.round(raw / 5) * 5;
}
