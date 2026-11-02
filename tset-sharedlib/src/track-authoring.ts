// Copy prompt and Paste track (docs/trackers/learning-tracks-tracker.md, TRK-20).
//
// Decision 9 keeps Lesson Builder's way out for families on any plan: Copy prompt hands their own
// AI app everything Kindredly's writer gets (the voice sample, the kinds, the criteria, the Avoid
// list and the format), and Paste track reads its answer back. A pasted track is not fetched or
// checked by Kindredly, and says so to its maker.

import type { TrackKind, TrackVoiceKey } from './track';
import { TRACK_KIND_LABELS } from './track';
import { getTrackVoice } from './track-voices';
import { parseTrackItemV1, TRACK_ITEM_KINDS, type TrackItemKind, type TrackItemV1 } from './track-item';
import { TRACK_AVOID, TRACK_CRITERION_QUESTIONS, TRACK_ITEM_KIND_GUIDES, TRACK_PASSING_SCORE } from './track-generation';

export interface TrackPromptInput {
  subject?: string;
  kind: TrackKind;
  length: number;
  audience?: string;
  voice: TrackVoiceKey;
  /** Text the maker pasted in to make the track from. */
  sourceText?: string;
  /** A page the maker linked to. */
  sourceUrl?: string;
  /** A PDF the maker added: their AI app needs it attached. */
  sourceFilename?: string;
  /** Several sources of the maker's own (HAT-761), each a text, a page or a PDF; wins over the three above. */
  sources?: Array<{ text?: string; url?: string; filename?: string }>;
}

/** The kinds a pasted track may use. A Visual needs an image Kindredly copies, which pasting can't do. */
const PASTE_KINDS: TrackItemKind[] = ['page', 'reading', 'exercise'];

export const TRACK_PASTE_FORMAT_SPEC = `Answer with ONE JSON object and nothing else, in this shape:
{
  "title": "<the track's title>",
  "description": "<one or two sentences>",
  "sections": [{ "title": "<section title>", "startsAtItem": <the number of its first item, from 1> }],
  "items": [
    {
      "title": "<item title>",
      "kind": "page" | "reading" | "exercise",
      "recap": "<light course items after the first: one sentence picking up from the item before>",
      "body": "<markdown: paragraphs and occasional emphasis; no headings>",
      "passage": { "text": "<a reading's passage, exactly as the source has it>", "source": "<whose words and the work, e.g. Charles Dickens, Great Expectations (1861)>", "locator": "<chapter or line>", "after": "<a line or two after the passage>" },
      "answer": "<an exercise's answer or reflection>",
      "check": { "type": "multiple_choice", "prompt": "<question>", "choices": ["<a>", "<b>", "<c>"], "correctIndex": 0, "explanation": "<why>" },
      "sources": [{ "title": "<source title>", "url": "<address>", "license": "<e.g. CC BY-SA 4.0, Public domain>" }]
    }
  ]
}
Leave out "sections" when the track needs none, "recap" in a theme and in the first item, "passage" except in a reading, "answer" except in an exercise, and "check" unless a question genuinely helps (most items have none; a check may also be { "type": "true_false", "prompt": "<statement>", "correct": true, "explanation": "<why>" }).`;

