import {RefStateRepo} from '@/db/ref_state.repo';
import {UserRepo} from '@/db/user.repo';
import NotificationService from '@/services/notification.service';
import {container} from '@/inversify.config';
import {RequestContext} from '@/base/request_context';
import {NotificationType, RequestTypes} from '@/typing/enum_strings';
import {UserType} from 'tset-sharedlib/shared.types';
import {config} from '@/config';
import {escapeHtml} from '@/utils/text_utils';
import {
  describeBrowser,
  isRemovalId,
  removalAlertCopy,
  removalKey,
  signRemoval,
  verifyRemoval,
  type RemovalLink,
} from './extensionRemovalPolicy';

const REF_TYPE = 'extension-removal';
const REF_ID = 'extension';
const STATE_KEY = 'removed';

/**
 * Tells a family's admins when the Kindredly extension is removed from a child's
 * browser (HAT-129). The rules — the signed link, the wording — live in
 * `extensionRemovalPolicy`; this class is only I/O and delivery.
 *
 * Always on: there is no setting for it. Each admin's Notification settings for
 * Device Protection Alert still choose push and email, both on by default.
 */
export class ExtensionRemovalService {
  private static _staticInstance: ExtensionRemovalService | null = null;

  static get instance(): ExtensionRemovalService {
    if (!this._staticInstance) this._staticInstance = new ExtensionRemovalService();
    return this._staticInstance;
  }

  private readonly refStateRepo = new RefStateRepo();
  private readonly userRepo = new UserRepo();
  // NotificationService takes an injected SetupService, so it must come from the container.
  private readonly notificationService = container.resolve(NotificationService);

  /** Signs with the current secret; verifies against it and the previous ones. */
  private keys(): Buffer[] {
    return [config.jwtAccessTokenSecret, ...config.jwtAccessTokenSecretsPrevious].filter(Boolean).map(removalKey);
  }

  /** The signed link for a child's install, or null for anyone who is not a child. */
  linkFor(user: {_id: string; type?: string; accountId?: string | null}, clientId: unknown): RemovalLink | null {
    if (user.type !== UserType.restricted || !user.accountId) return null;
    if (!isRemovalId(user._id) || !isRemovalId(clientId)) return null;
    return {u: user._id, c: clientId, s: signRemoval(this.keys()[0], user._id, clientId)};
  }

  /**
   * Called when the removal page is opened. Returns whether a parent has been told,
   * now or by an earlier opening of the same link.
   */
  async reportRemoved(
    link: Partial<Record<keyof RemovalLink, unknown>>,
    userAgent: string | undefined,
  ): Promise<boolean> {
    if (!verifyRemoval(this.keys(), link)) return false;
    const child = await this.userRepo.findById(link.u);
    if (!child?.accountId || child.type !== UserType.restricted) return false;

    // One alert per install. Removing an extension wipes its storage, so a reinstall
    // gets a new client id and its removal alerts again; reopening this page does not.
    const first = await this.refStateRepo.insertIfAbsent({
      _id: `${child._id}:${REF_ID}:${STATE_KEY}:${link.c}`,
      refType: REF_TYPE,
      refId: REF_ID,
      ownerType: 'user',
      ownerId: child._id,
      stateKey: STATE_KEY,
      stateSubKey: link.c,
      data: {at: Date.now(), ...describeBrowser(userAgent)},
      encrypted: false,
      encInfo: null,
    });
    if (!first) return true;

    const childName = child.displayedName || child.username || 'your child';
    const copy = removalAlertCopy(childName, userAgent);
    const ctx = new RequestContext({
      currentUserId: child._id,
      accountId: child.accountId,
      request: {type: RequestTypes.taskRunner},
    });
    await this.notificationService.addAccountNotification(
      ctx,
      NotificationType.DEVICE_PROTECTION_ALERT,
      child._id,
      child.accountId,
      {
        title: copy.title,
        // HTML in the notice and the email; it names the child, who can set their own name.
        message: escapeHtml(copy.body),
        shortMessage: copy.body,
        refInfo: {resourceType: 'extension', resourceId: link.c, requestType: 'extensionRemoved'},
      },
      true,
    );
    return true;
  }
}
