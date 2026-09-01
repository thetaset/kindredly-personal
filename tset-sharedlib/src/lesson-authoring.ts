import type { LessonGenRequest, LessonQuestionType } from './lesson.utils';

// Authoring presets + prompt composition shared by the server generator, the
// "copy prompt for another LLM" feature, and the builder UI. Keeping the depth/
// style instruction text here (not only in the admin prompt) is what makes
// AI-generated lessons deep instead of shallow, and lets a pasted-in lesson from
// any chat LLM match the exact JSON shape normalizeGeneratedLesson consumes.

export interface LessonGenModelOption {
  id: string;
  label: string;
  blurb: string;
}
/** Ids must be a subset of the server AI_MODEL_ALLOWLIST. */
export const LESSON_GEN_MODELS: LessonGenModelOption[] = [
  { id: 'gpt-5.4', label: 'Best', blurb: 'Deepest, most careful — slower' },
  { id: 'gpt-5.4-mini', label: 'Balanced', blurb: 'Good depth, faster' },
  { id: 'gpt-5.4-nano', label: 'Fast', blurb: 'Quick and basic — shallower' },
];
export const DEFAULT_LESSON_GEN_MODEL = 'gpt-5.4';

export interface LessonDepthPreset {
  id: string;
  label: string;
  description: string;
  stepCount: number;
  questionCount: number;
  instructions: string;
}
export const LESSON_DEPTH_PRESETS: LessonDepthPreset[] = [
  {
    id: 'quick',
    label: 'Quick',
    description: 'A short, focused pass',
    stepCount: 2,
    questionCount: 3,
    instructions:
      'Keep it brief but correct: cover the single most important idea clearly in 1-2 short teaching steps, then a short quiz. No filler.',
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'A solid, well-rounded lesson',
    stepCount: 4,
    questionCount: 5,
    instructions:
      'Teach the core ideas thoroughly across ~4 steps. Each teaching step should make ONE point well with a concrete example. Follow teaching with quizzes that check understanding, not just recall.',
  },
  {
    id: 'deep',
    label: 'Deep',
    description: 'Detailed, with examples & common mistakes',
    stepCount: 6,
    questionCount: 8,
    instructions:
      'Go deep. Across ~6 steps: build intuition first, then precise detail. For each key idea include (a) a plain-language explanation, (b) a concrete worked example or analogy, and (c) a common misconception and why it is wrong. Prefer questions that require reasoning or application over recall. Include at least one open (free_response) question that asks the learner to explain or apply an idea in their own words.',
  },
  {
    id: 'comprehensive',
    label: 'Comprehensive',
    description: 'Thorough, multi-section deep dive',
    stepCount: 10,
    questionCount: 12,
    instructions:
      'Produce a thorough, multi-section lesson (use "section" steps to group phases). Move from foundations to nuance: definitions, mechanisms, worked examples, edge cases, misconceptions, and real-world connections. Vary question types; include multiple open (free_response) questions that probe genuine understanding and synthesis. Never pad — every step must add something new.',
  },
];

export interface LessonStylePreset {
  id: string;
  label: string;
  description: string;
  defaultQuestionTypes: LessonQuestionType[];
  instructions: string;
}
export const LESSON_STYLE_PRESETS: LessonStylePreset[] = [
  {
    id: 'conceptual',
    label: 'Conceptual understanding',
    description: 'Build real intuition for the why',
    defaultQuestionTypes: ['multiple_choice', 'free_response', 'short_answer'],
    instructions:
      'Focus on WHY, not just facts. Lead with intuition and analogies, then formalize. Use worked examples. Assessment should test understanding and transfer: application scenarios, "what would happen if…", and open questions asking the learner to explain a concept in their own words. Avoid trivial recall.',
  },
  {
    id: 'exam_prep',
    label: 'Exam prep',
    description: 'Rigorous, test-style questions',
    defaultQuestionTypes: ['multiple_choice', 'short_answer', 'free_response'],
    instructions:
      'Write exam-quality questions. Multiple-choice must have plausible distractors that reflect common errors (not obviously-wrong throwaways). Mix recall, application, and analysis. Include a few free_response questions with a clear rubric and model answer so the learner learns what a full-credit answer looks like. Explanations should teach, not just state the answer.',
  },
  {
    id: 'vocabulary',
    label: 'Vocabulary / terms',
    description: 'Learn and drill key terms',
    defaultQuestionTypes: ['flashcard', 'multiple_choice', 'short_answer'],
    instructions:
      'Center the lesson on key terms and their meanings. Teaching steps introduce terms with a clear definition and a memorable example sentence. Use flashcards (term → definition) heavily, plus recognition multiple-choice and a few short_answer recall questions. Keep definitions precise and learner-appropriate.',
  },
  {
    id: 'socratic',
    label: 'Socratic / critical thinking',
    description: 'Provoke reasoning and reflection',
    defaultQuestionTypes: ['free_response', 'multiple_choice'],
    instructions:
      'Teach by posing questions and building reasoning. Emphasize open (free_response) questions that ask the learner to argue, compare, justify, or reflect — each with a rubric describing strong reasoning. Multiple-choice, where used, should surface reasoning steps or counterexamples. Encourage the learner to explain their thinking.',
  },
  {
    id: 'practice',
    label: 'Practice problems',
    description: 'Worked examples then practice',
    defaultQuestionTypes: ['multiple_choice', 'short_answer', 'free_response'],
    instructions:
      'Alternate worked examples with practice. Each teaching step should fully work ONE example step-by-step, then the following quiz gives a similar problem to solve. For open problems use free_response with a rubric that credits the correct method even if the final value is off. Increase difficulty gradually.',
  },
  {
    id: 'story',
    label: 'Story / engaging',
    description: 'Narrative-driven, great for kids',
    defaultQuestionTypes: ['multiple_choice', 'true_false', 'flashcard'],
    instructions:
      'Teach through a light narrative or vivid real-world framing that carries across steps. Keep language warm and concrete. Questions should feel like a fun check-in; favor multiple-choice, true/false, and flashcards. Keep it accurate — the story serves the facts, never distorts them.',
  },
];

