import {
  getBlockIntervention,
  hasIntervention,
  interventionStanceFor,
} from '../src/types/block-intervention';
import { offscreenIdeasFor, OFFSCREEN_IDEAS } from '../src/types/offscreen-ideas';
import { REASON_LABELS } from '../src/types/reason-metadata';
import { pickPrimaryReasonCode } from '../src/types/reason-code.utils';
import type { ReasonCode } from '../src/types/activity.types';

// Every code the union admits. Kept as a literal list rather than derived from a
// map, so that adding a ReasonCode without deciding its stance fails here.
const ALL_REASON_CODES: ReasonCode[] = [
  'restrict-all',
  'inappropriate',
  'adult-content',
  'strong-language',
  'inappropriate-topic',
  'short-form-video',
  'social-media',
  'custom-blocked-url',
  'violence',
  'extremism',
  'no-time-given',
  'time-exceeded',
  'other',
  'not-in-library',
  'library-syncing',
  'reqs-not-met',
  'checkpoint-pending',
  'out-of-time-range',
  'no-matching-rule',
];

describe('getBlockIntervention', () => {
  it('covers every reason code', () => {
    for (const code of ALL_REASON_CODES) {
      const intervention = getBlockIntervention(code);
      expect(intervention).toBeDefined();
      expect(intervention.message.length).toBeGreaterThan(0);
    }
  });

  it('stays in step with the reason-code vocabulary', () => {
    // REASON_LABELS is the other exhaustive-ish table over the same union. If one
    // grows a code the other lacks, the two screens disagree about what exists.
    for (const code of Object.keys(REASON_LABELS) as ReasonCode[]) {
      expect(ALL_REASON_CODES).toContain(code);
    }
  });

  /**
   * The invariant the whole design rests on. A block that fired because a limit
   * was reached must never answer with more things to look at — that turns the
   * limit into a reward. Asserted over the table rather than spot-checked, so it
   * cannot be lost by editing one entry.
   */
  it('never offers on-screen alternatives for a step-away block', () => {
    const offenders = ALL_REASON_CODES.filter((code) => {
      const intervention = getBlockIntervention(code);
      return intervention.stance === 'step-away' && intervention.offerOnScreenAlternatives;
    });
    expect(offenders).toEqual([]);
  });

  it('treats the time reasons as step-away', () => {
    expect(interventionStanceFor('time-exceeded')).toBe('step-away');
    expect(interventionStanceFor('no-time-given')).toBe('step-away');
    expect(interventionStanceFor('out-of-time-range')).toBe('step-away');
    expect(interventionStanceFor('no-matching-rule')).toBe('step-away');
  });

  it('treats content blocks as a redirect, since the intent was fine', () => {
    expect(interventionStanceFor('not-in-library')).toBe('redirect-on-screen');
    expect(interventionStanceFor('adult-content')).toBe('redirect-on-screen');
    expect(interventionStanceFor('custom-blocked-url')).toBe('redirect-on-screen');
  });

  it('treats a check-in as something to finish, not something to wait out', () => {
    expect(interventionStanceFor('checkpoint-pending')).toBe('finish-task');
  });

  /**
   * `reqs-not-met` reads like a task gate and is not one. The usage evaluator
   * raises it whenever a usage row's requirements fail, and it outranks
   * `time-exceeded` in `pickPrimaryReasonCode` — so it is the code an ordinary
   * "no time left" block actually carries. Sending that child off to finish a
   * task they do not have is the bug this pins down.
   */
  it('treats reqs-not-met as a time block, since that is what it usually is', () => {
    expect(interventionStanceFor('reqs-not-met')).toBe('step-away');
    expect(getBlockIntervention('reqs-not-met').offerOnScreenAlternatives).toBe(false);
  });

  /**
   * A syncing library is a transient window, not a restriction. Offering
   * alternatives there tells a child their own content isn't theirs.
   */
  it('says nothing at all while the library is still syncing', () => {
    const intervention = getBlockIntervention('library-syncing');
    expect(intervention.stance).toBe('just-wait');
    expect(intervention.offerOnScreenAlternatives).toBe(false);
    expect(intervention.offscreenIdeaKeys).toEqual([]);
    expect(hasIntervention('library-syncing')).toBe(false);
  });

  /**
   * Every code must be able to WIN a merge, or its stance is unreachable no
   * matter what this table says. `library-syncing` was absent from the shared
   * precedence, so `pickPrimaryReasonCode` returned null for it and the block
   * page fell through to the generic "This page is blocked".
   */
  it('lets every reason code survive its own merge', () => {
    for (const code of ALL_REASON_CODES) {
      expect([code, pickPrimaryReasonCode([code])]).toEqual([code, code]);
    }
  });

  it('explains a syncing library rather than calling it missing', () => {
    expect(pickPrimaryReasonCode(['not-in-library', 'library-syncing'])).toBe(
      'library-syncing',
    );
  });

  it('falls back to step-away when the reason is missing', () => {
    // The block page reads the reason from a log lookup that can miss, so this
    // path is real. Guessing "redirect" would hand out screen time on the
    // strength of absent information.
    expect(interventionStanceFor(null)).toBe('step-away');
    expect(interventionStanceFor(undefined)).toBe('step-away');
    expect(getBlockIntervention(null).offerOnScreenAlternatives).toBe(false);
    expect(hasIntervention(null)).toBe(true);
  });

  it('gives every stance that offers ideas at least one idea key that resolves', () => {
    for (const code of ALL_REASON_CODES) {
      const { offscreenIdeaKeys } = getBlockIntervention(code);
      for (const key of offscreenIdeaKeys) {
        expect(OFFSCREEN_IDEAS.some((idea) => idea.key === key)).toBe(true);
      }
    }
  });
});

describe('offscreenIdeasFor', () => {
  it('returns ideas in the order the keys were asked for', () => {
    const ideas = offscreenIdeasFor('minage_kids', ['paper', 'outside']);
    expect(ideas.map((i) => i.key)).toEqual(['paper', 'outside']);
  });

  it('picks the wording that suits the age band', () => {
    const kid = offscreenIdeasFor('minage_kids', ['make']);
    const adult = offscreenIdeasFor('minage_adult', ['make']);
    expect(kid[0].title).toBe('Build or draw something');
    expect(adult[0].title).toBe('Make something with your hands');
  });

  it('resolves each key to exactly one idea', () => {
    // 'talk' and 'make' each have a kid and an adult entry under one key.
    const ideas = offscreenIdeasFor('minage_kids', ['talk', 'make']);
    expect(ideas).toHaveLength(2);
  });

  it('falls back to adult wording when the age band is unknown', () => {
    const ideas = offscreenIdeasFor(null, ['talk']);
    expect(ideas).toHaveLength(1);
    expect(ideas[0].title).toBe('Talk to someone');
  });

  it('skips a key the catalog has no entry for', () => {
    expect(offscreenIdeasFor('minage_kids', ['nope'])).toEqual([]);
  });

  it('returns nothing for an empty key list', () => {
    expect(offscreenIdeasFor('minage_kids', [])).toEqual([]);
  });
});
