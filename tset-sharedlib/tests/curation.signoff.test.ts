import {curationItemContext, getCurationChecklist, type CurationAnswers} from '../src/curation.checklist';
import {
  CURATION_POLICY_DEFAULT,
  CURATORS_TO_ADD_MAX,
  combineSignoffs,
  compareSignoffAnswers,
  curationItemFingerprint,
  curatorsRequired,
  decideCurationReview,
  normalizeCurationPolicy,
  selectCountableSignoffs,
  sortSignoffsByFinish,
  type CurationSignoffForDecision,
} from '../src/curation.signoff';

const v1 = getCurationChecklist(1)!;
const LINK = curationItemContext({type: 'link', url: 'https://example.org/'});
const POLICY = {curatorsToAdd: 2};

/** A complete, passing set of answers for a link. */
function answers(overrides: CurationAnswers = {}): CurationAnswers {
  return {
    link_works: {value: 'pass'},
    description_accurate: {value: 'pass'},
    duplicate: {value: 'pass'},
    signup: {value: 'pass'},
    cost: {value: 'cost_free'},
    freshness: {value: 'fresh_active'},
    edu_value: {value: 'eduval_educational'},
    source: {value: 'pass'},
    critical_thinking: {value: 'pass'},
    sensitive_topics: {value: 'pass'},
    ads: {value: 'ads_no'},
    design: {value: 'design_clean'},
    attention_traps: {value: 'pass'},
    min_age: {value: 'minage_kids'},
    mature_content: {value: []},
    user_contact: {value: 'pass'},
    ...overrides,
  };
}

function signoff(overrides: Partial<CurationSignoffForDecision> = {}): CurationSignoffForDecision {
  return {
    _id: 'crs_1',
    curatorId: 'cur_1',
    curatorAccountId: 'acc_1',
    outcome: 'curate',
    answers: answers(),
    summary: 'Clear science lessons.',
    reviewAgainMonths: 12,
    finishedAt: '2026-09-16T10:00:00.000Z',
    ...overrides,
  };
}

function decide(counted: CurationSignoffForDecision[], itemCurated = false, policy = POLICY) {
  return decideCurationReview({checklist: v1, context: LINK, itemCurated, policy, counted});
}

describe('the policy', () => {
  it('starts at two curators and stays within bounds', () => {
    expect(CURATION_POLICY_DEFAULT.curatorsToAdd).toBe(2);
    expect(normalizeCurationPolicy(undefined)).toEqual({curatorsToAdd: 2});
    expect(normalizeCurationPolicy({curatorsToAdd: 'nonsense'})).toEqual({curatorsToAdd: 2});
    expect(normalizeCurationPolicy({curatorsToAdd: 0})).toEqual({curatorsToAdd: 1});
    expect(normalizeCurationPolicy({curatorsToAdd: 99})).toEqual({curatorsToAdd: CURATORS_TO_ADD_MAX});
    expect(normalizeCurationPolicy({curatorsToAdd: 3.4})).toEqual({curatorsToAdd: 3});
  });

  it('asks for one curator on an item already in the catalog', () => {
    expect(curatorsRequired(true, POLICY)).toBe(1);
    expect(curatorsRequired(false, POLICY)).toBe(2);
  });
});

describe('the item fingerprint', () => {
  const item = {name: 'Orbit', description: 'Physics', url: 'https://example.org/', type: 'link'};

  it('is the same for the same item, whatever order the children come in', () => {
    expect(curationItemFingerprint(item, ['b', 'a'])).toBe(curationItemFingerprint(item, ['a', 'b']));
  });

  it('changes when what was checked changes', () => {
    const base = curationItemFingerprint(item);
    expect(curationItemFingerprint({...item, url: 'https://example.org/moved'})).not.toBe(base);
    expect(curationItemFingerprint({...item, name: 'Orbit 2'})).not.toBe(base);
    expect(curationItemFingerprint(item, ['a'])).not.toBe(base);
  });
});

