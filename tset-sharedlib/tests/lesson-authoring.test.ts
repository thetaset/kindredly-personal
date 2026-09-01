import {
  LESSON_GEN_MODELS,
  DEFAULT_LESSON_GEN_MODEL,
  LESSON_DEPTH_PRESETS,
  LESSON_STYLE_PRESETS,
  getDepthPreset,
  getStylePreset,
  buildLessonGenInstructions,
  buildLessonGenPrompt,
  parseLessonImportJson,
  LESSON_GEN_FORMAT_SPEC,
} from '../src/lesson-authoring';

describe('presets', () => {
  test('default model is in the model list', () => {
    expect(LESSON_GEN_MODELS.some((m) => m.id === DEFAULT_LESSON_GEN_MODEL)).toBe(true);
  });
  test('getDepthPreset falls back to standard', () => {
    expect(getDepthPreset('nope').id).toBe('standard');
    expect(getDepthPreset('deep').id).toBe('deep');
  });
  test('every style has instructions + default question types', () => {
    for (const s of LESSON_STYLE_PRESETS) {
      expect(s.instructions.length).toBeGreaterThan(20);
      expect(s.defaultQuestionTypes.length).toBeGreaterThan(0);
    }
    expect(LESSON_DEPTH_PRESETS.length).toBeGreaterThan(2);
  });
});

describe('buildLessonGenInstructions', () => {
  test('includes depth + style + audience + type restriction', () => {
    const txt = buildLessonGenInstructions({
      topic: 'Fractions',
      depth: 'deep',
      style: 'exam_prep',
      gradeBand: 'middle',
      questionTypes: ['multiple_choice', 'free_response'],
    });
    expect(txt).toMatch(/DEPTH \(Deep\)/);
    expect(txt).toMatch(/STYLE \(Exam prep\)/);
    expect(txt).toMatch(/middle audience/);
    expect(txt).toMatch(/multiple_choice, free_response/);
  });
  test('uses style default question types when none given', () => {
    const txt = buildLessonGenInstructions({ topic: 'X', style: 'vocabulary' });
    const style = getStylePreset('vocabulary')!;
    expect(txt).toContain(style.defaultQuestionTypes.join(', '));
  });
});

describe('buildLessonGenPrompt', () => {
  test('is standalone: includes topic, instructions, format spec, and sources', () => {
    const p = buildLessonGenPrompt(
      { topic: 'Photosynthesis', depth: 'standard' },
      [{ title: 'Wiki', text: 'Plants make food from light.' }],
    );
    expect(p).toMatch(/Photosynthesis/);
    expect(p).toContain(LESSON_GEN_FORMAT_SPEC.slice(0, 40));
    expect(p).toMatch(/SOURCE 1 \(Wiki\)/);
    expect(p).toMatch(/Plants make food/);
  });
});

describe('parseLessonImportJson', () => {
  test('plain JSON', () => {
    expect(parseLessonImportJson('{"title":"A","steps":[]}')).toEqual({ title: 'A', steps: [] });
  });
  test('```json fenced', () => {
    const t = 'Here you go:\n```json\n{"title":"B"}\n```\nHope that helps!';
    expect(parseLessonImportJson(t)).toEqual({ title: 'B' });
  });
  test('JSON embedded in prose (brace extraction)', () => {
    expect(parseLessonImportJson('Sure! {"title":"C","steps":[1,2]} done')).toEqual({ title: 'C', steps: [1, 2] });
  });
  test('garbage returns null', () => {
    expect(parseLessonImportJson('no json here')).toBeNull();
    expect(parseLessonImportJson('')).toBeNull();
  });
});
