import {config} from '@/config';
import {logger} from '@/utils/logger';

/**
 * Picks how this process actually puts mail on the wire.
 *
 * Shaped after `base/runtime.factory.ts`, for the same reason it gives: the
 * implementations are `require`d on first send and never at module load, so the
 * cloud never resolves `nodemailer` and a self-hosted box never resolves
 * `aws-sdk` - which is not in its package.json at all. A static import of either
 * one here would be a boot failure on the other side.
 *
 * WHY THIS EXISTS. `utils/email_utils.ts` used to call SES directly, so it could
 * not be shipped to a box. It was excluded from the sync instead, and the
 * published repo carried its own copy with the send block deleted - which built,
 * ran, and silently sent nothing, with no error and no log. Making the transport
 * pluggable is what lets that copy be deleted rather than maintained.
 */

export type EmailMessage = {
  to: string[];
  bcc: string[];
  subject: string;
  html: string;
  from: string;
};

/**
 * Deliberately not a thrown error. `sendEmail` has 14 call sites and none of
 * them await it, so a rejected promise here would be an unhandled rejection in
 * request paths that are otherwise fine. Failure is a value.
 */
export type EmailSendResult = {
  delivered: boolean;
  messageId?: string;
  error?: string;
};

export interface EmailTransport {
  /** Named so a failure log says which transport failed, not just that one did. */
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

let transport: EmailTransport | null = null;

/**
 * `EMAIL_TRANSPORT` is an explicit override for all of it. Without one:
 *
 *   - messaging switched off  -> 'file', which is the old
 *     `!config.enableEmailMessaging` branch, kept byte-for-byte in behaviour
 *     because the test environment defaults into it.
 *   - a self-hosted box       -> 'smtp' once a host is configured, 'none' before
 *     that. A box with no mail settings is the normal first-boot state, not an
 *     error, so it must not look like one.
 *   - anything else           -> 'ses'.
 */
function chooseTransportName(): string {
  const override = (process.env.EMAIL_TRANSPORT || '').trim().toLowerCase();
  if (override) return override;
  if (!config.enableEmailMessaging) return 'file';
  if (config.privateServer) return config.smtp.host ? 'smtp' : 'none';
  return 'ses';
}

export function getEmailTransport(): EmailTransport {
  if (!transport) {
    const name = chooseTransportName();
    switch (name) {
      case 'ses': {
        const {SesEmailTransport} = require('./email_transport.ses');
        transport = new SesEmailTransport();
        break;
      }
      case 'smtp': {
        const {SmtpEmailTransport} = require('./email_transport.smtp');
        transport = new SmtpEmailTransport();
        break;
      }
      case 'file': {
        const {FileEmailTransport} = require('./email_transport.noop');
        transport = new FileEmailTransport();
        break;
      }
      case 'none': {
        const {NoopEmailTransport} = require('./email_transport.noop');
        transport = new NoopEmailTransport();
        break;
      }
      default: {
        // An unrecognised EMAIL_TRANSPORT must not fall through to a working
        // transport - that would send real mail through a route nobody asked
        // for. It must not throw either, because this resolves inside a send.
        logger.error(`EMAIL_TRANSPORT="${name}" is not a transport; sending nothing`);
        const {NoopEmailTransport} = require('./email_transport.noop');
        transport = new NoopEmailTransport();
      }
    }
    logger.info(`[email] transport: ${transport.name}`);
  }
  return transport as EmailTransport;
}

/**
 * Forget the resolved transport so the next send re-picks one. The save path for
 * server-side mail settings calls this; without it a box would keep using the
 * transport it resolved before the owner configured one.
 */
export function resetEmailTransport(): void {
  transport = null;
}
