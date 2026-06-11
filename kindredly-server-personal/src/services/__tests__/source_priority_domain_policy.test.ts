import {findSourcePriorityDomainRule} from '@/services/source_priority_domain_policy';

describe('source_priority_domain_policy', () => {
  it('returns null for invalid url', () => {
    expect(findSourcePriorityDomainRule('not-a-valid-url')).toBeNull();
  });

  it('matches educational wikipedia domains including subdomains', () => {
    const result = findSourcePriorityDomainRule('https://en.wikipedia.org/wiki/Photosynthesis');

    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('wikipedia-educational');
    expect(result?.rule.eduValue).toBe('eduval_educational');
    expect(result?.matchedDomain).toBe('wikipedia.org');
  });

  it('matches github as task-oriented in the small curated set', () => {
    const result = findSourcePriorityDomainRule('https://github.com/kindredly/thetaset/issues');

    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('github-task');
    expect(result?.rule.eduValue).toBe('eduval_task');
  });

  it('uses short-form path rule for reels/shorts pages over generic social domain rule', () => {
    const result = findSourcePriorityDomainRule('https://www.instagram.com/reels/abc123/');

    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('short-form-video-pages');
    expect(result?.rule.eduValue).toBe('eduval_junk');
    expect(result?.rule.topics).toContain('topic_short_video_infinite_scroll');
  });

  it('does not pre-classify non-short-form instagram pages', () => {
    const result = findSourcePriorityDomainRule('https://www.instagram.com/explore/');

    expect(result).toBeNull();
  });

  it('classifies tiktok feed as junk and marks it context dependent', () => {
    const result = findSourcePriorityDomainRule('https://www.tiktok.com/@creator/video/12345');

    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('tiktok-junk-social');
    expect(result?.rule.eduValue).toBe('eduval_junk');
    expect(result?.rule.flags).toContain('content_context_dependent');
  });
});
