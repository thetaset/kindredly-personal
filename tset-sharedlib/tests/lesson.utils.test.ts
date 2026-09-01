import {
  LESSON_SCHEMA_ID,
  DEFAULT_LESSON_SCORING,
  setLessonSchemaOnInfo,
  getLessonSchemaV1,
  makeEmptyLesson,
  getOrderedSteps,
  normalizeForMatch,
  levenshtein,
  gradeQuestion,
  scoreQuiz,
  scoreLesson,
  computeProgressPct,
  parseLessonSchemaV1,
  normalizeGeneratedLesson,
  type LessonSchemaV1,
  type LessonQuizStep,
  type LessonMultipleChoiceQuestion,
  type LessonShortAnswerQuestion,
} from '../src/lesson.utils';
import {
  getItemExperienceContract,
  getDefaultOpenAction,
  normalizeSubTypeForType,
} from '../src/content.types';

function baseLesson(steps: LessonSchemaV1['steps']): LessonSchemaV1 {
  return {
    schemaVersion: 1,
    schemaId: LESSON_SCHEMA_ID,
    meta: { title: 'Colors' },
    scoring: { ...DEFAULT_LESSON_SCORING },
    steps,
  };
}

describe('setLessonSchemaOnInfo / getLessonSchemaV1 round-trip', () => {
  test('writes into info.schemas and reads back', () => {
    const lesson = baseLesson([
      { key: 's1', order: 0, kind: 'content', body: 'Red is a color.' },
    ]);
    const info = setLessonSchemaOnInfo({ value: 'x' } as any, lesson);
    expect((info.schemas as any)[LESSON_SCHEMA_ID]).toBeTruthy();
    // preserves sibling info fields
    expect((info as any).value).toBe('x');
    const read = getLessonSchemaV1({ info });
    expect(read).not.toBeNull();
    expect(read!.steps).toHaveLength(1);
    expect(read!.meta.title).toBe('Colors');
  });

  test('reads from details.info too', () => {
    const info = setLessonSchemaOnInfo(null, baseLesson([{ key: 's1', order: 0, kind: 'section', title: 'Intro' }]));
    expect(getLessonSchemaV1({ details: { info } })).not.toBeNull();
  });
});

describe('getLessonSchemaV1 validation (security boundary)', () => {
  test('rejects wrong schemaVersion', () => {
    const info = { schemas: { [LESSON_SCHEMA_ID]: { ...baseLesson([{ key: 's1', order: 0, kind: 'section' }]), schemaVersion: 2 } } };
    expect(getLessonSchemaV1({ info: info as any })).toBeNull();
  });

  test('returns null when steps is not an array', () => {
    const info = { schemas: { [LESSON_SCHEMA_ID]: { schemaVersion: 1, meta: { title: 'X' }, steps: 'nope' } } };
    expect(getLessonSchemaV1({ info: info as any })).toBeNull();
  });

  test('returns null when no valid steps remain', () => {
    const info = { schemas: { [LESSON_SCHEMA_ID]: { schemaVersion: 1, meta: { title: 'X' }, steps: [{ kind: 'content' /* no key, no body */ }] } } };
    expect(getLessonSchemaV1({ info: info as any })).toBeNull();
  });

  test('drops a malformed step but keeps valid ones', () => {
    const info = {
      schemas: {
        [LESSON_SCHEMA_ID]: {
          schemaVersion: 1,
          meta: { title: 'X' },
          steps: [
            { key: 'ok', order: 0, kind: 'content', body: 'hi' },
            { key: 'bad', order: 1, kind: 'quiz', questions: [] }, // empty questions → dropped
          ],
        },
      },
    };
    const read = getLessonSchemaV1({ info: info as any });
    expect(read!.steps).toHaveLength(1);
    expect(read!.steps[0].key).toBe('ok');
  });

  test('drops multiple-choice question whose correctChoiceKeys are not a subset of choices', () => {
    const q = {
      key: 'q1',
      type: 'multiple_choice',
      prompt: 'Pick',
      choices: [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }],
      multiSelect: false,
      correctChoiceKeys: ['zzz'], // not in choices
    };
    const info = { schemas: { [LESSON_SCHEMA_ID]: { schemaVersion: 1, meta: { title: 'X' }, steps: [{ key: 's', order: 0, kind: 'quiz', questions: [q] }] } } };
    expect(getLessonSchemaV1({ info: info as any })).toBeNull(); // the only question dropped → quiz dropped → no steps
  });

  test('drops short-answer with empty acceptableAnswers', () => {
    const q = { key: 'q1', type: 'short_answer', prompt: 'Capital?', acceptableAnswers: [], matchMode: 'normalized' };
    const info = { schemas: { [LESSON_SCHEMA_ID]: { schemaVersion: 1, meta: { title: 'X' }, steps: [{ key: 's', order: 0, kind: 'quiz', questions: [q] }] } } };
    expect(getLessonSchemaV1({ info: info as any })).toBeNull();
  });

  test('defaults meta.title when missing', () => {
    const info = { schemas: { [LESSON_SCHEMA_ID]: { schemaVersion: 1, meta: {}, steps: [{ key: 's', order: 0, kind: 'section' }] } } };
    expect(getLessonSchemaV1({ info: info as any })!.meta.title).toBe('Untitled lesson');
  });
});