describe('comparing two curators', () => {
  it('finds nothing when they answered the same', () => {
    const result = compareSignoffAnswers(v1, LINK, [signoff(), signoff({_id: 'crs_2'})]);
    expect(result.matches).toBe(true);
    expect(result.differences).toEqual([]);
  });

  it('names the check when a verdict differs', () => {
    const other = signoff({_id: 'crs_2', answers: answers({source: {value: 'concern', comment: 'Unclear who runs it.'}})});
    const result = compareSignoffAnswers(v1, LINK, [signoff(), other]);
    expect(result.matches).toBe(false);
    expect(result.differences.map((d) => d.key)).toEqual(['source']);
    expect(result.differences[0].label).toBe('Trustworthy source');
    expect(result.differences[0].answers).toEqual([
      {signoffId: 'crs_1', value: 'pass'},
      {signoffId: 'crs_2', value: 'concern'},
    ]);
  });

  it('names the check when a facet differs', () => {
    const other = signoff({_id: 'crs_2', answers: answers({min_age: {value: 'minage_preteen'}})});
    expect(compareSignoffAnswers(v1, LINK, [signoff(), other]).differences.map((d) => d.key)).toEqual(['min_age']);
  });

  it('reads flags as a set, not a list', () => {
    const a = signoff({
      answers: answers({mature_content: {value: ['flag_violence', 'flag_mild_language'], comment: 'Some.'}}),
    });
    const b = signoff({
      _id: 'crs_2',
      answers: answers({mature_content: {value: ['flag_mild_language', 'flag_violence'], comment: 'Some.'}}),
    });
    expect(compareSignoffAnswers(v1, LINK, [a, b]).matches).toBe(true);

    const c = signoff({_id: 'crs_3', answers: answers({mature_content: {value: ['flag_mild_language'], comment: 'Some.'}})});
    expect(compareSignoffAnswers(v1, LINK, [a, c]).matches).toBe(false);
  });

  it('is not a disagreement when one curator left an optional check unanswered', () => {
    const other = signoff({_id: 'crs_2', answers: answers({user_contact: {value: 'not_checked'}})});
    expect(compareSignoffAnswers(v1, LINK, [signoff(), other]).matches).toBe(true);
  });

  it('ignores comments, screenshots and the interval', () => {
    const other = signoff({
      _id: 'crs_2',
      reviewAgainMonths: 3,
      answers: answers({source: {value: 'pass', comment: 'Run by a university.', screenshots: ['a.png']}}),
    });
    expect(compareSignoffAnswers(v1, LINK, [signoff(), other]).matches).toBe(true);
  });
});

describe('which sign-offs count', () => {
  const fingerprint = 'f1_abcdef12';

  it('drops one that answered an older version of the item', () => {
    const fresh = signoff({itemFingerprint: fingerprint});
    const old = signoff({_id: 'crs_2', curatorId: 'cur_2', curatorAccountId: 'acc_2', itemFingerprint: 'f1_00000000'});
    const result = selectCountableSignoffs([fresh, old], fingerprint);
    expect(result.counted.map((s) => s._id)).toEqual(['crs_1']);
    expect(result.stale.map((s) => s._id)).toEqual(['crs_2']);
  });

  it('counts one family once and drops a curator who is no longer active', () => {
    const first = signoff({itemFingerprint: fingerprint});
    const sameFamily = signoff({_id: 'crs_2', curatorId: 'cur_2', curatorAccountId: 'acc_1', itemFingerprint: fingerprint});
    const inactive = signoff({
      _id: 'crs_3',
      curatorId: 'cur_3',
      curatorAccountId: 'acc_3',
      curatorActive: false,
      itemFingerprint: fingerprint,
    });
    const result = selectCountableSignoffs([first, sameFamily, inactive], fingerprint);
    expect(result.counted.map((s) => s._id)).toEqual(['crs_1']);
    expect(result.dropped.map((s) => s._id).sort()).toEqual(['crs_2', 'crs_3']);
  });

  it('keeps the earliest finish first', () => {
    const later = signoff({_id: 'crs_2', curatorId: 'cur_2', curatorAccountId: 'acc_2', finishedAt: '2026-09-17T10:00:00.000Z'});
    expect(sortSignoffsByFinish([later, signoff()]).map((s) => s._id)).toEqual(['crs_1', 'crs_2']);
  });
});

