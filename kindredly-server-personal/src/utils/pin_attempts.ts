import {config} from '@/config';
import {getKeyValueStore} from '@/base/runtime.factory';
import {storedSecretMatches} from '@/utils/stored_password';

/**
 * Wrong PINs per person, counted on the server whichever device they come from (HAT-848).
 *
 * Ten wrong in fifteen minutes and that person's PIN is refused for fifteen minutes. Their password
 * is still accepted, so nobody is ever locked out of their account, and the wait is never permanent.
 * The count lives in the key-value store, so it is gone after a restart, which only ever helps the person.
 *
 * Fails open: if the store can't be reached, PINs are checked exactly as before.
 */
export const PIN_TRIES_BEFORE_WAIT = 10;
export const PIN_WINDOW_SEC = 15 * 60;
export const PIN_WAIT_SEC = 15 * 60;

const wrongKey = (userId: string) => `pin_wrong:${userId}`;
const waitKey = (userId: string) => `pin_wait:${userId}`;

type PinpassOwner = {_id?: string; pin?: string | null; password?: string | null};

/** Seconds until this person's PIN is accepted again, or 0. */
export async function pinWaitSecondsLeft(userId: string, now = Date.now()): Promise<number> {
  if (!config.pinLockout.enabled) return 0;
  try {
    const until = Number(await getKeyValueStore().get(waitKey(userId)));
    const left = Math.ceil((until - now) / 1000);
    return Number.isFinite(left) && left > 0 ? left : 0;
  } catch (error) {
    console.warn('[pin_attempts] could not read the PIN wait', error);
    return 0;
  }
}

async function recordWrong(userId: string, now: number): Promise<void> {
  if (!config.pinLockout.enabled) return;
  try {
    const store = getKeyValueStore();
    const wrong = Number(await store.incr(wrongKey(userId)));
    if (wrong === 1) await store.expire(wrongKey(userId), PIN_WINDOW_SEC);
    if (wrong >= PIN_TRIES_BEFORE_WAIT) {
      await store.set(waitKey(userId), String(now + PIN_WAIT_SEC * 1000), 'EX', PIN_WAIT_SEC);
      await store.del(wrongKey(userId));
    }
  } catch (error) {
    console.warn('[pin_attempts] could not count a wrong PIN', error);
  }
}

async function clear(userId: string): Promise<void> {
  if (!config.pinLockout.enabled) return;
  try {
    await getKeyValueStore().del(wrongKey(userId), waitKey(userId));
  } catch (error) {
    console.warn('[pin_attempts] could not clear the PIN count', error);
  }
}

export function pinWaitMessage(waitSec: number): string {
  const minutes = Math.max(1, Math.ceil(waitSec / 60));
  return `Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or use your password`;
}

/**
 * Whether `pinpass` is this person's PIN or password, the check every "PIN or password" field uses.
 *
 * The password is accepted at any time and clears the count. While the PIN is waiting, the PIN is
 * not looked at, so a right guess during the wait tells nothing.
 */
export async function checkPinpass(
  user: PinpassOwner,
  pinpass: string,
  now = Date.now(),
): Promise<{ok: boolean; waitSec: number}> {
  const userId = String(user._id);

  if (await storedSecretMatches(user.password, pinpass)) {
    await clear(userId);
    return {ok: true, waitSec: 0};
  }

  const waitSec = await pinWaitSecondsLeft(userId, now);
  if (waitSec > 0) return {ok: false, waitSec};

  if (await storedSecretMatches(user.pin, pinpass)) {
    await clear(userId);
    return {ok: true, waitSec: 0};
  }

  await recordWrong(userId, now);
  return {ok: false, waitSec: 0};
}
