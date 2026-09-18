/**
 * Shared decision fixtures (DCP-6): settings + installed apps + clock + usage → decision, one set of
 * cases every rule checker is held to.
 *
 * The sources are `src/deviceguard/fixtures/decisions/*.json`. This test compiles each one with
 * `compileDeviceSettings` (the D2 device compile) and checks the result against
 * `src/deviceguard/fixtures/decision-fixtures.compiled.json`, which the device evaluators read:
 * - Guard's Kotlin `DecisionFixturesTest.kt`, off the test classpath;
 * - the desktop Companion's `src/rules/__tests__/decisionFixtures.test.ts`.
 * The browser's usage engine reads the sources directly
 * (`tset-client/src/bg/services/activitylog/__tests__/decisionFixtures.browser.test.ts`).
 *
 * After changing a fixture or the compiler, regenerate, then run the three consumers:
 *   cd tset-sharedlib && UPDATE_DECISION_FIXTURES=1 npx jest tests/deviceDecisionFixtures.test.ts
 *   cd tset-client/android && ./gradlew :companion:testDebugUnitTest
 *   cd tset-electron && npm run test -- src/rules/__tests__/decisionFixtures.test.ts
 *   cd tset-client && npm run test -- src/bg/services/activitylog/__tests__/decisionFixtures.browser.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { compileDeviceSettings, dateKeyInTimeZone } from '../src/deviceguard/compileDeviceSettings';

const FIXTURE_DIR = path.resolve(__dirname, '../src/deviceguard/fixtures');
const SOURCE_DIR = path.join(FIXTURE_DIR, 'decisions');
const COMPILED_PATH = path.join(FIXTURE_DIR, 'decision-fixtures.compiled.json');

/** The behaviours DCP-6 names. Each needs at least one case, matched by id. */
const NAMED_BEHAVIOURS = [
  'bonus-time-before-expiry',
  'bonus-time-after-expiry',
  'pause-active',
  'pause-expired',
  'reward-rule-before-expiry',
  'reward-rule-after-expiry',
  'schedule-inside-window',
  'schedule-outside-window',
  'family-timezone-midnight',
  'category-limit-new-install',
  'blocked-category-allow-exception',
  'safety-floor',
  'reminder-mode',
  'track-only-mode',
];

const DEVICE_ACTIONS = new Set(['allow', 'warn', 'block']);
const DEVICE_REASONS = new Set([
  null,
  'budget-exhausted',
  'outside-schedule',
  'always-blocked',
  'app-blocked',
  'family-downtime',
]);

function loadSources(): any[] {
  return fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, f), 'utf8')));
}

/**
 * Each case compiled once per device platform, with that platform stamped on the installed apps, as a
 * device's own inventory would report it. Guard reads `android`, the desktop Companion reads `macos`.
 *
 * Why two: a compiled rule names apps as `<platform>:<id>`, and each evaluator strips only its own
 * prefix, so an Android rule cannot bind on a Mac. The ids themselves are the same strings on both.
 * The cases test decisions, not which real apps exist on which platform.
 */
const PLATFORMS = ['android', 'macos'] as const;

/**
 * The Apps page keys a per-app policy entry by `policyKeyFor(app)`: the bare id on Android,
 * `macos:<id>` on a Mac. Sources use the Android key; this gives the Mac compile the key its Apps page
 * would have written.
 */
function settingsForPlatform(settings: any, platform: (typeof PLATFORMS)[number]) {
  if (platform === 'android' || !settings.appPolicy) return settings;
  const entries: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(settings.appPolicy.entries || {})) {
    entries[key.includes(':') ? key : `${platform}:${key}`] = entry;
  }
  return { ...settings, appPolicy: { ...settings.appPolicy, entries } };
}

/**
 * The zone a case compiles in: the family's, or the device's own when the family has none, as Guard
 * falls back to the phone's zone (`GuardRuleCompile.zoneFor`) and the browser to the device clock.
 */
function compileZone(c: any): string {
  return c.clock.familyTimeZone ?? c.clock.deviceTimeZone;
}

function compileAll(sources: any[]) {
  return {
    generatedBy: 'tset-sharedlib/tests/deviceDecisionFixtures.test.ts — regenerate, never edit by hand',
    cases: sources.flatMap((c) =>
      PLATFORMS.map((platform) => ({
        id: c.id,
        platform,
        behaviour: c.behaviour,
        nowMs: c.clock.nowMs,
        dateKey: dateKeyInTimeZone(c.clock.nowMs, compileZone(c)),
        floor: c.floor,
        usageByPkgMs: c.usage.appMsByPkg,
        ruleSet: compileDeviceSettings({
          settings: settingsForPlatform(c.settings, platform),
          nowMs: c.clock.nowMs,
          familyTimeZone: compileZone(c),
          installedApps: c.installedApps.map((app: any) => ({
            ...app,
            platform,
          })),
          usageSeed: c.usageSeed,
        }),
        expect: c.expectDevice,
      })),
    ),
  };
}

describe('shared decision fixtures (DCP-6)', () => {
  const sources = loadSources();
  const compiled = compileAll(sources);

  it('the compiled file the device evaluators read is up to date', () => {
    const serialized = `${JSON.stringify(compiled, null, 2)}\n`;
    if (process.env.UPDATE_DECISION_FIXTURES === '1') fs.writeFileSync(COMPILED_PATH, serialized);
    expect(fs.existsSync(COMPILED_PATH)).toBe(true);
    expect(JSON.parse(fs.readFileSync(COMPILED_PATH, 'utf8'))).toEqual(JSON.parse(serialized));
  });

  it('covers every named behaviour', () => {
    const ids = sources.map((c) => String(c.id).replace(/^\d+-/, ''));
    for (const behaviour of NAMED_BEHAVIOURS) expect(ids).toContain(behaviour);
  });

  it.each(sources.map((c) => [c.id, c]))('%s is well formed', (_id, c) => {
    expect(typeof c.behaviour).toBe('string');
    expect(c.expectDevice.length).toBeGreaterThan(0);
    for (const e of c.expectDevice) {
      expect(DEVICE_ACTIONS.has(e.action)).toBe(true);
      expect(DEVICE_REASONS.has(e.reason)).toBe(true);
    }
    // Every case says what the browser should decide, or why the browser has no equivalent.
    expect(Boolean(c.expectBrowser) !== Boolean(c.browserNotApplicable)).toBe(true);
  });

  it('the family timezone sets the seed day, not UTC and not the device', () => {
    const midnight = compiled.cases.find(
      (c) => c.id.endsWith('family-timezone-midnight') && c.platform === 'android',
    )!;
    // 23:30 Tuesday in Los Angeles is 06:30 Wednesday UTC.
    expect(midnight.dateKey).toBe('2026-09-15');
    expect(midnight.ruleSet.tzOffsetMinutes).toBe(-420);
  });
});
