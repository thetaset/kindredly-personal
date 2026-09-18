import fs from 'fs';
import {logger} from '@/utils/logger';
import {EmailMessage, EmailSendResult, EmailTransport} from './email_transport';

/**
 * Writes the message to `testemail_output.html` instead of sending it. This is
 * the old `!config.enableEmailMessaging` branch of `sendEmail`, moved rather
 * than rewritten - the test environment defaults into it (`config.ts` sets
 * enableEmailMessaging from `environment !== 'test'`), and the file it writes is
 * already in .gitignore.
 */
export class FileEmailTransport implements EmailTransport {
  readonly name = 'file';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    logger.debug(`[email] not sending (file transport): ${message.subject} -> ${message.to.join(', ')}`);
    try {
      fs.writeFileSync('testemail_output.html', message.html);
    } catch (error) {
      // Writing the dump is a convenience, not the job. A read-only working
      // directory must not turn into a failed send.
      logger.debug('[email] could not write testemail_output.html', error);
    }
    return {delivered: false};
  }
}

/**
 * Accepts and drops. This is what a self-hosted box uses before its owner has
 * configured a mail server, which is the normal state on first boot.
 *
 * It logs every dropped message at warn. A box that cannot send its own password
 * reset should say so in its log rather than look healthy - that silence is
 * exactly what the published `email_utils.ts` copy did wrong.
 */
export class NoopEmailTransport implements EmailTransport {
  readonly name = 'none';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    logger.warn(`[email] no mail transport is configured; dropped "${message.subject}" to ${message.to.join(', ')}`);
    return {delivered: false, error: 'no mail transport is configured'};
  }
}
