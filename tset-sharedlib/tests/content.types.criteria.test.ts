import {
  getCriteriaTagDetail,
  getCriteriaTagShortName,
  getUseCriteriaObjWithKeys,
  hasAttentionTraps,
  adsTagList,
  costTagList,
  designTagList,
  audienceRoleTagList,
  freshnessTagList,
} from '../src/content.types';

describe('criteria tag metadata + short names', () => {
  test('ads/cost tags carry color + icon for chip rendering', () => {
    for (const tag of [...adsTagList, ...costTagList]) {
      expect(tag.color).toBeTruthy();
      expect(tag.icon).toBeTruthy();
    }
  });

  test('getCriteriaTagDetail returns the option detail', () => {
    expect(getCriteriaTagDetail('ads_no')?.name).toBe('No Ads');
    expect(getCriteriaTagDetail('cost_free')?.color).toBeTruthy();
    expect(getCriteriaTagDetail('not_a_tag')).toBeUndefined();
  });

  test('getCriteriaTagShortName prefers selectedName', () => {
    expect(getCriteriaTagShortName('ads_h')).toBe('Heavy Ads');
    expect(getCriteriaTagShortName('cost_freewithpaid')).toBe('Partial');
    expect(getCriteriaTagShortName('cost_free')).toBe('Free');
    expect(getCriteriaTagShortName('not_a_tag')).toBeUndefined();
  });

  test('design / audience / freshness tags carry color + icon for chip rendering', () => {
    for (const tag of [...designTagList, ...audienceRoleTagList, ...freshnessTagList]) {
      expect(tag.color).toBeTruthy();
      expect(tag.icon).toBeTruthy();
    }
  });

  test('new facet tags resolve via getCriteriaTagDetail', () => {
    expect(getCriteriaTagDetail('design_noisy')?.name).toBe('Very distracting & noisy');
    expect(getCriteriaTagDetail('dtag_kidfriendly')?.selectedName).toBe('Kid-friendly');
    expect(getCriteriaTagDetail('aud_educator')?.name).toBe('For teachers');
    expect(getCriteriaTagDetail('fresh_outdated')?.selectedName).toBe('Outdated');
  });
});

describe('useCriteria partitioning — design / audience / freshness facets', () => {
  test('routes each new prefix to the right field without cross-matching', () => {
    const parts = getUseCriteriaObjWithKeys([
      'design_busy',
      'dtag_kidfriendly',
      'aud_educator',
      'aud_parent',
      'fresh_outdated',
      'ta_kids',
      'ads_h',
    ]);
    expect(parts.design).toBe('design_busy');
    expect(parts.designTags).toEqual(['dtag_kidfriendly']);
    expect(parts.audienceRoles).toEqual(['aud_educator', 'aud_parent']);
    expect(parts.freshness).toBe('fresh_outdated');
    // audience-role tags must NOT leak into the age-based targetAudiences / ads fields.
    expect(parts.targetAudiences).toEqual(['ta_kids']);
    expect(parts.ads).toBe('ads_h');
  });

  test('design + freshness are single-valued (last write wins)', () => {
    const parts = getUseCriteriaObjWithKeys(['design_clean', 'design_noisy', 'fresh_active', 'fresh_aging']);
    expect(parts.design).toBe('design_noisy');
    expect(parts.freshness).toBe('fresh_aging');
  });

  test('empty / unknown input yields empty collections', () => {
    const parts = getUseCriteriaObjWithKeys([]);
    expect(parts.design).toBeUndefined();
    expect(parts.freshness).toBeUndefined();
    expect(parts.designTags).toEqual([]);
    expect(parts.audienceRoles).toEqual([]);
  });
});

describe('hasAttentionTraps', () => {
  test('true when a known attention-trap tag is present', () => {
    expect(hasAttentionTraps(['eduval_educational', 'intent_doomscroll'])).toBe(true);
    expect(hasAttentionTraps(['topic_short_video_infinite_scroll'])).toBe(true);
  });

  test('false for clean content or empty/null input', () => {
    expect(hasAttentionTraps(['eduval_educational', 'design_clean', 'aud_educator'])).toBe(false);
    expect(hasAttentionTraps([])).toBe(false);
    expect(hasAttentionTraps(null)).toBe(false);
    expect(hasAttentionTraps(undefined)).toBe(false);
  });
});
