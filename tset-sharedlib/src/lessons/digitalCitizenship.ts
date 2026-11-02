import { calculateAge, type DateOfBirth } from '../date.utils';
import type { LessonSchemaV1 } from '../lesson.utils';
import { lessonPictureSvg, svgDataUrl, type LessonPictureKey } from './lessonPictures';
import { LESSON_PACK_SCHEMA_ID, lessonPackKeyOfItem } from './lessonPackIndex';
import { KEEP_PRIVATE } from './digitalCitizenship/keepPrivate';
import { REAL_OR_FAKE } from './digitalCitizenship/realOrFake';
import { STRONG_PASSWORDS } from './digitalCitizenship/strongPasswords';
import { BE_KIND } from './digitalCitizenship/beKind';
import { ASK_FOR_HELP } from './digitalCitizenship/askForHelp';
import { KIND_ONLINE, PRIVATE_THINGS, REAL_OR_PRETEND, STOP_AND_ASK, TELL_A_GROWN_UP } from './digitalCitizenship/ages4to7';
import {
  KIND_ONLINE_CHECK,
  PRIVATE_THINGS_CHECK,
  REAL_OR_PRETEND_CHECK,
  STOP_AND_ASK_CHECK,
  TELL_A_GROWN_UP_CHECK,
} from './digitalCitizenship/quickChecks4to7';
import {
  ASK_FOR_HELP_CHECK,
  BE_KIND_CHECK,
  KEEP_PRIVATE_CHECK,
  REAL_OR_FAKE_CHECK,
  STRONG_PASSWORDS_CHECK,
} from './digitalCitizenship/quickChecks';
import {
  ACCOUNTS_AND_SCAMS,
  AI_CHATBOTS,
  FEEDS_AND_FILTERS,
  ONLINE_FRIENDSHIPS,
  PRIVATE_PHOTOS_AND_FAKES,
} from './digitalCitizenship/ages11to13';
import {
  ACCOUNTS_AND_SCAMS_CHECK,
  AI_CHATBOTS_CHECK,
  FEEDS_AND_FILTERS_CHECK,
  ONLINE_FRIENDSHIPS_CHECK,
  PRIVATE_PHOTOS_AND_FAKES_CHECK,
} from './digitalCitizenship/quickChecks11to13';
import {
  DATA_MONEY_SCAMS_CHECK,
  IMAGES_CONSENT_DEEPFAKES_CHECK,
  IS_IT_TRUE_CHECK,
  RELATIONSHIPS_CONTROL_AI_CHECK,
  SEXTORTION_CHECK,
} from './digitalCitizenship/quickChecks14to17';
import {
  DATA_MONEY_SCAMS,
  IMAGES_CONSENT_DEEPFAKES,
  IS_IT_TRUE,
  RELATIONSHIPS_CONTROL_AI,
  SEXTORTION,
} from './digitalCitizenship/ages14to17';

// Digital citizenship (HAT-534): Lessons Kindredly wrote, built into the app so they need no catalog
// and no server fetch (a self-hosted box has no catalog). A child's own app adds the pack for their
// age to their Library once, as ONE item with a part per lesson (HAT-560): the item holds the pack's
// key, not copies of the lessons, so a text change ships with the app and nothing in the Library needs
// rewriting. Progress is kept per part on that item (tset-client LessonProgressRefStateService). The
// parent sees results on the child's Digital citizenship page. Why these lessons and how they are
// written: docs/research/2026-10-16-digital-citizenship-content.md.

// What the app shell needs before any lesson loads lives in ./lessonPackIndex (HAT-578).
export {
  LESSON_PACK_AGES,
  LESSON_PACK_SCHEMA_ID,
  LESSON_PACKS_PLACED_PREF_KEY,
  lessonPackKeyForDob,
  lessonPackKeyOfItem,
  quickCheckPartKey,
  readPlacedLessonPacks,
  type PlacedLessonPack,
} from './lessonPackIndex';
import { quickCheckPartKey } from './lessonPackIndex';

