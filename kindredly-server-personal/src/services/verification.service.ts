import { UserRepo } from "@/db/user.repo";
import { VerificationRepo } from "@/db/verification.repo";
import { RequestContext } from "../base/request_context";
import { VerificationType } from "tset-sharedlib/shared.types";
import { generateToken } from "@/utils/crypto_util";


class VerificationService {
  
  private verifications = new VerificationRepo();
  private users = new UserRepo();

  //Verification
  async _getVerificationById(id) {
    const verification = await this.verifications.findById(id);
    if (!!verification) {
      const now = new Date();
      if (new Date(verification.expiresAt) < now) {
        console.log("Verification expired", verification);
        this.verifications.deleteWithId(id);
        return null;
      }
    }
    return verification;
  }

  async _updateVerificationData(id, data) {
    await this.verifications.updateWithId(id, { data });
  }

  async _invalidateVerification(id: string) {
    await this.verifications.deleteWithId(id);
  }


  // ROUTE-METHOD
  async getFamilyInviteInfo(code: string) {
    const verification = await this.verifications.findById(code);
    if (!verification || verification.type !== VerificationType.joinFamily) {
      throw Error("Invalid verification code");
    }
    if (!verification || verification.expiresAt < new Date()) {
      throw Error("Expired code");
    }

    const data = verification.data as Record<string, any>;
    const user = await this.users.findByEmail(data.email);
    data.alreadyHasAccount = user != null;
    return data;
  }

  async cancelFamilyInvite(ctx: RequestContext,code: string) {
    await this.verifications.deleteWhere({ _id: code, filterKey: ctx.accountId });
  }
  
  async listFamilyInvites(ctx: RequestContext) {
    if (!ctx.accountId) {
      throw Error("Invalid account id");
    }
    return await this.verifications.where({ type: VerificationType.joinFamily, filterKey:ctx.accountId});
  }

  async _addVerification(
    minutesUntilExpiration: number,
    type: VerificationType,
    filterKey: string,
    data: any
  ) {
    const id = "t" + generateToken();
    const now = new Date();
    let expiresAt = null;
    if (minutesUntilExpiration && minutesUntilExpiration > 0) {
      expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + minutesUntilExpiration);
    }

    const info = {
      _id: id,
      type,
      filterKey,
      data: data,
      createdAt: now,
      expiresAt: expiresAt,
    };

    await this.verifications.create(info);

    return info;
  }
}

export default VerificationService;
