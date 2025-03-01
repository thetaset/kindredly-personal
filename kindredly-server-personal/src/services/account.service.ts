import { config } from "@/config";
import { AccountRepo } from "@/db/account.repo";
import { UserRepo } from "@/db/user.repo";
import { RequestContext } from "@/base/request_context";

import { productLookup } from "../defaults/products_and_plans";
import ItemService from "./item.service";
import EventAuditService from "./record_event.service";
import VerificationService from "./verification.service";

import { EventRecordName, EventRecordType } from "@/typing/enum_strings";
import { AccountType, VerificationType } from "tset-sharedlib/shared.types";
import NotificationService from "./notification.service";
import { inject , injectable} from 'inversify';
import { TYPES } from "@/types";
import type SetupService from "./_interfaces/syssetup.service";
import { container } from "@/inversify.config";
import UserService from "./user.service";


@injectable()
class AccountService {

  constructor(@inject(TYPES.SetupService) private setupService: SetupService) {}

  private users = new UserRepo();
  private accounts = new AccountRepo();
  private eventLogService = new EventAuditService();
  private notificationService = container.resolve(NotificationService);
  private verificationService = new VerificationService();
  private itemService = new ItemService();

  private userService = new UserService();



  // ROUTE-METHOD
  async getAccountDetails(ctx: RequestContext) {
    const account = await this._getAccountById(ctx.accountId);
    return account;
  }

  // ROUTE-METHOD
  async createAccountInvite(
    ctx: RequestContext,
    inviteData: { email: string; inviterName: string; message: string }
  ) {
    const { email, inviterName, message } = inviteData;

    const accountUser = await ctx.getCurrentUser();

    const verification = await this.verificationService._addVerification(
      config.inviteAccountExpMin,
      VerificationType.joinFamily,
      ctx.accountId,
      {
        accountId: ctx.accountId,
        userId: ctx.currentUserId,
        email: email,
        type: VerificationType.joinFamily,
        inviterName: inviterName,
        inviterEmail: accountUser.email,
        message: message,
      }
    );

    const inviteCode = verification._id;

    this.notificationService.notifyOfInvitation(email, inviterName, accountUser, inviteCode, message);

    this.eventLogService.recordEvent({
      eventName: EventRecordName.ACCOUNT_INVITE,
      eventType: EventRecordType.EXPLICIT,
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
    });
    return { inviteCode: verification._id };
  }

  // ROUTE-METHOD
  async getAccountStats(ctx: RequestContext) {
    const accountId = ctx.accountId;
   
    //TODO: combine into one (or two) simple stat queries
    const users = await this.users.listByAccountId(accountId);

    const collectionCount = await this.itemService._getCollectionCount(
      accountId
    );

    const account = await this._getAccountById(accountId);

    const limits = await this.setupService.getLimitsForAccount(accountId);
    return {
      createdAt: account.createdAt,
      userCount: users.length,
      collectionCount,
      ...limits,
    };
  }

  // ROUTE-METHOD
  async checkSpaceUsage(ctx: RequestContext) {
    return this.users.checkSpaceUsageForAccountId(ctx.accountId);
  }

  // ROUTE-METHOD
  async updateAccountOptions(ctx: RequestContext, options) {
    if (!(await ctx.isAdmin())) {
      throw new Error("Not authorized");
    }
    const account = await ctx.getAccount();
    options = { ...account.options, ...options };
    await this.accounts.updateWithId(ctx.accountId, { options });
    return true;
  }


  async _getAccountById(id:string) {
    const account = await this.accounts.findById(id);
    return account;
  }

  async _queryAccountsByField(query) {
    return await this.accounts.findMany(query);
  }

  async _updateAccountInfo(accountId:string, info) {
    await this.accounts.updateWithId(accountId, info);
  }


  async deleteAccountForPersonalServer(ctx: RequestContext) {
    const accountId = ctx.accountId;


    throw new Error("Not implemented for personal server");
  }

}

export default AccountService;