export type LessonPackEntry = {
  /** A part's key. Never changes once shipped: progress is saved against it. */
  key: string;
  lesson: LessonSchemaV1;
  /** A short Quick check offered about three weeks after the part is finished. */
  review?: LessonSchemaV1;
};

/**
 * A website that practises the same skills (DCL-12). Never added on its own: it runs on someone
 * else's site with their analytics, so a parent adds it from the child's Digital citizenship page.
 * Once in the Library, Library Mode allows it like any other Library website.
 */
export type LessonPackExtra = {
  key: string;
  name: string;
  url: string;
  /** For the parent: what it is, that it needs no account, and whose site it runs on. */
  description: string;
};

export type LessonPack = {
  /** Stable: recorded in each child's prefs and on the item the pack becomes. */
  key: string;
  /** The item's name in the child's Library. */
  name: string;
  description: string;
  minAge: number;
  maxAge: number;
  /** A grown-up reads it with the child: shown as Read together, never as a line in the lesson. */
  readTogether?: boolean;
  /** The item's picture in the Library and on Home. */
  cover: LessonPictureKey;
  /** The parts, in teaching order. */
  lessons: LessonPackEntry[];
  extras?: LessonPackExtra[];
};

/** Days after a lesson is finished before its Quick check is offered: gains fade by three months. */
export const LESSON_REVIEW_AFTER_DAYS = 21;

/** Read aloud with a grown-up, and led by pictures (DCL-11, DCL-15). */
export const DIGITAL_CITIZENSHIP_PACK_4_7: LessonPack = {
  key: 'digital-citizenship-4-7',
  name: 'Digital citizenship, ages 4–7',
  description:
    'Five short lessons to read together: telling a grown-up, keeping things private, being kind online, stopping to ask before you tap, and real or pretend.',
  minAge: 4,
  maxAge: 7,
  readTogether: true,
  cover: 'telling-a-grown-up',
  lessons: [
    { key: 'tell-a-grown-up', lesson: TELL_A_GROWN_UP, review: TELL_A_GROWN_UP_CHECK },
    { key: 'private-things', lesson: PRIVATE_THINGS, review: PRIVATE_THINGS_CHECK },
    { key: 'kind-online', lesson: KIND_ONLINE, review: KIND_ONLINE_CHECK },
    { key: 'stop-and-ask', lesson: STOP_AND_ASK, review: STOP_AND_ASK_CHECK },
    { key: 'real-or-pretend', lesson: REAL_OR_PRETEND, review: REAL_OR_PRETEND_CHECK },
  ],
};

export const DIGITAL_CITIZENSHIP_PACK_8_10: LessonPack = {
  key: 'digital-citizenship-8-10',
  name: 'Digital citizenship, ages 8–10',
  description: 'Five short lessons: what to keep private, spotting fakes, strong passwords, being kind online and asking for help.',
  minAge: 8,
  maxAge: 10,
  cover: 'locked-box',
  lessons: [
    { key: 'keep-private', lesson: KEEP_PRIVATE, review: KEEP_PRIVATE_CHECK },
    { key: 'real-or-fake', lesson: REAL_OR_FAKE, review: REAL_OR_FAKE_CHECK },
    { key: 'strong-passwords', lesson: STRONG_PASSWORDS, review: STRONG_PASSWORDS_CHECK },
    { key: 'be-kind', lesson: BE_KIND, review: BE_KIND_CHECK },
    { key: 'ask-for-help', lesson: ASK_FOR_HELP, review: ASK_FOR_HELP_CHECK },
  ],
  extras: [
    {
      key: 'interland',
      name: 'Interland',
      url: 'https://beinternetawesome.withgoogle.com/en_us/interland',
      description:
        "A free browser game from Google with four short worlds on the same skills. No account needed. It runs on Google's site, which uses Google's analytics.",
    },
  ],
};

