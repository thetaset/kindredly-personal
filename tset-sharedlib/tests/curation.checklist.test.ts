import {
  CATALOG_REPORT_REASONS,
  CURATION_CHECK_GROUPS,
  CURATION_CHECKLISTS,
  CURATION_REVIEW_FIELD,
  CURRENT_CURATION_CHECKLIST_VERSION,
  answersForChecklist,
  NOT_CHECKED,
  addMonths,
  answerLabel,
  answerStatus,
  catalogReportReason,
  checksFor,
  curationItemContext,
  currentFacetValue,
  getCurationChecklist,
  isReviewOwnedCriteriaTag,
  mergeReviewFacets,
  renderCurationChecklistForPrompt,
  reviewOwnedCriteriaPrefixes,
  suggestedDeclineReason,
  suggestedReviewAgainMonths,
  validateCurationAnswers,
  type CurationAnswers,
} from '../src/curation.checklist';
import {flagOptions, tagOptionsWithDetailsMap} from '../src/content.types';
import {DECLINE_REASONS} from '../src/publish.rules';

const v1 = getCurationChecklist(1)!;
const LINK = curationItemContext({type: 'link', url: 'https://example.org/'});
const COLLECTION = curationItemContext({type: 'col', url: null});
const NOTE = curationItemContext({type: 'note', url: ''});

/** A complete, passing set of answers for a link, used as the base for finalize tests. */
function passingLinkAnswers(): CurationAnswers {
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
  };
}

const finalizeCurate = {outcome: 'curate' as const, summary: 'Clear, ad-free science lessons.', reviewAgainMonths: 12};

describe('checklist v1 is pinned', () => {
  // A finalized review stores answers by key against a version. If this test fails because a
  // check was added, removed, renamed or changed meaning, add CHECKLIST_V2 instead of editing v1.
  it('keeps its keys, answer kinds, options and rules', () => {
    const fingerprint = v1.checks.map((check) => {
      const spec = check.answer;
      return [
        check.key,
        check.group,
        spec.kind,
        spec.kind === 'facet' ? spec.axis : '',
        spec.kind === 'verdict' ? '' : spec.options.join('|'),
        spec.kind === 'facet' ? (spec.concernValues || []).join('|') : '',
        spec.kind === 'facet' ? (spec.failValues || []).join('|') : '',
        check.required ? 'required' : 'optional',
        check.appliesTo,
        check.ai,
        check.declineReasonOnFail || '',
        check.publicScreenshots ? 'public' : 'curators',
      ].join(' ; ');
    });
    expect(fingerprint).toEqual([
      'link_works ; basics ; verdict ;  ;  ;  ;  ; required ; link ; deterministic ; broken ; public',
      'description_accurate ; basics ; verdict ;  ;  ;  ;  ; required ; all ; draft ; presentation ; public',
      'duplicate ; basics ; verdict ;  ;  ;  ;  ; optional ; all ; draft ; duplicate ; public',
      'collection_items ; basics ; verdict ;  ;  ;  ;  ; required ; collection ; draft ; not_educational ; public',
      'signup ; basics ; verdict ;  ;  ;  ;  ; optional ; link ; draft ;  ; public',
      'cost ; basics ; facet ; cost ; cost_free|cost_freewithpaid|cost_paid ;  ;  ; optional ; link ; draft ;  ; public',
      'freshness ; basics ; facet ; freshness ; fresh_active|fresh_aging|fresh_outdated ; fresh_outdated ;  ; optional ; link ; draft ;  ; public',
      'edu_value ; learning ; facet ; eduValue ; eduval_task|eduval_educational|eduval_edutainment|eduval_fun|eduval_junk ; eduval_task ; eduval_fun|eduval_junk ; required ; all ; draft ; not_educational ; public',
      'source ; learning ; verdict ;  ;  ;  ;  ; required ; all ; draft ; source ; public',
      'critical_thinking ; learning ; verdict ;  ;  ;  ;  ; optional ; all ; draft ; source ; public',
      'sensitive_topics ; learning ; verdict ;  ;  ;  ;  ; required ; all ; draft ; advocacy ; public',
      'ads ; distraction ; facet ; ads ; ads_no|ads_l|ads_m|ads_h ; ads_m ; ads_h ; required ; link ; draft ; distracting ; public',
      'design ; distraction ; facet ; design ; design_clean|design_light|design_busy|design_noisy ; design_busy ; design_noisy ; optional ; link ; draft ; distracting ; public',
      'attention_traps ; distraction ; verdict ;  ;  ;  ;  ; optional ; all ; draft ; distracting ; public',
      'min_age ; safety ; facet ; minAgeGroup ; minage_na|minage_prek|minage_kids|minage_preteen|minage_teen|minage_adult ;  ;  ; required ; all ; draft ;  ; public',
      'mature_content ; safety ; flags ;  ; flag_sexual_content|flag_drugs|flag_mild_language|flag_strong_language|flag_violence ;  ;  ; required ; all ; draft ;  ; curators',
      'user_contact ; safety ; verdict ;  ;  ;  ;  ; optional ; link ; draft ;  ; public',
    ]);
  });
});

