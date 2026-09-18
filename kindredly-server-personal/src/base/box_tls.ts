/**
 * A box certifies itself (BOX-3).
 *
 * **Why.** A browser tab or iframe loading a page from `http://<box>` has no `crypto.subtle`, so
 * the client cannot derive the account key and nobody can sign in — only `localhost` is exempt.
 * No public authority issues for `.local` or a private IP, and public DNS pointing at a private
 * IP is rejected by rebinding protection in most home routers. So the box is its own authority,
 * the way Home Assistant is, with a stable name instead of an address.
 *
 * **The shape.**
 *   - One long-lived ROOT authority (10 years) in `<dataDir>/tls/`, generated on first start,
 *     0600, backed up with the data — it is as much a part of the box as `box.env`.
 *   - One short-lived LEAF (90 days, renewed at 30 remaining) for the box's names and every
 *     current LAN address. Re-issued whenever the address set changes.
 *   - Devices trust the AUTHORITY, never the leaf, so a DHCP move or a renewal asks nothing of
 *     them. That property is what makes a dynamic LAN address survivable.
 *
 * **Names, not addresses.** The origin a browser bookmarks must be `https://kindredly.local:8420`
 * (or the suffixed form the box took on a collision — BOX-1). Addresses ride in the SAN list so a
 * typed IP also works, but an IP in the bookmarked origin churns the session on every renewal.
 *
 * **The one way this goes badly wrong.** Shipping the leaf without the authority-install story.
 * A browser then shows an interstitial on a tab and a BLANK frame with no proceed button in an
 * iframe — strictly worse than HTTP. `box_trust_page.ts` (every platform, by hand) and the
 * Companion (BOX-4, desktops, zero-touch) are part of this, not a follow-up.
 *
 * Keys come from Node's own `crypto` (fast, native); the X.509 assembly is node-forge, which is
 * the only pure-JS certificate builder already in the tree.
 */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import forge from 'node-forge';
import {config} from '@/config';
import {logger} from '@/utils/logger';

export const CA_DAYS = 3650;
export const LEAF_DAYS = 90;
export const RENEW_AT_DAYS_LEFT = 30;

/** The names every box answers to. All three suffix forms are in every leaf, so a collision rename never needs a re-issue. */
export const BOX_HOSTNAMES = ['kindredly.local', 'kindredly-2.local', 'kindredly-3.local'];

export type BoxTlsMaterial = {
  dir: string;
  /** PEM, for `https.createServer`. */
  key: string;
  cert: string;
  /** The authority, PEM and DER — what a device installs. */
  caPem: string;
  caDer: Buffer;
  /** sha256 of the authority's DER, lowercase hex. Pinned by the Companion against /healthcheckping. */
  caSha256: string;
  /** What the current leaf covers, for change detection. */
  sans: {dns: string[]; ip: string[]};
  leafNotAfter: Date;
};

const FILES = {
  caKey: 'box-ca.key',
  caCert: 'box-ca.crt',
  leafKey: 'box.key',
  leafCert: 'box.crt',
};

/** Whether this process should serve TLS at all. Cloud never; a box unless told `off`. */
export function boxTlsEnabled(): boolean {
  return config.profile === 'lite' && config.box.tls;
}

export function tlsDir(dataDir: string = config.box.dataDir): string {
  return path.join(dataDir, 'tls');
}

/** Non-internal addresses on every interface. IPv4 first; global IPv6 too, link-local left out. */
export function currentLanAddresses(
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): string[] {
  const v4: string[] = [];
  const v6: string[] = [];
  for (const list of Object.values(interfaces)) {
    for (const info of list || []) {
      if (info.internal) continue;
      if (info.family === 'IPv4' || (info.family as unknown) === 4) v4.push(info.address);
      else if (!info.address.toLowerCase().startsWith('fe80')) v6.push(info.address.split('%')[0]);
    }
  }
  return [...new Set([...v4, ...v6])];
}

/** The SAN set a leaf issued right now would carry. */
export function desiredSans(opts: {hostname?: string; addresses?: string[]} = {}): {dns: string[]; ip: string[]} {
  const osName = os.hostname().split('.')[0].toLowerCase();
  const dns = [...BOX_HOSTNAMES, 'localhost'];
  if (opts.hostname && !dns.includes(opts.hostname)) dns.push(opts.hostname);
  if (osName && !dns.includes(`${osName}.local`)) dns.push(`${osName}.local`);
  const ip = ['127.0.0.1', ...(opts.addresses ?? currentLanAddresses())];
  return {dns: [...new Set(dns)], ip: [...new Set(ip)]};
}

function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function randomSerial(): string {
  // Positive, 16 bytes: forge wants a hex string and X.509 wants a positive integer.
  const bytes = crypto.randomBytes(16);
  bytes[0] &= 0x7f;
  return bytes.toString('hex');
}

