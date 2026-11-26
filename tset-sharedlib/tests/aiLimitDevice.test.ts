/**
 * HAT-1359: the AI limit on a phone or computer. Its `ai` attribute names the listed AI apps, as a
 * named game names its apps; beside a site or library item it is narrowed to those on the web, so it
 * names no apps.
 */
import { isDeviceAppRule, resolveAppIds } from '../src/deviceguard/deviceRuleCompiler';
import { AI_APP_IDS, AI_LIMIT_RULE_ID } from '../src/restrictions/ai';
import { HELPER_LIMIT_RULE_ID } from '../src/helper-ai';
import type { LimitRule } from '../src/types/usage-limits.types';

const aiRule = (extra: unknown[] = []) => ({
  id: AI_LIMIT_RULE_ID, name: 'AI', type: 'usage_only',
  conditions: [{ type: 'attribute', values: ['ai'] }, ...extra],
  timeLimits: [{ hours: 0.5, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
}) as unknown as LimitRule;

describe('the AI limit on a device', () => {
  it('keeps the Helper AI limit’s rule id, so a saved one carries over', () => {
    expect(AI_LIMIT_RULE_ID).toBe(HELPER_LIMIT_RULE_ID);
  });

  it('names the listed AI apps with no catalog, and reaches the device', () => {
    expect(isDeviceAppRule(aiRule(), [])).toBe(true);
    expect(resolveAppIds(aiRule(), [])).toEqual([...AI_APP_IDS]);
    expect(isDeviceAppRule(aiRule(), [], 'blocksOnly')).toBe(true);
  });

  it('names no apps beside a site, and a video limit still names none', () => {
    expect(isDeviceAppRule(aiRule([{ type: 'urlPatterns', values: ['chatgpt.com'] }]), [])).toBe(false);
    const video = { id: 'v', name: 'Video', type: 'usage_only', conditions: [{ type: 'attribute', values: ['videoPlaying'] }] } as unknown as LimitRule;
    expect(isDeviceAppRule(video, [])).toBe(false);
  });
});