describe('checklist v2', () => {
  const v2 = getCurationChecklist(2)!;

  it('is the current version', () => {
    expect(CURRENT_CURATION_CHECKLIST_VERSION).toBe(2);
  });

  it('drops the check that repeated Trustworthy source, and asks Mature content before Minimum age', () => {
    const v1Keys = v1.checks.map((check) => check.key).filter((key) => key !== 'critical_thinking');
    const expected = [...v1Keys];
    const age = expected.indexOf('min_age');
    const mature = expected.indexOf('mature_content');
    [expected[age], expected[mature]] = [expected[mature], expected[age]];
    expect(v2.checks.map((check) => check.key)).toEqual(expected);
  });

  it('keeps every answer shape and rule from v1', () => {
    for (const check of v2.checks) {
      const old = v1.checks.find((c) => c.key === check.key)!;
      const shape = (c: typeof check) => [c.group, c.answer.kind, c.required, c.appliesTo, c.ai, c.declineReasonOnFail, c.publicScreenshots];
      expect(shape(check)).toEqual(shape(old));
    }
  });

  it('asks about paying only in Cost', () => {
    const signup = v2.checks.find((check) => check.key === 'signup')!;
    expect(`${signup.publicLabel} ${signup.question}`.toLowerCase()).not.toMatch(/pay/);
  });

  it('keeps answers to checks it still has, and drops the rest', () => {
    expect(answersForChecklist({source: {value: 'pass'}, critical_thinking: {value: 'fail'}}, v2)).toEqual({source: {value: 'pass'}});
    expect(answersForChecklist(null, v2)).toEqual({});
  });
});

describe('every checklist version', () => {
  it.each(Object.values(CURATION_CHECKLISTS).map((list) => [list.version, list] as const))('v%s is well formed', (_version, list) => {
    const keys = list.checks.map((check) => check.key);
    expect(new Set(keys).size).toBe(keys.length);
    const groupKeys = CURATION_CHECK_GROUPS.map((group) => group.key);
    const declineCodes = DECLINE_REASONS.map((reason) => reason.code as string);
    for (const check of list.checks) {
      expect(groupKeys).toContain(check.group);
      expect(check.publicLabel.length).toBeGreaterThan(0);
      expect(check.question.length).toBeGreaterThan(0);
      expect(check.instructions.length).toBeGreaterThan(40);
      if (check.declineReasonOnFail) expect(declineCodes).toContain(check.declineReasonOnFail);
      const spec = check.answer;
      if (spec.kind === 'facet') {
        const known = (tagOptionsWithDetailsMap as Record<string, Array<{key: string}>>)[spec.axis].map((tag) => tag.key);
        for (const option of [...spec.options, ...(spec.concernValues || []), ...(spec.failValues || [])]) {
          expect(known).toContain(option);
        }
        for (const value of [...(spec.concernValues || []), ...(spec.failValues || [])]) {
          expect(spec.options).toContain(value);
        }
      }
      if (spec.kind === 'flags') expect([...spec.options].sort()).toEqual(Object.keys(flagOptions).sort());
    }
  });

  it('the current version exists', () => {
    expect(getCurationChecklist(CURRENT_CURATION_CHECKLIST_VERSION)).not.toBeNull();
    expect(getCurationChecklist(999)).toBeNull();
  });
});

describe('checksFor', () => {
  const keys = (context: typeof LINK) => checksFor(v1, context).map((check) => check.key);

  it('a link gets the link checks and not the collection check', () => {
    expect(keys(LINK)).toContain('ads');
    expect(keys(LINK)).toContain('link_works');
    expect(keys(LINK)).not.toContain('collection_items');
  });

  it('a collection gets the collection check and none of the page checks', () => {
    expect(keys(COLLECTION)).toContain('collection_items');
    for (const key of ['link_works', 'ads', 'design', 'signup', 'cost', 'freshness', 'user_contact']) {
      expect(keys(COLLECTION)).not.toContain(key);
    }
  });

  it('a post with no URL gets only the checks that apply to everything', () => {
    expect(checksFor(v1, NOTE).every((check) => check.appliesTo === 'all')).toBe(true);
  });
});

