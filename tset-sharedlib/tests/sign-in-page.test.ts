import { isSignInRedirect, isSignInUrl, isUnsafeForCookieRead } from '../src/sign-in-page.utils';
import { isLikelyChallengeTitle } from '../src/extraction.pure.utils';

// Where a fetch without Google cookies really ends (curl, 2026-10-02).
const DOC = 'https://docs.google.com/document/d/1AbCdEf/edit';
const GOOGLE_SIGN_IN =
  'https://accounts.google.com/v3/signin/identifier?continue=https://docs.google.com/document/d/1AbCdEf/edit&ltmpl=docs&service=wise';

describe('isSignInRedirect', () => {
  it('a Google Doc that landed on Google sign-in', () => {
    expect(isSignInRedirect(DOC, GOOGLE_SIGN_IN)).toBe(true);
  });

  it('a Microsoft file that landed on Microsoft sign-in', () => {
    expect(
      isSignInRedirect('https://onedrive.live.com/edit?id=ABC', 'https://login.live.com/login.srf?wa=wsignin1.0'),
    ).toBe(true);
  });

  it('a page that redirected to its own site’s login', () => {
    expect(isSignInRedirect('https://www.dropbox.com/home', 'https://www.dropbox.com/login?cont=%2Fhome')).toBe(true);
    expect(isSignInRedirect('https://www.instagram.com/p/xyz/', 'https://www.instagram.com/accounts/login/?next=%2Fp%2Fxyz%2F')).toBe(true);
  });

  it('an ordinary redirect is not one', () => {
    expect(isSignInRedirect('http://example.com/a', 'https://www.example.com/a/')).toBe(false);
    expect(isSignInRedirect('https://youtu.be/abc', 'https://www.youtube.com/watch?v=abc')).toBe(false);
    expect(isSignInRedirect('https://en.wikipedia.org/wiki/Login', 'https://en.wikipedia.org/wiki/Login_(computing)')).toBe(false);
  });

  it('no redirect, or no final address known, is not one', () => {
    expect(isSignInRedirect(DOC, DOC)).toBe(false);
    expect(isSignInRedirect(DOC, null)).toBe(false);
    expect(isSignInRedirect(DOC, 'not a url')).toBe(false);
  });

  it('saving a sign-in page itself is allowed', () => {
    expect(isSignInRedirect('https://github.com/login', 'https://github.com/login?return_to=%2F')).toBe(false);
  });
});

describe('isSignInUrl', () => {
  it('sign-in hosts and paths', () => {
    expect(isSignInUrl(GOOGLE_SIGN_IN)).toBe(true);
    expect(isSignInUrl('https://auth.example.com/')).toBe(true);
    expect(isSignInUrl('https://example.com/users/sign_in')).toBe(true);
  });

  it('not a page that merely mentions it', () => {
    expect(isSignInUrl('https://example.com/blog/how-to-login-faster')).toBe(false);
    expect(isSignInUrl(DOC)).toBe(false);
  });
});

describe('isLikelyChallengeTitle — sign-in pages', () => {
  it.each([
    'Google Docs: Sign-in',
    'Google Drive: Sign-in',
    'Google Sheets: Sign-in',
    'Sign in - Google Accounts',
    'Sign in – Google accounts',
    'Google Accounts',
    'Sign in to your account',
  ])('%s', (title) => {
    expect(isLikelyChallengeTitle(title)).toBe(true);
  });

  it.each(['Quarterly plan - Google Docs', 'How to sign in to Google Docs on a Chromebook', 'Google Docs'])(
    'not %s',
    (title) => {
      expect(isLikelyChallengeTitle(title)).toBe(false);
    },
  );
});

describe('isUnsafeForCookieRead', () => {
  it.each([
    'https://example.com/logout',
    'https://example.com/account/sign-out/',
    'https://news.example.com/unsubscribe?id=42',
    'https://example.com/confirm?token=abc',
    'https://example.com/verify-email?u=1&t=2',
    'https://example.com/share?access_token=abc',
    'https://example.com/callback?code=abc&state=xyz',
    'https://example.com/oauth2/authorize?client_id=1&redirect_uri=x',
    'https://accounts.google.com/v3/signin/identifier',
    'https://user:pass@example.com/',
    'ftp://example.com/file',
    'not a url',
  ])('%s', (url) => {
    expect(isUnsafeForCookieRead(url)).toBe(true);
  });

  it.each([
    'https://docs.google.com/document/d/1AbCdEf/edit',
    'https://www.notion.so/My-page-0123456789abcdef',
    'https://example.com/blog/how-to-confirm-a-booking',
    'https://example.com/confirm',
    'https://example.com/search?q=logout',
  ])('not %s', (url) => {
    expect(isUnsafeForCookieRead(url)).toBe(false);
  });
});
