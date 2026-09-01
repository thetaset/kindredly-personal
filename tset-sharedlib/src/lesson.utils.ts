import type { ItemDetailsInfo } from './types/item.types';

// Lesson item support. A "lesson" item is a self-contained, Khan-Academy-style
// mini-course stored on ONE library item: an ordered list of steps the learner
// works through (content / quiz), scored at the end with retry.
//
// Storage model:
//   - The lesson DEFINITION lives in `info.schemas['kindredly.lesson.v1']`, which
//     is E2E-encrypted at rest (personal path). Content is text or `attachmentId`
//     refs only — never inline media bytes (big media rides item attachments).
//   - Per-user PROGRESS/scores live separately in `ref_state` (see
//     LessonProgressRefStateService), not in the schema.
//
// Security: `getLessonSchemaV1` re-validates the whole structure on every read
// (the security boundary), dropping malformed steps/questions rather than
// trusting persisted data — mirroring `getMapEmbedSchemaV1`.

export const LESSON_SCHEMA_ID = 'kindredly.lesson.v1';

export type LessonGradeBand = 'early' | 'elementary' | 'middle' | 'high' | 'adult';

/** Points at an Item.attachments.entries[].id (personal path) OR an external URL (embeds / official). */
export interface LessonMediaRef {
  kind: 'image' | 'video' | 'audio' | 'file';
  /** Item attachment id (personal media). Omitted for external embeds. */
  attachmentId?: string;
  mimeType?: string;
  previewAttachmentId?: string | null;
  /** Caption / alt text. */
  alt?: string;
  /** Used only when `attachmentId` is absent (e.g. a YouTube video). */
  externalUrl?: string;
  provider?: 'youtube' | 'url';
}

// ---- Steps: discriminated union on `kind` ----

export type LessonStepKind = 'section' | 'content' | 'quiz';

/**
 * Conditional branch rule (schema-ready seam). The linear v1 player IGNORES
 * these and walks steps by `order`; a future branch-aware player consumes them.
 */
export interface LessonNextRule {
  when?: 'always' | 'passed' | 'failed' | 'answered';
  /** Quiz step key the condition refers to. */
  quizKey?: string;
  /** 0..1 score gate for `passed`/`failed`. */
  minScore?: number;
  goToStepKey: string;
}

interface LessonStepBase {
  /** Stable, unique-in-lesson id. THIS is the progress pointer key. */
  key: string;
  /** Explicit ordering (analog of subscription work-through order). */
  order: number;
  kind: LessonStepKind;
  title?: string;
  /** Branch seam — ignored by the linear v1 player. */
  next?: LessonNextRule[];
  /** "Go deeper" side-content seam (depth>0 = optional branch off `parentKey`). */
  meta?: { depth?: number; parentKey?: string; [k: string]: unknown };
}

export interface LessonSectionStep extends LessonStepBase {
  kind: 'section';
  /** Optional markdown intro under the section header. */
  body?: string;
}

export interface LessonContentStep extends LessonStepBase {
  kind: 'content';
  /** Markdown body. */
  body: string;
  media?: LessonMediaRef[];
}

export interface LessonQuizStep extends LessonStepBase {
  kind: 'quiz';
  /** Optional markdown shown above the question(s). */
  prompt?: string;
  /** Usually 1; question-groups supported. */
  questions: LessonQuestion[];
  /** Per-quiz override of the lesson default (null/undefined = unlimited). */
  maxAttempts?: number | null;
  /** 0..1 pass gate for this quiz; falls back to scoring.passThreshold. */
  passThreshold?: number;
}

export type LessonStep = LessonSectionStep | LessonContentStep | LessonQuizStep;

// ---- Questions: discriminated union on `type` (all four kinds) ----

export type LessonQuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'free_response' | 'flashcard';

export interface LessonChoice {
  key: string;
  text: string;
  media?: LessonMediaRef[];
}

