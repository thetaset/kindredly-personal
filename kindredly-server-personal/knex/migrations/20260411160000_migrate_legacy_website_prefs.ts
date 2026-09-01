import { Knex } from 'knex'

const LEGACY_TO_EXPLICIT_KEYS: Record<string, string[]> = {
  youtubeNoDistractionsEnabled: [
    'youtubeHideSearch',
    'youtubeHideComments',
    'youtubeHideRecommendations',
    'youtubeHideOtherDistractions',
  ],
  redditNoDistractionsEnabled: [
    'redditHideSearch',
    'redditHideComments',
    'redditHideOtherDistractions',
  ],
}

function normalizeLegacyValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    if (trimmed === 'null') return null

    try {
      const parsed = JSON.parse(trimmed)
      return typeof parsed === 'boolean' ? parsed : null
    } catch {
      return null
    }
  }

  return null
}

export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const legacyKeys = Object.keys(LEGACY_TO_EXPLICIT_KEYS)
    const legacyRows = await trx('user_pref')
      .select('_id', 'userId', 'key', 'value')
      .whereIn('key', legacyKeys)

    for (const row of legacyRows) {
      const legacyValue = normalizeLegacyValue(row.value)
      const explicitKeys = LEGACY_TO_EXPLICIT_KEYS[row.key] || []

      if (legacyValue === true || legacyValue === false) {
        const existingRows = explicitKeys.length === 0
          ? []
          : await trx('user_pref')
            .select('key')
            .where({ userId: row.userId })
            .whereIn('key', explicitKeys)

        const existingKeys = new Set(existingRows.map((existingRow) => String(existingRow.key)))
        const now = new Date()

        for (const explicitKey of explicitKeys) {
          if (existingKeys.has(explicitKey)) {
            continue
          }

          await trx('user_pref')
            .insert({
              _id: `${row.userId}-${explicitKey}`,
              userId: row.userId,
              key: explicitKey,
              value: JSON.stringify(legacyValue),
              updatedAt: now,
            })
            .onConflict('_id')
            .merge({
              value: JSON.stringify(legacyValue),
              updatedAt: now,
            })
        }
      }

      await trx('user_pref').where({ _id: row._id }).delete()
    }
  })
}

export async function down(_knex: Knex): Promise<void> {
  console.log('Skipping rollback for legacy website pref migration to avoid recreating removed coarse-grained settings')
}