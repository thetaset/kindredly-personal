import {config} from '@/config';
import {getEmailTransport} from '@/base/email_transport';
import {logger} from '@/utils/logger';

/**
 * THE SIGNATURE IS POSITIONAL ON PURPOSE. Fourteen call sites pass these
 * arguments in this order, and two suites - `__tests__/contact_request_alert_hook.test.ts`
 * and `services/__tests__/notification.service.emailLinks.test.ts` - mock this
 * module and read `mock.calls[0]` by index. An options object would be tidier
 * and would break both without any type error to warn you.
 *
 * WHAT CHANGED: this used to build an SES request inline, which is why it could
 * not be shipped to a self-hosted box and was excluded from the sync instead.
 * Choosing the wire now belongs to `base/email_transport.ts`; this function's
 * job is the template substitution above it.
 */
function sendEmail(
  ToAddresses,
  subject: string,
  HTMLContent: string,
  template: string = null,
  BccAddresses = [],
  sourceEmail = 'Kindredly @ kindredly.ai <support-noreply@kindredly.ai>',
) {
  let data = template != null ? template.replace('CONTENT_BODY', HTMLContent) : HTMLContent;

  // replace all instance of "SERVER_HOSTNAME" with the actual server hostname
  data = data.replace(/SERVER_HOSTNAME/g, config.serverHostname);

  const message = {
    to: ToAddresses,
    bcc: BccAddresses,
    subject,
    html: data,
    from: sourceEmail,
  };

  // Returns void, and no caller awaits it. So the promise is consumed here and
  // can never reject - an unhandled rejection out of a notification would take
  // down a request that had otherwise succeeded.
  //
  // It does now say when a send failed, which it previously could not: the SES
  // path logged inside a .catch nobody read, and the published copy of this file
  // had no send in it at all and reported nothing.
  void getEmailTransport()
    .send(message)
    .then((result) => {
      if (result.delivered) {
        logger.debug(`[email] sent "${subject}" (${result.messageId ?? 'no id'})`);
      } else if (result.error) {
        logger.error(`[email] failed to send "${subject}": ${result.error}`);
      }
    })
    .catch((error) => {
      logger.error(`[email] transport threw sending "${subject}"`, error);
    });
}

export {sendEmail};