describe('makeEmptyLesson', () => {
  test('produces a valid-but-empty skeleton (no steps → getLessonSchemaV1 null until authored)', () => {
    const l = makeEmptyLesson('My lesson');
    expect(l.meta.title).toBe('My lesson');
    expect(l.steps).toHaveLength(0);
    expect(l.generatedBy).toEqual({ kind: 'manual' });
  });
});

describe('getOrderedSteps', () => {
  test('sorts by order, stable on ties', () => {
    const l = baseLesson([
      { key: 'b', order: 2, kind: 'section' },
      { key: 'a', order: 1, kind: 'section' },
      { key: 'c', order: 1, kind: 'section' },
    ]);
    expect(getOrderedSteps(l).map((s) => s.key)).toEqual(['a', 'c', 'b']);
  });
});

describe('grading helpers', () => {
  test('normalizeForMatch folds case, whitespace, punctuation', () => {
    expect(normalizeForMatch('  Color. ')).toBe('color');
    expect(normalizeForMatch('Color', true)).toBe('Color');
  });

  test('levenshtein', () => {
    expect(levenshtein('color', 'colour')).toBe(1);
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
  });

  test('multiple choice single-select', () => {
    const q: LessonMultipleChoiceQuestion = {
      key: 'q', type: 'multiple_choice', prompt: 'p',
      choices: [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }],
      multiSelect: false, correctChoiceKeys: ['a'],
    };
    expect(gradeQuestion(q, ['a']).correct).toBe(true);
    expect(gradeQuestion(q, ['b']).correct).toBe(false);
    expect(gradeQuestion(q, undefined).correct).toBe(false);
  });

  test('multiple choice multi-select requires exact set (partial is wrong)', () => {
    const q: LessonMultipleChoiceQuestion = {
      key: 'q', type: 'multiple_choice', prompt: 'p',
      choices: [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }, { key: 'c', text: 'C' }],
      multiSelect: true, correctChoiceKeys: ['a', 'b'], points: 2,
    };
    expect(gradeQuestion(q, ['a', 'b']).correct).toBe(true);
    expect(gradeQuestion(q, ['a', 'b']).earned).toBe(2);
    expect(gradeQuestion(q, ['a']).correct).toBe(false); // partial
    expect(gradeQuestion(q, ['a', 'b', 'c']).correct).toBe(false); // superset
  });

  test('true / false', () => {
    const q = { key: 'q', type: 'true_false' as const, prompt: 'p', correct: true };
    expect(gradeQuestion(q, true).correct).toBe(true);
    expect(gradeQuestion(q, false).correct).toBe(false);
  });

  test('short answer exact / normalized / fuzzy', () => {
    const exact: LessonShortAnswerQuestion = { key: 'q', type: 'short_answer', prompt: 'p', acceptableAnswers: ['Paris'], matchMode: 'exact' };
    expect(gradeQuestion(exact, 'Paris').correct).toBe(true);
    expect(gradeQuestion(exact, 'paris').correct).toBe(true); // case-insensitive by default
    expect(gradeQuestion(exact, 'Pariss').correct).toBe(false);

    const norm: LessonShortAnswerQuestion = { key: 'q', type: 'short_answer', prompt: 'p', acceptableAnswers: ['color'], matchMode: 'normalized' };
    expect(gradeQuestion(norm, ' Color. ').correct).toBe(true);

    const fuzzy: LessonShortAnswerQuestion = { key: 'q', type: 'short_answer', prompt: 'p', acceptableAnswers: ['color'], matchMode: 'fuzzy', fuzzyMaxDistance: 1 };
    expect(gradeQuestion(fuzzy, 'colour').correct).toBe(true); // distance 1
    expect(gradeQuestion(fuzzy, 'kolour').correct).toBe(false); // distance 2 > 1
  });

  test('flashcard is self-graded', () => {
    const q = { key: 'q', type: 'flashcard' as const, prompt: 'p', front: 'F', back: 'B', gradeMode: 'self' as const };
    expect(gradeQuestion(q, true).correct).toBe(true);
    expect(gradeQuestion(q, false).correct).toBe(false);
  });
});

