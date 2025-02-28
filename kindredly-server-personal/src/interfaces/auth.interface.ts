import User from '@/schemas/public/User';
import { Request } from 'express';

//jwt token
export interface DataStoredInToken {
  userId: string;
  accountId: string;
  sessionId: string;
  expAtSec?: number;

}

export interface TokenData {
  token: string;
  expAtSec: number;
}

export interface RequestWithUser extends Request {
  user: User;
}
