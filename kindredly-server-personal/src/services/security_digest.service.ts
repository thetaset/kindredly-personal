import {SecurityEventRepo} from '@/db/security_event.repo';
import {getKeyValueStore} from '@/base/runtime.factory';
import {sendEmail} from '@/utils/email_utils';
import {config} from '@/config';
import {logger} from '@/utils/logger';
import {SECURITY_LOG_MARKER} from '@/services/security_event.service';
import {evaluateDigest, type DigestFinding, type DigestResult} from './securityDigestPolicy';

/**
 * Rolls the security ledger into an hourly picture and raises the parts that need a human.
 *
 * The ledger records; nothing reads it back on its own. Without this, noticing an attack
 * requires someone to open a dashboard during it — which is to say, noticing it afterwards.
 *
 * Decisions live in the pure `securityDigestPolicy` module so the thresholds are
 * unit-tested; this class is only I/O, throttling and delivery.
 *
 * Every run emits a digest line to the log whether or not anything is wrong. A run that
 * stays silent when healthy gives you no way to tell "nothing happened" from "the job
 * stopped running", and those need different responses.
 */

const WINDOW_HOURS = 1;

/**
 * How long a finding stays quiet after it has been mailed once.
 *
 * A sustained attack trips the same threshold every hour for as long as it lasts. Six hours
 * is long enough that an ongoing incident does not fill an inbox, and short enough that a
 * problem left unattended says so again the same day.
 */
const ALERT_THROTTLE_SECONDS = 6 * 3600;

const THROTTLE_KEY_PREFIX = 'kindredly:secdigest:alerted:';

export class SecurityDigestService {
  private static _staticInstance: SecurityDigestService | null = null;

  static get instance(): SecurityDigestService {
    if (!this._staticInstance) this._staticInstance = new SecurityDigestService();
    return this._staticInstance;
  }

  constructor(
    private repo = new SecurityEventRepo(),
    private windowHours: number = WINDOW_HOURS,
  ) {}

  /** One pass over the window. Returns the digest so a caller (or a test) can inspect it. */
  async run(now: Date = new Date()): Promise<DigestResult> {
    const start = new Date(now.getTime() - this.windowHours * 3600 * 1000);

    const [counts, sources] = await Promise.all([
      this.repo.countsByType({start, end: now}),
      this.repo.topSources({start, end: now, limit: 20}),
    ]);

    const digest = evaluateDigest({windowHours: this.windowHours, counts, sources});

    // Always logged, healthy or not — see the note above on silence.
    logger.info(
      `${SECURITY_LOG_MARKER} ` +
        JSON.stringify({
          kind: 'security',
          eventType: 'digest.window',
          severity: digest.findings.length ? 'warn' : 'info',
          detail: {
            windowHours: digest.windowHours,
            occurrences: digest.totalOccurrences,
            types: digest.distinctTypes,
            sources: digest.distinctSources,
            findings: digest.findings.length,
            count: 1,
          },
        }),
    );

    for (const finding of digest.findings) {
      await this.alert(finding);
    }

    return digest;
  }

  /**
   * Mail one finding, at most once per throttle window.
   *
   * The throttle lives in Redis rather than in memory because the task runner restarts —
   * on a redeploy, on a crash, on a scale event — and an in-memory record would reset every
   * time, which is exactly the moment a storm is most likely to be under way.
   *
   * Failure is deliberately quiet-but-logged: a digest that throws takes the whole job down
   * and stops the NEXT window from being evaluated at all.
   */
  private async alert(finding: DigestFinding): Promise<void> {
    try {
      if (!(await this.claimAlertSlot(finding.key))) return;

      logger.warn(
        `${SECURITY_LOG_MARKER} ` +
          JSON.stringify({
            kind: 'security',
            eventType: 'digest.alert',
            severity: finding.severity,
            detail: {...finding.detail, findingKey: finding.key, count: 1},
          }),
      );

      if (!config.adminWatchNotifications) return;

      const rows = Object.entries(finding.detail)
        .map(([key, value]) => `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`)
        .join('');

      sendEmail(
        [config.adminEmail],
        `[${finding.severity.toUpperCase()}] ${finding.title}`,
        `<p>${finding.title}</p><table>${rows}</table>` +
          `<p>Open the Security panel in the ops dashboard for source subnets and timing.</p>` +
          `<p>Further alerts for this condition are suppressed for ${ALERT_THROTTLE_SECONDS / 3600} hours.</p>`,
      );
    } catch (error) {
      logger.error('SecurityDigestService.alert failed', error);
    }
  }

  /**
   * True if this process may send the alert.
   *
   * SET NX is what makes that safe with more than one task runner: whichever call creates
   * the key wins, and the rest see it already exists. A GET-then-SET would let two runners
   * both read "not alerted" and both mail.
   *
   * If Redis is unreachable the alert goes out. Duplicate mail during a Redis outage is a
   * far better failure than silence during an attack.
   */
  private async claimAlertSlot(key: string): Promise<boolean> {
    try {
      // setIfAbsent rather than a flagged SET: ioredis takes the flags
      // positionally, and the node-redis option-object form (`{NX: true, EX: n}`)
      // is accepted as an ordinary argument and silently ignored - which would
      // leave the key with no expiry and suppress the alert forever. The named
      // method removes the chance to get the order wrong.
      return await getKeyValueStore().setIfAbsent(`${THROTTLE_KEY_PREFIX}${key}`, '1', ALERT_THROTTLE_SECONDS);
    } catch (error) {
      logger.error('SecurityDigestService could not read the alert throttle; alerting anyway', error);
      return true;
    }
  }
}

export default SecurityDigestService;
