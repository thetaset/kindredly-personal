/**
 * Image credits: how many images Kindredly.ai's image service will still make for a family.
 *
 * One rule, read by the server when it admits a picture and by the pages that show the count
 * before anyone asks for one, so the number a parent reads is the number that decides.
 *
 * A credit comes back 7 days after the picture that used it. There is no weekly reset to
 * explain: "next one back Tue 3:10 PM" is the time the oldest picture in the last 7 days
 * turns 7 days old.
 */
import { getSharedPlanPolicy } from './plan-policy';

export const AI_IMAGE_CREDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** The 429 `errorType` when a family has no credits left. */
export const AI_IMAGE_CREDITS_USED = 'AI_IMAGE_CREDITS_USED';

/**
 * The 428 `errorType` when the assistant is not turned on for the person asking. Images need the
 * assistant on (founder, 2026-09-15): the same parent switch, `user.options.aiChatEnabled`.
 */
export const AI_ASSISTANT_OFF = 'AI_ASSISTANT_OFF';

export type AiImageCredits = {
  /** The plan's weekly allowance. */
  perWeek: number;
  left: number;
  /** When the next credit comes back (ISO). Null when none has been used in the last 7 days. */
  nextCreditAt: string | null;
  /**
   * Kindredly staff turned hosted AI off for the family: no image is made whatever `left` says,
   * so the pages say that instead of a count.
   */
  stopped?: boolean;
};

export function aiImageCreditsPerWeek(accountType: string | null | undefined): number {
  return getSharedPlanPolicy(accountType).aiImages.creditsPerWeek;
}

/**
 * Credits left from the times pictures were made, plus requests still running (`held`).
 *
 * `usedAt` may include older pictures; only the last 7 days count. When more pictures were made
 * than the plan now allows (a family that moved from Plus to Standard), the next credit is the
 * one that brings the count under the allowance, not simply the oldest.
 */
export function computeAiImageCredits(input: {
  perWeek: number;
  usedAt: Date[];
  held?: number;
  now: Date;
}): AiImageCredits {
  const perWeek = Math.max(0, Math.floor(input.perWeek));
  const since = input.now.getTime() - AI_IMAGE_CREDIT_WINDOW_MS;
  const recent = input.usedAt
    .map((d) => d.getTime())
    .filter((t) => Number.isFinite(t) && t > since)
    .sort((a, b) => a - b);
  const held = Math.max(0, Math.floor(input.held || 0));
  const left = Math.max(0, perWeek - recent.length - held);

  let nextCreditAt: string | null = null;
  if (recent.length > 0) {
    const index = Math.min(recent.length - 1, Math.max(0, recent.length - perWeek));
    nextCreditAt = new Date(recent[index] + AI_IMAGE_CREDIT_WINDOW_MS).toISOString();
  }
  return { perWeek, left, nextCreditAt };
}
