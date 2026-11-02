/**
 * Recognises a sign-in page that answered in place of the page someone asked for.
 *
 * A page behind an account (a Google Doc, a Drive folder, a OneDrive file) answers a fetch made
 * without that account's cookies by redirecting to its sign-in page. The server reads every saved
 * link that way, so it read "Google Docs: Sign-in", and that title replaced the document's own in
 * the popup (HAT-168). The browser tab the person saved from had the real title all along.
 *
 * A sign-in page tells us nothing about the page behind it, so its title, description and picture
 * are never metadata for that page. The well-known sign-in titles are also in
 * `isLikelyChallengeTitle`, for a title whose final address was not recorded.
 */

/** Hosts that only ever serve sign-in for some other site. */
const SIGN_IN_HOSTS = new Set([
  'accounts.google.com',
  'login.microsoftonline.com',
  'login.microsoft.com',
  'login.live.com',
  'appleid.apple.com',
  'idmsa.apple.com',
  'login.yahoo.com',
]);

/** First label of a host that serves sign-in: login.example.com, auth.example.com. */
const SIGN_IN_HOST_LABEL = /^(login|signin|auth|sso|accounts?)$/i;

/** A path segment that is a sign-in step: /login, /accounts/login/, /ServiceLogin, /users/sign_in. */
const SIGN_IN_PATH_SEGMENT = /(^|\/)(login|log-in|log_in|signin|sign-in|sign_in|servicelogin|sso|oauth2?|authorize)(\/|$)/i;

function parse(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** True for an address that is itself a sign-in page. */
export function isSignInUrl(url: string | null | undefined): boolean {
  const parsed = parse(url);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  if (SIGN_IN_HOSTS.has(host)) return true;
  if (SIGN_IN_HOST_LABEL.test(host.split('.')[0] || '')) return true;
  return SIGN_IN_PATH_SEGMENT.test(parsed.pathname);
}

/**
 * True when a fetch of `requestedUrl` ended on a sign-in page at `finalUrl`: the page wanted an
 * account the fetch did not have. False when either address is missing, when nothing redirected,
 * or when the address asked for was already a sign-in page (saving a sign-in page is allowed).
 */
export function isSignInRedirect(requestedUrl: string | null | undefined, finalUrl: string | null | undefined): boolean {
  const requested = parse(requestedUrl);
  const final = parse(finalUrl);
  if (!requested || !final) return false;
  if (requested.href === final.href) return false;
  if (isSignInUrl(requested.href)) return false;
  return isSignInUrl(final.href);
}

/** A path step that does something when opened: signing out, unsubscribing. */
const ACTION_PATH_SEGMENT = /(^|\/)(logout|log-out|log_out|signout|sign-out|sign_out|unsubscribe|opt-out|optout)(\/|$)/i;

/** A path step that confirms something when opened with a token: /confirm?token=…, /verify/… */
const CONFIRM_PATH_SEGMENT = /(^|\/)(confirm|verify|activate|approve|accept|reset-password|password-reset|magic-link)(\/|$|[-_.])/i;

/** Query keys that carry a credential or start a sign-in. */
const CREDENTIAL_QUERY_KEYS = [
  'redirect_uri',
  'client_id',
  'response_type',
  'code_challenge',
  'access_token',
  'id_token',
  'token',
  'auth',
];

/**
 * True for an address the extension must not open in the background with the person's cookies
 * (+ › Link reads a pasted page that way, HAT-168). Opening such an address does something —
 * signs out, unsubscribes, confirms, or carries a credential — instead of just showing a page.
 * The server reads those without cookies, as it always has.
 */
export function isUnsafeForCookieRead(url: string | null | undefined): boolean {
  const parsed = parse(url);
  if (!parsed) return true;
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
  if (parsed.username || parsed.password) return true;
  if (isSignInUrl(parsed.href)) return true;
  if (ACTION_PATH_SEGMENT.test(parsed.pathname)) return true;

  const keys = Array.from(parsed.searchParams.keys()).map((key) => key.toLowerCase());
  if (keys.some((key) => CREDENTIAL_QUERY_KEYS.includes(key))) return true;
  // An OAuth callback.
  if (keys.includes('code') && keys.includes('state')) return true;
  return CONFIRM_PATH_SEGMENT.test(parsed.pathname) && keys.length > 0;
}
