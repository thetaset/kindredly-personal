import {
  FAMILY_AI_SETTINGS_OFFERED,
  familyAiRefusalMessage,
  familyAiSetting,
  familyAllowsHostedAi,
  familyAllowsPrivateAi,
  personAllowsAiTools,
  personAllowsAnyAi,
  personAllowsKinbot,
  personAllowsWebSearch,
} from '../src/family-ai';

describe('the family AI setting', () => {
  it('reads as Off for a family that never chose', () => {
    expect(familyAiSetting(undefined)).toBe('off');
    expect(familyAiSetting(null)).toBe('off');
    expect(familyAiSetting({})).toBe('off');
    expect(familyAiSetting({ aiSetting: null })).toBe('off');
  });

  it('reads anything it does not understand as Off, never On', () => {
    expect(familyAiSetting({ aiSetting: 'ON' })).toBe('off');
    expect(familyAiSetting({ aiSetting: true })).toBe('off');
    expect(familyAiSetting({ aiSetting: 'everything' })).toBe('off');
  });

  it('reads Settings only as Off until PLN-11 offers it', () => {
    expect(FAMILY_AI_SETTINGS_OFFERED).not.toContain('settingsOnly');
    expect(familyAiSetting({ aiSetting: 'settingsOnly' })).toBe('off');
  });

  it('offers Off, Private AI only and On, in that order', () => {
    expect(FAMILY_AI_SETTINGS_OFFERED).toEqual(['off', 'privateOnly', 'on']);
    for (const value of FAMILY_AI_SETTINGS_OFFERED) {
      expect(familyAiSetting({ aiSetting: value })).toBe(value);
    }
  });

  it('lets only On reach Kindredly.ai', () => {
    expect(familyAllowsHostedAi('on')).toBe(true);
    expect(familyAllowsHostedAi('privateOnly')).toBe(false);
    expect(familyAllowsHostedAi('off')).toBe(false);
  });

  it('allows private AI on Private AI only and On, and nothing on Off', () => {
    expect(familyAllowsPrivateAi('on')).toBe(true);
    expect(familyAllowsPrivateAi('privateOnly')).toBe(true);
    expect(familyAllowsPrivateAi('off')).toBe(false);
  });

  it('says which setting refused a Kindredly.ai request', () => {
    expect(familyAiRefusalMessage('off')).toBe('AI is off for your family. An admin can turn it on in Family settings.');
    expect(familyAiRefusalMessage('privateOnly')).toMatch(/private AI only/);
  });
});

/** Founder, 2026-09-18: a child's AI tools stay off until a parent turns them on; an adult's are on. */
describe("a person's AI switches", () => {
  const child = (options: Record<string, unknown> = {}) => ({ type: 'restricted', options });
  const adult = (options: Record<string, unknown> = {}) => ({ type: 'admin', options });

  it("keeps a child's AI tools off until a parent turns them on", () => {
    expect(personAllowsAiTools(child())).toBe(false);
    expect(personAllowsAiTools({ type: 'restricted', options: null })).toBe(false);
    expect(personAllowsAiTools(child({ aiToolsEnabled: false }))).toBe(false);
    expect(personAllowsAiTools(child({ aiToolsEnabled: true }))).toBe(true);
  });

  it("keeps an adult's AI tools on unless they are turned off", () => {
    expect(personAllowsAiTools(adult())).toBe(true);
    expect(personAllowsAiTools(adult({ aiToolsEnabled: false }))).toBe(false);
  });

  it('never turns Kinbot on by default, for anyone', () => {
    expect(personAllowsKinbot(adult())).toBe(false);
    expect(personAllowsKinbot(child())).toBe(false);
    expect(personAllowsKinbot(child({ aiChatEnabled: true }))).toBe(true);
  });

  // HAT-288: a search sends the question out, so nobody has it until an admin turns it on.
  it('keeps web search off for everyone until it is turned on, and never without Kinbot', () => {
    expect(personAllowsWebSearch(adult({ aiChatEnabled: true }))).toBe(false);
    expect(personAllowsWebSearch(child({ aiChatEnabled: true }))).toBe(false);
    expect(personAllowsWebSearch(adult({ aiChatEnabled: true, aiWebSearchEnabled: true }))).toBe(true);
    expect(personAllowsWebSearch(child({ aiChatEnabled: true, aiWebSearchEnabled: true }))).toBe(true);
    expect(personAllowsWebSearch(adult({ aiWebSearchEnabled: true }))).toBe(false);
    expect(personAllowsWebSearch(null)).toBe(false);
  });

  it('lets a child with only Kinbot, or only AI tools, use some AI, and one with neither none', () => {
    expect(personAllowsAnyAi(child())).toBe(false);
    expect(personAllowsAnyAi(child({ aiChatEnabled: true }))).toBe(true);
    expect(personAllowsAnyAi(child({ aiToolsEnabled: true }))).toBe(true);
  });
});
