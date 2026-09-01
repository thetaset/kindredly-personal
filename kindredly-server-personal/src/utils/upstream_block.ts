import {isBotBlockPage} from '@/utils/fetch_helpers';

/** Which piece of evidence identified the response as a bot mitigation. */
export type UpstreamBlockSignal = 'cf-mitigated' | 'challenge-body';

export interface UpstreamBlockVerdict {
  blocked: boolean;
  signal?: UpstreamBlockSignal;
}

/**
 * Decide whether an upstream response is a CDN bot mitigation aimed at *us*,
 * as opposed to the origin legitimately refusing the request.
 *
 * The distinction matters because the two need opposite advice. A mitigation
 * means our datacenter IP was filtered and a client that fetches directly (the
 * extension, the mobile apps) would succeed. An origin 403 — an expired token
 * on a paid podcast feed, say — will refuse those clients identically, and
 * telling that user to install an extension is worse than saying nothing.
 *
 * So the test is deliberately narrow: it requires evidence of a *mitigation*,
 * never merely evidence of a CDN. `cf-ray` and `server: cloudflare` are present
 * on every response from every Cloudflare-fronted origin — roughly a fifth of
 * the web — so keying on those would classify every 403 behind Cloudflare as a
 * block. Only two things count:
 *
 *  1. `cf-mitigated`, which Cloudflare sets when it, not the origin, produced
 *     the response.
 *  2. A body that reads as a challenge/interstitial page.
 *
 * Status is deliberately not part of the test. Managed challenges are commonly
 * served as `text/html` with HTTP **200**, which no status rule would catch,
 * and a bare 403 without either signal above is the origin's own answer.
 */
export function classifyUpstreamBlock(input: {
  headers: Record<string, any>;
  bodyPrefix?: string;
}): UpstreamBlockVerdict {
  const headers = input.headers || {};

  // Header lookup is case-insensitive: Node lowercases, but tests and other
  // transports may not.
  const hasHeader = (name: string): boolean =>
    Object.keys(headers).some((key) => key.toLowerCase() === name && headers[key] != null && headers[key] !== '');

  if (hasHeader('cf-mitigated')) {
    return {blocked: true, signal: 'cf-mitigated'};
  }

  if (input.bodyPrefix && isBotBlockPage(input.bodyPrefix)) {
    return {blocked: true, signal: 'challenge-body'};
  }

  return {blocked: false};
}

/**
 * Read at most `maxBytes` from a stream, giving up after `timeoutMs`.
 *
 * Used to sniff a response we are about to discard anyway, so it never delays
 * a successful proxy. Always detaches its own listeners; destroying the stream
 * is the caller's job (it already owns that discipline).
 */
export function readStreamPrefix(
  stream: NodeJS.ReadableStream | undefined,
  maxBytes = 32 * 1024,
  timeoutMs = 3000,
): Promise<string> {
  if (!stream || typeof stream.on !== 'function') {
    return Promise.resolve('');
  }

  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stream.removeListener('data', onData);
      stream.removeListener('end', finish);
      stream.removeListener('error', finish);
      resolve(Buffer.concat(chunks).toString('utf8'));
    };

    const onData = (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      chunks.push(buf);
      total += buf.length;
      if (total >= maxBytes) finish();
    };

    const timer = setTimeout(finish, timeoutMs);
    // Do not hold the process open for a sniff of a body we are discarding.
    if (typeof (timer as any).unref === 'function') (timer as any).unref();

    stream.on('data', onData);
    stream.on('end', finish);
    stream.on('error', finish);
  });
}