describe('facet answers are the item criteria', () => {
  it('replaces each answered axis and keeps every other tag', () => {
    const answers: CurationAnswers = {
      ads: {value: 'ads_l'},
      edu_value: {value: 'eduval_edutainment'},
      min_age: {value: NOT_CHECKED},
    };
    const merged = mergeReviewFacets(['ads_h', 'eduval_academic', 'minage_teen', 'ta_kids', 'costd_nosignin'], v1, LINK, answers);
    expect(merged.sort()).toEqual(['ads_l', 'costd_nosignin', 'eduval_edutainment', 'minage_teen', 'ta_kids'].sort());
  });

  it('replaces the older ad_ spelling of the ads axis', () => {
    expect(mergeReviewFacets(['ad_h'], v1, LINK, {ads: {value: 'ads_no'}})).toEqual(['ads_no']);
  });

  it('does not write an axis the item type has no check for', () => {
    expect(mergeReviewFacets(['ads_h'], v1, COLLECTION, {ads: {value: 'ads_no'}})).toEqual(['ads_h']);
  });

  it('starts the form from the value the item already carries', () => {
    const edu = v1.checks.find((check) => check.key === 'edu_value')!;
    const ads = v1.checks.find((check) => check.key === 'ads')!;
    expect(currentFacetValue(edu, ['eduval_academic'])).toBe('eduval_educational');
    expect(currentFacetValue(ads, ['ta_kids'])).toBeNull();
    expect(currentFacetValue(edu, ['eduval_unknown'])).toBeNull();
  });

  it('knows which criteria a review owns', () => {
    expect(reviewOwnedCriteriaPrefixes(v1).sort()).toEqual(['ad_', 'ads_', 'cost_', 'design_', 'eduval_', 'fresh_', 'minage_'].sort());
    expect(isReviewOwnedCriteriaTag('costd_nosignin')).toBe(false);
    expect(isReviewOwnedCriteriaTag('ta_kids')).toBe(false);
    expect(isReviewOwnedCriteriaTag('design_busy')).toBe(true);
  });
});

describe('answerStatus and answerLabel', () => {
  const byKey = (key: string) => v1.checks.find((check) => check.key === key)!;

  it('reads facet answers through their concern and fail values', () => {
    expect(answerStatus(byKey('ads'), {value: 'ads_l'})).toBe('pass');
    expect(answerStatus(byKey('ads'), {value: 'ads_m'})).toBe('concern');
    expect(answerStatus(byKey('ads'), {value: 'ads_h'})).toBe('fail');
    expect(answerLabel(byKey('ads'), {value: 'ads_h'})).toBe('Heavy Ads');
  });

  it('treats mature content found as a concern, never an automatic fail', () => {
    expect(answerStatus(byKey('mature_content'), {value: []})).toBe('pass');
    expect(answerStatus(byKey('mature_content'), {value: ['flag_violence']})).toBe('concern');
    expect(answerLabel(byKey('mature_content'), {value: []})).toBe('None found');
    expect(answerLabel(byKey('mature_content'), {value: ['flag_violence']})).toBe('Violence');
  });

  it('counts a missing or malformed answer as not checked', () => {
    expect(answerStatus(byKey('source'), undefined)).toBe(NOT_CHECKED);
    expect(answerStatus(byKey('source'), {value: 'maybe'})).toBe(NOT_CHECKED);
    expect(answerLabel(byKey('source'), {value: 'maybe'})).toBe('Not checked');
    expect(answerLabel(byKey('source'), {value: 'concern'})).toBe('Could not confirm');
  });
});

