import type AWSNamespace from 'aws-sdk';
import {config} from '@/config';
import {EmailMessage, EmailSendResult, EmailTransport} from './email_transport';

/**
 * The cloud transport. `aws-sdk` is imported for its types only and required at
 * send time, because this module is synced to the published repo, whose
 * package.json has no `aws-sdk` in it. A value import would resolve at boot and
 * take a box down.
 */
export class SesEmailTransport implements EmailTransport {
  readonly name = 'ses';

  private ses: AWSNamespace.SES | null = null;

  private client(): AWSNamespace.SES {
    if (!this.ses) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AWS = require('aws-sdk'); // personal-optional: cloud transport, resolved only when selected
      this.ses = new AWS.SES({region: config.awsRegion});
    }
    return this.ses as AWSNamespace.SES;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const result = await this.client()
        .sendEmail({
          Destination: {
            ToAddresses: message.to,
            BccAddresses: message.bcc,
          },
          Message: {
            Body: {Html: {Charset: 'UTF-8', Data: message.html}},
            Subject: {Charset: 'UTF-8', Data: message.subject},
          },
          Source: message.from,
        })
        .promise();
      return {delivered: true, messageId: result.MessageId};
    } catch (error) {
      return {delivered: false, error: error instanceof Error ? error.message : String(error)};
    }
  }
}
