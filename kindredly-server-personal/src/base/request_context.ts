import {AccountRepo} from '@/db/account.repo';
import {ClientInfoRepo} from '@/db/client_info.repo';
import {FriendRepo} from '@/db/friend.repo';
import {ItemRepo} from '@/db/item.repo';
import {UserRepo} from '@/db/user.repo';
import Account from 'tset-sharedlib/schemas/public/Account';
import Item from 'tset-sharedlib/schemas/public/Item';
import User from 'tset-sharedlib/schemas/public/User';
import {UserType} from 'tset-sharedlib/shared.types';

export class RequestContext {
  public currentUserId?: string;
  public authUserId?: string;
  public accountId?: string;
  public request?: any;
  public clientId: string;
  public appType?: string;
  public appId?: string;
  public appVersion?: string;
  public clientVersion?: string;
  /**
   * The physical machine this client runs on, when the agent can actually know it. Only the desktop
   * Companion and Android Guard report these; a browser has no way to read a hostname, so a device
   * list built from `client_info` can name a computer running the Companion and cannot name a
   * browser-only install. That limit is real and belongs on screen, not papered over here.
   */
  public deviceId?: string;
  public deviceName?: string;
  public deviceType?: string;

  public tempAuthUserId?: string;

  public inNetworkUserSet?: Set<string>;

  /**
   * Which authorization checks ran during this request.
   *
   * Authorization here is convention, not structure: a route hands `getTargetUserId(req)` — a user
   * id the *caller* named — to a service, and safety depends on that service happening to call one
   * of the verify primitives below. Nothing enforces it, so a route that forgets fails open with
   * no compile error, no failing test and no log.
   *
   * This makes it observable. `authorization_observer.middleware.ts` reads it after the response
   * and reports requests that named a user other than the caller and checked nothing. Recording
   * only — it changes no behavior.
   *
   * Deliberately NOT recorded: `verifyUserExists`, which is authentication and runs on every
   * authenticated request. Counting it would mark everything as checked.
   */
  public authChecks: Set<string> = new Set();