function newRsaKeyPem(): string {
  return crypto
    .generateKeyPairSync('rsa', {modulusLength: 2048})
    .privateKey.export({type: 'pkcs1', format: 'pem'}) as string;
}

function writeSecret(file: string, contents: string | Buffer): void {
  fs.writeFileSync(file, contents, {mode: 0o600});
  fs.chmodSync(file, 0o600);
}

function readIfExists(file: string): string | null {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

/** A root authority for this box. `id` is a short random tag so two boxes' authorities are distinguishable in a trust store. */
export function createAuthority(): {keyPem: string; certPem: string} {
  const keyPem = newRsaKeyPem();
  const key = forge.pki.privateKeyFromPem(keyPem);
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.setRsaPublicKey(key.n, key.e);
  cert.serialNumber = randomSerial();
  cert.validity.notBefore = new Date(Date.now() - 5 * 60 * 1000);
  cert.validity.notAfter = new Date(Date.now() + CA_DAYS * 86400 * 1000);
  const id = crypto.randomBytes(3).toString('hex');
  const subject = [
    {name: 'commonName', value: `Kindredly Box Authority ${id}`},
    {name: 'organizationName', value: 'Kindredly'},
  ];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.setExtensions([
    {name: 'basicConstraints', cA: true, critical: true},
    {name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true},
    {name: 'subjectKeyIdentifier'},
  ]);
  cert.sign(key, forge.md.sha256.create());
  return {keyPem, certPem: forge.pki.certificateToPem(cert)};
}

/** A leaf for the box, signed by its authority. What Apple and Chrome require of a leaf is all here: SANs, serverAuth, ≤825 days, SHA-256, RSA-2048. */
export function issueLeaf(
  ca: {keyPem: string; certPem: string},
  sans: {dns: string[]; ip: string[]},
  primaryName: string,
): {keyPem: string; certPem: string; notAfter: Date} {
  const caKey = forge.pki.privateKeyFromPem(ca.keyPem);
  const caCert = forge.pki.certificateFromPem(ca.certPem);
  const keyPem = newRsaKeyPem();
  const key = forge.pki.privateKeyFromPem(keyPem);
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.setRsaPublicKey(key.n, key.e);
  cert.serialNumber = randomSerial();
  cert.validity.notBefore = new Date(Date.now() - 5 * 60 * 1000);
  cert.validity.notAfter = new Date(Date.now() + LEAF_DAYS * 86400 * 1000);
  cert.setSubject([
    {name: 'commonName', value: primaryName},
    {name: 'organizationName', value: 'Kindredly'},
  ]);
  cert.setIssuer(caCert.subject.attributes);
  cert.setExtensions([
    {name: 'basicConstraints', cA: false, critical: true},
    {name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true},
    {name: 'extKeyUsage', serverAuth: true},
    {name: 'subjectKeyIdentifier'},
    // Explicitly the ISSUER's key id: forge's `keyIdentifier: true` computes it from the leaf's own
    // key, which makes OpenSSL unable to build the chain ("unable to verify the first certificate").
    {
      name: 'authorityKeyIdentifier',
      keyIdentifier: caCert.generateSubjectKeyIdentifier().getBytes(),
    } as unknown as Record<string, unknown>,
    {
      name: 'subjectAltName',
      altNames: [...sans.dns.map((value) => ({type: 2, value})), ...sans.ip.map((ip) => ({type: 7, ip}))],
    },
  ]);
  cert.sign(caKey, forge.md.sha256.create());
  return {keyPem, certPem: forge.pki.certificateToPem(cert), notAfter: cert.validity.notAfter};
}

/** What a PEM leaf covers, read back from the certificate itself rather than a sidecar that could lie. */
export function readLeaf(certPem: string): {sans: {dns: string[]; ip: string[]}; notAfter: Date} {
  const cert = forge.pki.certificateFromPem(certPem);
  const ext = cert.getExtension('subjectAltName') as {
    altNames?: Array<{type: number; value?: string; ip?: string}>;
  } | null;
  const dns: string[] = [];
  const ip: string[] = [];
  for (const alt of ext?.altNames || []) {
    if (alt.type === 2 && alt.value) dns.push(alt.value);
    if (alt.type === 7 && alt.ip) ip.push(alt.ip);
  }
  return {sans: {dns, ip}, notAfter: cert.validity.notAfter};
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((v) => set.has(v));
}

/** Whether a leaf needs replacing: its address set changed, or it is inside the renewal window. */
export function leafStale(
  leaf: {sans: {dns: string[]; ip: string[]}; notAfter: Date},
  wanted: {dns: string[]; ip: string[]},
  now: Date = new Date(),
): boolean {
  if (!sameSet(leaf.sans.dns, wanted.dns) || !sameSet(leaf.sans.ip, wanted.ip)) return true;
  return leaf.notAfter.getTime() - now.getTime() < RENEW_AT_DAYS_LEFT * 86400 * 1000;
}

/**
 * Make sure the authority and a current leaf exist under `dir`, creating or renewing as needed,
 * and hand back everything a listener and the trust page need. Synchronous on purpose: it runs
 * once at start, before the port is bound, and key generation takes well under a second.
 */
export function ensureBoxTls(
  opts: {dir?: string; hostname?: string; addresses?: string[]; now?: Date} = {},
): BoxTlsMaterial {
  const dir = opts.dir ?? tlsDir();
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});

  let caKeyPem = readIfExists(path.join(dir, FILES.caKey));
  let caCertPem = readIfExists(path.join(dir, FILES.caCert));
  if (!caKeyPem || !caCertPem) {
    const ca = createAuthority();
    caKeyPem = ca.keyPem;
    caCertPem = ca.certPem;
    writeSecret(path.join(dir, FILES.caKey), caKeyPem);
    writeSecret(
      path.join(dir, FILES.caCert),
      `# Kindredly box authority. Devices that trust this file trust every certificate this box issues.\n# Back it up WITH the data: a box that loses it is a box every device has to trust again.\n${caCertPem}`,
    );
    logger.info(`[box-tls] generated a new authority in ${dir}`);
  }
  // Strip the comment header for consumers: PEM parsers tolerate it, but the DER conversion does not want it.
  const caPemClean = caCertPem.replace(/^#.*\n/gm, '');

  const wanted = desiredSans({hostname: opts.hostname, addresses: opts.addresses});
  const primaryName = opts.hostname || BOX_HOSTNAMES[0];
  let leafKeyPem = readIfExists(path.join(dir, FILES.leafKey));
  let leafCertPem = readIfExists(path.join(dir, FILES.leafCert));
  let leaf = leafKeyPem && leafCertPem ? safeReadLeaf(leafCertPem) : null;

  if (!leafKeyPem || !leafCertPem || !leaf || leafStale(leaf, wanted, opts.now)) {
    const reason = !leaf ? 'no leaf' : 'address set changed or renewal window';
    const issued = issueLeaf({keyPem: caKeyPem, certPem: caPemClean}, wanted, primaryName);
    leafKeyPem = issued.keyPem;
    leafCertPem = issued.certPem;
    writeSecret(path.join(dir, FILES.leafKey), leafKeyPem);
    writeSecret(path.join(dir, FILES.leafCert), leafCertPem);
    leaf = {sans: wanted, notAfter: issued.notAfter};
    logger.info(`[box-tls] issued a leaf for ${wanted.dns.join(', ')} + ${wanted.ip.join(', ')} (${reason})`);
  }

  const caDer = Buffer.from(
    forge.asn1.toDer(forge.pki.certificateToAsn1(forge.pki.certificateFromPem(caPemClean))).getBytes(),
    'binary',
  );
  return {
    dir,
    key: leafKeyPem,
    cert: leafCertPem,
    caPem: caPemClean,
    caDer,
    caSha256: sha256Hex(caDer),
    sans: leaf.sans,
    leafNotAfter: leaf.notAfter,
  };
}

