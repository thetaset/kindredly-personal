import User from 'tset-sharedlib/schemas/public/User';
import {Request} from 'express';

//jwt token
export interface DataStoredInToken {
  userId: string;
  accountId: string;
  sessionId: string;
  expAtSec?: number;
  /** Limited-purpose token. 'device-agent' (Companion satellite app) is confined to DEVICE_AGENT_ALLOWED_PATHS. */
  scope?: 'device-agent';
  /** Device the scoped token was minted for. */
  deviceId?: string;
}

export interface RequestWithUser extends Request {
  user: User;
}
