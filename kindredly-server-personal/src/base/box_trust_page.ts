/**
 * The HTTPS front door of a box, and the page that gets a device through it (BOX-3).
 *
 * Three things live here because they only make sense together:
 *   1. `createBoxListener` — ONE port serving both HTTPS and HTTP. A box keeps `8420` on every
 *      run because the browser scopes the session to the origin (`start_box.sh`), so HTTPS cannot
 *      move to a second port; instead the first byte of each connection decides (0x16 is a TLS
 *      handshake, anything else is HTTP).
 *   2. `shouldRedirectToHttps` — only NAVIGATIONS from non-loopback hosts are sent to HTTPS. API
 *      calls over HTTP keep working: the extension and the native apps are secure origins that are
 *      allowed to call an HTTP box, and forcing them onto a certificate they have not installed
 *      yet would break every device that works today. `localhost` is already a secure context, so
 *      it is never redirected either. The trust page, the authority download and the discovery
 *      probe are exempt — a device that does not yet trust us cannot load anything else.
 *   3. `mountBoxTrustRoutes` — `/box/trust` and `/downloads/kindredly-box-ca.{crt,pem}`, the
 *      per-platform install steps written for a cold reader.
 */
import http from 'http';
import https from 'https';
import net from 'net';
import type {Duplex} from 'stream';
import type {Application, NextFunction, Request, Response} from 'express';
import {BOX_HOSTNAMES, getBoxTls, refreshBoxTls, type BoxTlsMaterial} from '@/base/box_tls';
import {logger} from '@/utils/logger';

export const TRUST_PAGE_PATH = '/box/trust';
export const CA_DOWNLOAD_PATH = '/downloads/kindredly-box-ca';

/** Paths a device must be able to reach BEFORE it trusts the box. */
export const HTTP_EXEMPT_PREFIXES = ['/healthcheckping', '/box/', CA_DOWNLOAD_PATH];

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function hostWithoutPort(host: string | undefined): string {
  const h = String(host || '')
    .trim()
    .toLowerCase();
  if (!h) return '';
  // IPv6 literal: [::1]:8420
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1);
  return h.split(':')[0];
}

/** True for a browser navigation that should be on HTTPS. Pure, for tests. */
export function shouldRedirectToHttps(req: {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
  encrypted?: boolean;
}): boolean {
  if (req.encrypted) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const host = hostWithoutPort(req.headers.host);
  if (!host || LOOPBACK_HOSTS.has(host)) return false;
  const url = String(req.url || '/');
  if (HTTP_EXEMPT_PREFIXES.some((p) => url.startsWith(p))) return false;
  // Only something that wants a page. Fetches send */* or application/json; a navigation says text/html.
  const accept = String(req.headers.accept || '');
  if (!accept.includes('text/html')) return false;
  // A fetch from a page still says text/html sometimes; the Sec-Fetch-Mode header settles it when present.
  const mode = String(req.headers['sec-fetch-mode'] || '');
  if (mode && mode !== 'navigate') return false;
  return true;
}

export type BoxListener = {
  /** The mux. `listen(port)` this. */
  server: net.Server;
  httpServer: http.Server;
  httpsServer: https.Server;
  /** Swap in renewed material without dropping the port. */
  setMaterial: (material: BoxTlsMaterial) => void;
  close: () => Promise<void>;
};

/**
 * One port, both protocols. Each incoming socket is paused until its first bytes arrive; those
 * bytes are pushed back and the socket is handed to the right server.
 */