interface LessonQuestionBase {
  /** Stable, unique-in-lesson id. */
  key: string;
  type: LessonQuestionType;
  /** Markdown prompt. */
  prompt: string;
  media?: LessonMediaRef[];
  /** Shown after answering — the "why". */
  explanation?: string;
  /** Static hint in v1 (a live-tutor seam). */
  hint?: string;
  /** Weight; default 1. */
  points?: number;
}

export interface LessonMultipleChoiceQuestion extends LessonQuestionBase {
  type: 'multiple_choice';
  choices: LessonChoice[];
  /** false = single (radio); true = multi (checkbox). */
  multiSelect: boolean;
  /** 1 key for single-select, N for multi-select. */
  correctChoiceKeys: string[];
  shuffleChoices?: boolean;
}

export interface LessonTrueFalseQuestion extends LessonQuestionBase {
  type: 'true_false';
  correct: boolean;
}

export interface LessonShortAnswerQuestion extends LessonQuestionBase {
  type: 'short_answer';
  /** Any-of acceptable answers. */
  acceptableAnswers: string[];
  matchMode: 'exact' | 'normalized' | 'fuzzy';
  /** Levenshtein tolerance for 'fuzzy' (default 2). */
  fuzzyMaxDistance?: number;
  /** Default false. */
  caseSensitive?: boolean;
  /** Hard-false in v1 (a consume-time AI-grading seam). */
  aiGraded?: false;
}

/**
 * Open-ended question graded by the model against a reference answer + rubric
 * (not string matching). The player calls the grade endpoint at answer time and
 * shows a score + written feedback.
 */
export interface LessonFreeResponseQuestion extends LessonQuestionBase {
  type: 'free_response';
  /** Reference / model answer the grader compares against. */
  sampleAnswer: string;
  /** What a strong answer should include (grading criteria). */
  rubric?: string;
  minWords?: number;
}

export interface LessonFlashcardQuestion extends LessonQuestionBase {
  type: 'flashcard';
  front: string;
  back: string;
  /** Self-graded got-it/missed in v1 ('auto' is a future seam). */
  gradeMode: 'self';
}

export type LessonQuestion =
  | LessonMultipleChoiceQuestion
  | LessonTrueFalseQuestion
  | LessonShortAnswerQuestion
  | LessonFreeResponseQuestion
  | LessonFlashcardQuestion;

// ---- Retry / scoring ----

export interface LessonScoringConfig {
  /** null = unlimited retries. */
  maxAttempts?: number | null;
  keepBestScore: boolean;
  showScoreEachAttempt: boolean;
  /** 0..1 whole-lesson pass gate. */
  passThreshold: number;
  revealAnswersAfter: 'each_question' | 'each_quiz' | 'end' | 'never';
}

export const DEFAULT_LESSON_SCORING: LessonScoringConfig = {
  maxAttempts: null,
  keepBestScore: true,
  showScoreEachAttempt: true,
  passThreshold: 0.7,
  revealAnswersAfter: 'each_question',
};

// ---- Sources (grounding / citation; mirrors feed sourceInfo) ----

export interface LessonSourceRef {
  kind: 'wikipedia' | 'gutenberg' | 'url' | 'library_item' | 'library_attachment';
  url?: string;
  title?: string;
  itemId?: string;
  attachmentId?: string;
  retrievedAt?: string;
  licenseNote?: string;
}

export interface LessonSchemaV1 {
  schemaVersion: 1;
  schemaId: typeof LESSON_SCHEMA_ID;
  meta: {
    title: string;
    subtitle?: string;
    objectives?: string[];
    estMinutes?: number;
    gradeBand?: LessonGradeBand;
    subject?: string;
    tone?: string;
    coverMedia?: LessonMediaRef;
  };
  scoring: LessonScoringConfig;
  /** The linear player walks these by `order`. */
  steps: LessonStep[];
  sources?: LessonSourceRef[];
  generatedBy?: { kind: 'manual' | 'ai_personal' | 'ai_official'; model?: string; at?: number };
}

/** A submitted answer, shaped per question type. */
export type LessonAnswerValue = string[] | boolean | string;

// ---------------------------------------------------------------------------
// Read / write on info.schemas (mirrors setMapEmbedSchemaOnInfo / getMapEmbedSchemaV1)
// ---------------------------------------------------------------------------

