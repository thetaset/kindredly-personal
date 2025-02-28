import { EventLogRepo } from '@/db/event_log.repo';
import EventLog from '@/schemas/public/EventLog';
import { EventRecordName, EventRecordType } from '@/typing/enum_strings';
import { sendEmail } from '@/utils/email_utils';
import { config } from '@/config';
import { MAIN_EMAIL_TEMPLATE } from '@/templates/email.templates';

class EventAuditService {
  public eventLogs = new EventLogRepo();

  async recordEvent(data: EventLog) {
    try {
      await this.eventLogs.create(data);

      if (config.adminWatchNotifications) {
        // Send email to admin when new account is created
        if (data.eventName == EventRecordName.CREATE_ACCOUNT) {
          sendEmail(
            [config.adminEmail],
            "ADMIN NOTICE: New Account Created",
            "A new account has been created: email"
          );
        }

        else if (data.eventName == EventRecordName.CREATE_USER) {
          sendEmail(
            [config.adminEmail],

            `ADMIN NOTICE: New  user created`,
            `A new user created`,
            MAIN_EMAIL_TEMPLATE
          );

        }
      }

    } catch (error) {
      console.error('Error logging event', error, data);
    }
  }
}

export default EventAuditService;
