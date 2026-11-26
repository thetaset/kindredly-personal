/**
 * What the server says when someone signs in and no Kindredly account is theirs (HAT-1236, HAT-1238).
 * For Google and Apple the sign-in page answers it with an offer to create an account, not an error.
 *
 * It travels as text: the extension's sign-in window records the server's message with the session
 * (`/auth/providerLogin/fail`) and the sign-in page reads it back from the status, so an error code
 * would not survive the trip. The server writes these words and the app recognises them from this one
 * place, never from copies of its own.
 */

/** The direct sign-in's answer for an identity with no account (auth.service.ts). */
export const USER_NOT_FOUND_MESSAGE = 'User not found';

/** The Google or Apple check's answer, which the phones and the sign-in window get. */
export function noKindredlyAccountMessage(provider: 'Google' | 'Apple'): string {
  return `No Kindredly account uses this ${provider} account. Sign in another way, or create an account.`;
}

/** True for either answer, however the message was trimmed or added to on its way. */
export function isNoKindredlyAccountMessage(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  const text = message.trim();
  if (text === USER_NOT_FOUND_MESSAGE) return true;
  return (['Google', 'Apple'] as const).some((provider) => text.startsWith(noKindredlyAccountMessage(provider).split('. ')[0]));
}
