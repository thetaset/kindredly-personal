import {Knex} from 'knex';
import {v4 as uuidv4} from 'uuid';

/**
 * Assistant guidelines become per child.
 *
 * Until now one set of guidelines sat on the account and governed every child the
 * assistant was switched on for, with an optional per-child override. The family-level
 * page is gone: a parent writes guidelines on the child's own Filtering page, and reuses
 * them elsewhere through a template.
 *
 * Without this migration an account that wrote family guidelines keeps them in force —
 * `resolveAssistantGuidelines` still falls back to the base entry — while no screen can
 * show or edit them. A live rule nobody can see is worse than no rule.
 *
 * So the base entry is copied into every child who was relying on it (switched on, and
 * with no override of their own), saved as a template named "Family guidelines" so it can
 * be applied to the next child, and then cleared. Every child ends up judged by exactly
 * the text that was judging them before.
 */

type Entry = {presets?: unknown[]; customText?: string};

function hasGuidelines(entry: Entry | null | undefined): boolean {
  if (!entry) return false;
  const presets = Array.isArray(entry.presets) ? entry.presets : [];
  const custom = typeof entry.customText === 'string' ? entry.customText.trim() : '';
  return presets.length > 0 || custom.length > 0;
}

export async function up(knex: Knex): Promise<void> {
  const accounts = await knex('account').select('_id', 'options').whereNotNull('options');

  for (const account of accounts) {
    const options = (account.options || {}) as Record<string, any>;
    const config = options.assistantReview as Record<string, any> | undefined;
    if (!config) continue;

    const base: Entry = {presets: config.presets, customText: config.customText};
    if (!hasGuidelines(base)) continue;

    const overrides = {...(config.overrides || {})};
    const users = await knex('user').select('_id', 'options').where({accountId: account._id});

    for (const user of users) {
      const userOptions = (user.options || {}) as Record<string, any>;
      if (userOptions.assistantReviewEnabled !== true) continue;
      if (hasGuidelines(overrides[user._id])) continue;
      overrides[user._id] = {presets: base.presets || [], customText: base.customText || ''};
    }

    const templates = [...(config.templates || [])];
    // Named for where it came from, so a parent recognises it in the picker.
    templates.push({
      id: `tpl_${uuidv4()}`,
      name: 'Family guidelines',
      entry: {presets: base.presets || [], customText: base.customText || ''},
    });

    const nextConfig = {...config, presets: [], customText: '', overrides, templates};
    await knex('account')
      .where({_id: account._id})
      .update({options: JSON.stringify({...options, assistantReview: nextConfig})});
  }
}

/**
 * Not reversible. The base entry it cleared has been copied into each child and kept as a
 * template, so nothing is lost, but which children were following the family text and
 * which had already been given their own is no longer recorded.
 */
export async function down(): Promise<void> {
  // Intentionally empty.
}
