import { AI_USAGE_KIND_ORDER, aiUsageKindOfFeature } from '../src/ai-usage-kinds';

describe('what a family used AI for', () => {
  it('groups the metering features a parent would call one thing', () => {
    expect(aiUsageKindOfFeature('chatStream')).toBe('assistant');
    expect(aiUsageKindOfFeature('aitask.agentInteraction')).toBe('assistant');
    expect(aiUsageKindOfFeature('aitask.stream.agentInteraction')).toBe('assistant');
    expect(aiUsageKindOfFeature('textRequest')).toBe('tools');
    expect(aiUsageKindOfFeature('aitask.accessRequestReview')).toBe('requestReview');
    expect(aiUsageKindOfFeature('aitask.lessonGenLesson')).toBe('lessons');
    expect(aiUsageKindOfFeature('aitask.lessonGradeAnswer')).toBe('lessons');
    expect(aiUsageKindOfFeature('aitask.imageGeneration')).toBe('images');
    // The Learning feed builder's chat is counted with the feed's own writing (HAT-757).
    expect(aiUsageKindOfFeature('chatStream.feedBuilder')).toBe('tracks');
  });

  // A feature added later and not named here is still counted — as Other, never dropped.
  it('counts anything it does not name as other', () => {
    expect(aiUsageKindOfFeature('aitask.somethingNew')).toBe('other');
    expect(aiUsageKindOfFeature('unscoped')).toBe('other');
    expect(aiUsageKindOfFeature(null)).toBe('other');
    expect(aiUsageKindOfFeature(undefined)).toBe('other');
  });

  it('lists every kind once, with Other last', () => {
    expect(new Set(AI_USAGE_KIND_ORDER).size).toBe(AI_USAGE_KIND_ORDER.length);
    expect(AI_USAGE_KIND_ORDER[AI_USAGE_KIND_ORDER.length - 1]).toBe('other');
  });
});
