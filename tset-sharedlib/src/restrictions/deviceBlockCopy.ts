/**
 * What a device block says — on the Companion's block window AND on the web block page.
 *
 * These are two screens describing one decision, and until this module they wrote their own words
 * from two different vocabularies. The Mac decided in `BlockReason` (`budget-exhausted`,
 * `app-blocked`, …) and handed that value to the web page as a `blockReason` query parameter; the
 * web page had nothing that understood it, so `Blocked.vue` rendered it as the subtitle **raw**. A
 * child who pressed "Ask a parent" on a spent Steam budget was shown the literal string
 * `budget-exhausted`. Nobody caught it because the button that reaches that page had never once
 * opened it (see `companionOpenPathToAppPath`).
 *
 * The rules are Android's, from `BlockOverlayController`, and they are why this is copy and not a
 * label lookup:
 *
 *  - **Lead with the reason, not the brand.** "Blocked by Kindredly" makes the app the villain;
 *    "Your time for Games is used up" is the truth.
 *  - **Name the app, never the bundle id.** `com.valvesoftware.steam` means nothing to a child.
 *  - **Give a real time when there is one, and stay silent when there isn't.** A made-up "try
 *    later" is worse than no promise.
 *  - **No live countdown.** A ticking clock turns the screen into something to sit and watch, and
 *    it is the pattern kids most reliably game.
 *  - **Say who to ask.** A child who cannot tell "blocked" from "broken" reports it as broken.
 *
 * Pure and dependency-free: the Electron main process imports it from `dist/`, the client imports
 * it through `@/`, and neither gets to have its own opinion about a Mac block.
 */
import { isDesktopPlatform } from './deviceAppIds';

/** Why a rule is blocking. The device decides in these terms; every surface reads them. */
export type DeviceBlockReason =
  /** Today's budget is spent. Resets at local midnight. */
  | 'budget-exhausted'
  /** Now is outside every allowed window for today. */
  | 'outside-schedule'
  /** Today's budget is zero — the rule turns the app off for the whole day. */
  | 'always-blocked'
  /** A parent turned this app off outright. No budget, no schedule, no time at which it returns. */
  | 'app-blocked'
  /**
   * A browser with no Kindredly in it, on a child's computer.
   *
   * Its own reason rather than `app-blocked` because it is the only block on the list with an
   * action behind it: put Kindredly in this browser and it opens. Reporting it as "a parent turned
   * this off" would send a child to ask for something nobody chose.
   */
  | 'browser-unprotected'
  /**
   * Family Downtime is on. Checked before everything but the safety floor, and lifted by nothing a
   * child can ask for, so its words never mention asking.
   */
  | 'family-downtime'
  /**
   * An Earn access rule holds this app until its steps are done (HAT-836). Not a time and not a
   * parent's off switch: the child can open it, and Kindredly says what is left.
   */
  | 'earn-access'
  /**
   * New apps start blocked (NAP-6): the app arrived after a parent turned that on, and waits for
   * them. Its own reason so the child is told the app is new, not that someone turned it off.
   */
  | 'new-app';

const DEVICE_BLOCK_REASONS: readonly string[] = [
  'budget-exhausted',
  'outside-schedule',
  'always-blocked',
  'app-blocked',
  'browser-unprotected',
  'family-downtime',
  'earn-access',
  'new-app',
];

/**
 * Is this a reason the device produced?
 *
 * The web block page receives `blockReason` as an untrusted query string and must not render a
 * value it does not understand. Anything unrecognised falls back to written copy.
 */
export function isDeviceBlockReason(value: unknown): value is DeviceBlockReason {
  return typeof value === 'string' && DEVICE_BLOCK_REASONS.includes(value);
}

export type DeviceBlockCopy = { headline: string; detail: string };

export type DeviceBlockCopyInput = {
  reason: DeviceBlockReason | null | undefined;
  /** The app's human name. Never a bundle id — resolve it before calling. */
  appLabel: string;
  /** When the block lifts, if it does. Omitted means "no promise", which is said by staying silent. */
  unlockAtMs?: number | null;
  nowMs: number;
  /** The FAMILY's offset, never the machine's — a child can change the machine's. */
  tzOffsetMinutes: number;
  /** The winning rule's name, for a limit that covers a category rather than one app. */
  ruleName?: string | null;
  /** True when the winning rule is the child's overall allowance rather than a category. */
  coversEverything?: boolean;
  /**
   * Which kind of device this is, as a `DevicePlatform` (`macos`, `android`, …).
   *
   * Present because "A parent chooses which apps can be used on this phone" was shown on a Mac.
   * The web page reads it off the `<platform>:<pkg>` app id the device already sends.
   */
  platform?: string | null;
  /**
   * Browsers the child may still open, when this block is one Kindredly placed on a browser.
   *
   * Absent for every other reason, and absent on a build that predates it — the copy then falls
   * back to the generic "use a browser with Kindredly in it", which is what it always said.
   */
  allowedBrowsers?: readonly string[];
  /** The person's Blocked message, shown during Family Downtime. */
  note?: string | null;
};