/** Write a lesson schema into an item's `info.schemas`, mirroring setMapEmbedSchemaOnInfo. */
export function setLessonSchemaOnInfo(
  info: ItemDetailsInfo | null | undefined,
  schema: LessonSchemaV1,
): ItemDetailsInfo {
  const schemas =
    info?.schemas && typeof info.schemas === 'object' && !Array.isArray(info.schemas) ? info.schemas : {};

  return {
    ...(info || {}),
    schemas: {
      ...schemas,
      [LESSON_SCHEMA_ID]: schema,
    },
  };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function sanitizeMediaRef(raw: unknown): LessonMediaRef | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Partial<LessonMediaRef>;
  if (m.kind !== 'image' && m.kind !== 'video' && m.kind !== 'audio' && m.kind !== 'file') return null;
  // Must resolve to SOMETHING renderable: an attachment or an external url.
  if (!isNonEmptyString(m.attachmentId) && !isNonEmptyString(m.externalUrl)) return null;
  const out: LessonMediaRef = { kind: m.kind };
  if (isNonEmptyString(m.attachmentId)) out.attachmentId = m.attachmentId;
  if (isNonEmptyString(m.externalUrl)) out.externalUrl = m.externalUrl;
  if (isNonEmptyString(m.mimeType)) out.mimeType = m.mimeType;
  if (isNonEmptyString(m.previewAttachmentId)) out.previewAttachmentId = m.previewAttachmentId;
  if (isNonEmptyString(m.alt)) out.alt = m.alt;
  if (m.provider === 'youtube' || m.provider === 'url') out.provider = m.provider;
  return out;
}

function sanitizeMediaList(raw: unknown): LessonMediaRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.map(sanitizeMediaRef).filter((m): m is LessonMediaRef => !!m);
  return list.length ? list : undefined;
}

function sanitizeQuestion(raw: unknown): LessonQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Partial<LessonQuestion> & { type?: string };
  if (!isNonEmptyString(q.key) || !isNonEmptyString(q.prompt)) return null;

  const base: LessonQuestionBase = {
    key: q.key,
    type: q.type as LessonQuestionType,
    prompt: q.prompt,
  };
  if (isNonEmptyString((q as LessonQuestionBase).explanation)) base.explanation = (q as LessonQuestionBase).explanation;
  if (isNonEmptyString((q as LessonQuestionBase).hint)) base.hint = (q as LessonQuestionBase).hint;
  const media = sanitizeMediaList((q as LessonQuestionBase).media);
  if (media) base.media = media;
  const points = (q as LessonQuestionBase).points;
  if (typeof points === 'number' && points > 0) base.points = points;

  switch (q.type) {
    case 'multiple_choice': {
      const mc = q as Partial<LessonMultipleChoiceQuestion>;
      if (!Array.isArray(mc.choices)) return null;
      const choices: LessonChoice[] = mc.choices
        .map((c) => {
          if (!c || typeof c !== 'object') return null;
          const cc = c as Partial<LessonChoice>;
          if (!isNonEmptyString(cc.key) || typeof cc.text !== 'string') return null;
          const media = sanitizeMediaList(cc.media);
          return { key: cc.key, text: cc.text, ...(media ? { media } : {}) } as LessonChoice;
        })
        .filter((c): c is LessonChoice => !!c);
      if (choices.length < 2) return null;
      const choiceKeys = new Set(choices.map((c) => c.key));
      const correct = Array.isArray(mc.correctChoiceKeys)
        ? mc.correctChoiceKeys.filter((k) => isNonEmptyString(k) && choiceKeys.has(k))
        : [];
      if (correct.length < 1) return null; // must have at least one valid correct answer
      return {
        ...base,
        type: 'multiple_choice',
        choices,
        multiSelect: mc.multiSelect === true,
        correctChoiceKeys: correct,
        ...(mc.shuffleChoices === true ? { shuffleChoices: true } : {}),
      };
    }
    case 'true_false': {
      const tf = q as Partial<LessonTrueFalseQuestion>;
      if (typeof tf.correct !== 'boolean') return null;
      return { ...base, type: 'true_false', correct: tf.correct };
    }
    case 'short_answer': {
      const sa = q as Partial<LessonShortAnswerQuestion>;
      const answers = Array.isArray(sa.acceptableAnswers)
        ? sa.acceptableAnswers.filter(isNonEmptyString)
        : [];
      if (answers.length < 1) return null;
      const matchMode =
        sa.matchMode === 'exact' || sa.matchMode === 'fuzzy' ? sa.matchMode : 'normalized';
      return {
        ...base,
        type: 'short_answer',
        acceptableAnswers: answers,
        matchMode,
        ...(typeof sa.fuzzyMaxDistance === 'number' ? { fuzzyMaxDistance: sa.fuzzyMaxDistance } : {}),
        ...(sa.caseSensitive === true ? { caseSensitive: true } : {}),
        aiGraded: false,
      };
    }
    case 'free_response': {
      const fr = q as Partial<LessonFreeResponseQuestion>;
      if (!isNonEmptyString(fr.sampleAnswer)) return null;
      return {
        ...base,
        type: 'free_response',
        sampleAnswer: fr.sampleAnswer,
        ...(isNonEmptyString(fr.rubric) ? { rubric: fr.rubric } : {}),
        ...(typeof fr.minWords === 'number' && fr.minWords > 0 ? { minWords: fr.minWords } : {}),
      };
    }
    case 'flashcard': {
      const fc = q as Partial<LessonFlashcardQuestion>;
      if (!isNonEmptyString(fc.front) || !isNonEmptyString(fc.back)) return null;
      return { ...base, type: 'flashcard', front: fc.front, back: fc.back, gradeMode: 'self' };
    }
    default:
      return null;
  }
}

