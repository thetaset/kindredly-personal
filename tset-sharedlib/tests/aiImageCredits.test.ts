import {
  AI_IMAGE_CREDIT_WINDOW_MS,
  aiImageCreditsPerWeek,
  computeAiImageCredits,
} from '../src/ai-image-credits';

const now = new Date('2026-09-15T12:00:00.000Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

describe('image credits', () => {
  it('gives Standard 2 a week and Plus 6', () => {
    expect(aiImageCreditsPerWeek('standard')).toBe(2);
    expect(aiImageCreditsPerWeek(undefined)).toBe(2);
    expect(aiImageCreditsPerWeek('plus')).toBe(6);
    expect(aiImageCreditsPerWeek('superplus')).toBe(6);
  });

  it('has every credit and no refill time before any picture', () => {
    expect(computeAiImageCredits({ perWeek: 2, usedAt: [], now })).toEqual({ perWeek: 2, left: 2, nextCreditAt: null });
  });

  it('counts only the last 7 days', () => {
    const credits = computeAiImageCredits({ perWeek: 2, usedAt: [daysAgo(8), daysAgo(1)], now });
    expect(credits.left).toBe(1);
    expect(credits.nextCreditAt).toBe(new Date(daysAgo(1).getTime() + AI_IMAGE_CREDIT_WINDOW_MS).toISOString());
  });

  it('says when the oldest recent picture gives its credit back', () => {
    const credits = computeAiImageCredits({ perWeek: 2, usedAt: [daysAgo(2), daysAgo(5)], now });
    expect(credits).toEqual({
      perWeek: 2,
      left: 0,
      nextCreditAt: new Date(daysAgo(5).getTime() + AI_IMAGE_CREDIT_WINDOW_MS).toISOString(),
    });
  });

  it('counts requests still running against what is left', () => {
    expect(computeAiImageCredits({ perWeek: 2, usedAt: [daysAgo(1)], held: 1, now }).left).toBe(0);
  });

  it('after a plan moves down, waits for the credit that brings the count under the allowance', () => {
    const usedAt = [daysAgo(6), daysAgo(5), daysAgo(4), daysAgo(3)];
    const credits = computeAiImageCredits({ perWeek: 2, usedAt, now });
    expect(credits.left).toBe(0);
    expect(credits.nextCreditAt).toBe(new Date(daysAgo(4).getTime() + AI_IMAGE_CREDIT_WINDOW_MS).toISOString());
  });
});
