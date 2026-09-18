import type {Transporter} from 'nodemailer';
import {config} from '@/config';
import {EmailMessage, EmailSendResult, EmailTransport} from './email_transport';

/**
 * The self-hosted transport: the box owner's own mail server, or any provider
 * that speaks SMTP.
 *
 * `nodemailer` is required at send time for the mirror of the reason SES is -
 * this module is in the cloud image too, and the cloud has no use for it.
 *
 * ONE TRANSPORTER, REUSED. nodemailer pools connections per transporter, so
 * building one per message would open a TCP connection and a TLS handshake for
 * every notification. It is rebuilt only when `resetEmailTransport()` drops this
 * whole object, which is what the settings save path calls.
 */
export class SmtpEmailTransport implements EmailTransport {
  readonly name = 'smtp';

  private transporter: Transporter | null = null;

  private client(): Transporter {
    if (!this.transporter) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        // `secure` means implicit TLS on connect, which is port 465. Everything
        // else - including 587, the common submission port - connects in the
        // clear and upgrades with STARTTLS, which nodemailer does on its own.
        secure: config.smtp.secure,
        auth: config.smtp.user ? {user: config.smtp.user, pass: config.smtp.password} : undefined,
      });
    }
    return this.transporter as Transporter;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!config.smtp.host) {
      return {delivered: false, error: 'no SMTP host is configured'};
    }
    try {
      const info = await this.client().sendMail({
        // The box owner's own from-address wins. Falling back to the cloud's
        // support-noreply@kindredly.ai would be a domain their mail server is
        // not authorised to send for, so it would be rejected or spam-filed.
        from: config.smtp.from || message.from,
        to: message.to.join(', '),
        bcc: message.bcc.length ? message.bcc.join(', ') : undefined,
        subject: message.subject,
        html: message.html,
      });
      return {delivered: true, messageId: info?.messageId};
    } catch (error) {
      return {delivered: false, error: error instanceof Error ? error.message : String(error)};
    }
  }

  /**
   * Opens a connection and authenticates without sending anything. This is what
   * the settings form's test button needs: "are these credentials right" is a
   * different question from "did that one message arrive", and answering it
   * without mailing a real person is the point.
   */
  async verify(): Promise<EmailSendResult> {
    if (!config.smtp.host) {
      return {delivered: false, error: 'no SMTP host is configured'};
    }
    try {
      await this.client().verify();
      return {delivered: true};
    } catch (error) {
      return {delivered: false, error: error instanceof Error ? error.message : String(error)};
    }
  }
}
