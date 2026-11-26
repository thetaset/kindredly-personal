/**
 * HAT-1092: what a limit leaves out, as a device compiles it. A malformed entry in `excludes` is
 * skipped, as the browser (`checkRuleConditions`) and Guard (`objects()`) skip it, rather than
 * stopping the whole compile.
 */
import { excludedAppIds } from '../src/deviceguard/deviceRuleCompiler';
import type { AppCatalogEntry } from '../src/deviceguard/deviceAppPolicy';
import type { LimitRule } from '../src/types/usage-limits.types';

const catalog = [
  { pkg: 'com.roblox.client', label: 'Roblox', categoryId: 'games', eduValue: 'eduval_fun' },
  { pkg: 'com.google.android.youtube', label: 'YouTube', categoryId: 'video', eduValue: 'eduval_fun' },
] as AppCatalogEntry[];

describe('excludedAppIds', () => {
  it('skips a null entry and still reads the rest', () => {
    const rule = { id: 'simple-entertainment', name: 'E', type: 'usage_only', conditions: [],
      excludes: [null, { type: 'attribute', values: ['game'] }] } as unknown as LimitRule;
    expect([...excludedAppIds(rule, catalog)]).toEqual(['android:com.roblox.client']);
  });

  it('leaves no app out for Task-Related items in their library: an app is never a library item', () => {
    const rule = { id: 'simple-overall', name: 'Overall', type: 'all', conditions: [],
      excludes: [{ type: 'libraryItem', values: ['eduval_task'] }] } as unknown as LimitRule;
    expect([...excludedAppIds(rule, catalog)]).toEqual([]);
  });
});
