import { getOrderedSteps, parseLessonSchemaV1, type LessonQuestion } from '../src/lesson.utils';
import {
  DIGITAL_CITIZENSHIP_PACK_4_7,
  DIGITAL_CITIZENSHIP_PACK_8_10,
  DIGITAL_CITIZENSHIP_PACK_11_13,
  DIGITAL_CITIZENSHIP_PACK_14_17,
  LESSON_PACKS,
  LESSON_PACK_SCHEMA_ID,
  dueQuickChecks,
  findLessonPack,
  lessonPackNextPart,
  isReviewDue,
  lessonPackForDob,
  lessonPackItemDetails,
  lessonPackOfItem,
  lessonPackPart,
  packContinueRecord,
  quickCheckPartKey,
  readPlacedLessonPacks,
  readTalkedAbout,
  type LessonPack,
} from '../src/lessons/digitalCitizenship';
import { LESSON_PICTURE_KEYS, lessonPicture, lessonPictureSvg } from '../src/lessons/lessonPictures';
import { parentNotesForAge } from '../src/lessons/parentNotes';
import { LESSON_PACK_AGES, lessonPackKeyOfItem } from '../src/lessons/lessonPackIndex';
import { GUARDIAN_ONLY_PREF_KEYS } from '../src/types/client.types';

const PARENT_LINE = 'Your parent can see how you do';
// Brand names stay out of what a child reads; attribution lives in `sources` only.
const BANNED = /google|interland|internaut|be internet|youtube|tiktok|roblox|minecraft|fortnite|instagram|snapchat|whatsapp|discord/i;

function textOf(question: LessonQuestion): string[] {
  const out = [question.prompt, question.explanation || '', question.hint || ''];
  if (question.type === 'multiple_choice') out.push(...question.choices.map((c) => c.text));
  if (question.type === 'flashcard') out.push(question.front, question.back);
  return out;
}

