import {
  FAMILY_AI_SETTINGS_OFFERED,
  familyAiRefusalMessage,
  familyAiSetting,
  familyAllowsHostedAi,
  familyAllowsPrivateAi,
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
