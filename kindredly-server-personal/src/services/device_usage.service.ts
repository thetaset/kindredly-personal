import {RefStateRepo, type RefStateRow} from '@/db/ref_state.repo';
import {notifyDeviceSettingsChanged} from './device_settings.service';
import {
  USAGE_DEVICE_KEY_STATE,
  USAGE_REF_ID,
  USAGE_REPORT_STATE,
  type DeviceUsageSyncResponse,
  type OtherDeviceUsageReport,
  type SealedUsageBlob,
} from 'tset-sharedlib/types/device-guard.types';

/**
 * DCP-27: app time added up across a child's devices. A device sends its own time per limit,
 * sealed with the child's usage key, and gets back the other devices' latest reports and its own
 * sealed copy of the key. The server stores and passes on what it cannot read.
 * Design: docs/proposals/app-time-across-devices.md.
 */

/** A report holds a handful of limit ids and numbers; this is far more than one needs. */
const MAX_SEALED_CHARS = 16 * 1024;
/** Older reports cannot count today or this week on any device, so they are not sent. */
const REPORT_TTL_MS = 8 * 24 * 60 * 60 * 1000;
const MAX_OTHERS = 12;

export function isSealedUsageBlob(value: unknown): value is SealedUsageBlob {
  const v = value as Partial<SealedUsageBlob> | null;
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.keyId === 'string' &&
    v.keyId.length > 0 &&
    v.keyId.length <= 128 &&
    typeof v.iv === 'string' &&
    v.iv.length > 0 &&
    v.iv.length <= 64 &&
    typeof v.data === 'string' &&
    v.data.length > 0 &&
    v.data.length <= MAX_SEALED_CHARS
  );
}

export class DeviceUsageService {
  constructor(
    private readonly refStates: Pick<RefStateRepo, 'upsert' | 'listByRef'> = new RefStateRepo(),
    private readonly nudge: (userIds: string[]) => void = notifyDeviceSettingsChanged,
  ) {}

  /**
   * One device's report, and its pull. `userId` and `deviceId` come from the device's token, never
   * the body. A report that is not a sealed blob is refused rather than stored.
   */
  async sync(
    input: {userId: string; deviceId: string; report?: unknown; limitUsedUp?: unknown},
    nowMs: number,
  ): Promise<DeviceUsageSyncResponse> {
    const {userId, deviceId} = input;
    if (input.report !== undefined && input.report !== null) {
      if (!isSealedUsageBlob(input.report)) throw new Error('Not a sealed usage report');
      await this.refStates.upsert({
        _id: `${userId}:${USAGE_REF_ID}:${USAGE_REPORT_STATE}:${deviceId}`,
        refType: 'device-guard',
        refId: USAGE_REF_ID,
        ownerType: 'user',
        ownerId: userId,
        stateKey: USAGE_REPORT_STATE,
        stateSubKey: deviceId,
        data: {report: input.report, receivedAtMs: nowMs},
        encrypted: false,
        encInfo: null,
      });
    }
    // A limit ran out here: the child's other devices pull now rather than at their next report.
    // The nudge carries nothing and reaches every device of the child's, this one included.
    if (input.limitUsedUp === true) this.nudge([userId]);

    const base = {refType: 'device-guard', refId: USAGE_REF_ID, ownerType: 'user', ownerId: userId};
    const [keyRows, reportRows] = await Promise.all([
      this.refStates.listByRef({...base, stateKey: USAGE_DEVICE_KEY_STATE, stateSubKey: deviceId, limit: 1}),
      this.refStates.listByRef({...base, stateKey: USAGE_REPORT_STATE, limit: MAX_OTHERS + 1}),
    ]);
    const usageKey = isSealedUsageBlob(keyRows[0]?.data) ? (keyRows[0].data as SealedUsageBlob) : undefined;
    return {
      serverTimeMs: nowMs,
      ...(usageKey ? {usageKey} : {}),
      others: otherReports(reportRows, deviceId, nowMs),
    };
  }
}

function otherReports(rows: RefStateRow[], deviceId: string, nowMs: number): OtherDeviceUsageReport[] {
  const out: OtherDeviceUsageReport[] = [];
  for (const row of rows) {
    if (row.stateSubKey === deviceId) continue;
    const report = row.data?.report;
    const receivedAtMs = Number(row.data?.receivedAtMs);
    if (!isSealedUsageBlob(report) || !Number.isFinite(receivedAtMs)) continue;
    if (nowMs - receivedAtMs > REPORT_TTL_MS) continue;
    out.push({deviceId: row.stateSubKey, receivedAtMs, report});
    if (out.length >= MAX_OTHERS) break;
  }
  return out;
}