describe('built-in lesson packs (HAT-534)', () => {
  for (const pack of LESSON_PACKS) {
    describe(pack.key, () => {
      it('has unique lesson keys', () => {
        const keys = pack.lessons.map((l) => l.key);
        expect(new Set(keys).size).toBe(keys.length);
      });

      for (const { key, review } of pack.lessons.filter((entry) => entry.review)) {
        it(`${key}: its Quick check parses whole, tells the child their parent sees it, and passes at two of three`, () => {
          const parsed = parseLessonSchemaV1(review);
          expect(parsed!.steps.length).toBe(review!.steps.length);
          const steps = getOrderedSteps(review!);
          // The player shows the parent line as a note of its own, never a line of the lesson (HAT-579).
          expect(steps[0].kind === 'content' && !steps[0].body.includes(PARENT_LINE)).toBe(true);
          const questions = review!.steps.flatMap((s) => (s.kind === 'quiz' ? s.questions : []));
          expect(questions).toHaveLength(3);
          expect(review!.scoring.passThreshold).toBeLessThanOrEqual(2 / 3);
          for (const q of questions) expect(textOf(q).join(' ')).not.toMatch(BANNED);
        });
      }

      for (const { key, lesson } of pack.lessons) {
        describe(key, () => {
          const parsed = parseLessonSchemaV1(lesson);

          it('parses with no step or question dropped', () => {
            expect(parsed).not.toBeNull();
            expect(parsed!.steps.length).toBe(lesson.steps.length);
            const count = (l: typeof lesson) =>
              l.steps.reduce((n, s) => n + (s.kind === 'quiz' ? s.questions.length : 0), 0);
            expect(count(parsed!)).toBe(count(lesson));
          });

          it('keeps step and question keys unique, so progress has one place to land', () => {
            const stepKeys = lesson.steps.map((s) => s.key);
            const questionKeys = lesson.steps.flatMap((s) => (s.kind === 'quiz' ? s.questions.map((q) => q.key) : []));
            expect(new Set(stepKeys).size).toBe(stepKeys.length);
            expect(new Set(questionKeys).size).toBe(questionKeys.length);
          });

          it('leaves the parent line to the player, and ends with Talk it over', () => {
            const steps = getOrderedSteps(lesson);
            const first = steps[0];
            expect(first.kind === 'content' && !first.body.includes(PARENT_LINE)).toBe(true);
            expect(steps[steps.length - 1].key).toBe('talk-it-over');
          });

          it('uses only questions a child can answer with AI off, each with an explanation', () => {
            const questions = lesson.steps.flatMap((s) => (s.kind === 'quiz' ? s.questions : []));
            expect(questions.length).toBeGreaterThanOrEqual(5);
            for (const q of questions) {
              expect(['multiple_choice', 'true_false', 'flashcard']).toContain(q.type);
              expect(q.explanation).toBeTruthy();
            }
          });

          it('names no brand in what the child reads, and credits its sources', () => {
            const texts = [
              lesson.meta.title,
              lesson.meta.subtitle || '',
              ...(lesson.meta.objectives || []),
              ...lesson.steps.flatMap((s) => [
                s.title || '',
                s.kind === 'content' ? s.body : s.kind === 'section' ? s.body || '' : s.prompt || '',
                ...(s.kind === 'quiz' ? s.questions.flatMap(textOf) : []),
              ]),
            ];
            for (const text of texts) expect(text).not.toMatch(BANNED);
            expect((lesson.sources || []).every((s) => !!s.licenseNote)).toBe(true);
          });
        });
      }
    });
  }

  it('covers ages 4 to 17 with no gaps or overlaps', () => {
    for (let age = 4; age <= 17; age++) {
      expect(LESSON_PACKS.filter((p) => age >= p.minAge && age <= p.maxAge)).toHaveLength(1);
    }
    expect(new Set(LESSON_PACKS.map((p) => p.name)).size).toBe(LESSON_PACKS.length);
  });

  it('picks the pack by age, and none without a date of birth', () => {
    const on = new Date(2026, 9, 16);
    expect(lessonPackForDob({ y: 2017, m: 1 }, on)).toBe(DIGITAL_CITIZENSHIP_PACK_8_10); // 9
    expect(lessonPackForDob({ y: 2018, m: 10 }, on)).toBe(DIGITAL_CITIZENSHIP_PACK_8_10); // 8
    expect(lessonPackForDob({ y: 2019, m: 1 }, on)).toBe(DIGITAL_CITIZENSHIP_PACK_4_7); // 7
    expect(lessonPackForDob({ y: 2022, m: 1 }, on)).toBe(DIGITAL_CITIZENSHIP_PACK_4_7); // 4
    expect(lessonPackForDob({ y: 2023, m: 1 }, on)).toBeNull(); // 3
    expect(lessonPackForDob({ y: 2015, m: 1 }, on)).toBe(DIGITAL_CITIZENSHIP_PACK_11_13); // 11
    expect(lessonPackForDob({ y: 2011, m: 1 }, on)).toBe(DIGITAL_CITIZENSHIP_PACK_14_17); // 15
    expect(lessonPackForDob({ y: 2008, m: 1 }, on)).toBeNull(); // 18
    expect(lessonPackForDob(null, on)).toBeNull();
  });

  it('reads the placed record, dropping what is malformed and the old collection shape', () => {
    const placed = readPlacedLessonPacks({
      'digital-citizenship-8-10': { itemId: 'i1', extraItemIds: { interland: 'w1', bad: 7 }, placedAtMs: 5 },
      // Before HAT-560: a collection of lesson items, with no itemId.
      'digital-citizenship-4-7': { collectionId: 'c1', lessonItemIds: { 'tell-a-grown-up': 'x' }, placedAtMs: 3 },
      junk: 'x',
    });
    expect(placed).toEqual({
      'digital-citizenship-8-10': { packKey: 'digital-citizenship-8-10', itemId: 'i1', extraItemIds: { interland: 'w1' }, placedAtMs: 5 },
    });
    expect(readPlacedLessonPacks(null)).toEqual({});
  });

  it('makes a pack one Library item that points at the built-in lessons (HAT-560)', () => {
    const pack = DIGITAL_CITIZENSHIP_PACK_4_7;
    const details = lessonPackItemDetails(pack);
    expect(details).toMatchObject({ type: 'thing', subType: 'lesson', name: pack.name });
    expect(details.info.schemas[LESSON_PACK_SCHEMA_ID]).toEqual({ packKey: pack.key });
    // No copies of the lessons: the text ships with the app.
    expect(JSON.stringify(details.info)).not.toContain('steps');
    expect(details.meta.imageSrc.startsWith('data:image/svg+xml,')).toBe(true);
    expect(lessonPackOfItem(details)).toBe(pack);
    expect(lessonPackOfItem({ info: { schemas: { [LESSON_PACK_SCHEMA_ID]: { packKey: 'gone' } } } })).toBeNull();
    expect(lessonPackOfItem({ info: {} })).toBeNull();
    expect(findLessonPack(pack.key)).toBe(pack);
  });

  it('finds each part and its Quick check by key', () => {
    const pack = DIGITAL_CITIZENSHIP_PACK_8_10;
    const second = pack.lessons[1];
    expect(lessonPackPart(pack, second.key)).toMatchObject({ key: second.key, number: 2, isCheck: false, lesson: second.lesson });
    expect(lessonPackPart(pack, quickCheckPartKey(second.key))).toMatchObject({ lessonKey: second.key, number: 2, isCheck: true, lesson: second.review });
    expect(lessonPackPart(pack, 'nope')).toBeNull();
    expect(lessonPackPart(pack, null)).toBeNull();
  });

  it('names every pack the same way, with its ages', () => {
    for (const pack of LESSON_PACKS) expect(pack.name).toBe(`Digital citizenship, ages ${pack.minAge}–${pack.maxAge}`);
  });

  it('offers a Quick check three weeks after a lesson is finished', () => {
    const day = 24 * 60 * 60 * 1000;
    expect(isReviewDue(1_000, 1_000 + 20 * day)).toBe(false);
    expect(isReviewDue(1_000, 1_000 + 21 * day)).toBe(true);
    expect(isReviewDue(undefined, Date.now())).toBe(false);
  });

  it("shows a parent only the notes for their child's age", () => {
    const keys = (age: number | null) => parentNotesForAge(age).map((n) => n.key);
    expect(keys(6)).not.toContain('image-threats');
    expect(keys(6)).not.toContain('ai-companions');
    expect(keys(9)).toContain('ai-companions');
    expect(keys(9)).not.toContain('image-threats');
    expect(keys(12)).toContain('image-threats');
    expect(keys(null)).toHaveLength(4);
  });

  it('keeps the talked-about record for parents only', () => {
    expect(GUARDIAN_ONLY_PREF_KEYS).toContain('lessonPacks.talkedAbout');
    expect(readTalkedAbout({ 'p/a': 5, 'p/b': 'x' })).toEqual({ 'p/a': 5 });
  });

  describe('lesson pictures (DCL-15)', () => {
    for (const key of LESSON_PICTURE_KEYS) {
      it(`${key}: is a well-formed SVG that loads nothing and runs nothing`, () => {
        const svg = lessonPictureSvg(key);
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"')).toBe(true);
        expect(svg).not.toMatch(/<script|<foreignObject|<image|href=|\son[a-z]+=|javascript:/i);
        // Every tag closes, in order.
        const open: string[] = [];
        for (const [, close, name, selfClosing] of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
          if (close) expect(open.pop()).toBe(name);
          else if (!selfClosing) open.push(name);
        }
        expect(open).toEqual([]);
        // Every gradient, clip path and filter it uses is defined in it.
        const ids = new Set([...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
        for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids.has(ref)).toBe(true);
        expect(lessonPicture(key).externalUrl!.length).toBeLessThan(8000);
      });
    }

    it('carries its alt for screen readers and asks the player not to print it as a caption', () => {
      const media = lessonPicture('lock-and-key');
      expect(media).toMatchObject({ kind: 'image', hideCaption: true, alt: 'A gold padlock and its key' });
      expect(media.externalUrl!.startsWith('data:image/svg+xml,')).toBe(true);
      expect(media.externalUrl).not.toMatch(/[<>#"]/);
    });

    it('survives the lesson parser', () => {
      const parsed = parseLessonSchemaV1(DIGITAL_CITIZENSHIP_PACK_4_7.lessons[0].lesson)!;
      const first = getOrderedSteps(parsed)[0];
      expect(first.kind === 'content' && first.media?.[0]).toMatchObject({ kind: 'image', hideCaption: true });
    });

    it('opens every lesson with one picture (every page having one is checked under HAT-580)', () => {
      for (const pack of LESSON_PACKS) {
        for (const { lesson } of pack.lessons) {
          const first = getOrderedSteps(lesson)[0];
          expect(first.kind === 'content' && first.media?.length).toBe(1);
        }
      }
    });
  });

  describe('the questions (HAT-560, DCL-26)', () => {
    const questionsOf = (lesson: LessonPack['lessons'][number]['lesson']) =>
      lesson.steps.flatMap((step) => (step.kind === 'quiz' ? step.questions : []));
    const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
    const maxWords: Record<string, number> = {
      'digital-citizenship-4-7': 20,
      'digital-citizenship-8-10': 25,
      'digital-citizenship-11-13': 35,
      'digital-citizenship-14-17': 35,
    };

    for (const pack of LESSON_PACKS) {
      for (const entry of pack.lessons) {
        for (const lesson of [entry.lesson, ...(entry.review ? [entry.review] : [])]) {
          it(`${pack.key} · ${lesson.meta.title}: one answer each, short prompts, true/false rare`, () => {
            const questions = questionsOf(lesson);
            for (const q of questions) {
              expect(q.type === 'flashcard').toBe(false);
              if (q.type === 'multiple_choice') {
                expect(q.multiSelect).toBe(false);
                expect(q.correctChoiceKeys).toHaveLength(1);
              }
              expect(words(q.prompt)).toBeLessThanOrEqual(maxWords[pack.key]);
            }
            const trueFalse = questions.filter((q) => q.type === 'true_false');
            if (pack.key === 'digital-citizenship-4-7') {
              // A five-year-old can't weigh a statement: two choices, never true or false.
              expect(trueFalse).toHaveLength(0);
              for (const q of questions) if (q.type === 'multiple_choice') expect(q.choices.length).toBeLessThanOrEqual(3);
            } else {
              expect(trueFalse.length).toBeLessThanOrEqual(1);
            }
          });
        }
      }
    }
  });
});

describe('a due Quick check in Library → Continue (HAT-577)', () => {
  const pack = DIGITAL_CITIZENSHIP_PACK_8_10;
  const day = 24 * 60 * 60 * 1000;
  const now = 100 * day;
  const allDone = (completedAtMs: number) =>
    Object.fromEntries(pack.lessons.map((entry) => [entry.key, { completed: true, completedAtMs }]));

  it('names the next part while parts are left', () => {
    const first = pack.lessons[0];
    const record = packContinueRecord(pack, { [first.key]: { completed: true, completedAtMs: now - 30 * day } }, now);
    expect(record).toEqual({
      place: `Part 2 of ${pack.lessons.length} · ${pack.lessons[1].lesson.meta.title}`,
      pct: Math.round((1 / pack.lessons.length) * 100),
      finished: false,
    });
  });

  it('names the part the child was last in, not the first one left (HAT-584)', () => {
    const [first, second, third] = pack.lessons;
    const positions = {
      [first.key]: { updatedAtMs: now - 3 * day },
      [second.key]: { updatedAtMs: now - day },
      [third.key]: { completed: true, updatedAtMs: now - 2 * day },
    };
    expect(lessonPackNextPart(pack, positions)).toBe(second);
    expect(packContinueRecord(pack, positions, now).place).toBe(`Part 2 of ${pack.lessons.length} · ${second.lesson.meta.title}`);
    // Nothing started: the first part.
    expect(lessonPackNextPart(pack, {})).toBe(first);
  });

  it('says Quick check ready once every part is done and a check is due, and finished when none is', () => {
    expect(packContinueRecord(pack, allDone(now - 30 * day), now)).toEqual({ place: 'Quick check ready', pct: 100, finished: false });
    expect(packContinueRecord(pack, allDone(now - 2 * day), now)).toEqual({ place: 'Finished', pct: 100, finished: true });

    const checksDone = {
      ...allDone(now - 30 * day),
      ...Object.fromEntries(pack.lessons.map((entry) => [quickCheckPartKey(entry.key), { completed: true }])),
    };
    expect(packContinueRecord(pack, checksDone, now)).toEqual({ place: 'Finished', pct: 100, finished: true });
  });

  it('lists only the checks whose part was finished long enough ago and not yet done', () => {
    const [first, second, third] = pack.lessons;
    const positions = {
      [first.key]: { completed: true, completedAtMs: now - 30 * day },
      [second.key]: { completed: true, completedAtMs: now - 5 * day },
      [third.key]: { completed: true, completedAtMs: now - 30 * day },
      [quickCheckPartKey(third.key)]: { completed: true },
    };
    expect(dueQuickChecks(pack, positions, now).map((entry) => entry.key)).toEqual([first.key]);
  });
});

describe('a picture on every teaching page (HAT-580)', () => {
  // Talk it over is shown on Part done, which has its own picture.
  for (const pack of LESSON_PACKS) {
    it(`${pack.key}: every page but Talk it over has a picture`, () => {
      const missing: string[] = [];
      for (const entry of pack.lessons) {
        for (const [where, lesson] of [[entry.key, entry.lesson], [`${entry.key}/check`, entry.review]] as const) {
          for (const step of lesson?.steps || []) {
            if (step.kind !== 'content' || step.key === 'talk-it-over') continue;
            if (!step.media?.some((m) => m.kind === 'image' && m.externalUrl)) missing.push(`${where}/${step.key}`);
          }
        }
      }
      expect(missing).toEqual([]);
    });
  }
});

describe('the pack list the app starts with (HAT-578)', () => {
  it('names every pack with its ages, in the same order', () => {
    expect(LESSON_PACK_AGES.map(({ key, minAge, maxAge }) => ({ key, minAge, maxAge }))).toEqual(
      LESSON_PACKS.map(({ key, minAge, maxAge }) => ({ key, minAge, maxAge })),
    );
  });

  it('knows a pack item without the lessons, and nothing else', () => {
    expect(lessonPackKeyOfItem(lessonPackItemDetails(DIGITAL_CITIZENSHIP_PACK_8_10))).toBe(DIGITAL_CITIZENSHIP_PACK_8_10.key);
    expect(lessonPackKeyOfItem({ info: { schemas: { [LESSON_PACK_SCHEMA_ID]: { packKey: 'a-pack-from-a-newer-app' } } } })).toBeNull();
    expect(lessonPackKeyOfItem({ info: {} })).toBeNull();
  });
});

