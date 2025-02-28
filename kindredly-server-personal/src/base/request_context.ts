import { AccountRepo } from "@/db/account.repo";
import { ClientInfoRepo } from "@/db/client_info.repo";
import { FriendRepo } from "@/db/friend.repo";
import { ItemRepo } from "@/db/item.repo";
import { UserRepo } from "@/db/user.repo";
import Account from "@/schemas/public/Account";
import Item from "@/schemas/public/Item";
import User from "@/schemas/public/User";
import { UserType } from "tset-sharedlib/shared.types";

export class RequestContext {
  public currentUserId?: string;
  public accountId?: string;
  public request?: any;
  public clientId: string;

  public inNetworkUserSet?: Set<string>;


  private users = new UserRepo();
  private friends = new FriendRepo();
  private accounts = new AccountRepo();
  private clientInfoRepo = new ClientInfoRepo();
  private itemRepo = new ItemRepo();

  private userCache: Record<string, User> = {};
  private itemCache: Record<string, Item> = {};
  private accountCache: Record<string, Account> = {};

  static instance(request: any) {
    if (request.ctx) return request.ctx;
    else
      return new RequestContext({
        currentUserId: request.authInfo ? request.authInfo.userId : null,
        accountId: request.authInfo ? request.authInfo.accountId : null,
        request: request,
      });
  }

  static instanceForSystem() {
    return new RequestContext({ request: { type: "taskrunner" } });
  }

  constructor({
    currentUserId,
    accountId,
    request,
  }: {
    currentUserId?: string;
    accountId?: string;
    request?: any;
  }) {
    this.currentUserId = currentUserId;
    this.accountId = accountId;
    this.request = request;

    const tsclientid =
      request?.headers && "tsclientid" in request.headers
        ? request.headers["tsclientid"]
        : null;
    this.clientId = tsclientid || "CLID_" + this.getIPAddress();
  }

  isAuthenticated() {
    return this.currentUserId != null;
  }

  getIPAddress() {
    return this.request?.ip || "UNKNOWNIP";
  }

  isTaskRunnerTask() {
    return this.request?.type == "taskrunner";
  }

  getClientId() {
    return this.clientId;
  }

  setTempAuthUserId(userId: string) {
    this.currentUserId = userId;
  }

  async logClientActivity() {
    if (!this.currentUserId) return;

    const clientInfo = await this.clientInfoRepo.findById(
      this.clientInfoRepo.createId(this.currentUserId, this.clientId)
    );
    if (clientInfo) {
      await this.clientInfoRepo.updateWithId(clientInfo._id, {
        lastSeen: new Date(),
      });
    } else {
      if (
        this.currentUserId &&
        this.clientId &&
        this.clientId != "CLID_UNKNOWNIP"
      ) {
        console.log(
          "Could not find client info for client id, creating record",
          this.clientId
        );

        const currentTime = new Date();
        const _id = this.clientInfoRepo.createId(
          this.currentUserId,
          this.clientId
        );

        const clientInfoUpdates = {
          lastIp: this.getIPAddress(),
          lastSeen: currentTime,
          lastLogin: currentTime,
          updatedAt: currentTime,
          createdAt: currentTime,
          clientId: this.clientId,
          userId: this.currentUserId,
          _id,
        };

        await this.clientInfoRepo.create({
          ...clientInfoUpdates,
        });
      } else {
        console.error(
          "Could not find client info for client id and cannot create record - missing info",
          this.clientId
        );
      }
    }
  }