function sanitizeStep(raw: unknown): LessonStep | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<LessonStep> & { kind?: string };
  if (!isNonEmptyString(s.key)) return null;
  const order = typeof s.order === 'number' && Number.isFinite(s.order) ? s.order : 0;

  const base = {
    key: s.key,
    order,
    ...(isNonEmptyString(s.title) ? { title: s.title } : {}),
    ...(Array.isArray(s.next) ? { next: s.next.filter((n) => n && isNonEmptyString((n as LessonNextRule).goToStepKey)) as LessonNextRule[] } : {}),
    ...(s.meta && typeof s.meta === 'object' && !Array.isArray(s.meta) ? { meta: s.meta as LessonStep['meta'] } : {}),
  };

  switch (s.kind) {
    case 'section':
      return {
        ...base,
        kind: 'section',
        ...(isNonEmptyString((s as LessonSectionStep).body) ? { body: (s as LessonSectionStep).body } : {}),
      };
    case 'content': {
      const cs = s as Partial<LessonContentStep>;
      if (typeof cs.body !== 'string') return null;
      const media = sanitizeMediaList(cs.media);
      return { ...base, kind: 'content', body: cs.body, ...(media ? { media } : {}) };
    }
    case 'quiz': {
      const qs = s as Partial<LessonQuizStep>;
      const questions = Array.isArray(qs.questions)
        ? qs.questions.map(sanitizeQuestion).filter((x): x is LessonQuestion => !!x)
        : [];
      if (questions.length < 1) return null;
      return {
        ...base,
        kind: 'quiz',
        ...(isNonEmptyString(qs.prompt) ? { prompt: qs.prompt } : {}),
        questions,
        ...(qs.maxAttempts === null || typeof qs.maxAttempts === 'number' ? { maxAttempts: qs.maxAttempts } : {}),
        ...(typeof qs.passThreshold === 'number' ? { passThreshold: qs.passThreshold } : {}),
      };
    }
    default:
      return null;
  }
}

