import type {NextFunction, Request, Response} from 'express';
import {RequestContext} from '@/base/request_context';
import {AI_OFF_FOR_PERSON, personAllowsAiTools} from 'tset-sharedlib/family-ai';
import {getSharedPlanPolicy} from 'tset-sharedlib/plan-policy';
import {FEED_BUILDER_CHAT_MODE, FEED_BUILDER_UNAVAILABLE} from 'tset-sharedlib/track-generation';
import {LESSON_BUILDER_CHAT_MODE, LESSON_BUILDER_UNAVAILABLE} from 'tset-sharedlib/lesson-authoring';

export const CONTENT_AUTHORING_PLUS_MESSAGE = 'Writing lessons and learning feeds with Kindredly AI is part of Plus.';

/**
 * Kindredly AI writing lessons and learning tracks is Plus only (`readiness.contentAuthoring`;
 * learning tracks decision 3, TRK-17).
 *
 * The client hid Lesson Builder from Standard, but the server never checked, so any signed-in
 * account could call the routes (observation 99). Mount it after `authenticateJWT` and before
 * `aiCostGuard`, so a refused request never takes a hold on the family's AI limits.
 *
 * Grading a lesson's free-response answer is not authoring: it runs while any family takes a
 * lesson, and stays on every plan.
 *
 * It is also an AI tool, so the person's AI tools switch has to allow it: a child makes a track or a
 * lesson only when a parent has turned AI tools on for them (founder, 2026-09-24, learning tracks
 * Q1). The cost guard admits anyone with AI tools or Kinbot, so a child with only Kinbot on would
 * otherwise reach these routes by their address.
 */
export async function requireContentAuthoring(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const account = await RequestContext.instance(req).getAccount();
    if (getSharedPlanPolicy(account?.accountType).readiness.contentAuthoring !== true) {
      // errorHelper's shape: a 403 is a soft status (HTTP 200, code in the body).
      res.json({success: false, message: CONTENT_AUTHORING_PLUS_MESSAGE, statusCode: 403});
      return;
    }
    const user = await RequestContext.instance(req).getCurrentUser();
    if (!personAllowsAiTools(user)) {
      res.status(428).json({
        success: false,
        errorType: AI_OFF_FOR_PERSON,
        message:
          user?.type === 'restricted'
            ? 'AI tools are off for you. Ask a parent to turn them on.'
            : 'AI tools are off for you.',
      });
      return;
    }
    next();
  } catch (error: any) {
    console.error('[content_authoring] could not check the plan', error);
    if (!res.headersSent) res.status(500).json({success: false, message: 'Could not check the plan.', statusCode: 500});
  }
}

/** The builder chats: Kinbot making one learning feed (HAT-757) or one lesson (HAT-762) with an adult. */
const BUILDER_CHATS: Record<string, {errorType: string; forParents: string}> = {
  [FEED_BUILDER_CHAT_MODE]: {errorType: FEED_BUILDER_UNAVAILABLE, forParents: 'The feed builder chat is for parents.'},
  [LESSON_BUILDER_CHAT_MODE]: {
    errorType: LESSON_BUILDER_UNAVAILABLE,
    forParents: 'The lesson builder chat is for parents.',
  },
};

/**
 * A builder chat (the Learning feed's, HAT-757; Lesson Builder's, HAT-762) is Kinbot making a feed or
 * a lesson with an adult: that is content authoring, so Plus and AI tools on, as
 * `requireContentAuthoring`; and never a child, by the founder's rule that no AI talks directly with a
 * child. Any other chat passes untouched.
 *
 * Mount it on `/ai/sendMessageStream` after `authenticateJWT` and before `aiCostGuard`, so a refused
 * turn takes no hold on the family's limits. Refusals are 428, never 403: installed clients sign out
 * on an auth status.
 */
export async function requireBuilderChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  const chat = BUILDER_CHATS[String((req.body as any)?.mode || '')];
  if (!chat) {
    next();
    return;
  }
  const refuse = (message: string) => {
    res.status(428).json({success: false, errorType: chat.errorType, message});
  };
  try {
    const user = await RequestContext.instance(req).getCurrentUser();
    if (user?.type === 'restricted') return refuse(chat.forParents);
    const account = await RequestContext.instance(req).getAccount();
    if (getSharedPlanPolicy(account?.accountType).readiness.contentAuthoring !== true) {
      return refuse(CONTENT_AUTHORING_PLUS_MESSAGE);
    }
    if (!personAllowsAiTools(user)) return refuse('AI tools are off for you.');
    next();
  } catch (error: any) {
    console.error('[content_authoring] could not check the builder chat', error);
    if (!res.headersSent) res.status(500).json({success: false, message: 'Could not check the plan.', statusCode: 500});
  }
}