  async verifyUserExists() {
    if (!this.currentUserId) {
      throw new Error("User not found");
    }
    {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || currentUser.deleted == true) {
        throw new Error("User not found");
      } else if (currentUser.disabled == true) {
        throw new Error(
          "User has been disabled. Please contact an account admin or Kindredly Support."
        );
      }
    }
  }

  async verifyInAccount(userId: string, message = "User auth error") {
    if (userId != this.currentUserId) {
      const targetUser = await this.getUserById(userId);
      if (targetUser.accountId != this.accountId) {
        throw new Error(message);
      }
    }
  }

  async isSelfOrAdmin(userId: string) {
    if (userId == this.currentUserId) {
      return true;
    }
    const targetUser = await this.getUserById(userId);
    return (await this.isAdmin()) && targetUser.accountId == this.accountId;
  }

  async verifySelfOrAdmin(userId: string, message = "User auth error") {
    let selforadmin = await this.isSelfOrAdmin(userId);
    if (!selforadmin) {
      throw new Error(message);
    }
  }

  async isSelfOrAdminOfUser(userId: string) {
    if (userId == this.currentUserId) {
      return true;
    }
    const targetUser = await this.getUserById(userId);

    if (
      !(await this.isAdmin()) ||
      targetUser.accountId != this.accountId ||
      targetUser.type == UserType.admin
    ) {
      return false;
    } else return true;
  }

  async verifySelfOrAdminOverUser(userId: string, message = "User auth error") {
    let selforadminofuser = await this.isSelfOrAdminOfUser(userId);
    if (!selforadminofuser) {
      throw new Error(message);
    }
  }


  async verifyAdminOverUser(userId: string, message = "User auth error") {
    const targetUser = await this.getUserById(userId);
    if (
      !(await this.isAdmin()) ||
      targetUser.accountId != this.accountId ||
      targetUser.type == UserType.admin
    ) {
      throw new Error(message);
    }
  }

  async verifyCurrentUserIsAdmin() {
    if (!(await this.isAdmin())) {
      throw new Error("You must be an admin");
    }
  }

  async verifyAdminPermissions(userId: string = null) {
    if (!(await this.isAdmin())) {
      throw new Error("You must be an admin");
    }
    if (userId != this.currentUserId) await this.verifyInAccount(userId);
  }


  async verifyInNetwork(userIds: string[]) {
    if (!this.inNetworkUserSet) {
      await this.loadInNetwork();
    }
    for (let userId of userIds) {
      if (!this.inNetworkUserSet.has(userId)) {
        throw new Error("User not in network");
      }
    }
  }

  async getCurrentUser() {
    return this.currentUserId ? this.getUserById(this.currentUserId) : null;
  }

  async getAccount() {
    return this.accountId ? this.getAccountWithId(this.accountId) : null;
  }

  async isAdmin() {
    const user = await this.getCurrentUser();
    return user && user.type == UserType.admin;
  }

  async getUserById(userId: string) {
    if (!(userId in this.userCache)) {
      this.userCache[userId] = await this.users.findById(userId);
    }
    return this.userCache[userId];
  }

  async getItemById(itemId: string, refreshCache = false) {
    if (!itemId) return null;
    if (!(itemId in this.itemCache) || refreshCache) {
      this.itemCache[itemId] = await this.itemRepo.findById(itemId);
    }

    return this.itemCache[itemId];
  }

  cacheItem(item: Item) {
    this.itemCache[item._id] = item;
  }

  async loadInNetwork() {
    let users = (await this.users.findMany({ accountId: this.accountId }))
    for (let user of users) {
      this.cacheUser(user);
    }
    let userIds = (await this.users.findMany({ accountId: this.accountId })).map(u => u._id);
    let friendIds = await this.friends.listFriendIds(this.currentUserId);

    let inNetworkSet = new Set(userIds.concat(friendIds));
    inNetworkSet.add(this.currentUserId);
    this.inNetworkUserSet = inNetworkSet;
  }



  async getManagedUserIds() {
    if (!this.accountId) return [];
    const accountUsers = await this.users.listByAccountId(this.accountId);
    const restrictedUserIds = accountUsers.filter((v) => v.type == UserType.restricted).map((x) => x._id);
    return [...restrictedUserIds, this.currentUserId];
  }

  async getAccountUserIds() {
    if (!this.accountId) return [];
    return (await this.users.listByAccountId(this.accountId)).map((x) => x._id);
  }

  async isInNetwork(userId: string) {
    if (!this.inNetworkUserSet) {
      await this.loadInNetwork();
    }
    return this.inNetworkUserSet.has(userId);
  }


  async getAccountWithId(accountId: string) {
    if (!(accountId in this.accountCache)) {
      this.accountCache[accountId] = await this.accounts.findById(accountId);
    }
    return this.accountCache[accountId];
  }

  cacheUser(user: User) {
    this.userCache[user._id] = user;
  }
}