function sanitizeScoring(raw: unknown): LessonScoringConfig {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<LessonScoringConfig>;
  const reveal =
    s.revealAnswersAfter === 'each_quiz' ||
    s.revealAnswersAfter === 'end' ||
    s.revealAnswersAfter === 'never'
      ? s.revealAnswersAfter
      : 'each_question';
  return {
    maxAttempts: s.maxAttempts === null || typeof s.maxAttempts === 'number' ? s.maxAttempts : null,
    keepBestScore: s.keepBestScore !== false,
    showScoreEachAttempt: s.showScoreEachAttempt !== false,
    passThreshold:
      typeof s.passThreshold === 'number' && s.passThreshold >= 0 && s.passThreshold <= 1
        ? s.passThreshold
        : DEFAULT_LESSON_SCORING.passThreshold,
    revealAnswersAfter: reveal,
  };
}

/**
 * Read and validate a lesson schema. Re-validates the whole structure on every
 * read (the security boundary): drops malformed steps/questions rather than
 * trusting persisted data; returns null when no valid steps remain.
 */
/**
 * Validate a raw lesson-schema object (the security boundary). Drops malformed
 * steps/questions; returns null when no valid steps remain. Used both when
 * reading a persisted item and when validating freshly AI-generated output.
 */
export function parseLessonSchemaV1(raw: unknown): LessonSchemaV1 | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const schema = raw as Partial<LessonSchemaV1>;
  if (schema.schemaVersion !== 1) return null;

  const stepsRaw = Array.isArray(schema.steps) ? schema.steps : [];
  const steps = stepsRaw.map(sanitizeStep).filter((s): s is LessonStep => !!s);
  if (steps.length === 0) return null;

  const meta = (schema.meta && typeof schema.meta === 'object' ? schema.meta : {}) as LessonSchemaV1['meta'];

  return {
    schemaVersion: 1,
    schemaId: LESSON_SCHEMA_ID,
    meta: { ...meta, title: isNonEmptyString(meta.title) ? meta.title : 'Untitled lesson' },
    scoring: sanitizeScoring(schema.scoring),
    steps,
    ...(Array.isArray(schema.sources) ? { sources: schema.sources as LessonSourceRef[] } : {}),
    ...(schema.generatedBy ? { generatedBy: schema.generatedBy } : {}),
  };
}

export function getLessonSchemaV1(
  source:
    | {
        info?: ItemDetailsInfo | null;
        details?: { info?: ItemDetailsInfo | null } | null;
      }
    | null
    | undefined,
): LessonSchemaV1 | null {
  const raw =
    source?.info?.schemas?.[LESSON_SCHEMA_ID] || source?.details?.info?.schemas?.[LESSON_SCHEMA_ID];
  return parseLessonSchemaV1(raw);
}

/** A blank lesson skeleton for the builder's "start from scratch" path. */
export function makeEmptyLesson(title = 'Untitled lesson'): LessonSchemaV1 {
  return {
    schemaVersion: 1,
    schemaId: LESSON_SCHEMA_ID,
    meta: { title },
    scoring: { ...DEFAULT_LESSON_SCORING },
    steps: [],
    generatedBy: { kind: 'manual' },
  };
}

// ---------------------------------------------------------------------------
// Ordering + grading (pure; shared by the player and generator validation)
// ---------------------------------------------------------------------------

/** Steps in play order (by `order`, stable on ties). */
export function getOrderedSteps(schema: LessonSchemaV1): LessonStep[] {
  return schema.steps
    .map((step, idx) => ({ step, idx }))
    .sort((a, b) => a.step.order - b.step.order || a.idx - b.idx)
    .map((x) => x.step);
}

