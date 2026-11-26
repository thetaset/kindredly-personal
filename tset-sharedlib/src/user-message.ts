/**
 * The `errorType` on a failure whose `message` is written for the person who asked: a limit
 * reached, a site a parent has to allow, an image server that did not answer. A page shows such a
 * message as it is. Every other failure message is for engineers ("LoginId is missing", "Item not
 * found"), and the page says what failed in its own words instead (UIC-27,
 * tset-client/src/app/actionFailure.ts).
 */
export const USER_MESSAGE = 'USER_MESSAGE';

/**
 * An error whose message a page may show as written. The server's `errorHelper` and the
 * background's request handler both copy `errorType` into the `{success:false}` reply.
 */
export class UserMessageError extends Error {
  readonly errorType = USER_MESSAGE;

  constructor(message: string) {
    super(message);
    this.name = 'UserMessageError';
  }
}
