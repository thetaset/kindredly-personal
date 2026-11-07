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
  // "Pause all restrictions" reaching the phone. Until these, both device compilers read only "Pause
  // just usage limits", so a child who asked a parent from the block screen and was granted a pause
  // stayed blocked on their phone while the browser opened up.
  'restrictions-pause-active',
  'restrictions-pause-expired',
  'restrictions-pause-keeps-downtime',
  'block-all-cancels-pause',
  // Always allowed (HAT-152): past a spent budget without spending it, an app block still wins, and
  // open during Family Downtime.
  'always-allowed-past-limits',
  'always-allowed-during-downtime',
  // A guardian's yes to one app from a request (HAT-178), until it ends.
  'app-grant-active',
  'app-grant-expired',
  // Games (HAT-634): the Games limit covers the Games app type; a limit on one game covers its apps.
  'games-limit',
  'one-game-limit',
  // Earn access (HAT-836): a holding rule closes the apps its holds cover until it opens, for its
  // period (a day, a family week); Always allowed stays open, and only "Pause all restrictions" lifts it.
  'earn-access-holds-games',
  'earn-access-opened-today',
  'earn-access-opened-yesterday',
  'earn-access-always-allowed',
  'earn-access-weekly-opened-monday',
  'earn-access-usage-pause-keeps-hold',
  // On a ruleset compiled the day before, with nothing to recompile from (EA-15): a daily rule holds
  // again after the family's midnight, and a school-days rule opens on Saturday.
  'earn-access-held-again-without-recompile',
  'earn-access-off-day-without-recompile',
  // A rule opened only by I've done it (HAT-912): no device can check the step, so it holds until
  // an opening, exactly as a rule with a task step does.
  'earn-access-confirm-holds',
  'earn-access-confirm-opened-today',
  // New apps start blocked (NAP-6, NAP-8): an app that arrived after the switch waits, saying it is new.
  'new-app-waiting',
];

const DEVICE_ACTIONS = new Set(['allow', 'warn', 'block']);
const DEVICE_REASONS = new Set([
  null,
  'budget-exhausted',
  'outside-schedule',
  'always-blocked',
  'app-blocked',
  'family-downtime',
  'earn-access',
  'new-app',
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
  // Always allowed app ids are stored `<platform>:<id>`; sources write the bare id, and each platform
  // gets its own prefix, which its evaluator strips (HAT-152).
  if (Array.isArray(settings.alwaysAllowAppIds)) {
    settings = {
      ...settings,
      alwaysAllowAppIds: settings.alwaysAllowAppIds.map((id: string) => (id.includes(':') ? id : `${platform}:${id}`)),
    };
  }
  // A guardian's grants name apps the same way (HAT-178).
  if (Array.isArray(settings.appGrants)) {
    settings = {
      ...settings,
      appGrants: settings.appGrants.map((g: {appId: string; until: number}) => ({
        ...g,
        appId: g.appId.includes(':') ? g.appId : `${platform}:${g.appId}`,
      })),
    };
  }
  if (platform === 'android' || !settings.appPolicy) return settings;
  const entries: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(settings.appPolicy.entries || {})) {
    entries[key.includes(':') ? key : `${platform}:${key}`] = entry;
  }
  // Apps marked seen are keyed by app id (NAP-6): the Android one in a source, this platform's here.
  const seenApps = settings.appPolicy.seenApps
    ? Object.fromEntries(Object.entries(settings.appPolicy.seenApps).map(([id, at]) => [id.replace(/^android:/, `${platform}:`), at]))
    : undefined;
  return { ...settings, appPolicy: { ...settings.appPolicy, entries, ...(seenApps ? { seenApps } : {}) } };
}

/**
 * The zone a case compiles in: the family's, or the device's own when the family has none, as Guard
 * falls back to the phone's zone (`GuardRuleCompile.zoneFor`) and the browser to the device clock.
 */
function compileZone(c: any): string {
  return c.clock.familyTimeZone ?? c.clock.deviceTimeZone;
}

/**
 * When the device decides. A case compiles at `clock.nowMs`; one with `clock.decideAtMs` decides then,
 * on the ruleset compiled earlier, as a device with no settings of its own to recompile from does
 * (EA-15). Guard's native compile still compiles at `clock.nowMs`.
 */
function decideAtMs(c: any): number {
  return typeof c.clock.decideAtMs === 'number' ? c.clock.decideAtMs : c.clock.nowMs;
}

function compileAll(sources: any[]) {
  return {
    generatedBy: 'tset-sharedlib/tests/deviceDecisionFixtures.test.ts — regenerate, never edit by hand',
    cases: sources.flatMap((c) =>
      PLATFORMS.map((platform) => ({
        id: c.id,
        platform,
        behaviour: c.behaviour,
        // When the device decides: later than the compile for a case about a ruleset gone stale.
        nowMs: decideAtMs(c),
        dateKey: dateKeyInTimeZone(decideAtMs(c), compileZone(c)),
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
        // A case about one real app (a game from the games list, HAT-634) names it by each platform's
        // own id, so it may give a platform its own expectations.
        expect: c.expectDeviceByPlatform?.[platform] ?? c.expectDevice,
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
    for (const e of [c.expectDevice, ...Object.values(c.expectDeviceByPlatform ?? {})].flat() as any[]) {
      expect(DEVICE_ACTIONS.has(e.action)).toBe(true);
      expect(DEVICE_REASONS.has(e.reason)).toBe(true);
    }
    for (const platform of Object.keys(c.expectDeviceByPlatform ?? {})) expect(PLATFORMS).toContain(platform);
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