export const DIGITAL_CITIZENSHIP_PACK_11_13: LessonPack = {
  key: 'digital-citizenship-11-13',
  name: 'Digital citizenship, ages 11–13',
  description:
    'Five lessons: feeds and filters, healthy and unhealthy online friendships, private photos and fake images, AI chatbots, and accounts, scams and buying.',
  minAge: 11,
  maxAge: 13,
  cover: 'checking-the-news',
  lessons: [
    { key: 'feeds-and-filters', lesson: FEEDS_AND_FILTERS, review: FEEDS_AND_FILTERS_CHECK },
    { key: 'online-friendships', lesson: ONLINE_FRIENDSHIPS, review: ONLINE_FRIENDSHIPS_CHECK },
    { key: 'private-photos-and-fakes', lesson: PRIVATE_PHOTOS_AND_FAKES, review: PRIVATE_PHOTOS_AND_FAKES_CHECK },
    { key: 'ai-chatbots', lesson: AI_CHATBOTS, review: AI_CHATBOTS_CHECK },
    { key: 'accounts-and-scams', lesson: ACCOUNTS_AND_SCAMS, review: ACCOUNTS_AND_SCAMS_CHECK },
  ],
};

export const DIGITAL_CITIZENSHIP_PACK_14_17: LessonPack = {
  key: 'digital-citizenship-14-17',
  name: 'Digital citizenship, ages 14–17',
  description:
    'Five lessons: checking sources, image abuse and deepfakes, sextortion, relationships and AI companions, and data, money and scams.',
  minAge: 14,
  maxAge: 17,
  cover: 'lock-and-key',
  lessons: [
    { key: 'is-it-true', lesson: IS_IT_TRUE, review: IS_IT_TRUE_CHECK },
    { key: 'images-consent-deepfakes', lesson: IMAGES_CONSENT_DEEPFAKES, review: IMAGES_CONSENT_DEEPFAKES_CHECK },
    { key: 'sextortion', lesson: SEXTORTION, review: SEXTORTION_CHECK },
    { key: 'relationships-control-ai', lesson: RELATIONSHIPS_CONTROL_AI, review: RELATIONSHIPS_CONTROL_AI_CHECK },
    { key: 'data-money-scams', lesson: DATA_MONEY_SCAMS, review: DATA_MONEY_SCAMS_CHECK },
  ],
};

export const LESSON_PACKS: LessonPack[] = [
  DIGITAL_CITIZENSHIP_PACK_4_7,
  DIGITAL_CITIZENSHIP_PACK_8_10,
  DIGITAL_CITIZENSHIP_PACK_11_13,
  DIGITAL_CITIZENSHIP_PACK_14_17,
];

/** The pack for a child of this age, or null (no date of birth means no pack: never guess an age). */
export function lessonPackForDob(dob: DateOfBirth | null | undefined, referenceDate?: Date): LessonPack | null {
  const age = calculateAge(dob, referenceDate);
  if (age === null) return null;
  return LESSON_PACKS.find((pack) => age >= pack.minAge && age <= pack.maxAge) || null;
}

/** The pack with this key, or null for a key this version of the app doesn't know. */
export function findLessonPack(key: string | null | undefined): LessonPack | null {
  return LESSON_PACKS.find((pack) => pack.key === key) || null;
}

/** The Library item a pack becomes: one item that points at the lessons built into the app. */
export function lessonPackItemDetails(pack: LessonPack) {
  return {
    type: 'thing' as const,
    subType: 'lesson',
    name: pack.name,
    description: pack.description,
    meta: { imageSrc: svgDataUrl(lessonPictureSvg(pack.cover)) },
    info: { schemas: { [LESSON_PACK_SCHEMA_ID]: { packKey: pack.key } } },
  };
}

/** The pack a Library item points at, or null for any other item. */
export function lessonPackOfItem(details: { info?: unknown } | null | undefined): LessonPack | null {
  return findLessonPack(lessonPackKeyOfItem(details));
}

