import {config} from '@/config';
import {RequestContext} from '@/base/request_context';
import {AccountRepo} from '@/db/account.repo';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import {UserRepo} from '@/db/user.repo';
import {HttpException} from '@exceptions/HttpException';
import {LoginType, UserType, VerificationType} from 'tset-sharedlib/shared.types';
import VerificationService from './verification.service';

/** sys_info row naming the person who set up this server. */
const OWNER_ROW = 'box_owner';
/** A sign-up link lasts a week: long enough to hand over in person or by message. */
export const BOX_SIGNUP_MINUTES = 7 * 24 * 60;
/** A reset link lasts a day. The email version lasts ten minutes, but here a person passes it on. */
export const BOX_RESET_MINUTES = 24 * 60;

/** `deleted` is NULL on most rows, and `NOT (deleted = true)` is NULL for those, so say it outright. */
const notDeleted = (q: any) => q.whereNull('deleted').orWhere('deleted', false);

/** A server a family runs itself: the published Personal edition, or the `lite` box profile. */
export function isSelfHosted(): boolean {
  return config.privateServer === true || config.profile === 'lite';
}

export type BoxFamilyView = {
  accountId: string;
  createdAt: string | null;
  members: Array<{
    userId: string;
    username: string | null;
    displayedName: string | null;
    type: string;
    /** A guardian who signs in with a password, so a reset link means something. */
    canReset: boolean;
  }>;
};

/**
 * The person who set up a self-hosted server, and what only they can do (HAT-1022).
 *
 * A self-hosted server has no mail, so the two things Kindredly's own servers do by email are
 * done by this person instead: letting a new family sign up, and getting someone back in after a
 * forgotten password. Both hand out a link rather than an account. The family still chooses its own
 * password on its own device, which is what keeps its data encrypted with a key it holds.
 */
export class BoxAdminService {
  private static _instance: BoxAdminService | null = null;
  static get instance(): BoxAdminService {
    if (!this._instance) this._instance = new BoxAdminService();
    return this._instance;
  }

  private sysInfo = new SysInfoRepo();
  private accounts = new AccountRepo();
  private users = new UserRepo();
  private verifications = new VerificationService();

  /**
   * Who set up this server, or null on a server with no family yet. A server set up before this
   * existed has no row: its first family's first guardian set it up, so that person is recorded.
   */
  async ownerUserId(): Promise<string | null> {
    const row = await this.sysInfo.findById(OWNER_ROW);
    const recorded = (row?.data as {userId?: string} | null)?.userId;
    if (recorded) return recorded;

    const first = await this.accounts.query().where(notDeleted).orderBy('createdAt', 'asc').first();
    if (!first) return null;
    const admin = await this.users
      .query()
      .where({accountId: first._id, type: UserType.admin})
      .where(notDeleted)
      .orderBy('createdAt', 'asc')
      .first();
    if (!admin) return null;
    await this.recordOwner(admin._id);
    return admin._id;
  }

  async recordOwner(userId: string) {
    await this.sysInfo.create({_id: OWNER_ROW, data: {userId} as any});
  }

  /** New families need a sign-up link once someone has set the server up. */
  async signupNeedsLink(): Promise<boolean> {
    return isSelfHosted() && !!(await this.ownerUserId());
  }

  async isOwner(ctx: RequestContext): Promise<boolean> {
    if (!isSelfHosted() || !ctx.currentUserId) return false;
    return ctx.currentUserId === (await this.ownerUserId());
  }

  private async assertOwner(ctx: RequestContext) {
    if (!isSelfHosted()) throw new HttpException(404, 'Not found');
    if (!(await this.isOwner(ctx))) {
      throw new HttpException(403, 'Only the person who set up this server can do this.');
    }
  }

  async status(ctx: RequestContext): Promise<{isBoxAdmin: boolean; families: BoxFamilyView[]}> {
    if (!(await this.isOwner(ctx))) return {isBoxAdmin: false, families: []};

    const accounts = await this.accounts.query().where(notDeleted).orderBy('createdAt', 'asc');
    const families: BoxFamilyView[] = [];
    for (const account of accounts) {
      const members = await this.users
        .query()
        .where({accountId: account._id})
        .where(notDeleted)
        .orderBy('createdAt', 'asc');
      families.push({
        accountId: account._id,
        createdAt: account.createdAt ? new Date(account.createdAt).toISOString() : null,
        members: members.map((m: any) => ({
          userId: m._id,
          username: m.username ?? null,
          displayedName: m.displayedName ?? null,
          type: m.type,
          canReset: m.type === UserType.admin && (m.loginType ?? LoginType.internal) === LoginType.internal,
        })),
      });
    }
    return {isBoxAdmin: true, families};
  }

  async createSignupCode(ctx: RequestContext): Promise<{code: string; expiresAt: string}> {
    await this.assertOwner(ctx);
    const v = await this.verifications._addVerification(
      BOX_SIGNUP_MINUTES,
      VerificationType.boxSignup,
      ctx.currentUserId,
      {
        type: VerificationType.boxSignup,
        createdBy: ctx.currentUserId,
      },
    );
    return {code: v._id, expiresAt: new Date(v.expiresAt).toISOString()};
  }

  /** True for an unused, unexpired sign-up code. */
  async signupCodeValid(code: string | null | undefined): Promise<boolean> {
    if (!code) return false;
    const v = await this.verifications._getVerificationById(code);
    return v?.type === VerificationType.boxSignup;
  }

  async useSignupCode(code: string) {
    await this.verifications._invalidateVerification(code);
  }

  /**
   * The same code the reset email would carry. With a spare key on the server it opens a new
   * password; without one it is the account-recovery code, used with the person's recovery key.
   */
  async createResetCode(
    ctx: RequestContext,
    targetUserId: string,
  ): Promise<{code: string; kind: 'reset' | 'recovery'; expiresAt: string}> {
    await this.assertOwner(ctx);
    const user = targetUserId ? await this.users.findById(targetUserId) : null;
    if (!user || user.deleted) throw new HttpException(404, 'No such person on this server.');
    if ((user.loginType ?? LoginType.internal) !== LoginType.internal) {
      throw new HttpException(400, 'This person signs in another way, so there is no password to reset.');
    }

    const recoverable = !!user.recoveryKey || !!user.passwordCopy;
    const type = recoverable ? VerificationType.passwordReset : VerificationType.accountRecovery;
    const v = await this.verifications._addVerification(BOX_RESET_MINUTES, type, user._id, {userId: user._id, type});
    return {code: v._id, kind: recoverable ? 'reset' : 'recovery', expiresAt: new Date(v.expiresAt).toISOString()};
  }
}
