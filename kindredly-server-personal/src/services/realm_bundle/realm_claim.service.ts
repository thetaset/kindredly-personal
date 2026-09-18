import {createDecipheriv, pbkdf2} from 'crypto';
import {promisify} from 'util';

import knex from '@/db/knex_config';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import {hashString} from '@/utils/crypto_util';
import {logger} from '@/utils/logger';
import {Knex} from 'knex';

const pbkdf2Async = promisify(pbkdf2);
const GCM_TAG_BYTES = 16;

/**
 * First sign-in at a destination — "claim your account" (REALM-14, decision D12).
 *
 * **The problem this exists for.** By design nothing that authenticates a member travels in a
 * bundle: `user.password`, `pin` and `loginId` are dropped (`realm_scope.ts`, format §4.4), and a
 * `passkey_credential` row travels but is bound to the rpId that registered it, so on a box it
 * cannot sign anyone in. The E2E material *does* travel — every `key_entry` envelope — so a
 * restored member can still **unlock** their data. They simply cannot get through the door to the
 * point where that matters. After any restore, every member is locked out.
 *
 * **How the door is refitted.** The box holds, for each member, an envelope that only that
 * member's own password opens. So it can check a password without ever having had the password
 * hash: derive the same PBKDF2 key the client derives, unwrap, and see whether the AES-GCM tag
 * verifies and the plaintext is the JWK it should be. This is the same positive identification
 * `key_entry.service.ts` already performs for the KEY-0 sweep, against the same fields.
 *
 * **What that costs, stated plainly.** To test the password the host must actually open the
 * envelope, so the member's user secret is in this process's memory for the moment it takes to
 * parse it. It is never stored, never logged and never returned. That trade is acceptable on the
 * family's own hardware for exactly the reason KEY-11 D9 and D11 give — a box holding its own
 * family's key is a local convenience, and the same box already holds the live database. **It does
 * not extend to Kindredly Cloud**, where the holder is not the family; the D11 argument inverts
 * there, and so does this one. `assertClaimAllowedHere` is where that line is enforced.
 *
 * **Why a window.** The raw password already crosses the wire on every ordinary sign-in
 * (`open_auth.validator.service.ts` hashes it server-side), so the claim adds no new exposure of
 * the password itself. What it does add is an oracle: a box that would test passwords against
 * restored envelopes forever is an offline attack surface sitting on a home network. The window is
 * opened by the restore — that is, by someone who proved they hold the printed recovery phrase —
 * and closes on its own.
 *
 * Children are deliberately not here. A child has a PIN, not a password, and no password-wrapped
 * envelope to test one against; a guardian sets a child's PIN at the destination exactly as at
 * account setup, through the existing admin path, once that guardian has claimed their own
 * account.
 */

export const claimWindowId = (realmId: string) => `restore_claim_${realmId}`;

/** Long enough for a family that restores in the evening and finishes the next day. */
export const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ClaimWindow = {
  realmId: string;
  snapshotId: string;
  restoredAt: string;
  expiresAt: string;
};

export type ClaimableMember = {
  userId: string;
  username: string | null;
  displayedName: string | null;
  type: string | null;
  /** Whether this member can claim with a password of their own. */
  passwordClaimable: boolean;
  /** Already has a host credential — they sign in normally, not here. */
  alreadyHasCredential: boolean;
};

export class RealmClaimService {
  private static _instance: RealmClaimService | null = null;

  static get instance(): RealmClaimService {
    if (!this._instance) this._instance = new RealmClaimService();
    return this._instance;
  }

  constructor(
    private readonly db: Knex = knex,
    private readonly sysInfo = new SysInfoRepo(),
  ) {}

  /**
   * The host types where opening someone's key envelope to test a password is allowed.
   *
   * `lite` is a family's own box. Anything else is somebody hosting for them, and the argument
   * that makes this acceptable does not survive that change of holder (KEY-11 D11's closing note).
   */
  assertClaimAllowedHere(profile: string): void {
    if (profile !== 'lite') {
      throw new Error(
        'Claiming an account by proving its encryption password is only available on a home box. ' +
          'On a hosted server, sign in with the account you already have.',
      );
    }
  }

