import NotificationService from '@/services/notification.service';
import {NotificationType} from '@/typing/enum_strings';
import {sendEmail} from '@/utils/email_utils';

jest.mock('@/utils/email_utils', () => ({
  sendEmail: jest.fn(),
}));

describe('NotificationService.createAndSendEmail', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService({
      sendPushNotification: jest.fn(),
    } as any);
  });

  it('uses the sharing feed footer link for new post emails', async () => {
    await service.createAndSendEmail(NotificationType.NEW_POST, {email: 'user@example.com'} as any, {
      title: 'New Post share by parent',
      emailMessage: 'parent shared a post with you.',
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);

    const [, , body] = (sendEmail as jest.Mock).mock.calls[0];

    expect(body).toContain('/kindredapp/#/feeds/sharing');
    expect(body).toContain('View shared posts');
    expect(body).not.toContain('/kindredapp/#/notifications');
  });

  it('keeps the notifications footer link for notification-backed emails', async () => {
    await service.createAndSendEmail(NotificationType.NEW_COMMENT, {email: 'user@example.com'} as any, {
      title: 'New comment',
      emailMessage: 'Someone commented on your post.',
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);

    const [, , body] = (sendEmail as jest.Mock).mock.calls[0];

    expect(body).toContain('/kindredapp/#/notifications');
    expect(body).toContain('View all my notifications');
    expect(body).not.toContain('/kindredapp/#/feeds/sharing');
  });
});
