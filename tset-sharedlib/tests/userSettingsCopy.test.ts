import { buildContentFilteringCopySnapshot } from '../src/restrictions/userSettingsCopy'

describe('buildContentFilteringCopySnapshot', () => {
  test('forces removed short-form and social blocking flags off in copied filters', () => {
    const snapshot = buildContentFilteringCopySnapshot(
      {
        whitelistingEnabled: false,
        contentFilteringEnabled: true,
      },
      {
        'filters.strictnessPresetId': 'custom',
        'filters.contentFilters': {
          blockShortFormVideo: true,
          blockSocialMedia: true,
          blockInappropriateTopics: true,
        },
      },
      'restricted',
    )

    const filters = snapshot.preferenceUpdates?.['filters.contentFilters'] as Record<string, unknown>

    expect(filters.blockShortFormVideo).toBe(false)
    expect(filters.blockSocialMedia).toBe(false)
    expect(filters.blockInappropriateTopics).toBe(true)
  })
})