/** The whole prompt for the maker's own AI app. */
export function buildTrackPrompt(input: TrackPromptInput): string {
  const voice = getTrackVoice(input.voice);
  const kindLine =
    input.kind === 'course'
      ? 'A light course: a gentle sequence that goes somewhere. Items build on earlier ones, each after the first opens with a one-sentence recap, and the last is a real ending. Short sessions and a clear thread, not a syllabus with homework.'
      : 'A theme: standalone items within one area. Every item is complete on its own, any order works, and none has a recap.';
  const about = input.subject?.trim() || 'the source below';
  const lines: string[] = [
    'You are writing a learning track for Kindredly, a family app whose feeds are meant to be good for the people who read them. A track is delivered one short item at a time, and each item is a satisfying session even when the track continues. No cliffhangers engineered for compulsion.',
    '',
    `Track: ${input.length} items on ${about}, for ${input.audience?.trim() || 'a curious family: a 12-year-old should be able to follow it, and an adult should never feel talked down to'}.`,
    `Kind: ${TRACK_KIND_LABELS[input.kind]}. ${kindLine}`,
    '',
    'Item kinds:',
    `- page: ${TRACK_ITEM_KIND_GUIDES.page.replace(' and one image', '')}`,
    `- reading: ${TRACK_ITEM_KIND_GUIDES.reading}`,
    `- exercise: ${TRACK_ITEM_KIND_GUIDES.exercise}`,
    'Most items are pages. Use a reading only for a public-domain text you can quote exactly, and an exercise only where it genuinely helps.',
    '',
    'Sources: open the actual source for each item and write from it, never from memory. Name every source you used, with its license. Every factual claim must be traceable to a named source. If you cannot open a source, choose another.',
  ];
  const several = (input.sources || []).filter((s) => s.text?.trim() || s.url?.trim() || s.filename?.trim());
  if (several.length > 1) {
    lines.push('', 'Write only from these sources, each in its own order, splitting each where its headings do:');
    several.forEach((s, i) => {
      if (s.text?.trim()) lines.push('', `Source ${i + 1}:`, '"""', s.text.trim(), '"""');
      else if (s.url?.trim()) lines.push('', `Source ${i + 1}: this page: ${s.url.trim()}`);
      else lines.push('', `Source ${i + 1}: the attached document (${s.filename!.trim()}).`);
    });
  } else if (several.length === 1) {
    const one = several[0];
    if (one.text?.trim()) lines.push('', 'Write only from this text, in its own order, splitting it where its headings do:', '"""', one.text.trim(), '"""');
    else if (one.url?.trim()) lines.push('', `Write from this page, in its own order: ${one.url.trim()}`);
    else lines.push('', `Write from the attached document (${one.filename!.trim()}), in its own order.`);
  } else if (input.sourceText?.trim()) {
    lines.push('', 'Write only from this text, in its own order, splitting it where its headings do:', '"""', input.sourceText.trim(), '"""');
  } else if (input.sourceUrl?.trim()) {
    lines.push('', `Write from this page, in its own order: ${input.sourceUrl.trim()}`);
  } else if (input.sourceFilename?.trim()) {
    lines.push('', `Write from the attached document (${input.sourceFilename.trim()}), in its own order.`);
  }
  lines.push(
    '',
    `Voice: ${voice.name}. ${voice.description} Match this sample as closely as you can; it matters more than any rule here.`,
    '"""',
    voice.sample.title,
    '',
    voice.sample.body,
    '"""',
    '',
    'Clear, warm, curious, never patronising. Concrete beats abstract; one specific example beats a general claim. Open each item with a hook that is true, not clickbait, and end at a deliberate stopping point.',
    `Avoid: ${TRACK_AVOID.join('; ')}.`,
    '',
    `Before you answer, score each item 1–5 on these, and rewrite anything below ${TRACK_PASSING_SCORE} once:`,
    ...Object.values(TRACK_CRITERION_QUESTIONS).map((q) => `- ${q}`),
    '',
    TRACK_PASTE_FORMAT_SPEC,
  );
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Paste track
// ---------------------------------------------------------------------------

export interface PastedTrack {
  title: string;
  description: string;
  sections: Array<{ title: string; startsAtItem: number }>;
  items: Array<{ title: string; item: TrackItemV1 }>;
  /** What was changed or left out on the way in, one line each. */
  warnings: string[];
}

export type PastedTrackResult = { ok: true; track: PastedTrack } | { ok: false; error: string };

/** "line 12" for a character offset, the way an editor counts. */
function lineOf(text: string, offset: number): number {
  return text.slice(0, Math.max(0, offset)).split('\n').length;
}

/**
 * The offset of the first character that makes `s` invalid JSON, or -1 when it is valid.
 * JSON.parse's own message gives a position on some engines and not on others.
 */
export function jsonErrorOffset(s: string): number {
  let i = 0;
  const num = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  const ws = () => {
    while (i < s.length && (s[i] === ' ' || s[i] === '\n' || s[i] === '\r' || s[i] === '\t')) i++;
  };
  const fail = (): never => {
    throw i;
  };
  const string = () => {
    i++;
    while (i < s.length) {
      const ch = s[i];
      if (ch === '\\') i += 2;
      else if (ch === '"') {
        i++;
        return;
      } else if (ch === '\n') fail();
      else i++;
    }
    fail();
  };
  const value = (): void => {
    ws();
    const c = s[i];
    if (c === '{' || c === '[') {
      const close = c === '{' ? '}' : ']';
      i++;
      ws();
      if (s[i] === close) {
        i++;
        return;
      }
      for (;;) {
        if (c === '{') {
          ws();
          if (s[i] !== '"') fail();
          string();
          ws();
          if (s[i] !== ':') fail();
          i++;
        }
        value();
        ws();
        if (s[i] === ',') i++;
        else if (s[i] === close) {
          i++;
          return;
        } else fail();
      }
    }
    if (c === '"') return string();
    num.lastIndex = i;
    const m = num.exec(s);
    if (m && m[0]) {
      i += m[0].length;
      return;
    }
    for (const lit of ['true', 'false', 'null']) {
      if (s.startsWith(lit, i)) {
        i += lit.length;
        return;
      }
    }
    fail();
  };
  try {
    value();
    ws();
    if (i < s.length) fail();
    return -1;
  } catch (at) {
    return typeof at === 'number' ? at : -1;
  }
}

/** Where the JSON goes wrong, as a line number in `text`. */
function jsonErrorLine(text: string, message: string): number | null {
  const offset = jsonErrorOffset(text);
  if (offset >= 0) return lineOf(text, offset);
  const lineCol = message.match(/line (\d+) column \d+/i);
  if (lineCol) return Number(lineCol[1]);
  const pos = message.match(/position (\d+)/i);
  if (pos) return lineOf(text, Number(pos[1]));
  return null;
}

function stripFence(text: string): { json: string; lineOffset: number } {
  const trimmed = text.replace(/^\uFEFF/, '');
  const fence = trimmed.match(/```(?:json)?[ \t]*\n?([\s\S]*?)```/i);
  if (fence) {
    const start = (fence.index ?? 0) + fence[0].indexOf(fence[1]);
    return { json: fence[1], lineOffset: lineOf(trimmed, start) - 1 };
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  // Prose before or after the object ("Here is your track:", "Hope this helps!") is left out.
  if (first >= 0 && last > first) return { json: trimmed.slice(first, last + 1), lineOffset: lineOf(trimmed, first) - 1 };
  return { json: trimmed, lineOffset: 0 };
}

function str(v: unknown, max = 20000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** A pasted check in the writer's shape (`choices` + `correctIndex`), in the lesson question shape. */
function pastedCheck(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, any>;
  const prompt = str(r.prompt, 500);
  const explanation = str(r.explanation, 800) || undefined;
  if (!prompt) return undefined;
  if (r.type === 'true_false' && typeof r.correct === 'boolean') {
    return { key: 'check', type: 'true_false', prompt, correct: r.correct, explanation };
  }
  const choices = Array.isArray(r.choices) ? r.choices.map((c: unknown) => str(c, 300)).filter(Boolean) : [];
  const i = Number(r.correctIndex);
  if (r.type !== 'multiple_choice' || choices.length < 2 || !Number.isInteger(i) || i < 0 || i >= choices.length) return undefined;
  return {
    key: 'check',
    type: 'multiple_choice',
    prompt,
    choices: choices.map((text: string, n: number) => ({ key: `c${n + 1}`, text })),
    multiSelect: false,
    correctChoiceKeys: [`c${i + 1}`],
    explanation,
  };
}

/** Reads a pasted track, or says what is wrong with it and on which line. */
export function parsePastedTrack(text: string, options: { kind?: TrackKind } = {}): PastedTrackResult {
  if (!text || !text.trim()) return { ok: false, error: 'Paste the JSON your AI app wrote.' };
  const { json, lineOffset } = stripFence(text);
  let raw: any;
  try {
    raw = JSON.parse(json);
  } catch (e: any) {
    const line = jsonErrorLine(json, String(e?.message || ''));
    return {
      ok: false,
      error: line != null ? `That isn't valid JSON: the problem is on line ${line + lineOffset}.` : "That isn't valid JSON.",
    };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Expected one JSON object with "title" and "items".' };
  if (!Array.isArray(raw.items) || raw.items.length === 0) return { ok: false, error: 'The JSON has no "items".' };

  const warnings: string[] = [];
  const items: PastedTrack['items'] = [];
  /** Pasted item number → its number here, once items without a body are left out. */
  const kept = new Map<number, number>();
  raw.items.forEach((it: any, index: number) => {
    const n = index + 1;
    const title = str(it?.title, 200) || `Item ${n}`;
    let kind: TrackItemKind = TRACK_ITEM_KINDS.includes(it?.kind) ? it.kind : 'page';
    if (!PASTE_KINDS.includes(kind)) {
      warnings.push(`Item ${n} ("${title}") was a ${kind}; it is a page here, since a pasted feed has no images.`);
      kind = 'page';
    }
    const item = parseTrackItemV1({
      kind,
      body: str(it?.body),
      // A recap picks up from the item before, so the first item kept has none.
      ...(options.kind !== 'theme' && items.length > 0 && str(it?.recap, 400) ? { recap: str(it.recap, 400) } : {}),
      ...(kind === 'reading' && it?.passage ? { passage: it.passage } : {}),
      ...(kind === 'exercise' && str(it?.answer, 4000) ? { answer: str(it.answer, 4000) } : {}),
      ...(pastedCheck(it?.check) ? { check: pastedCheck(it.check) } : {}),
      sources: Array.isArray(it?.sources) ? it.sources : [],
      pasted: true,
    });
    if (!item || !item.body) {
      warnings.push(`Item ${n} ("${title}") has no body, so it was left out.`);
      return;
    }
    items.push({ title, item });
    kept.set(n, items.length);
  });
  if (!items.length) return { ok: false, error: 'None of the items has a body.' };

  const sections: PastedTrack['sections'] = [];
  for (const s of Array.isArray(raw.sections) ? raw.sections : []) {
    const title = str(s?.title, 200);
    const pastedAt = Math.round(Number(s?.startsAtItem));
    if (!title || !Number.isFinite(pastedAt) || pastedAt < 1) continue;
    // A section whose first item was left out starts at the next one kept.
    let at: number | undefined;
    for (let n = pastedAt; n <= raw.items.length && at == null; n++) at = kept.get(n);
    if (at == null || sections.some((x) => x.startsAtItem === at)) continue;
    sections.push({ title, startsAtItem: at });
  }

  return {
    ok: true,
    track: { title: str(raw.title, 200) || 'Learning feed', description: str(raw.description, 600), sections, items, warnings },
  };
}