export function getDepthPreset(id?: string): LessonDepthPreset {
  return LESSON_DEPTH_PRESETS.find((d) => d.id === id) || LESSON_DEPTH_PRESETS[1];
}
export function getStylePreset(id?: string): LessonStylePreset | undefined {
  return LESSON_STYLE_PRESETS.find((s) => s.id === id);
}

/** The exact JSON shape the generator (and any pasted-in LLM output) must produce. */
export const LESSON_GEN_FORMAT_SPEC =
  'Return ONLY a JSON object of this shape (no markdown, no commentary):\n' +
  '{\n' +
  '  "title": "<lesson title>",\n' +
  '  "subtitle": "<one-line summary>",\n' +
  '  "objectives": ["<what the learner will be able to do>"],\n' +
  '  "steps": [\n' +
  '    { "type": "section", "title": "<phase heading>" },\n' +
  '    { "type": "content", "title": "<short>", "body": "<markdown teaching text — use paragraphs, bold, lists>", "mediaHint": "<optional: an image or video that would help, e.g. \'diagram of a cell\'>" },\n' +
  '    { "type": "quiz", "title": "<short>", "questions": [\n' +
  '      { "type": "multiple_choice", "prompt": "<question>", "choices": ["<a>","<b>","<c>","<d>"], "correctIndexes": [0], "multiSelect": false, "explanation": "<why the answer is right>" },\n' +
  '      { "type": "true_false", "prompt": "<statement>", "correct": true, "explanation": "<why>" },\n' +
  '      { "type": "short_answer", "prompt": "<question with a short exact answer>", "answers": ["<accepted>","<synonym>"], "explanation": "<why>" },\n' +
  '      { "type": "free_response", "prompt": "<open question to explain/apply in their own words>", "sampleAnswer": "<a strong reference answer>", "rubric": "<what a full-credit answer includes>", "explanation": "<optional teaching note>" },\n' +
  '      { "type": "flashcard", "front": "<term or prompt>", "back": "<definition or answer>", "explanation": "<optional>" }\n' +
  '    ] }\n' +
  '  ]\n' +
  '}\n' +
  'Rules: correctIndexes are 0-based positions into that question\'s choices; multiple_choice needs 2-4 choices; use short_answer ONLY for genuinely short exact answers (a term, name, number) and free_response for anything conceptual; every quiz should check the content immediately before it.';

/** Compose the depth + style + audience guidance block used in the prompt. */
export function buildLessonGenInstructions(req: LessonGenRequest): string {
  const depth = getDepthPreset(req.depth);
  const style = getStylePreset(req.style);
  const parts: string[] = [];
  parts.push(`DEPTH (${depth.label}): ${depth.instructions}`);
  if (style) parts.push(`STYLE (${style.label}): ${style.instructions}`);
  if (req.gradeBand) parts.push(`AUDIENCE: Write for a ${req.gradeBand} audience — match vocabulary and examples to that level.`);
  if (req.tone) parts.push(`TONE: ${req.tone}.`);
  if (req.objectives?.length) parts.push(`OBJECTIVES the lesson must achieve: ${req.objectives.join('; ')}.`);
  const types = req.questionTypes && req.questionTypes.length ? req.questionTypes : style?.defaultQuestionTypes;
  if (types?.length) parts.push(`Use ONLY these question types: ${types.join(', ')}.`);
  parts.push(
    `Aim for about ${req.stepCount ?? depth.stepCount} teaching steps and ${req.questionCount ?? depth.questionCount} quiz questions total.`,
  );
  if (req.extraInstructions?.trim()) parts.push(`AUTHOR NOTES: ${req.extraInstructions.trim()}`);
  parts.push('Quality bar: accurate, specific, and genuinely educational. No filler, no vague generalities.');
  return parts.join('\n');
}

/** A complete, standalone prompt an author can paste into any chat LLM. */
export function buildLessonGenPrompt(req: LessonGenRequest, sources?: Array<{ title?: string | null; text?: string }>): string {
  const lines: string[] = [];
  lines.push(`Create a lesson on: ${req.topic}`);
  lines.push('');
  lines.push('Follow these instructions carefully:');
  lines.push(buildLessonGenInstructions(req));
  const withText = (sources || []).filter((s) => s?.text && s.text.trim());
  if (withText.length) {
    lines.push('');
    lines.push('Ground the factual content in these sources (do not contradict them):');
    withText.forEach((s, i) => {
      lines.push(`--- SOURCE ${i + 1}${s.title ? ` (${s.title})` : ''} ---`);
      lines.push((s.text || '').slice(0, 6000));
    });
  }
  lines.push('');
  lines.push(LESSON_GEN_FORMAT_SPEC);
  return lines.join('\n');
}

/**
 * Tolerantly extract a lesson JSON object from pasted text (handles ```json
 * fences and surrounding prose). Returns the parsed object or null.
 */
export function parseLessonImportJson(text: string): any | null {
  if (!text || typeof text !== 'string') return null;
  let s = text.trim();
  // Strip a ```json ... ``` or ``` ... ``` fence if present.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Try a direct parse first.
  try {
    return JSON.parse(s);
  } catch {
    /* fall through to brace extraction */
  }
  // Extract the outermost {...} block.
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}
