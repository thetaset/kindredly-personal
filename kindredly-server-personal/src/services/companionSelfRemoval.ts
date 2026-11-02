import {UserType} from 'tset-sharedlib/shared.types';
import {verifyCompanionApproval} from '@/utils/auth_utils';

/**
 * May a Companion take itself off its parent's list? (CMP-70)
 *
 * Unlinking at the computer used to leave it listed: removing a device is `/companion/devices/remove`,
 * which takes an admin's sign-in, and the Companion holds only the child's device token. That token
 * alone still removes nothing — a child who reads it from their own folder must not be able to make
 * their computer vanish from the parent's page. What it may carry is a parent's approval: issued by
 * `/auth/desktopCompanionAuthorize` when the parent typed their PIN at that computer, for that device
 * and that child, for ten minutes.
 *
 * Yes only when the approval is genuine, is for the device and child the token was minted for, and
 * its admin is still an admin of that child's family.
 */
export async function selfRemovalApprover(input: {
  approval: string;
  tokenUserId: string | null;
  tokenDeviceId: string | null;
  loadUser: (
    userId: string,
  ) => Promise<{type?: string; accountId?: string | null; deleted?: boolean} | null | undefined>;
}): Promise<{ok: true; adminUserId: string} | {ok: false; status: 401 | 403; message: string}> {
  if (!input.tokenUserId || !input.tokenDeviceId) {
    return {ok: false, status: 401, message: 'This device is not provisioned.'};
  }
  const approval = verifyCompanionApproval(input.approval);
  if (!approval || approval.childUserId !== input.tokenUserId || approval.deviceId !== input.tokenDeviceId) {
    return {ok: false, status: 403, message: 'No parent approved removing this device.'};
  }
  const [admin, child] = await Promise.all([input.loadUser(approval.adminUserId), input.loadUser(input.tokenUserId)]);
  if (
    !admin ||
    admin.deleted ||
    admin.type !== UserType.admin ||
    !child ||
    child.deleted ||
    !admin.accountId ||
    String(admin.accountId) !== String(child.accountId)
  ) {
    return {ok: false, status: 403, message: 'No parent approved removing this device.'};
  }
  return {ok: true, adminUserId: approval.adminUserId};
}