  /** Open the window. Called by a restore, which has already proved the recovery phrase. */
  async openWindow(realmId: string, snapshotId: string, now = new Date()): Promise<ClaimWindow> {
    const window: ClaimWindow = {
      realmId,
      snapshotId,
      restoredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CLAIM_WINDOW_MS).toISOString(),
    };
    await this.sysInfo.create({_id: claimWindowId(realmId), data: window as any});
    logger.info(`[claim] window open for ${realmId} until ${window.expiresAt}`);
    return window;
  }

  /** The open window for a realm, or null when there is none or it has expired. */
  async getWindow(realmId: string, now = new Date()): Promise<ClaimWindow | null> {
    const row = await this.sysInfo.findById(claimWindowId(realmId));
    const window = row?.data as ClaimWindow | undefined;
    if (!window?.expiresAt) return null;
    return new Date(window.expiresAt) > now ? window : null;
  }

  /** Every realm with an open claim window. On a box that is one, or none. */
  async openWindows(now = new Date()): Promise<ClaimWindow[]> {
    const rows = await this.db('sys_info').where('_id', 'like', 'restore_claim_%').select('data');
    return rows
      .map((r: {data: unknown}) => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) as ClaimWindow)
      .filter((w) => w?.expiresAt && new Date(w.expiresAt) > now);
  }

  async closeWindow(realmId: string): Promise<void> {
    await this.sysInfo.deleteWithId(claimWindowId(realmId));
  }

  /**
   * Who is waiting at the door, and whether each of them can open it themselves.
   *
   * Names only. This is readable during the window without a credential, because nobody has one
   * yet — that is the situation. It is bounded by the window, which is opened only by proving the
   * printed recovery phrase.
   */
  async listClaimable(realmId: string, now = new Date()): Promise<ClaimableMember[]> {
    if (!(await this.getWindow(realmId, now))) return [];

    const users = await this.db('user')
      .whereIn('accountId', [realmId, `deleted_${realmId}`])
      .whereNot({deleted: true})
      .select('_id', 'username', 'displayedName', 'type', 'password');

    const claimable: ClaimableMember[] = [];
    for (const user of users) {
      claimable.push({
        userId: user._id,
        username: user.username ?? null,
        displayedName: user.displayedName ?? null,
        type: user.type ?? null,
        passwordClaimable: (await this.passwordEnvelopes(user._id)).length > 0,
        alreadyHasCredential: !!user.password,
      });
    }
    return claimable;
  }

  /**
   * Prove the password against the travelled envelope, then set it as the host credential.
   *
   * Returns the username so the caller can sign in through the ordinary `/auth/signin` path.
   * Minting a session here would be a second way into the application with its own security
   * surface, for no gain — the credential this just set is the one sign-in already checks.
   */
  async claimWithPassword(
    realmId: string,
    userId: string,
    password: string,
    now = new Date(),
  ): Promise<{userId: string; username: string}> {
    if (!(await this.getWindow(realmId, now))) {
      throw new Error('The recovery window for this family has closed. Restore again to reopen it.');
    }
    if (!password) throw new Error('Password is required');

    const user = await this.db('user').where({_id: userId}).first();
    if (!user || user.deleted) throw new Error('No such member');
    if (![realmId, `deleted_${realmId}`].includes(user.accountId)) throw new Error('No such member');
    if (user.password) {
      // Not an error worth hiding: they are simply past this step.
      throw new Error('This member already has a sign-in for this box. Sign in normally.');
    }

    const envelopes = await this.passwordEnvelopes(userId);
    if (!envelopes.length) {
      throw new Error(
        'This member has no password-protected key on this box, so their password cannot be checked here. ' +
          'A guardian can set them up after signing in.',
      );
    }

    let proved = false;
    for (const envelope of envelopes) {
      if (await this.opensEnvelope(envelope, password)) {
        proved = true;
        break;
      }
    }
    if (!proved) throw new Error('That password does not match this member’s encryption key.');

    await this.db('user')
      .where({_id: userId})
      .update({password: hashString(password)});
    logger.info(`[claim] ${userId} claimed their account after a restore`);
    return {userId, username: user.username};
  }

  /** Live envelopes for this member's own secret that a password unwraps. */
  private async passwordEnvelopes(userId: string): Promise<Array<Record<string, any>>> {
    return await this.db('key_entry')
      .where({selectType: 'user', selectId: userId, unwrappingKeyId: 'userPassword'})
      .whereNull('deletedAt')
      .select('keyData');
  }

  /**
   * Does this password open the envelope?
   *
   * The same derivation the client performs at every sign-in — PBKDF2-SHA256 over the password
   * with the salt and iteration count recorded on the entry, then AES-256-GCM. The tag makes a
   * successful decrypt a positive identification rather than a guess, and the JSON parse rejects
   * anything that decrypted but is not one of our JWK payloads.
   *
   * The plaintext is never returned, stored or logged; it exists only long enough to be parsed.
   */
  private async opensEnvelope(envelope: Record<string, any>, password: string): Promise<boolean> {
    try {
      const keyData = (typeof envelope.keyData === 'string' ? JSON.parse(envelope.keyData) : envelope.keyData) ?? {};
      const salt = String(keyData.kdfSalt ?? '');
      const iterations = Number(keyData.kdfIterations);
      const wrapped = Buffer.from(String(keyData.wrappedKey ?? ''), 'base64');
      const iv = Buffer.from(String(keyData.iv ?? ''), 'base64');
      if (!salt || !Number.isFinite(iterations) || iterations <= 0) return false;
      if (wrapped.length <= GCM_TAG_BYTES || iv.length === 0) return false;

      const key = await pbkdf2Async(password, salt, iterations, 32, 'sha256');
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(wrapped.subarray(wrapped.length - GCM_TAG_BYTES));
      const plaintext = Buffer.concat([
        decipher.update(wrapped.subarray(0, wrapped.length - GCM_TAG_BYTES)),
        decipher.final(), // throws unless the tag verifies
      ]);
      JSON.parse(plaintext.toString('utf8')); // wrapped payloads are JWK JSON; anything else is not ours
      return true;
    } catch {
      return false;
    }
  }
}