/**
 * "1h 20m left", "20m left", "under a minute left", "none left".
 *
 * The whole phrase, not a duration a caller appends "left" to — that is how you get "none left
 * left", and it is why this existed three times before it existed once. Two surfaces draw it: the
 * Companion's shield (`rules/blockWindow.ts`) and the child's own **My time** screen
 * (`companion/CompanionMe.vue`), which live in different packages and could only agree through
 * here.
 *
 * Never seconds. A number a child can watch tick toward zero is the thing the whole block screen is
 * written to avoid, and it is the pattern kids most reliably game.
 */
export function formatTimeLeftLine(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'none left';
  if (ms < 60_000) return 'under a minute left';
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m left`;
  return minutes ? `${hours}h ${minutes}m left` : `${hours}h left`;
}

/** `HH:MM` in the family's timezone. */
export function localClock(ms: number, tzOffsetMinutes: number): string {
  const local = new Date(ms + tzOffsetMinutes * 60_000);
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
}

function sameLocalDay(a: number, b: number, tzOffsetMinutes: number): boolean {
  const day = (ms: number) => Math.floor((ms + tzOffsetMinutes * 60_000) / 86_400_000);
  return day(a) === day(b);
}

/**
 * What a time block is about, named the way the headline says it (HAT-979): "Screen time" for the
 * overall allowance, the rule's name for a category, the app's own name when no rule covers it.
 */
function timeSubject(input: DeviceBlockCopyInput, appLabel: string): string {
  if (input.coversEverything) return 'Screen time';
  return input.ruleName || appLabel;
}

/** "Steam counts as Games." — why this app is under that limit. Nothing when the limit is the app's own. */
function countsAsLine(input: DeviceBlockCopyInput, appLabel: string): string {
  if (input.coversEverything || !input.ruleName || input.ruleName === appLabel) return '';
  return `${appLabel} counts as ${input.ruleName}.`;
}

function unlockLine(input: DeviceBlockCopyInput): string {
  if (input.unlockAtMs == null) return '';
  return sameLocalDay(input.nowMs, input.unlockAtMs, input.tzOffsetMinutes)
    ? `Opens again at ${localClock(input.unlockAtMs, input.tzOffsetMinutes)}.`
    : 'Opens again tomorrow.';
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "Until 07:00." today, "Until tomorrow at 07:00.", "Until Sunday at 18:00." within the week, and
 * "Until Sep 28 at 18:00." past it (a one-off can run 14 days). Nothing without a time.
 */
export function downtimeUntilSentence(input: DeviceBlockCopyInput): string {
  if (input.unlockAtMs == null) return '';
  const clock = localClock(input.unlockAtMs, input.tzOffsetMinutes);
  const day = (ms: number) => Math.floor((ms + input.tzOffsetMinutes * 60_000) / 86_400_000);
  const days = day(input.unlockAtMs) - day(input.nowMs);
  if (days <= 0) return `Until ${clock}.`;
  if (days === 1) return `Until tomorrow at ${clock}.`;
  const local = new Date(input.unlockAtMs + input.tzOffsetMinutes * 60_000);
  if (days < 7) return `Until ${WEEKDAY_NAMES[local.getUTCDay()]} at ${clock}.`;
  return `Until ${MONTH_NAMES[local.getUTCMonth()]} ${local.getUTCDate()} at ${clock}.`;
}

/** "this computer" or "this phone" — the one place that decides, so no surface can say the wrong one. */
export function deviceNoun(platform: string | null | undefined): string {
  return isDesktopPlatform(platform) ? 'this computer' : 'this phone';
}

/**
 * "Chrome", "Chrome or Firefox", "Chrome, Firefox or Brave Browser".
 *
 * Capped at three: this goes on a shield a child reads in one glance, and a machine with six
 * browsers would turn the way out into a list to parse.
 */
function formatBrowserList(labels: readonly string[] | undefined): string {
  const names = (labels || []).map((label) => String(label || '').trim()).filter(Boolean).slice(0, 3);
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

export function deviceBlockCopy(input: DeviceBlockCopyInput): DeviceBlockCopy {
  const appLabel = input.appLabel || 'This app';
  // `coversEverything` means the winning rule is the child's overall allowance. Its stored name is
  // the internal "All Content" — fine in a parent's settings list, wrong on the one screen whose
  // whole job is explaining to a kid why their computer stopped.
  const subject = input.coversEverything ? 'your screen time' : input.ruleName || 'this';
  const opens = unlockLine(input);

  switch (input.reason) {
    case 'family-downtime': {
      // The whole family is off screens, so the app is not the subject and asking is not offered.
      const note = (input.note || '').trim();
      const until = downtimeUntilSentence(input);
      return {
        headline: 'Family Downtime',
        detail: [until, note || 'Screens are off for the whole family right now.'].filter(Boolean).join(' '),
      };
    }
    case 'app-blocked':
      // Checked first on purpose: "your time is used up" would be a lie for an app with no budget.
      return { headline: `${appLabel} is turned off`, detail: 'A parent turned this off. Ask them if you need it.' };
    case 'new-app':
      return { headline: `${appLabel} is new`, detail: 'New apps open once a parent allows them. Ask them if you need it.' };
    case 'browser-unprotected': {
      // The one block here with a fix behind it, so it says the fix instead of "ask a parent".
      // Names the browser, because a child who has three of them needs to know this is about the
      // one they just opened and not about browsers in general.
      //
      // And it names where to GO when we know. "Ask a parent to add Kindredly to Safari" is advice
      // nobody can follow — macOS will not let anything outside touch Safari's extensions, which is
      // the whole reason Safari is closed under lockdown — so a browser that can never be fixed
      // gets the way out instead of a fix that does not exist.
      const open = formatBrowserList(input.allowedBrowsers);
      if (open) {
        return { headline: `${appLabel} does not have Kindredly`, detail: `Use ${open} instead.` };
      }
      return {
        headline: `${appLabel} does not have Kindredly`,
        detail: `Use a browser with Kindredly in it, or ask a parent to add Kindredly to ${appLabel}.`,
      };
    }
    case 'earn-access':
      // No time to give: it opens when the steps are done, and only Kindredly can show those.
      return { headline: 'Finish what comes first', detail: "Open Kindredly to see what's left." };
    // A time block's headline is one sentence that names the limit and when it opens (HAT-979);
    // the detail says why this app is under it.
    case 'always-blocked':
      return {
        headline: input.ruleName && !input.coversEverything ? `No ${input.ruleName} today` : `${appLabel} is off today`,
        detail: [countsAsLine(input, appLabel), 'A parent set no time for this today.'].filter(Boolean).join(' '),
      };
    case 'outside-schedule': {
      const name = timeSubject(input, appLabel);
      const counts = countsAsLine(input, appLabel);
      if (input.unlockAtMs == null) {
        return { headline: `${appLabel} isn't available right now`, detail: counts || `This is outside the hours set for ${subject}.` };
      }
      const headline = sameLocalDay(input.nowMs, input.unlockAtMs, input.tzOffsetMinutes)
        ? `${name} opens at ${localClock(input.unlockAtMs, input.tzOffsetMinutes)}`
        : `${name} opens tomorrow`;
      return { headline, detail: counts || (input.coversEverything ? 'It is outside your screen time hours.' : '') };
    }
    case 'budget-exhausted':
      return {
        headline: input.coversEverything ? 'No screen time left today' : `No ${timeSubject(input, appLabel)} time left today`,
        detail: [countsAsLine(input, appLabel), opens || 'It comes back tomorrow.'].filter(Boolean).join(' '),
      };
    default:
      return { headline: `${appLabel} isn't available right now`, detail: opens };
  }
}