describe('validateCurationAnswers', () => {
  it('a draft only rejects malformed answers', () => {
    const {errors} = validateCurationAnswers(v1, LINK, {
      ads: {value: 'ads_lots'},
      made_up: {value: 'pass'},
      source: {value: NOT_CHECKED},
      collection_items: {value: 'pass'},
    });
    expect(errors.map((e) => e.key).sort()).toEqual(['ads', 'collection_items', 'made_up']);
  });

  it('a complete review can add the item to the catalog', () => {
    expect(validateCurationAnswers(v1, LINK, passingLinkAnswers(), finalizeCurate).errors).toEqual([]);
  });

  it('adding to the catalog needs every required check answered', () => {
    const answers = passingLinkAnswers();
    delete answers.source;
    answers.min_age = {value: NOT_CHECKED};
    const {errors} = validateCurationAnswers(v1, LINK, answers, finalizeCurate);
    expect(errors.map((e) => e.key).sort()).toEqual(['min_age', 'source']);
  });

  it('a failed check cannot go in the catalog', () => {
    const answers = {...passingLinkAnswers(), ads: {value: 'ads_h', comment: 'Pop-up video ads.'}};
    const {errors} = validateCurationAnswers(v1, LINK, answers, finalizeCurate);
    expect(errors).toEqual([{key: 'ads', message: expect.stringContaining('cannot go in the catalog')}]);
  });

  it('a concern must say what was found', () => {
    const answers = {...passingLinkAnswers(), source: {value: 'concern'}};
    expect(validateCurationAnswers(v1, LINK, answers, finalizeCurate).errors.map((e) => e.key)).toEqual(['source']);
    answers.source = {value: 'concern', comment: 'No About page.'} as any;
    expect(validateCurationAnswers(v1, LINK, answers, finalizeCurate).errors).toEqual([]);
  });

  it('not adding it needs a reason families will read, and no required answers', () => {
    const answers: CurationAnswers = {link_works: {value: 'fail', comment: 'Domain is parked.'}};
    const withoutReason = validateCurationAnswers(v1, LINK, answers, {outcome: 'decline', reviewAgainMonths: 12});
    expect(withoutReason.errors.map((e) => e.key)).toEqual([CURATION_REVIEW_FIELD.declineReason]);
    const withReason = validateCurationAnswers(v1, LINK, answers, {outcome: 'decline', declineReason: 'broken', reviewAgainMonths: 12});
    expect(withReason.errors).toEqual([]);
  });

  it('finalizing needs an outcome, and adding to the catalog needs a review-again interval', () => {
    const noOutcome = validateCurationAnswers(v1, LINK, passingLinkAnswers(), {summary: 'x'});
    expect(noOutcome.errors.map((e) => e.key)).toEqual([CURATION_REVIEW_FIELD.outcome]);

    const noInterval = validateCurationAnswers(v1, LINK, passingLinkAnswers(), {outcome: 'curate', summary: 'x'});
    expect(noInterval.errors.map((e) => e.key)).toEqual([CURATION_REVIEW_FIELD.reviewAgainMonths]);

    const declined = validateCurationAnswers(v1, LINK, {}, {outcome: 'decline', declineReason: 'duplicate'});
    expect(declined.errors).toEqual([]);
  });

  it('warns when mature content is marked on an item for young children', () => {
    const answers = {...passingLinkAnswers(), mature_content: {value: ['flag_violence'], comment: 'Cartoon battles.'}};
    const {errors, warnings} = validateCurationAnswers(v1, LINK, answers, finalizeCurate);
    expect(errors).toEqual([]);
    expect(warnings.map((w) => w.key)).toEqual(['min_age']);
  });
});

describe('suggestions for the curator', () => {
  it('points a failed check at its decline reason', () => {
    const answers = {...passingLinkAnswers(), ads: {value: 'ads_h'}, link_works: {value: 'fail'}};
    expect(suggestedDeclineReason(v1, LINK, answers)).toBe('broken');
    expect(suggestedDeclineReason(v1, LINK, passingLinkAnswers())).toBeNull();
  });

  it('checks feeds and ageing sources sooner', () => {
    expect(suggestedReviewAgainMonths({}, {publishType: 'feed'})).toBe(3);
    expect(suggestedReviewAgainMonths({freshness: {value: 'fresh_aging'}})).toBe(6);
    expect(suggestedReviewAgainMonths(passingLinkAnswers())).toBe(12);
  });

  it('adds months without spilling into the following month', () => {
    expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1).toISOString()).toBe('2026-02-28T10:00:00.000Z');
    expect(addMonths(new Date('2026-09-15T00:00:00Z'), 12).toISOString()).toBe('2027-09-15T00:00:00.000Z');
  });
});

describe('renderCurationChecklistForPrompt', () => {
  it('lists every applicable check with its allowed values, and nothing else', () => {
    const text = renderCurationChecklistForPrompt(v1, COLLECTION);
    for (const check of checksFor(v1, COLLECTION)) expect(text).toContain(`### ${check.key}: ${check.publicLabel}`);
    expect(text).not.toContain('### ads:');
    expect(text).toContain('"eduval_junk" (Junk)');
    expect(text).toContain('an empty list means none found');
  });

  it('is the same text every time', () => {
    expect(renderCurationChecklistForPrompt(v1, LINK)).toBe(renderCurationChecklistForPrompt(v1, LINK));
  });
});

describe('CATALOG_REPORT_REASONS', () => {
  it('only broken links and inappropriate content take an item out of recommendations', () => {
    expect(CATALOG_REPORT_REASONS.filter((reason) => reason.pulls).map((reason) => reason.code)).toEqual([
      'broken',
      'inappropriateContentOrAds',
    ]);
    expect(catalogReportReason('other')?.pulls).toBe(false);
    expect(catalogReportReason('spam')).toBeNull();
  });
});