function safeReadLeaf(certPem: string): {sans: {dns: string[]; ip: string[]}; notAfter: Date} | null {
  try {
    return readLeaf(certPem);
  } catch {
    return null;
  }
}

/** The material the running process serves with; `null` until `loadBoxTls()` ran, and forever on the cloud. */
let current: BoxTlsMaterial | null = null;

export function getBoxTls(): BoxTlsMaterial | null {
  return current;
}

/** The authority's fingerprint for /healthcheckping, or undefined when this process serves no TLS. */
export function getBoxCaSha256(): string | undefined {
  return current?.caSha256;
}

/** Generate-or-load once at start. Returns null when TLS is not for this process. */
export function loadBoxTls(opts: {hostname?: string} = {}): BoxTlsMaterial | null {
  if (!boxTlsEnabled()) return null;
  current = ensureBoxTls({hostname: opts.hostname});
  return current;
}

/**
 * Re-check the leaf against the current address set. Called on a slow timer by the listener; the
 * returned material, when non-null, is new and the caller swaps it in with `setSecureContext`.
 */
export function refreshBoxTls(opts: {hostname?: string} = {}): BoxTlsMaterial | null {
  if (!current) return null;
  const wanted = desiredSans({hostname: opts.hostname});
  if (!leafStale({sans: current.sans, notAfter: current.leafNotAfter}, wanted)) return null;
  current = ensureBoxTls({dir: current.dir, hostname: opts.hostname});
  return current;
}

/** Test seam: forget the loaded material. */
export function resetBoxTlsForTests(): void {
  current = null;
}
