import {Router} from 'express';

import {config} from '@/config';
import {HttpException} from '@exceptions/HttpException';
import {Routes} from '@interfaces/routes.interface';
import {ApiReq} from '@/types/api-types';
import {getBackupTarget} from '@/base/backup_target';
import {RealmClaimService} from '@/services/realm_bundle/realm_claim.service';
import {RealmRestoreService} from '@/services/realm_bundle/realm_restore.service';
import {errorHelper} from '../utils/auth_utils';

/**
 * "Recover my family", and the first sign-in that follows it (REALM-8, REALM-14).
 *
 * **Why every route here is unauthenticated.** A box being recovered has an empty database: there
 * is no account, so there is nobody to sign in as. And immediately after a restore there is still
 * nobody, because no host credential travels in a bundle — that is the whole of REALM-14. Requiring
 * a session here would make the feature impossible rather than safe.
 *
 * What stands in for a session:
 *
 * 1. **The `lite` profile.** These routes do not exist on a hosted server. Restoring into a hosted
 *    account is REALM-5 and is a different, authenticated flow; and the claim step opens a
 *    member's key envelope, which KEY-11 D11's closing note says is only acceptable when the
 *    holder is the family. `assertLite` is that line.
 * 2. **The recovery phrase**, for anything that reads family data. Without it a bundle is opaque
 *    bytes, so "can you open this" is the only authority there is — and the only one there can be.
 * 3. **The claim window**, for the claim routes: opened by a restore, which already proved the
 *    phrase, and closed on a timer so the box does not sit on a home network testing passwords
 *    against restored envelopes forever.
 *
 * **`/routes/`, not `/routes/_internal/`.** The published box repo excludes `_internal`
 * (`scripts/personal-sync/server-src.exclude`), so a recovery surface written there would build,
 * test green, and not exist on the appliance it was written for.
 */
class RealmRecoveryRoute implements Routes {
  public router = Router();

  private restore = RealmRestoreService.instance;
  private claims = RealmClaimService.instance;

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  /** A hosted server must not offer any of this. See the class comment. */
  private assertLite() {
    if (config.profile !== 'lite') {
      throw new HttpException(404, 'Not found');
    }
  }

  /**
   * Every way this surface fails is the caller's to correct — a wrong phrase, a backup that did not
   * verify, a destination holding newer data, a password that does not open the envelope. The
   * services throw plain `Error`s because they are also called outside HTTP, so the mapping belongs
   * here; without it `errorHelper` reports 500, and a mistyped password reads as a broken server on
   * the one day a family is already worried. See `docs/trackers/server-error-status-codes.md`.
   */
  private async asClientError<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(400, String(e?.message ?? e));
    }
  }

  private initializeRoutes() {
    /** What is on the attached storage, from cleartext headers alone — no phrase needed to look. */
    this.router.post(
      '/realm/restore/list',
      errorHelper(async (_req: ApiReq<'/realm/restore/list'>, res) => {
        this.assertLite();
        const target = getBackupTarget();
        const snapshots = await this.restore.listRestorable(target);
        res.status(200).json({success: true, results: {available: !!target, snapshots}});
      }),
    );

    /**
     * Everything a guardian needs to decide, with nothing written: which family, which date,
     * whether it passes its own check, whether this host would be outranking newer data, and who
     * would be able to get back in afterwards.
     */
    this.router.post(
      '/realm/restore/preflight',
      errorHelper(async (req: ApiReq<'/realm/restore/preflight'>, res) => {
        this.assertLite();
        const {objectName, phrase} = req.body ?? {};
        if (!objectName || !phrase) throw new HttpException(400, 'A snapshot and a recovery phrase are required');

        const pre = await this.asClientError(() => this.restore.preflight(objectName, phrase));
        res.status(200).json({
          success: true,
          results: {
            realmId: pre.manifest.realmId,
            snapshotId: pre.manifest.snapshotId,
            createdAt: pre.manifest.createdAt,
            isLatest: pre.isLatest,
            memberCount: pre.memberCount,
            recordCount: pre.recordCount,
            blobCount: pre.blobCount,
            excluded: pre.excluded,
            verifyOk: pre.verify.ok,
            verifyProblems: pre.verify.problems.map((p) => `${p.kind}: ${p.detail}`),
            authorityOk: pre.authority.ok,
            destinationHasRealm: pre.authority.destinationHasRealm,
            ahead: pre.authority.ahead,
            unlockMethods: pre.unlockMethods,
          },
        });
      }),
    );

    this.router.post(
      '/realm/restore/run',
      errorHelper(async (req: ApiReq<'/realm/restore/run'>, res) => {
        this.assertLite();
        const {objectName, phrase, acceptNoUnlockMethod, allowUnverified} = req.body ?? {};
        if (!objectName || !phrase) throw new HttpException(400, 'A snapshot and a recovery phrase are required');

        const report = await this.asClientError(() =>
          this.restore.restore({objectName, phrase, acceptNoUnlockMethod, allowUnverified}),
        );
        res.status(200).json({
          success: true,
          results: {
            realmId: report.realmId,
            snapshotId: report.snapshotId,
            createdAt: report.createdAt,
            memberIds: report.memberIds,
            recordsWritten: report.recordsWritten,
            recordsSkipped: report.recordsSkipped,
            droppedColumns: report.droppedColumns,
            blobsWritten: report.blobsWritten,
            blobsMissing: report.blobsMissing,
            excluded: report.excluded,
            restoredWithoutUnlockMethod: report.restoredWithoutUnlockMethod,
            claimWindowExpiresAt: report.claimWindow.expiresAt,
          },
        });
      }),
    );

    /** Who is waiting at the door. Names only, and only while the window a restore opened is open. */
    this.router.post(
      '/realm/claim/list',
      errorHelper(async (req: ApiReq<'/realm/claim/list'>, res) => {
        this.assertLite();
        const realmId = String(req.body?.realmId ?? '');
        if (!realmId) throw new HttpException(400, 'A family is required');

        const windowOpen = !!(await this.claims.getWindow(realmId));
        const members = await this.claims.listClaimable(realmId);
        res.status(200).json({success: true, results: {windowOpen, members}});
      }),
    );

    /**
     * Prove the password against the travelled key envelope and set it as the host credential.
     *
     * Deliberately returns no session: the credential this just set is the one `/auth/signin`
     * already checks, and minting a token here would be a second way into the application with its
     * own surface, for nothing.
     */
    this.router.post(
      '/realm/claim/withPassword',
      errorHelper(async (req: ApiReq<'/realm/claim/withPassword'>, res) => {
        this.assertLite();
        this.claims.assertClaimAllowedHere(config.profile);
        const {realmId, userId, password} = req.body ?? {};
        if (!realmId || !userId || !password)
          throw new HttpException(400, 'A family, a member and a password are required');

        const result = await this.asClientError(() => this.claims.claimWithPassword(realmId, userId, password));
        res.status(200).json({success: true, results: result});
      }),
    );
  }
}

export default RealmRecoveryRoute;
