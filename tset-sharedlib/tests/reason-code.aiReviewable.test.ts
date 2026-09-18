import type { ReasonCode } from '../src/types/activity.types';
import {
  AI_REVIEWABLE_REASON_CODES,
  isAiReviewableReasonCode,
} from '../src/types/reason-code.utils';

describe('isAiReviewableReasonCode', () => {
  it('reviews the judgment calls a parent could have written down in advance', () => {
    const reviewable: ReasonCode[] = [
      'not-in-library',
      'inappropriate-topic',
      'social-media',
      'short-form-video',
      'other',
    ];
    for (const code of reviewable) expect(isAiReviewableReasonCode(code)).toBe(true);
  });

  // A parent's own block rule is already their answer; re-deciding it would let a
  // child route around a decision that has been made.
  it('never reviews a rule the parent wrote themselves', () => {
    expect(isAiReviewableReasonCode('custom-blocked-url')).toBe(false);
  });

  it('never reviews a safety block', () => {
    const safety: ReasonCode[] = [
      'adult-content',
      'violence',
      'extremism',
      'strong-language',
      'inappropriate',
      'restrict-all',
    ];
    for (const code of safety) expect(isAiReviewableReasonCode(code)).toBe(false);
  });

  // Nothing about a site's content answers "you are out of time" or "you owe a
  // check-in", so a review would be a category error, not just a wasted call.
  it('never reviews a time or check-in gate', () => {
    const gates: ReasonCode[] = [
      'time-exceeded',
      'no-time-given',
      'out-of-time-range',
      'no-matching-rule',
      'reqs-not-met',
      'checkpoint-pending',
      'library-syncing',
    ];
    for (const code of gates) expect(isAiReviewableReasonCode(code)).toBe(false);
  });

  // Opposite default to isContentDerivedReason, and deliberately so: the worst
  // case here is a request the assistant hands to the parent anyway.
  it('allows a missing code, which is what a plain url request carries', () => {
    expect(isAiReviewableReasonCode(null)).toBe(true);
    expect(isAiReviewableReasonCode(undefined)).toBe(true);
  });

  it('is an allowlist, so a reason added later is not reviewable until someone decides', () => {
    expect(AI_REVIEWABLE_REASON_CODES.has('made-up-future-code' as ReasonCode)).toBe(false);
    expect(isAiReviewableReasonCode('made-up-future-code' as ReasonCode)).toBe(false);
  });
});