export type LessonPackPart = {
  /** `<lesson key>` for a lesson, `<lesson key>/check` for its Quick check. */
  key: string;
  lessonKey: string;
  /** 1-based place among the pack's lessons. */
  number: number;
  isCheck: boolean;
  lesson: LessonSchemaV1;
};

/** One part of a pack by its key, or null when the pack has no such part. */
export function lessonPackPart(pack: LessonPack, partKey: string | null | undefined): LessonPackPart | null {
  if (!partKey) return null;
  const isCheck = partKey.endsWith('/check');
  const lessonKey = isCheck ? partKey.slice(0, -'/check'.length) : partKey;
  const index = pack.lessons.findIndex((entry) => entry.key === lessonKey);
  if (index < 0) return null;
  const entry = pack.lessons[index];
  const lesson = isCheck ? entry.review : entry.lesson;
  if (!lesson) return null;
  return { key: partKey, lessonKey, number: index + 1, isCheck, lesson };
}

/** Whether a part finished at `completedAtMs` is due its Quick check. */
export function isReviewDue(completedAtMs: number | null | undefined, nowMs: number): boolean {
  if (!completedAtMs) return false;
  return nowMs - completedAtMs >= LESSON_REVIEW_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

/** Where a child got to in one part, as `lesson_progress` keeps it. */
export type LessonPackPartPosition = { completed?: boolean; completedAtMs?: number | null; updatedAtMs?: number } | null | undefined;

/**
 * The part to carry on with: the unfinished part the child was in most recently, or else the first
 * one not started. Naming the first unfinished part sent a child in part 2 back to part 1 (HAT-584).
 */
export function lessonPackNextPart(pack: LessonPack, positions: Record<string, LessonPackPartPosition>): LessonPackEntry | null {
  const unfinished = pack.lessons.filter((entry) => !positions[entry.key]?.completed);
  const started = unfinished
    .filter((entry) => positions[entry.key])
    .sort((a, b) => (positions[b.key]?.updatedAtMs || 0) - (positions[a.key]?.updatedAtMs || 0));
  return started[0] || unfinished[0] || null;
}

/** The parts whose Quick check is due now: the part finished long enough ago, its check not done. */
export function dueQuickChecks(
  pack: LessonPack,
  positions: Record<string, LessonPackPartPosition>,
  nowMs: number,
): LessonPackEntry[] {
  return pack.lessons.filter((entry) => {
    if (!entry.review) return false;
    const position = positions[entry.key];
    if (!position?.completed || !isReviewDue(position.completedAtMs, nowMs)) return false;
    return !positions[quickCheckPartKey(entry.key)]?.completed;
  });
}

/**
 * What Library → Continue says about a pack (HAT-577): the part to carry on with, then a Quick check
 * once one is due, and finished only when neither is left.
 */
export function packContinueRecord(
  pack: LessonPack,
  positions: Record<string, LessonPackPartPosition>,
  nowMs: number,
): { place: string; pct: number; finished: boolean } {
  const lessons = pack.lessons;
  const done = lessons.filter((entry) => positions[entry.key]?.completed).length;
  const pct = Math.round((done / lessons.length) * 100);
  const next = lessonPackNextPart(pack, positions);
  if (next) {
    return { place: `Part ${lessons.indexOf(next) + 1} of ${lessons.length} · ${next.lesson.meta.title}`, pct, finished: false };
  }
  if (dueQuickChecks(pack, positions, nowMs).length) return { place: 'Quick check ready', pct, finished: false };
  return { place: 'Finished', pct, finished: true };
}

/**
 * Lessons a parent marked as talked about with their child, keyed `<pack key>/<lesson key>` → when.
 * Guardian-only (`GUARDIAN_ONLY_PREF_KEYS`): the evidence's strongest check is the child explaining
 * it in their own words to a parent, and only the parent can say that happened.
 */
export const LESSON_PACKS_TALKED_PREF_KEY = 'lessonPacks.talkedAbout';

export function readTalkedAbout(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, atMs] of Object.entries(raw)) if (typeof atMs === 'number' && atMs > 0) out[key] = atMs;
  }
  return out;
}
