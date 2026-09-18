import { isContentDerivedReason } from '../src/types/reason-code.utils';
import type { ReasonCode } from '../src/types/activity.types';

/**
 * Guards the gate that stops the block/retry runaway.
 *
 * A child on an Arduino page tripped the violence word list on "execution". The
 * block page polls `/access/evaluate` to notice a parent granting access, but that
 * evaluator is handed empty page content — it re-checks URL rules, check-ins,
 * library access and usage limits and nothing else. For a content-derived block it
 * therefore answers "allowed", the page navigated straight back, the content script
 * re-scanned, and it blocked again, immediately and forever.
 *
 * Anything classified here as NOT content-derived will be auto-navigated on. Adding
 * a reason to the wrong side re-opens the loop, so both sides are asserted.
 */
describe('isContentDerivedReason', () => {
  const CONTENT_DERIVED: ReasonCode[] = [
    'inappropriate',
    'adult-content',
    'strong-language',
    'inappropriate-topic',
    'violence',
    'extremism',
  ];

  // The poll CAN re-derive each of these: they come from the URL, the clock, the
  // library or the check-in state, all of which it reads directly.
  const RE_EVALUABLE: ReasonCode[] = [
    'custom-blocked-url',
    'short-form-video',
    'social-media',
    'not-in-library',
    'library-syncing',
    'no-time-given',
    'time-exceeded',
    'out-of-time-range',
    'checkpoint-pending',
    'reqs-not-met',
    'family-downtime',
    'restrict-all',
    'no-matching-rule',
    'other',
  ];

  it.each(CONTENT_DERIVED)('treats %s as content-derived', (code) => {
    expect(isContentDerivedReason(code)).toBe(true);
  });

  it.each(RE_EVALUABLE)('treats %s as re-evaluable by the poll', (code) => {
    expect(isContentDerivedReason(code)).toBe(false);
  });

  it('fails safe on an unknown or missing reason', () => {
    // Not knowing why a page was blocked must never license moving the child.
    expect(isContentDerivedReason(null)).toBe(true);
    expect(isContentDerivedReason(undefined)).toBe(true);
    expect(isContentDerivedReason('' as ReasonCode)).toBe(true);
    expect(isContentDerivedReason('some-future-code' as ReasonCode)).toBe(true);
  });

  it('covers every reason code, so a new one cannot be forgotten', () => {
    const classified = new Set([...CONTENT_DERIVED, ...RE_EVALUABLE]);
    expect(classified.size).toBe(CONTENT_DERIVED.length + RE_EVALUABLE.length);
  });
});