describe('scoreQuiz / scoreLesson / progress', () => {
  const quiz: LessonQuizStep = {
    key: 'quiz1', order: 1, kind: 'quiz',
    questions: [
      { key: 'q1', type: 'true_false', prompt: 'p', correct: true },
      { key: 'q2', type: 'short_answer', prompt: 'p', acceptableAnswers: ['red'], matchMode: 'normalized' },
    ],
  };

  test('scoreQuiz', () => {
    const s = scoreQuiz(quiz, { q1: true, q2: 'blue' });
    expect(s.earned).toBe(1);
    expect(s.total).toBe(2);
    expect(s.pct).toBe(0.5);
  });

  test('scoreLesson aggregates + passThreshold', () => {
    const lesson = baseLesson([
      { key: 's0', order: 0, kind: 'content', body: 'learn' },
      quiz,
    ]);
    const perfect = scoreLesson(lesson, { quiz1: { q1: true, q2: 'red' } });
    expect(perfect.pct).toBe(1);
    expect(perfect.passed).toBe(true);

    const failing = scoreLesson(lesson, { quiz1: { q1: false, q2: 'blue' } });
    expect(failing.pct).toBe(0);
    expect(failing.passed).toBe(false);
  });

  test('computeProgressPct', () => {
    const lesson = baseLesson([
      { key: 's0', order: 0, kind: 'section' },
      { key: 's1', order: 1, kind: 'content', body: 'x' },
      { key: 's2', order: 2, kind: 'content', body: 'y' },
      { key: 's3', order: 3, kind: 'content', body: 'z' },
    ]);
    expect(computeProgressPct(lesson, null)).toBe(0);
    expect(computeProgressPct(lesson, 's1')).toBe(0.5);
    expect(computeProgressPct(lesson, 's3')).toBe(1);
    expect(computeProgressPct(lesson, 'missing')).toBe(0);
  });
});

describe('normalizeGeneratedLesson (loose AI JSON -> strict schema)', () => {
  const rawFromModel = {
    title: 'Colors',
    subtitle: 'Learn primary colors',
    objectives: ['Name primary colors'],
    steps: [
      { type: 'content', title: 'Intro', body: 'Red, blue and yellow are primary colors.' },
      {
        type: 'quiz',
        title: 'Check',
        questions: [
          { type: 'multiple_choice', prompt: 'Which is primary?', choices: ['Green', 'Red', 'Purple'], correctIndexes: [1], explanation: 'Red is primary.' },
          { type: 'true_false', prompt: 'Blue is primary.', correct: true },
          { type: 'short_answer', prompt: 'Name a primary color.', answers: ['red', 'blue', 'yellow'] },
          { type: 'flashcard', front: 'Primary colors?', back: 'Red, blue, yellow' },
        ],
      },
    ],
  }

  test('assigns keys/order and maps correctIndexes -> correctChoiceKeys', () => {
    const lesson = normalizeGeneratedLesson(rawFromModel, { model: 'gpt-x' })
    expect(lesson.steps).toHaveLength(2)
    expect(lesson.steps[0].kind).toBe('content')
    expect(lesson.steps[0].key).toBe('s0')
    const quiz = lesson.steps[1] as any
    expect(quiz.kind).toBe('quiz')
    const mc = quiz.questions[0]
    expect(mc.choices.map((c: any) => c.key)).toEqual(['c0', 'c1', 'c2'])
    expect(mc.correctChoiceKeys).toEqual(['c1'])
    expect(lesson.generatedBy?.kind).toBe('ai_personal')
  })

  test('round-trips through parseLessonSchemaV1 and grades correctly', () => {
    const normalized = normalizeGeneratedLesson(rawFromModel)
    const lesson = parseLessonSchemaV1(normalized)
    expect(lesson).not.toBeNull()
    const quiz = lesson!.steps[1] as any
    // The mapped MC answer grades as correct for choice c1.
    expect(gradeQuestion(quiz.questions[0], ['c1']).correct).toBe(true)
    expect(gradeQuestion(quiz.questions[0], ['c0']).correct).toBe(false)
    // short_answer accepts any listed answer, normalized.
    expect(gradeQuestion(quiz.questions[2], 'Blue').correct).toBe(true)
  })

  test('drops a malformed generated question but keeps the lesson', () => {
    const raw = {
      title: 'X',
      steps: [
        { type: 'content', body: 'hi' },
        { type: 'quiz', questions: [{ type: 'multiple_choice', prompt: 'q', choices: ['a'], correctIndexes: [9] }] },
      ],
    }
    // The MC has <2 choices AND an out-of-range correct index → dropped → quiz empty → dropped.
    const lesson = parseLessonSchemaV1(normalizeGeneratedLesson(raw))
    expect(lesson!.steps).toHaveLength(1)
    expect(lesson!.steps[0].kind).toBe('content')
  })
})