export function normalizeForMatch(value: string, caseSensitive = false): string {
  let v = value.trim().replace(/\s+/g, ' ');
  if (!caseSensitive) v = v.toLowerCase();
  // Fold common punctuation so "color." matches "color".
  v = v.replace(/[.,!?;:"'`]/g, '');
  return v;
}

/** Standard Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export interface QuestionGrade {
  correct: boolean;
  earned: number;
  points: number;
  /** free_response awaiting an AI grade (no aiResult supplied). */
  needsAiGrading?: boolean;
}

/** Result of grading an open response with the model (score is 0..1). */
export interface AiGradeResult {
  score: number;
  correct?: boolean;
  feedback?: string;
}

/**
 * Grade one question against a submitted answer. Unanswered → incorrect.
 * For `free_response`, pass `aiResult` (from the grade endpoint); without it the
 * question is flagged `needsAiGrading`.
 */
export function gradeQuestion(
  q: LessonQuestion,
  submitted: LessonAnswerValue | undefined,
  aiResult?: AiGradeResult,
): QuestionGrade {
  const points = typeof q.points === 'number' && q.points > 0 ? q.points : 1;
  const wrong: QuestionGrade = { correct: false, earned: 0, points };
  const right: QuestionGrade = { correct: true, earned: points, points };

  switch (q.type) {
    case 'free_response': {
      if (!aiResult) {
        if (typeof submitted !== 'string' || !submitted.trim()) return wrong;
        return { correct: false, earned: 0, points, needsAiGrading: true };
      }
      const clamped = Math.max(0, Math.min(1, aiResult.score));
      const earned = Math.round(clamped * points * 100) / 100;
      return { correct: aiResult.correct ?? clamped >= 0.6, earned, points };
    }
    case 'multiple_choice': {
      const picked = Array.isArray(submitted) ? submitted.filter((s): s is string => typeof s === 'string') : [];
      const want = new Set(q.correctChoiceKeys);
      const got = new Set(picked);
      if (want.size !== got.size) return wrong;
      for (const k of want) if (!got.has(k)) return wrong;
      return right;
    }
    case 'true_false':
      return submitted === q.correct ? right : wrong;
    case 'short_answer': {
      if (typeof submitted !== 'string' || !submitted.trim()) return wrong;
      const caseSensitive = q.caseSensitive === true;
      for (const ans of q.acceptableAnswers) {
        if (q.matchMode === 'exact') {
          if (caseSensitive ? submitted.trim() === ans.trim() : submitted.trim().toLowerCase() === ans.trim().toLowerCase())
            return right;
        } else if (q.matchMode === 'fuzzy') {
          const dist = levenshtein(normalizeForMatch(submitted, caseSensitive), normalizeForMatch(ans, caseSensitive));
          if (dist <= (typeof q.fuzzyMaxDistance === 'number' ? q.fuzzyMaxDistance : 2)) return right;
        } else {
          // normalized
          if (normalizeForMatch(submitted, caseSensitive) === normalizeForMatch(ans, caseSensitive)) return right;
        }
      }
      return wrong;
    }
    case 'flashcard':
      // Self-graded: the learner reports got-it (true) / missed (false).
      return submitted === true ? right : wrong;
    default:
      return wrong;
  }
}

export interface QuizScore {
  earned: number;
  total: number;
  pct: number;
  perQuestion: Array<{ key: string; correct: boolean; earned: number; points: number; needsAiGrading?: boolean }>;
}

/**
 * Score a quiz step. `aiResults` supplies model grades for free_response
 * questions (keyed by question key).
 */
export function scoreQuiz(
  step: LessonQuizStep,
  answers: Record<string, LessonAnswerValue | undefined>,
  aiResults?: Record<string, AiGradeResult | undefined>,
): QuizScore {
  const perQuestion = step.questions.map((q) => {
    const g = gradeQuestion(q, answers[q.key], aiResults?.[q.key]);
    return { key: q.key, correct: g.correct, earned: g.earned, points: g.points, needsAiGrading: g.needsAiGrading };
  });
  const earned = perQuestion.reduce((s, x) => s + x.earned, 0);
  const total = perQuestion.reduce((s, x) => s + x.points, 0);
  return { earned, total, pct: total > 0 ? earned / total : 0, perQuestion };
}

export interface LessonScore {
  earned: number;
  total: number;
  pct: number;
  passed: boolean;
  perQuiz: Array<{ stepKey: string } & QuizScore>;
}

/**
 * Aggregate score across every quiz step. `answersByQuiz` and `aiResultsByQuiz`
 * are keyed by quiz step key, then by question key.
 */
export function scoreLesson(
  schema: LessonSchemaV1,
  answersByQuiz: Record<string, Record<string, LessonAnswerValue | undefined>>,
  aiResultsByQuiz?: Record<string, Record<string, AiGradeResult | undefined>>,
): LessonScore {
  const quizzes = schema.steps.filter((s): s is LessonQuizStep => s.kind === 'quiz');
  const perQuiz = quizzes.map((step) => ({
    stepKey: step.key,
    ...scoreQuiz(step, answersByQuiz[step.key] || {}, aiResultsByQuiz?.[step.key]),
  }));
  const earned = perQuiz.reduce((s, x) => s + x.earned, 0);
  const total = perQuiz.reduce((s, x) => s + x.total, 0);
  const pct = total > 0 ? earned / total : 0;
  return { earned, total, pct, passed: pct >= schema.scoring.passThreshold, perQuiz };
}

// ---------------------------------------------------------------------------
// AI generation (Phase A) — request/response contract + a normalizer that maps
// the loose JSON a model emits into the strict schema (assigning keys/order),
// which is then re-validated by getLessonSchemaV1.
// ---------------------------------------------------------------------------

/** A source for AI generation: a fetchable URL (server-fetched) or inline text (client-supplied, e.g. a library item). */
export type LessonGenSource =
  | { kind: 'wikipedia' | 'gutenberg' | 'url'; url: string; title?: string }
  | { kind: 'inline'; title?: string; text: string };

export interface LessonGenRequest {
  topic: string;
  gradeBand?: LessonGradeBand;
  objectives?: string[];
  /** Depth preset id (see LESSON_DEPTH_PRESETS) — drives length & rigor. */
  depth?: string;
  /** Style preset id (see LESSON_STYLE_PRESETS) — drives pedagogy & assessment. */
  style?: string;
  /** Number of teaching (content) steps to aim for (overrides depth default). */
  stepCount?: number;
  /** Total number of quiz questions to aim for (overrides depth default). */
  questionCount?: number;
  /** Which question types the model may use. */
  questionTypes?: LessonQuestionType[];
  tone?: string;
  /** Freeform extra guidance from the author. */
  extraInstructions?: string;
  /** Let the server find a Wikipedia article for the topic when no source covers it. */
  autoDiscover?: boolean;
  sources?: LessonGenSource[];
  /** Allowlisted model override. */
  model?: string;
}

/** Result of grading one free-response answer with the model. */
export interface LessonGradeRequest {
  prompt: string;
  sampleAnswer: string;
  rubric?: string;
  learnerAnswer: string;
  gradeBand?: LessonGradeBand;
  model?: string;
}
export interface LessonGradeResponse {
  score: number; // 0..1
  correct: boolean;
  feedback: string;
}

export interface LessonGenResponse {
  /** A draft lesson (plaintext) for the builder to review/edit before saving. */
  lesson: LessonSchemaV1;
  sources: LessonSourceRef[];
  warnings: string[];
}

function normalizeGeneratedQuestion(q: any, key: string): LessonQuestion | null {
  const prompt = typeof q?.prompt === 'string' ? q.prompt : '';
  const explanation = typeof q?.explanation === 'string' ? q.explanation : undefined;
  switch (q?.type) {
    case 'multiple_choice': {
      const rawChoices = Array.isArray(q?.choices) ? q.choices : [];
      const choices: LessonChoice[] = rawChoices.map((c: any, ci: number) => ({
        key: `c${ci}`,
        text: typeof c === 'string' ? c : typeof c?.text === 'string' ? c.text : '',
      }));
      const correctIdx: number[] = Array.isArray(q?.correctIndexes)
        ? q.correctIndexes
        : typeof q?.correctIndex === 'number'
          ? [q.correctIndex]
          : [];
      const correctChoiceKeys = correctIdx.map((n: number) => choices[n]?.key).filter((k): k is string => !!k);
      return { key, type: 'multiple_choice', prompt, explanation, choices, multiSelect: q?.multiSelect === true, correctChoiceKeys };
    }
    case 'true_false':
      return { key, type: 'true_false', prompt, explanation, correct: q?.correct === true };
    case 'short_answer': {
      const answers = Array.isArray(q?.answers)
        ? q.answers.filter((x: any) => typeof x === 'string')
        : typeof q?.answer === 'string'
          ? [q.answer]
          : [];
      return { key, type: 'short_answer', prompt, explanation, acceptableAnswers: answers, matchMode: 'normalized', aiGraded: false };
    }
    case 'free_response':
      return {
        key,
        type: 'free_response',
        prompt,
        explanation,
        sampleAnswer: typeof q?.sampleAnswer === 'string' ? q.sampleAnswer : typeof q?.answer === 'string' ? q.answer : '',
        rubric: typeof q?.rubric === 'string' ? q.rubric : undefined,
        minWords: typeof q?.minWords === 'number' ? q.minWords : undefined,
      };
    case 'flashcard':
      return {
        key,
        type: 'flashcard',
        prompt: prompt || (typeof q?.front === 'string' ? q.front : ''),
        explanation,
        front: typeof q?.front === 'string' ? q.front : '',
        back: typeof q?.back === 'string' ? q.back : '',
        gradeMode: 'self',
      };
    default:
      return null;
  }
}

/**
 * Map the loose JSON a model emits (steps of `type` content|section|quiz;
 * questions with `correctIndexes`/`answers`) into a strict LessonSchemaV1,
 * assigning stable keys + order. Callers should still pass the result through
 * getLessonSchemaV1 for final validation.
 */
export function normalizeGeneratedLesson(
  raw: any,
  opts?: { gradeBand?: LessonGradeBand; sources?: LessonSourceRef[]; model?: string; atMs?: number },
): LessonSchemaV1 {
  const rawSteps = Array.isArray(raw?.steps) ? raw.steps : [];
  const steps: LessonStep[] = [];
  rawSteps.forEach((rs: any, i: number) => {
    const key = `s${i}`;
    const title = typeof rs?.title === 'string' ? rs.title : undefined;
    const mediaHint = typeof rs?.mediaHint === 'string' && rs.mediaHint.trim() ? rs.mediaHint.trim() : undefined;
    const meta = mediaHint ? { mediaHint } : undefined;
    if (rs?.type === 'quiz') {
      const rq = Array.isArray(rs?.questions) ? rs.questions : [];
      const questions = rq
        .map((q: any, qi: number) => normalizeGeneratedQuestion(q, `${key}_q${qi}`))
        .filter((q: LessonQuestion | null): q is LessonQuestion => !!q);
      if (questions.length) steps.push({ key, order: i, kind: 'quiz', title, questions, ...(meta ? { meta } : {}) });
    } else if (rs?.type === 'section') {
      steps.push({ key, order: i, kind: 'section', title, body: typeof rs?.body === 'string' ? rs.body : undefined, ...(meta ? { meta } : {}) });
    } else {
      steps.push({ key, order: i, kind: 'content', title, body: typeof rs?.body === 'string' ? rs.body : '', ...(meta ? { meta } : {}) });
    }
  });

  return {
    schemaVersion: 1,
    schemaId: LESSON_SCHEMA_ID,
    meta: {
      title: typeof raw?.title === 'string' && raw.title ? raw.title : 'Untitled lesson',
      subtitle: typeof raw?.subtitle === 'string' ? raw.subtitle : undefined,
      objectives: Array.isArray(raw?.objectives) ? raw.objectives.filter((x: any) => typeof x === 'string') : undefined,
      gradeBand: opts?.gradeBand,
    },
    scoring: { ...DEFAULT_LESSON_SCORING },
    steps,
    sources: opts?.sources,
    generatedBy: { kind: 'ai_personal', model: opts?.model, at: opts?.atMs },
  };
}

/** Progress fraction (0..1) given the last completed step key. */
export function computeProgressPct(schema: LessonSchemaV1, completedThroughKey: string | null | undefined): number {
  const ordered = getOrderedSteps(schema);
  if (ordered.length === 0) return 0;
  if (!completedThroughKey) return 0;
  const idx = ordered.findIndex((s) => s.key === completedThroughKey);
  if (idx < 0) return 0;
  return Math.min(1, (idx + 1) / ordered.length);
}
