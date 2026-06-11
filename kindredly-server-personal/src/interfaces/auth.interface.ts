import User from 'tset-sharedlib/schemas/public/User';
import {Request} from 'express';

//jwt token
export interface DataStoredInToken {
  userId: string;
  accountId: string;
  sessionId: string;
  expAtSec?: number;
}

export interface RequestWithUser extends Request {
  user: User;
}
