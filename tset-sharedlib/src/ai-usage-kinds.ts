/**
 * What a family's Kindredly.ai use was for, grouped the way a parent thinks about it rather than by
 * the metering feature name each call is recorded under (`ai_usage_log.feature`).
 *
 * The server groups a week's calls with `aiUsageKindOfFeature`, and the AI Usage page lists the
 * kinds in `AI_USAGE_KIND_ORDER`, so a feature named here is counted and shown the same way on both
 * sides. A metered feature missing from the map counts as `other` — still counted, never dropped.
 */

export type AiUsageKind = 'assistant' | 'tools' | 'requestReview' | 'lessons' | 'tracks' | 'images' | 'other';

/** The order the AI Usage page lists them in. */
export const AI_USAGE_KIND_ORDER: readonly AiUsageKind[] = [
  'assistant',
  'tools',
  'requestReview',
  'lessons',
  'tracks',
  'images',
  'other',
];

/**
 * Metering feature → kind. The names are the ones the server's routes and task helpers meter under
 * (`aiCostGuard({feature})`, `withAiMetering(ctx, feature, …)`).
 */
const FEATURE_KIND: Readonly<Record<string, AiUsageKind>> = {
  // AI Chat, the command bar and the agent's tool loop.
  chatStream: 'assistant',
  'aitask.agentInteraction': 'assistant',
  'aitask.stream.agentInteraction': 'assistant',
  // Suggestions, extraction and the other one-shot helpers across the app.
  textRequest: 'tools',
  'aitask.accessRequestReview': 'requestReview',
  'aitask.lessonGenLesson': 'lessons',
  'aitask.lessonCheck': 'lessons',
  'aitask.lessonGradeAnswer': 'lessons',
  // Learning tracks: planning, writing and checking items (TRK-17).
  'aitask.trackSyllabus': 'tracks',
  'aitask.trackWrite': 'tracks',
  'aitask.trackImprove': 'tracks',
  // The feed builder's chat, which plans and edits a feed with the parent (HAT-757).
  'chatStream.feedBuilder': 'tracks',
  // Lesson Builder's chat, which writes and edits a lesson with the parent (HAT-762).
  'chatStream.lessonBuilder': 'lessons',
  'aitask.imageGeneration': 'images',
};

export function aiUsageKindOfFeature(feature: string | null | undefined): AiUsageKind {
  return (feature && FEATURE_KIND[feature]) || 'other';
}
