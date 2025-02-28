import { RequestContext } from '@/base/request_context';
import { ClientInfoRepo } from '@/db/client_info.repo';
import User from '@/schemas/public/User';
import { sanitizeString } from "@/utils/text_utils";
import { Request } from 'express';

class ClientInfoService {

  private clientInfoRepo = new ClientInfoRepo();

  async _loginUpdate(user: User, clientInfoData: any, req: Request) {
    if (!user) {
      throw new Error('Invalid user');
    }

    const ipAddress = req?.ip || 'UNKNOWNIP';
    const clientId = clientInfoData?.clientId || 'CLID_' + ipAddress;

    const _id = this.clientInfoRepo.createId(user._id, clientId);

    const currentClientInfo = await this.clientInfoRepo.findById(_id);
    const currentTime = new Date();

    const clientInfoUpdates = {
      ...clientInfoData,
      lastIp: ipAddress,
      lastSeen: currentTime,
      lastLogin: currentTime,
      updatedAt: currentTime,
      createdAt: currentTime,
      clientId: clientId,
      userId: user._id,
      _id,
    };

    if (currentClientInfo) {
      await this.clientInfoRepo.updateWithId(_id, {
        ...currentClientInfo,
        ...clientInfoUpdates,
      });
    } else {
      await this.clientInfoRepo.create({
        ...clientInfoUpdates,
      });
    }

    return {clientId};
  }

  // ROUTE-METHOD
  async updateDeviceToken(ctx: RequestContext, deviceToken: string) {

    const currentUserId = ctx.currentUserId
    const clientId = sanitizeString(ctx.clientId)

    if (!currentUserId) {
      throw new Error('Invalid user');
    }
    else if (!clientId) {
      throw new Error('Invalid client id');
    }
    else if(!deviceToken){
      throw new Error('Invalid device token');
    }

    const _id = this.clientInfoRepo.createId(currentUserId, clientId);
    await this.clientInfoRepo.updateWithId(_id, {
      deviceToken: deviceToken,
      updatedAt: new Date(),
    });
  }

  // ROUTE-METHOD
  async listClients(ctx:RequestContext, targetUserId:string) {
    await ctx.verifySelfOrAdmin(targetUserId)
    
    const lst =  await this.clientInfoRepo.listByUserId(targetUserId);
    return lst;
  }

  async listDeviceTokens(targetUserId:string) {
    
    const lst =  await this.clientInfoRepo.listByUserId(targetUserId);
    const tokens = lst.map(v=>v.deviceToken).filter(v=>!!v);
    
    return [...new Set(tokens)];
  }

  async listDeviceTokensUsedSinceXDaysAgo(targetUserId:string, days:number) { 
    const since = new Date();
    since.setDate(since.getDate() - days);

    const lst =  await this.clientInfoRepo.listByUserId(targetUserId);
    const tokens = lst.filter(v=>!!v?.deviceToken).filter(v=>v.lastSeen > since).map(v=>v.deviceToken)
    
    return [...new Set(tokens)];
    
  }

  async listDeviceTokensForUsers(targetUserIds:string[]) {
    const lst =  await this.clientInfoRepo.findWhereIn('userId',targetUserIds);
    const tokens = lst.map(v=>v.deviceToken).filter(v=>!!v);
    
    return [...new Set(tokens)];
    
  }

  async listDeviceTokensForUsersUsedSinceXDaysAgo(targetUserIds:string[], days:number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const lst =  await this.clientInfoRepo.findWhereIn('userId',targetUserIds);
    const tokens = lst.filter(v=>!!v?.deviceToken).filter(v=>v.lastSeen > since).map(v=>v.deviceToken)
    
    return [...new Set(tokens)];
  }

}

export default ClientInfoService;
