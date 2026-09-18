import {isContributor, CONTRIBUTOR_VERIFIED_TYPE} from '../src/publish.rules';

/** The badge the admin can put beside a publisher's name, on the published page and the public profile. */
describe('isContributor', () => {
  it('is true only for the contributor badge', () => {
    expect(isContributor(CONTRIBUTOR_VERIFIED_TYPE)).toBe(true);
    expect(isContributor('official')).toBe(false);
    expect(isContributor(null)).toBe(false);
    expect(isContributor(undefined)).toBe(false);
  });
});
