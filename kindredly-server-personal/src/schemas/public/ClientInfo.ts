
export default  interface ClientInfo {
  
  _id?: string;

  userId?: string | null;

  clientId?: string | null;

  clientVersion?: string | null;

  appId?: string | null;

  appType?: string | null;

  appVersion?: string | null;

  deviceName?: string | null;

  deviceId?: string | null;

  deviceType?: string | null;

  deviceToken?: string | null;

  lastIp?: string | null;

  lastLogin?: Date | null;

  lastLogout?: Date | null;

  lastSeen?: Date | null;

  createdAt?: Date;

  updatedAt?: Date;
}
