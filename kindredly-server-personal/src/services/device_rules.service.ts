import {RequestContext} from '@/base/request_context';
import {RefStateService} from '@/services/ref_state.service';
import UserService from '@/services/user.service';
import {applyOverrides, compileDeviceRules} from 'tset-sharedlib/deviceguard/deviceRuleCompiler';
import type {CategoryExpansion} from 'tset-sharedlib/deviceguard/deviceRuleCompiler';
import {buildAppCatalog, compileAppPolicy} from 'tset-sharedlib/deviceguard/deviceAppPolicy';
import type {AppCatalogEntry} from 'tset-sharedlib/deviceguard/deviceAppPolicy';
import type {
  CompiledDeviceRuleSet,
  DeviceAppInventory,
  DeviceAppPolicy,
} from 'tset-sharedlib/types/device-guard.types';
import type {LimitRule} from 'tset-sharedlib/types/usage-limits.types';

/**
 * Compile a child's device ruleset here, so Guard never needs the main app running.
 *
 * A parent's block used to reach a child's phone only through that child opening Kindredly:
 * the ruleset was compiled in the app's web layer and handed to Guard over local IPC on a
 * 15-minute timer. So the block landed whenever the child happened to open the app, which is
 * exactly backwards from what a parent expects (UX-019).
 *
 * This works because usage limits are NOT end-to-end encrypted — the server reads
 * `usageLimitsData` off user options directly — and the app inventory and app policy are
 * already in `ref_state`. So the server holds every input the compiler needs, and Guard can
 * fetch a finished ruleset with the token and HTTP client it already has.
 *
 * The compiler itself is the SAME module the browser uses (`tset-sharedlib/deviceguard`).
 * That is the point of it living in sharedlib: two implementations of this arithmetic would
 * eventually disagree, and a disagreement here means a child's limits quietly differ from what
 * their parent set, on the surface where nobody is watching.
 */

/** Matches the client's `RULESET_FORMAT_VERSION`; bump together. */
const RULESET_FORMAT_VERSION = 1;

const DEVICE_GUARD_REF_TYPE = 'device-guard';
const DEVICE_GUARD_REF_ID = 'companion';
const STATE_KEY_APP_INVENTORY = 'appInventory';
const STATE_KEY_APP_POLICY = 'appPolicy';

export class DeviceRulesService {
  private refStateService = new RefStateService();
  private userService = new UserService();

  /**
   * The compiled ruleset for one device.
   *
   * `childUserId` MUST come from the caller's own token, never from a request body — the
   * device-agent allowlist is not what stops a Companion naming a sibling, this is.
   */
  async compileForDevice(
    ctx: RequestContext,
    input: {childUserId: string; deviceId: string; tzOffsetMinutes: number; nowMs?: number},
  ): Promise<CompiledDeviceRuleSet> {
    const now = input.nowMs ?? Date.now();

    const user = await this.userService.getUserById(input.childUserId);
    if (!user) throw new Error('User not found');

    const options = (user.options || {}) as Record<string, any>;
    const usageLimitData = (options.usageLimitsData || {}) as {
      contentUsageLimits?: LimitRule[];
      timeLimitOverrides?: any[];
    };
    const accessControlSettings = (options.accessControlSettings || {}) as Record<string, any>;

    // Mirror the browser engine: an active account-level pause disables limits entirely, and
    // must reach the device as an EMPTY ruleset rather than a stale one. Sending nothing at
    // all would leave Guard enforcing the set it last sealed, so a parent lifting restrictions
    // would appear to do nothing on the phone.
    const limitsDisabled =
      accessControlSettings?.disableUsageLimits === true &&
      (!accessControlSettings.disableUsageLimitsExpires ||
        accessControlSettings.disableUsageLimitsExpires === 0 ||
        accessControlSettings.disableUsageLimitsExpires > now);

    const authored: LimitRule[] = limitsDisabled ? [] : usageLimitData?.contentUsageLimits || [];
    // Bonus time and temporary grants, exactly as the browser engine folds them in — without
    // this a parent granting extra time would leave the phone still shielded.
    const allRules = applyOverrides(
      authored,
      limitsDisabled ? [] : usageLimitData?.timeLimitOverrides,
      new Date(now).getDay(),
      now,
    );

    const inventory = await this.readState<DeviceAppInventory>(
      ctx,
      input.childUserId,
      STATE_KEY_APP_INVENTORY,
      input.deviceId,
    );
    // Per-CHILD, not per-device: a parent decides about their kid, not about a handset.
    const policy = await this.readState<DeviceAppPolicy>(ctx, input.childUserId, STATE_KEY_APP_POLICY, '');

    const appCatalog: AppCatalogEntry[] = buildAppCatalog(inventory?.apps || [], policy || undefined);
    const categoryExpansion: CategoryExpansion = 'all';

    return compileDeviceRules(allRules, {
      version: RULESET_FORMAT_VERSION,
      now,
      appCatalog,
      categoryExpansion,
      tzOffsetMinutes: input.tzOffsetMinutes,
      // The account's real intervention mode, matching what the browser sends (UX-018).
      // Absent falls back to 'block': a family that never chose reminder mode must not be
      // handed it by a missing field.
      mode:
        accessControlSettings?.usageLimitInterventionMode ||
        accessControlSettings?.defaultInterventionMode ||
        'block',
      ...(policy ? {appPolicy: compileAppPolicy(policy, appCatalog)} : {}),
    });
  }

  private async readState<T>(
    ctx: RequestContext,
    ownerId: string,
    stateKey: string,
    stateSubKey: string,
  ): Promise<T | null> {
    const result = await this.refStateService.list(ctx, 'user', {
      refType: DEVICE_GUARD_REF_TYPE,
      refId: DEVICE_GUARD_REF_ID,
      stateKey,
      stateSubKey,
      ownerId,
      limit: 1,
    });
    const entry = result?.entries?.[0];
    return (entry?.state as T) ?? null;
  }
}

export default DeviceRulesService;