/**
 * The web block page's subtitle for a device block.
 *
 * Separate from `deviceBlockCopy` because the two screens are not saying the same thing in the same
 * place: the block window's headline IS the reason, so its own detail line elaborates. The web page
 * has already shown a hero title, so echoing the headline there would say it twice. This is the
 * line that goes underneath.
 */
export function deviceBlockSubtitle(input: DeviceBlockCopyInput): string {
  const noun = deviceNoun(input.platform);
  switch (input.reason) {
    case 'family-downtime':
      return downtimeUntilSentence(input) || 'An admin set Family Downtime.';
    case 'app-blocked':
      return `A parent chooses which apps can be used on ${noun}.`;
    case 'new-app':
      return `New apps on ${noun} open once a parent allows them.`;
    case 'browser-unprotected': {
      const open = formatBrowserList(input.allowedBrowsers);
      return open
        ? `Use ${open} instead.`
        : `Use a browser with Kindredly in it, or ask a parent to add it to ${input.appLabel || 'this browser'}.`;
    }
    case 'earn-access':
      // The web block page's own words for an Earn access block with no rule name to show.
      return 'Finish what comes first.';
    case 'always-blocked':
      return 'A parent set no time for this today.';
    case 'outside-schedule':
      // The headline says when it opens (HAT-979); without a time, this line says why.
      return input.unlockAtMs == null ? 'This is outside the hours set for it.' : '';
    case 'budget-exhausted':
      return unlockLine(input) || "Ask a parent if you'd like more time.";
    default:
      // An unrecognised reason must never reach a child as a raw token.
      return `A parent chooses which apps can be used on ${noun}.`;
  }
}
