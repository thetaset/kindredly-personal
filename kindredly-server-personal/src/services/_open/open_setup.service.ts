import { AccountRepo } from "@/db/account.repo";
import { productLookup } from "@/defaults/products_and_plans";
import { injectable } from 'inversify';
import { AccountType } from "tset-sharedlib/shared.types";
import SysSetupService from "../_interfaces/syssetup.service";

@injectable()
class OpenSetupService implements SysSetupService {
  sendPushNotification(message: { apns: { payload: { aps: { alert: { title: string; body: string; }; }; }; }; data: any; tokens: any[]; }): void {
    console.error("Method not implemented.");
  }
  private accounts = new AccountRepo();

  public async systemInfo(): Promise<any> {

    const result = {
      underAccountLimit:true,
      allowInviteCode: false
    };
    return result;
  }
  async getAccountById(id:string) {
    const account = await this.accounts.findById(id);
    return account;
  }

  async getLimitsForAccount(id: string) {
    const account = await this.getAccountById(id);
    const productInfo =
      productLookup[account.accountType || AccountType.standard];
    return productInfo;
  }
}

export default OpenSetupService;
