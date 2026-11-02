import { lessonPicture, type LessonPictureKey } from '../lessonPictures';
import type {
  LessonContentStep,
  LessonMediaRef,
  LessonMultipleChoiceQuestion,
  LessonQuestion,
  LessonQuizStep,
  LessonSchemaV1,
  LessonTrueFalseQuestion,
} from '../../lesson.utils';

// Small builders for the lessons written by hand rather than generated (the 4–7 pack). They make the
// same LessonSchemaV1 objects as the other packs' files. The player shows choices in the order
// written, so vary where the right answer sits.

export const SOURCES_4_TO_7: LessonSchemaV1['sources'] = [
  {
    kind: 'url',
    url: 'https://www.gov.uk/government/publications/education-for-a-connected-world',
    title: 'Education for a Connected World (UKCIS)',
    licenseNote: 'Contains public sector information licensed under the Open Government Licence v3.0.',
  },
];

export function content(key: string, order: number, title: string, body: string, media?: LessonMediaRef[]): LessonContentStep {
  return { key, order, kind: 'content', title, body, ...(media ? { media } : {}) };
}

export function quiz(key: string, order: number, title: string, questions: LessonQuestion[]): LessonQuizStep {
  return { key, order, kind: 'quiz', title, questions };
}

/** One answer; `choices` are [key, text] pairs in the order shown. */
export function choose(
  key: string,
  prompt: string,
  choices: Array<[string, string]>,
  correct: string,
  explanation: string,
): LessonMultipleChoiceQuestion {
  return {
    key,
    type: 'multiple_choice',
    prompt,
    choices: choices.map(([k, text]) => ({ key: k, text })),
    multiSelect: false,
    correctChoiceKeys: [correct],
    explanation,
  };
}

/** One answer, each choice shown as a picture with its words under it (ages 4–7, HAT-560). */
export function chooseWithPictures(
  key: string,
  prompt: string,
  choices: Array<[string, string, LessonPictureKey]>,
  correct: string,
  explanation: string,
): LessonMultipleChoiceQuestion {
  return {
    ...choose(key, prompt, choices.map(([k, text]) => [k, text]), correct, explanation),
    choices: choices.map(([k, text, picture]) => ({ key: k, text, media: [lessonPicture(picture)] })),
  };
}

export function trueOrFalse(key: string, prompt: string, correct: boolean, explanation: string): LessonTrueFalseQuestion {
  return { key, type: 'true_false', prompt, correct, explanation };
}

export function lesson4to7(fields: {
  title: string;
  subtitle: string;
  objectives: string[];
  estMinutes: number;
  passThreshold: number;
  steps: LessonSchemaV1['steps'];
}): LessonSchemaV1 {
  return {
    schemaVersion: 1,
    schemaId: 'kindredly.lesson.v1',
    meta: {
      title: fields.title,
      subtitle: fields.subtitle,
      objectives: fields.objectives,
      estMinutes: fields.estMinutes,
      gradeBand: 'early',
      subject: 'Digital citizenship',
      tone: 'warm, calm, simple; read aloud by a grown-up',
    },
    scoring: {
      maxAttempts: null,
      keepBestScore: true,
      showScoreEachAttempt: true,
      passThreshold: fields.passThreshold,
      revealAnswersAfter: 'each_question',
    },
    steps: fields.steps,
    sources: SOURCES_4_TO_7,
    generatedBy: { kind: 'manual' },
  };
}