describe('free_response question type', () => {
  const frq = { key: 'q', type: 'free_response' as const, prompt: 'Explain evaporation.', sampleAnswer: 'Water turns to vapor when heated.' }

  test('validation rejects missing sampleAnswer', () => {
    const info = { schemas: { [LESSON_SCHEMA_ID]: { schemaVersion: 1, meta: { title: 'X' }, steps: [{ key: 's', order: 0, kind: 'quiz', questions: [{ key: 'q', type: 'free_response', prompt: 'p' }] }] } } }
    expect(getLessonSchemaV1({ info: info as any })).toBeNull()
  })

  test('grades via aiResult; flags needsAiGrading without one', () => {
    // no aiResult but answered → needs grading
    const g0 = gradeQuestion(frq, 'water becomes gas')
    expect(g0.needsAiGrading).toBe(true)
    expect(g0.earned).toBe(0)
    // unanswered → wrong, no grading needed
    expect(gradeQuestion(frq, '').needsAiGrading).toBeUndefined()
    // with aiResult → scaled score
    const g1 = gradeQuestion({ ...frq, points: 2 }, 'answer', { score: 0.75 })
    expect(g1.earned).toBe(1.5)
    expect(g1.correct).toBe(true)
    const g2 = gradeQuestion(frq, 'answer', { score: 0.3 })
    expect(g2.correct).toBe(false)
  })

  test('scoreQuiz/scoreLesson thread aiResults', () => {
    const quiz: LessonQuizStep = {
      key: 'quiz1', order: 1, kind: 'quiz',
      questions: [
        { key: 'q1', type: 'true_false', prompt: 'p', correct: true },
        frq,
      ],
    }
    const lesson = baseLesson([quiz])
    const s = scoreLesson(lesson, { quiz1: { q1: true, q: 'ans' } }, { quiz1: { q: { score: 1 } } })
    expect(s.pct).toBe(1)
    expect(s.passed).toBe(true)
  })
})

describe('normalizeGeneratedLesson free_response + mediaHint', () => {
  test('maps free_response and captures mediaHint', () => {
    const raw = {
      title: 'X',
      steps: [
        { type: 'content', body: 'learn', mediaHint: 'diagram of the water cycle' },
        { type: 'quiz', questions: [{ type: 'free_response', prompt: 'explain', sampleAnswer: 'because heat' }] },
      ],
    }
    const lesson = parseLessonSchemaV1(normalizeGeneratedLesson(raw))!
    expect((lesson.steps[0].meta as any)?.mediaHint).toBe('diagram of the water cycle')
    const q = (lesson.steps[1] as any).questions[0]
    expect(q.type).toBe('free_response')
    expect(q.sampleAnswer).toBe('because heat')
  })
})

describe('content.types lesson registration', () => {
  test('experience contract resolves to lesson', () => {
    const c = getItemExperienceContract('thing', 'lesson');
    expect(c.experienceKind).toBe('lesson');
    expect(c.label).toBe('Lesson');
  });

  test('normalizeSubTypeForType accepts lesson', () => {
    expect(normalizeSubTypeForType('thing', 'lesson')).toBe('lesson');
  });

  test('default open action is openItem (opens detail, then Start lesson)', () => {
    expect(getDefaultOpenAction('thing', 'lesson')).toBe('openItem');
  });
});