describe('deciding a review', () => {
  it('waits while only one of two curators has finished', () => {
    expect(decide([signoff()])).toEqual({kind: 'waiting', finished: 1, required: 2});
  });

  it('adds the item when two curators agree', () => {
    const second = signoff({_id: 'crs_2', curatorId: 'cur_2', curatorAccountId: 'acc_2'});
    const decision = decide([signoff(), second]);
    expect(decision.kind).toBe('add');
    expect(decision.kind === 'add' && decision.signoffs.map((s) => s._id)).toEqual(['crs_1', 'crs_2']);
  });

  it('holds the item out when their answers differ', () => {
    const second = signoff({
      _id: 'crs_2',
      curatorId: 'cur_2',
      curatorAccountId: 'acc_2',
      answers: answers({ads: {value: 'ads_l'}}),
    });
    const decision = decide([signoff(), second]);
    expect(decision.kind).toBe('disagree');
    expect(decision.kind === 'disagree' && decision.differences.map((d) => d.key)).toEqual(['ads']);
  });

  it('ends the review as soon as one curator says not to add it', () => {
    const declining = signoff({
      _id: 'crs_2',
      curatorId: 'cur_2',
      curatorAccountId: 'acc_2',
      outcome: 'decline',
      finishedAt: '2026-09-16T11:00:00.000Z',
    });
    const decision = decide([signoff(), declining]);
    expect(decision.kind).toBe('decline');
    expect(decision.kind === 'decline' && decision.signoff._id).toBe('crs_2');
  });

  it('takes one curator for an item already in the catalog', () => {
    const decision = decide([signoff()], true);
    expect(decision.kind).toBe('keep');
    expect(decision.kind === 'keep' && decision.signoff._id).toBe('crs_1');
    expect(decide([], true)).toEqual({kind: 'waiting', finished: 0, required: 1});
  });

  it('follows the number an admin set', () => {
    const second = signoff({_id: 'crs_2', curatorId: 'cur_2', curatorAccountId: 'acc_2'});
    expect(decide([signoff(), second], false, {curatorsToAdd: 3})).toEqual({kind: 'waiting', finished: 2, required: 3});
    expect(decide([signoff()], false, {curatorsToAdd: 1}).kind).toBe('add');
  });
});

describe('combining what the curators agreed', () => {
  const first = signoff({
    answers: answers({
      ads: {value: 'ads_no', comment: 'No ads at all.', screenshots: ['one.png']},
      source: {value: 'pass', comment: 'Run by a university.'},
    }),
    summary: 'Clear science lessons.',
    reviewAgainMonths: 12,
  });
  const second = signoff({
    _id: 'crs_2',
    curatorId: 'cur_2',
    curatorAccountId: 'acc_2',
    finishedAt: '2026-09-16T12:00:00.000Z',
    answers: answers({
      ads: {value: 'ads_no', comment: 'Checked on mobile too.', screenshots: ['two.png']},
      source: {value: 'pass'},
    }),
    summary: 'Worth having.',
    reviewAgainMonths: 6,
  });

  it('keeps every curator comment, in finish order', () => {
    const combined = combineSignoffs(v1, LINK, [second, first]);
    expect(combined.answers.ads.comments).toEqual(['No ads at all.', 'Checked on mobile too.']);
    expect(combined.answers.ads.comment).toBe('No ads at all.\n\nChecked on mobile too.');
    expect(combined.answers.ads.screenshots).toEqual(['one.png', 'two.png']);
  });

  it('shows each summary and checks again at the soonest interval asked for', () => {
    const combined = combineSignoffs(v1, LINK, [first, second]);
    expect(combined.summary).toBe('Clear science lessons.\n\nWorth having.');
    expect(combined.reviewAgainMonths).toBe(6);
  });

  it('takes screenshots only from the curators whose answer it is', () => {
    const disagreeing = signoff({
      _id: 'crs_3',
      curatorId: 'cur_3',
      curatorAccountId: 'acc_3',
      finishedAt: '2026-09-16T13:00:00.000Z',
      answers: answers({ads: {value: 'ads_l', comment: 'One banner.', screenshots: ['three.png']}}),
    });
    const combined = combineSignoffs(v1, LINK, [first, disagreeing]);
    expect(combined.answers.ads.value).toBe('ads_no');
    expect(combined.answers.ads.screenshots).toEqual(['one.png']);
    expect(combined.answers.ads.comments).toEqual(['No ads at all.']);
  });

  it('leaves out a check nobody answered and keeps the one answer that was given', () => {
    const partial = signoff({
      _id: 'crs_2',
      curatorId: 'cur_2',
      curatorAccountId: 'acc_2',
      answers: answers({user_contact: {value: 'not_checked'}}),
    });
    const combined = combineSignoffs(v1, LINK, [partial, signoff()]);
    expect(combined.answers.user_contact.value).toBe('pass');

    const neither = combineSignoffs(v1, LINK, [
      signoff({answers: answers({user_contact: {value: 'not_checked'}})}),
      partial,
    ]);
    expect(neither.answers.user_contact).toBeUndefined();
  });
});
