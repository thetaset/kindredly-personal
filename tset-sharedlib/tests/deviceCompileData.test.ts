/**
 * The data a device's own rule compiler needs, generated from sharedlib (DCP-7).
 *
 * Guard compiles settings natively in Kotlin (D2) and must classify apps exactly as sharedlib does:
 * the curated seed map, each category's default usage bucket, Android's declared categories, and
 * the safety floors. Hand-copying ~450 seed entries into Kotlin would drift, so this test writes
 * them to `src/deviceguard/generated/device-compile-data.json`, which Guard packages as an asset
 * (`companion/build.gradle.kts`), and fails when the file is stale.
 *
 * Regenerate after changing the seed map or the category table:
 *   cd tset-sharedlib && UPDATE_DEVICE_COMPILE_DATA=1 npx jest tests/deviceCompileData.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { APP_CATEGORY_SEED } from '../src/kinds/appCategorySeed';
import {
  ANDROID_CATEGORY_TO_APP_CATEGORY,
  APP_CATEGORY_DEFS,
  DEVICE_SAFETY_FLOOR_MACOS,
  DEVICE_SAFETY_FLOOR_STATIC,
} from '../src/kinds/appCategories';
import { DEFAULT_SAFETY_ALLOWLIST } from '../src/deviceguard/deviceRuleCompiler';
import { DEVICE_PLATFORMS } from '../src/restrictions/deviceAppIds';
import { NOT_SCREEN_TIME_ANDROID } from '../src/deviceguard/notScreenTime';
import { GAMES_LIST } from '../src/restrictions/gamesList';
import {
  EARN_ACCESS_COUNTABLE_EDU_VALUES,
  EARN_ACCESS_HOLDS,
  earnAccessHoldCondition,
} from '../src/restrictions/earnAccess';

const OUT = path.resolve(__dirname, '../src/deviceguard/generated/device-compile-data.json');

function build() {
  return {
    generatedBy: 'tset-sharedlib/tests/deviceCompileData.test.ts — regenerate, never edit by hand',
    categoryDefaultEduValue: Object.fromEntries(APP_CATEGORY_DEFS.map((c) => [c.id, c.defaultEduValue])),
    androidCategoryToAppCategory: ANDROID_CATEGORY_TO_APP_CATEGORY,
    appCategorySeed: Object.fromEntries(Object.entries(APP_CATEGORY_SEED).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    safetyFloorAndroid: [...DEVICE_SAFETY_FLOOR_STATIC],
    safetyFloorMacos: [...DEVICE_SAFETY_FLOOR_MACOS],
    // Phone apps whose time counts toward no limit (HAT-952).
    notScreenTimeAndroid: [...NOT_SCREEN_TIME_ANDROID],
    defaultSafetyAllowlist: [...DEFAULT_SAFETY_ALLOWLIST],
    devicePlatforms: [...DEVICE_PLATFORMS],
    // A limit on one game names it by id (HAT-634); its apps on every platform, from the games list.
    gameApps: Object.fromEntries(GAMES_LIST.map((game) => [game.id, [...game.apps]])),
    // Earn access (HAT-836): what each hold matches, in the order rules list them, and the Usage
    // types a minutes step may count (a step counting none is dropped, as `normalizeEarnAccessRule`
    // drops it). A list, not an object: Guard's JSON reader does not keep key order.
    earnAccessHolds: EARN_ACCESS_HOLDS.map((hold) => ({ hold, condition: earnAccessHoldCondition(hold) })),
    earnAccessCountableEduValues: [...EARN_ACCESS_COUNTABLE_EDU_VALUES],
  };
}

describe('device compile data (DCP-7)', () => {
  it('the generated file Guard packages is up to date', () => {
    const serialized = `${JSON.stringify(build(), null, 2)}\n`;
    if (process.env.UPDATE_DEVICE_COMPILE_DATA === '1') fs.writeFileSync(OUT, serialized);
    expect(fs.existsSync(OUT)).toBe(true);
    expect(JSON.parse(fs.readFileSync(OUT, 'utf8'))).toEqual(JSON.parse(serialized));
  });
});
