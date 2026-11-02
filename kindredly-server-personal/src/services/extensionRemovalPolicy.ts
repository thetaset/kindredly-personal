/**
 * The removal alert for the Kindredly browser extension (HAT-129).
 *
 * Chrome and Firefox open one web page when an extension is removed —
 * `runtime.setUninstallURL`. While a child is signed in, the extension points that
 * page at the server, and opening it tells the family's admins. It is the only
 * moment a removed extension gets: once it is gone, none of it runs.
 *
 * The page is opened by the child's browser with no session, so the link has to
 * prove itself. It carries the child's id and the install's client id, signed with
 * a key only the server holds; without the signature anyone could alert any family.
 *
 * Switching the extension off opens no page, so it is not covered here.
 *
 * Pure: keys come in as arguments, so this is unit-tested without config.
 */
import crypto from 'crypto';

export type RemovalLink = {u: string; c: string; s: string};

const SIGNATURE_LENGTH = 32;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export function isRemovalId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/** A key of its own, so a removal link can never be mistaken for anything else the secret signs. */
export function removalKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(`extension-removal:${secret}`).digest();
}

export function signRemoval(key: Buffer, userId: string, clientId: string): string {
  return crypto
    .createHmac('sha256', key)
    .update(`${userId}\n${clientId}`)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH);
}

/** True when any of `keys` signed this link. Several keys, so a secret rotation does not break links already set. */
export function verifyRemoval(keys: Buffer[], link: Partial<Record<keyof RemovalLink, unknown>>): link is RemovalLink {
  const {u, c, s} = link;
  if (!isRemovalId(u) || !isRemovalId(c) || typeof s !== 'string' || s.length !== SIGNATURE_LENGTH) return false;
  const given = Buffer.from(s);
  return keys.some((key) => {
    const expected = Buffer.from(signRemoval(key, u, c));
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  });
}

/**
 * Which browser and computer, from the user agent of the browser that opened the page.
 * Only ever one of these fixed labels, so a forged user agent cannot put its own text
 * into a parent's email.
 */
export function describeBrowser(userAgent: string | undefined): {browser: string; device: string} {
  const ua = userAgent || '';
  let browser = 'a browser';
  if (/\bEdg\//.test(ua)) browser = 'Edge';
  else if (/\bOPR\//.test(ua)) browser = 'Opera';
  else if (/\bFirefox\//.test(ua)) browser = 'Firefox';
  else if (/\bChrome\//.test(ua)) browser = 'Chrome';

  let device = 'computer';
  if (/\bCrOS\b/.test(ua)) device = 'Chromebook';
  else if (/\bWindows\b/.test(ua)) device = 'Windows computer';
  else if (/\bMacintosh\b|\bMac OS X\b/.test(ua)) device = 'Mac';
  else if (/\bLinux\b/.test(ua)) device = 'Linux computer';

  return {browser, device};
}

export function removalAlertCopy(childName: string, userAgent: string | undefined): {title: string; body: string} {
  const {browser, device} = describeBrowser(userAgent);
  return {
    title: 'Kindredly was removed',
    body: `Kindredly was removed from ${browser} on ${childName}'s ${device}.`,
  };
}

/** The page the browser shows after removal. Self-contained: no scripts, no requests. */
export function removedPageHtml(parentTold: boolean): string {
  const told = parentTold ? '<p>A parent has been told.</p>' : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kindredly removed</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --text: #1f2328; --muted: #59636e; }
  @media (prefers-color-scheme: dark) { :root { --bg: #16181c; --text: #e6e8eb; --muted: #9aa3ad; } }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, -apple-system, sans-serif; }
  main { max-width: 32rem; margin: 18vh auto 0; padding: 0 16px; }
  h1 { font-size: 1.4rem; margin: 0 0 0.5rem; }
  p { margin: 0 0 0.5rem; color: var(--muted); }
</style>
</head>
<body>
<main>
<h1>Kindredly has been removed from this browser</h1>
${told}
</main>
</body>
</html>
`;
}
