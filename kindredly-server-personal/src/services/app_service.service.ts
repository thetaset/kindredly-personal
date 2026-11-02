import {createHash} from 'crypto';
import {matchCheckedService} from 'tset-sharedlib/app-outside-services';
import {getKeyValueStore} from '@/base/runtime.factory';
import {config} from '@/config';
import {HttpException} from '@/exceptions/HttpException';
import {logger} from '@/utils/logger';

/**
 * Calls an app makes to a checked outside service, such as weather (HAT-629,
 * docs/trackers/app-outside-services-tracker.md).
 *
 * The host sends a call here instead of making it from the browser when the call is on
 * `CHECKED_SERVICES`. Everything that keeps this from being a proxy to anywhere is checked here,
 * not trusted from the host: the list again, GET only, no redirects followed, a size cap.
 *
 * One answer is shared by everyone who asks the same thing, for the time the list gives. A forecast
 * for one city asked by a thousand families is one call to the service.
 *
 * **Never log the address.** A forecast query carries the place a family asked about.
 */

export type AppServiceAnswer = {notSetUp: true} | {status: number; contentType: string; body: string};

const MAX_BODY_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;
const KEY_PREFIX = 'kindredly:appservice:v1:';
const USER_AGENT = 'Kindredly app services (+https://kindredly.ai)';

function cacheKey(url: string): string {
  return KEY_PREFIX + createHash('sha256').update(url).digest('hex');
}

/** A cached answer, or null when there is none or the cache is down — a cache fault costs a call, nothing more. */
async function readCache(key: string): Promise<AppServiceAnswer | null> {
  try {
    const raw = await getKeyValueStore().get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.status !== 'number' || typeof parsed?.body !== 'string') return null;
    return {status: parsed.status, contentType: String(parsed.contentType || ''), body: parsed.body};
  } catch (error) {
    logger.error('[appService] cache read failed', error);
    return null;
  }
}

async function writeCache(key: string, answer: AppServiceAnswer, seconds: number): Promise<void> {
  try {
    await getKeyValueStore().set(key, JSON.stringify(answer), 'EX', seconds);
  } catch (error) {
    logger.error('[appService] cache write failed', error);
  }
}

export async function callCheckedService(rawUrl: unknown): Promise<AppServiceAnswer> {
  const match = matchCheckedService(rawUrl, 'GET');
  if (!match) throw new HttpException(400, 'That address is not one of the services apps may call.');

  const {service, host} = match;

  // Only ever the server's own key: one an app put in the address must not reach the service, and
  // must not split the cache.
  const url = new URL(match.url.toString());
  url.searchParams.delete('apikey');
  url.hash = '';

  // Open-Meteo's free API is for non-commercial use, and Kindredly has paid plans. Without a key,
  // production says so and the host makes the call the old way (tracker decision 5).
  const apiKey = service.keyEnv ? String(process.env[service.keyEnv] || '').trim() : '';
  if (service.keyEnv && !apiKey && config.env === 'production') return {notSetUp: true};

  const key = cacheKey(url.toString());
  const cached = await readCache(key);
  if (cached) return cached;

  const upstream = new URL(url.toString());
  if (apiKey) {
    upstream.hostname = host.keyedHost;
    upstream.searchParams.set('apikey', apiKey);
  }

  let resp: Response;
  try {
    resp = await fetch(upstream, {
      headers: {'User-Agent': USER_AGENT, Accept: 'application/json'},
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error: any) {
    logger.warn(`[appService] ${service.id} did not answer: ${error?.name || 'error'}`);
    throw new HttpException(502, `${service.name} did not answer. Try again in a moment.`);
  }

  const declaredLength = Number(resp.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) throw new HttpException(502, `${service.name} sent too much.`);
  const body = await resp.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new HttpException(502, `${service.name} sent too much.`);

  const answer: AppServiceAnswer = {
    status: resp.status,
    contentType: resp.headers.get('content-type') || '',
    body,
  };
  // Only a good answer is shared: an error is one family's bad query, or a moment's outage.
  if (resp.status === 200) await writeCache(key, answer, host.cacheSeconds);
  return answer;
}