  /** Note that an authorization check ran. Safe to call more than once per request. */
  recordAuthCheck(name: string) {
    this.authChecks.add(name);
  }

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
        authUserId: request.authInfo ? request.authInfo.userId : null,
        accountId: request.authInfo ? request.authInfo.accountId : null,
        request: request,
      });
  }

  static instanceForSystem() {
    return new RequestContext({request: {type: 'taskrunner'}});
  }

  constructor({
    currentUserId,
    authUserId,
    accountId,
    request,
  }: {
    currentUserId?: string;
    authUserId?: string;
    accountId?: string;
    request?: any;
  }) {
    this.currentUserId = currentUserId;
    this.authUserId = authUserId ?? currentUserId;
    this.accountId = accountId;
    this.request = request;

    const tsclientid = request?.headers && 'tsclientid' in request.headers ? request.headers['tsclientid'] : null;
    const queryClientId = request?.query && 'clientId' in request.query ? request.query.clientId : null;
    this.clientId = tsclientid || queryClientId || 'CLID_' + this.getIPAddress();
    this.appType = this.getHeaderValue('tsapptype');
    this.appId = this.getHeaderValue('tsappid');
    this.appVersion = this.getHeaderValue('tsappversion');
    this.clientVersion = this.getHeaderValue('tsclientversion');
    // Machine identity, reported by agents that genuinely have one. A browser cannot read a
    // hostname, so these stay undefined for the extension and the webapp — and an undefined value
    // never overwrites a stored one below, so a row named by a Companion keeps its name when the
    // same account's browser checks in.
    this.deviceId = this.getHeaderValue('tsdeviceid');
    this.deviceName = this.getHeaderValue('tsdevicename');
    this.deviceType = this.getHeaderValue('tsdevicetype');
  }

  private getHeaderValue(name: string): string | undefined {
    const value = this.request?.headers && name in this.request.headers ? this.request.headers[name] : null;
    const normalized = Array.isArray(value) ? value[0] : value;
    const text = String(normalized || '').trim();
    return text || undefined;
  }

  isAuthenticated() {
    return this.currentUserId != null;
  }

  /**
   * True for an admin-console token specifically.
   *
   * These are minted by getAdminAuthDetails with `{isAdmin: true}` and **no userId** — deliberately,
   * since they sit outside the user_session registry and expiry is their only invalidation. The
   * consequence is that `isAuthenticated()` is false for them, and `isAdmin()` is too (it resolves a
   * user row, and there is no user). Any check written as "authenticated, and therefore allowed"
   * silently excludes the admin console: that is why an admin asking published search for both
   * catalogs got Kindredly's only (agent-observations #61).
   *
   * Narrow on purpose — this reports how the caller authenticated, nothing about a user's role.
   * For "is this person an admin", use `isAdmin()`.
   */
  isAdminConsoleToken() {
    return this.request?.authInfo?.isAdmin === true;
  }

  getIPAddress() {
    return this.request?.ip || 'UNKNOWNIP';
  }

  isTaskRunnerTask() {
    return this.request?.type == 'taskrunner';
  }

  getClientId() {
    return this.clientId;
  }

  setTempAuthUserId(userId: string) {
    this.tempAuthUserId = userId;
    this.currentUserId = userId;
  }

  cloneWithActingUser(currentUserId: string, options: {tempAuthUserId?: string | null} = {}) {
    const cloned = new RequestContext({
      currentUserId,
      authUserId: this.authUserId,
      accountId: this.accountId,
      request: this.request,
    });

    if (options.tempAuthUserId !== undefined) {
      cloned.tempAuthUserId = options.tempAuthUserId || undefined;
    } else {
      cloned.tempAuthUserId = this.tempAuthUserId;
    }

    return cloned;
  }

  cloneAsSessionUser() {
    const sessionUserId = this.authUserId ?? this.currentUserId;
    return this.cloneWithActingUser(sessionUserId, {tempAuthUserId: null});
  }

  async logClientActivity() {
    if (!this.currentUserId) return;

    const clientInfo = await this.clientInfoRepo.findById(
      this.clientInfoRepo.createId(this.currentUserId, this.clientId),
    );
    if (clientInfo) {
      await this.clientInfoRepo.updateWithId(clientInfo._id, {
        lastSeen: new Date(),
        appType: this.appType || clientInfo.appType,
        appId: this.appId || clientInfo.appId,
        appVersion: this.appVersion || clientInfo.appVersion,
        clientVersion: this.clientVersion || clientInfo.clientVersion,
        deviceId: this.deviceId || clientInfo.deviceId,
        deviceName: this.deviceName || clientInfo.deviceName,
        deviceType: this.deviceType || clientInfo.deviceType,
      });
    } else {
      if (this.currentUserId && this.clientId && this.clientId != 'CLID_UNKNOWNIP') {
        console.log('Could not find client info for client id, creating record', this.clientId);

        const currentTime = new Date();
        const _id = this.clientInfoRepo.createId(this.currentUserId, this.clientId);

        const clientInfoUpdates = {
          lastIp: this.getIPAddress(),
          lastSeen: currentTime,
          lastLogin: currentTime,
          updatedAt: currentTime,
          createdAt: currentTime,
          clientId: this.clientId,
          appType: this.appType,
          appId: this.appId,
          appVersion: this.appVersion,
          clientVersion: this.clientVersion,
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          deviceType: this.deviceType,
          userId: this.currentUserId,
          _id,
        };

        await this.clientInfoRepo.create({
          ...clientInfoUpdates,
        });
      } else {
        console.error(
          'Could not find client info for client id and cannot create record - missing info',
          this.clientId,
        );
      }
    }
  }

  async verifyUserExists() {
    if (!this.currentUserId) {
      throw new Error('User not found');
    }
    {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || currentUser.deleted == true) {
        throw new Error('User not found');
      } else if (currentUser.disabled == true) {
        throw new Error('User has been disabled. Please contact an account admin or Kindredly Support.');
      }
    }
  }

  async verifyInAccount(userId: string, message = 'User auth error') {
    this.recordAuthCheck('verifyInAccount');
    if (userId != this.currentUserId) {
      const targetUser = await this.getUserById(userId);
      if (targetUser.accountId != this.accountId) {
        throw new Error(message);
      }
    }
  }

  async isSelfOrAdmin(userId: string) {
    this.recordAuthCheck('isSelfOrAdmin');
    if (userId == this.currentUserId) {
      return true;
    }
    const targetUser = await this.getUserById(userId);

    return (await this.isAdmin()) && targetUser.accountId == this.accountId;
  }

  async verifySelfOrAdmin(userId: string, message = 'User auth error') {
    this.recordAuthCheck('verifySelfOrAdmin');
    let selforadmin = await this.isSelfOrAdmin(userId);
    if (!selforadmin) {
      throw new Error(message);
    }
  }

  async isSelfOrAdminOfUser(userId: string) {
    this.recordAuthCheck('isSelfOrAdminOfUser');
    if (userId == this.currentUserId) {
      return true;
    }
    const targetUser = await this.getUserById(userId);

    if (!(await this.isAdmin()) || targetUser.accountId != this.accountId || targetUser.type == UserType.admin) {
      return false;
    } else return true;
  }

  async verifySelfOrAdminOverUser(userId: string, message = 'User auth error') {
    this.recordAuthCheck('verifySelfOrAdminOverUser');
    let selforadminofuser = await this.isSelfOrAdminOfUser(userId);
    if (!selforadminofuser) {
      throw new Error(message);
    }
  }

  async verifyAdminOverUser(userId: string, message = 'User auth error') {
    this.recordAuthCheck('verifyAdminOverUser');
    const targetUser = await this.getUserById(userId);
    if (!(await this.isAdmin()) || targetUser.accountId != this.accountId || targetUser.type == UserType.admin) {
      throw new Error(message);
    }
  }

  async verifyCurrentUserIsAdmin() {
    this.recordAuthCheck('verifyCurrentUserIsAdmin');
    if (!(await this.isAdmin())) {
      throw new Error('You must be an admin');
    }
  }

  async verifyAdminPermissions(userId: string = null) {
    this.recordAuthCheck('verifyAdminPermissions');
    if (!(await this.isAdmin())) {
      throw new Error('You must be an admin');
    }
    if (userId != this.currentUserId) await this.verifyInAccount(userId);
  }

  async verifyInNetwork(userIds: string[]) {
    this.recordAuthCheck('verifyInNetwork');
    if (!this.inNetworkUserSet) {
      await this.loadInNetwork();
    }
    for (let userId of userIds) {
      if (!this.inNetworkUserSet.has(userId)) {
        throw new Error('User not in network : ' + userId);
      }
    }
  }

  async getCurrentUser() {
    return this.currentUserId ? this.getUserById(this.currentUserId) : null;
  }

  getCurrentUserId() {
    return this.currentUserId;
  }

  getSessionUserId() {
    return this.authUserId;
  }

  getActingUserId() {
    return this.currentUserId;
  }

  getTempAuthUserId() {
    return this.tempAuthUserId;
  }

  /**
   * The device this token was minted for, from the TOKEN — not the `tsdeviceid` header,
   * which any caller can set. Only a Companion (device-agent) token carries one.
   */
  getTokenDeviceId(): string | null {
    return (this.request as any)?.authInfo?.deviceId || null;
  }

  isOverrideActive() {
    return !!this.tempAuthUserId;
  }

  async getAccount() {
    return this.accountId ? this.getAccountWithId(this.accountId) : null;
  }

  async isAdmin() {
    // Use the effective user for permission checks.
    // In permission-override mode, currentUserId is set to the temp-auth user.
    const userIdToCheck = this.currentUserId || this.authUserId;
    if (!userIdToCheck) return false;
    const user = await this.getUserById(userIdToCheck);
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
    let users = await this.users.findMany({accountId: this.accountId});
    for (let user of users) {
      this.cacheUser(user);
    }
    let userIds = (await this.users.findMany({accountId: this.accountId})).map((u) => u._id);
    let friendRelationships = await this.friends.listFriendIds(this.currentUserId);
    let friendIds = friendRelationships.map((v) => v.friendUserId);

    if (friendIds && friendIds.length > 0) {
      let inNetworkSet = new Set(userIds.concat(friendIds));
      inNetworkSet.add(this.currentUserId);
      this.inNetworkUserSet = inNetworkSet;
    } else {
      let inNetworkSet = new Set(userIds);
      this.inNetworkUserSet = inNetworkSet;
    }
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
