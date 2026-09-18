import type { ReasonCode } from '../src/types/activity.types';
import {
  AI_RECLASSIFY_REASON_CODES,
  isAiReclassifyReasonCode,
  isAiReviewableReasonCode,
} from '../src/types/reason-code.utils';

describe('isAiReclassifyReasonCode', () => {
  // The only two that mean "the budget for a CATEGORY ran out", which is the one
  // question a look at the page can answer.
  it('reconsiders a category whose budget ran out', () => {
    expect(isAiReclassifyReasonCode('no-time-given')).toBe(true);
    expect(isAiReclassifyReasonCode('time-exceeded')).toBe(true);
  });

  // The hour is what is wrong, not the category, and a gate the parent set is not
  // a category call at all.
  it('never reconsiders a schedule block or an unmet requirement', () => {
    expect(isAiReclassifyReasonCode('out-of-time-range')).toBe(false);
    expect(isAiReclassifyReasonCode('reqs-not-met')).toBe(false);
    expect(isAiReclassifyReasonCode('checkpoint-pending')).toBe(false);
  });

  it('never reconsiders a safety block or a rule the parent wrote', () => {
    const refused: ReasonCode[] = ['adult-content', 'violence', 'custom-blocked-url', 'restrict-all'];
    for (const code of refused) expect(isAiReclassifyReasonCode(code)).toBe(false);
  });

  // Opposite default to isAiReviewableReasonCode, and deliberately so: widening a
  // category changes what a child may do for the rest of the day, so it needs a
  // stated reason to be about a category at all.
  it('refuses a missing code', () => {
    expect(isAiReclassifyReasonCode(null)).toBe(false);
    expect(isAiReclassifyReasonCode(undefined)).toBe(false);
  });

  it('is an allowlist, so a reason added later is not reclassifiable until someone decides', () => {
    expect(AI_RECLASSIFY_REASON_CODES.has('made-up-future-code' as ReasonCode)).toBe(false);
    expect(isAiReclassifyReasonCode('made-up-future-code' as ReasonCode)).toBe(false);
  });

  // Two lists, two questions. A site request is never answered by moving its
  // category, and a category block is never answered by opening the site.
  it('shares no code with the list of blocks the assistant may open', () => {
    for (const code of AI_RECLASSIFY_REASON_CODES) {
      expect(isAiReviewableReasonCode(code)).toBe(false);
    }
  });
});