export function createBoxListener(opts: {app: Application; tls: BoxTlsMaterial; renewEveryMs?: number}): BoxListener {
  const {app} = opts;

  const httpServer = http.createServer((req, res) => {
    if (shouldRedirectToHttps(req)) {
      const location = `https://${req.headers.host}${req.url || '/'}`;
      res.writeHead(302, {Location: location, 'Cache-Control': 'no-store'});
      res.end();
      return;
    }
    app(req, res);
  });

  const httpsServer = https.createServer({key: opts.tls.key, cert: opts.tls.cert}, app);

  const server = net.createServer((socket) => {
    socket.once('error', () => undefined);
    socket.once('data', (chunk: Buffer) => {
      socket.pause();
      socket.unshift(chunk);
      const target = chunk[0] === 0x16 ? httpsServer : httpServer;
      target.emit('connection', socket as Duplex);
      // Let the receiving server attach its listeners before the bytes flow again.
      process.nextTick(() => socket.resume());
    });
  });

  // Renewal: re-check the leaf against the current address set on a slow timer. A DHCP move on a
  // running box re-issues within the interval; the authority never changes, so devices need nothing.
  const renewEveryMs = opts.renewEveryMs ?? 6 * 60 * 60 * 1000;
  const timer = setInterval(() => {
    try {
      const renewed = refreshBoxTls();
      if (renewed) {
        httpsServer.setSecureContext({key: renewed.key, cert: renewed.cert});
        logger.info('[box-tls] leaf renewed and swapped in');
      }
    } catch (error) {
      logger.warn(`[box-tls] renewal check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, renewEveryMs);
  timer.unref();

  return {
    server,
    httpServer,
    httpsServer,
    setMaterial: (material) => httpsServer.setSecureContext({key: material.key, cert: material.cert}),
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(timer);
        // Keep-alive sockets would otherwise hold the port open until the client gives up.
        httpServer.closeAllConnections();
        httpsServer.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The setup page. Plain HTML on purpose: it is loaded by a device that cannot yet load the app. */
export function renderTrustPage(opts: {
  hostname: string;
  port: number;
  caSha256: string;
  names: string[];
  addresses: string[];
}): string {
  const primary = `https://${opts.hostname}:${opts.port}`;
  const fp = opts.caSha256.toUpperCase().match(/.{2}/g)?.join(':') ?? opts.caSha256;
  const appUrl = `${primary}/kindredapp/`;
  const otherNames = opts.names.filter((n) => n !== opts.hostname);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trust this Kindredly box</title>
<style>
  body{font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:44rem;margin:2rem auto;padding:0 1.25rem;color:#1d1d1f}
  h1{font-size:1.6rem;margin:0 0 .25rem} h2{font-size:1.1rem;margin:1.75rem 0 .5rem}
  p{margin:.5rem 0} ol{padding-left:1.25rem} li{margin:.25rem 0}
  code{font:.9em ui-monospace,SFMono-Regular,Menlo,monospace;background:#f2f2f4;padding:.1em .35em;border-radius:4px}
  .btn{display:inline-block;padding:.55rem 1rem;border-radius:8px;background:#1b6ef3;color:#fff;text-decoration:none;font-weight:600;margin:.5rem .5rem .5rem 0}
  .muted{color:#6e6e73} .fp{word-break:break-all}
  details{margin:.5rem 0} summary{cursor:pointer;font-weight:600}
</style></head><body>
<h1>Trust this Kindredly box</h1>
<p class="muted">This box runs your family's Kindredly at home. It signs its own HTTPS certificate, because no public authority issues one for a name that only exists on your network. Install its authority once on each device; after that <a href="${appUrl}">${escapeHtml(appUrl)}</a> opens with no warning, and a change of address on your network never asks you again.</p>
<p><a class="btn" href="${CA_DOWNLOAD_PATH}.crt">Download the authority (.crt)</a> <a class="btn" style="background:#6e6e73" href="${CA_DOWNLOAD_PATH}.pem">PEM</a></p>
<p class="muted fp">Fingerprint (SHA-256): <code>${fp}</code></p>
<p><strong>The Kindredly app on a phone does not need this.</strong> Only a phone or computer <em>browser</em> does. The browser extension needs it on any computer where it opens apps from this box.</p>

<h2>macOS</h2>
<ol><li>Open the downloaded file. Keychain Access opens and adds it to your <strong>login</strong> keychain straight away — there is no dialog, and it lands under the <strong>Certificates</strong> tab, not My Certificates.</li><li>In Keychain Access, search <strong>Kindredly Box</strong> and double-click the certificate.</li><li>Expand <strong>Trust</strong>. Set <strong>When using this certificate</strong> to <strong>Always Trust</strong>.</li><li>Close the window and enter your password.</li></ol>
<p class="muted">Or, in Terminal, one line does both the install and the trust for every user on this Mac: <code>sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/Downloads/kindredly-box-ca.crt</code></p>
<p class="muted">Safari and Chrome pick it up at once. Firefox does too when <code>security.enterprise_roots.enabled</code> is on (it is by default in current Firefox); otherwise import it under Settings → Privacy &amp; Security → Certificates → Authorities.</p>

<h2>Windows</h2>
<ol><li>Open the downloaded file, choose <strong>Install Certificate…</strong></li><li>Store location: <strong>Local Machine</strong>. Approve the prompt.</li><li>Choose <strong>Place all certificates in the following store</strong> → Browse → <strong>Trusted Root Certification Authorities</strong>.</li><li>Finish. Approve the security warning.</li><li>Restart the browser.</li></ol>

<h2>iPhone and iPad (browser only)</h2>
<ol><li>Download the .crt in Safari and choose <strong>Allow</strong>. It says "Profile Downloaded".</li><li>Settings → <strong>Profile Downloaded</strong> → Install, enter your passcode.</li><li>Settings → General → About → <strong>Certificate Trust Settings</strong>, and turn on full trust for the Kindredly Box authority.</li></ol>

<h2>Android (browser only)</h2>
<ol><li>Download the .crt.</li><li>Settings → Security → Encryption &amp; credentials → <strong>Install a certificate</strong> → <strong>CA certificate</strong>.</li><li>Pick the downloaded file and confirm.</li></ol>
<p class="muted">Android before 12 does not resolve <code>.local</code> names in Chrome. Use the box's address instead — it is in the certificate too.</p>

<h2>Linux</h2>
<ol><li><code>sudo cp kindredly-box-ca.crt /usr/local/share/ca-certificates/kindredly-box-ca.crt</code></li><li><code>sudo update-ca-certificates</code></li><li>Firefox keeps its own store: Settings → Privacy &amp; Security → Certificates → View → Authorities → Import.</li></ol>

<h2>Where this box answers</h2>
<p>By name: <code>${escapeHtml(primary)}</code>${otherNames.length ? ` <span class="muted">(the certificate also covers ${otherNames.map((n) => `<code>${escapeHtml(n)}</code>`).join(', ')})</span>` : ''}</p>
<p>By address: ${opts.addresses.map((a) => `<code>https://${escapeHtml(a)}:${opts.port}</code>`).join(' ')}</p>
<p class="muted">Bookmark the name, not an address. Addresses change when your router feels like it; the name does not.</p>
<details><summary>If the name does not resolve</summary><p>Some routers block the multicast DNS that carries <code>.local</code> names, and Android before 12 ignores it. The address form above works everywhere; the Kindredly apps also find the box on their own when it moves.</p></details>
</body></html>`;
}

/**
 * Mount the trust page and the authority downloads. Reads the material lazily so the routes can be
 * registered before `listen()` generates it. No-ops on requests when there is none (cloud).
 */
export function mountBoxTrustRoutes(app: Application, opts: {port: number; hostname?: () => string | null}): void {
  const material = () => getBoxTls();

  app.get(`${CA_DOWNLOAD_PATH}.crt`, (_req: Request, res: Response, next: NextFunction) => {
    const m = material();
    if (!m) return next();
    res.setHeader('Content-Type', 'application/x-x509-ca-cert');
    res.setHeader('Content-Disposition', 'attachment; filename="kindredly-box-ca.crt"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(m.caDer);
  });

  app.get(`${CA_DOWNLOAD_PATH}.pem`, (_req: Request, res: Response, next: NextFunction) => {
    const m = material();
    if (!m) return next();
    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader('Content-Disposition', 'attachment; filename="kindredly-box-ca.pem"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(m.caPem);
  });

  app.get(TRUST_PAGE_PATH, (_req: Request, res: Response, next: NextFunction) => {
    const m = material();
    if (!m) return next();
    const hostname = (opts.hostname && opts.hostname()) || BOX_HOSTNAMES[0];
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(
      renderTrustPage({
        hostname: hostname.endsWith('.local') ? hostname : `${hostname}.local`,
        port: opts.port,
        caSha256: m.caSha256,
        names: m.sans.dns.filter((n) => n.endsWith('.local')),
        addresses: m.sans.ip.filter((ip) => ip !== '127.0.0.1'),
      }),
    );
  });
}
