import jsonwebtoken, { sign } from 'jsonwebtoken';
import { Request, Response } from 'express';

import { config } from '@/config';
import { v4 as uuidv4 } from 'uuid';
import User from '@/schemas/public/User';
import { RequestContext } from '@/base/request_context';

import { promisify } from 'util';
import { DataStoredInToken, TokenData } from '@/interfaces/auth.interface';

const jwtAccessTokenSecret = config.jwtAccessTokenSecret;
const jwtverify = promisify((arg: string, callback) => jsonwebtoken.verify(arg, jwtAccessTokenSecret, callback));

export interface TRequest extends Request {
  ctx?: RequestContext;
  authInfo?: any;
  errorInfo?: Record<string, any>;
}
export interface TErrorInfo {
  message: string;
  status: number;
  details?: any;
}

export const authenticateJWTHelper = (req: TRequest): Promise<TRequest> => {
  return new Promise((resolve, reject) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      resolve(req as TRequest);
    }
    const token = authHeader ? authHeader.split(' ')[1] : null;

    jwtverify(token)
      .then(async (authInfo) => {
        req.authInfo = authInfo;
        try {
          const ctx = RequestContext.instance(req);
          await ctx.verifyUserExists();
          req.ctx = ctx;
          resolve(req);
        } catch (e) {
          console.error('AuthUserError:', e);
          return reject({ message: 'AuthUserError', status: 401 } as TErrorInfo);
        }
      })
      .catch((err) => {
        console.error('AuthTokenError:', err);
        return reject({ message: 'AuthTokenError', status: 401 } as TErrorInfo);
      });
  });
};

export const setAuthCookie = (req: Request, res: Response, token: string) => {
  const cookieOptions = {
    httpOnly: true,
    signed: true,
    sameSite: 'none' as 'none',
  };
  res.cookie('session', token, cookieOptions);
};

export const clearAuthCookie = (req: Request, res: Response) => {
  res.clearCookie('session');
};

const getTokenFromRequest = (req: TRequest): string => {

  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    return token;
  }

  const sessionToken = req.cookies['session'];
  if (sessionToken) {
    return sessionToken;
  } else {
    return null;
  }
};

export const authenticateJWTWithToken = (req, res, next, token: string) => {
  if (token) {
    jsonwebtoken.verify(token, jwtAccessTokenSecret, async (err, authInfo) => {
      if (err) {
        console.error('AuthTokenError:', err);
        return res.json({ success: false, message: 'AuthTokenError', status: 401 });
      }
      req.authInfo = authInfo;

      try {
        let ctx: RequestContext = RequestContext.instance(req);
        await ctx.verifyUserExists();

        ctx.logClientActivity().catch((e) => console.error(e));


        // temp authorization allows for a user to be authorized for a limited time
        const tempAuthToken = req.body.tempAuthToken as { token: string, expAtSec: number };
        if (tempAuthToken) {
          try {
            const tempAuthInfo: any = await jwtverify(tempAuthToken.token) as DataStoredInToken;

            if (tempAuthInfo && tempAuthInfo.expAtSec && tempAuthInfo.expAtSec >= (Date.now() / 1000)) {
              ctx.setTempAuthUserId(tempAuthInfo.userId);
            } else {
              throw new Error('token corrupted or expired' + tempAuthInfo);
            }
          } catch (e) {
            console.error('TempAuthTokenError:', req.path, " error:", e);
            throw e;
          }
        }

        req.ctx = ctx;
      } catch (e) {
        console.error('AuthUserError:', e);
        return res.json({ success: false, message: 'AuthUserError', status: 401 });
      }

      next();
      return;
    });
  } else {
    const message = 'AuthError: Not authorized';
    console.error(message, req.path);
    res.json({ success: false, message, status: 403 });
  }
};

export const authenticationJWTWithCookie = async (req: TRequest, res: Response, next) => {
  const sessionToken = req.cookies['session'];
  return authenticateJWTWithToken(req, res, next, sessionToken);
};

export const authenticationJWTWithHeader = async (req: TRequest, res: Response, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.split(' ')[1] : null;
  return authenticateJWTWithToken(req, res, next, token);
};

export const authenticateJWT = async (req: TRequest, res: Response, next) => {
  const token = getTokenFromRequest(req);
  return authenticateJWTWithToken(req, res, next, token);
};

export const authenticateOptionalJWT = (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (token) {
    return authenticateJWT(req, res, next);
  } else {
    next();
  }
};

// default middle where to check for authorization of async function
export const adminAuthenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jsonwebtoken.verify(token, jwtAccessTokenSecret, (err, authInfo) => {
      if (err) {
        console.error(err);
        return res.sendStatus(403);
      } else if (!authInfo.isAdmin) {
        console.error(err);
        return res.sendStatus(403);
      }

      req.authInfo = authInfo;

      next();
    });
  } else {
    console.error('Missing authorization header');
    res.sendStatus(401);
  }
};

export const errorHelper = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('Error', error);
    const statusCode = error.status || 500;

    res.json({ success: false, message: error.message, statusCode });
  });
};

export function getUserAuthDetails(user: User) {
  const token = jsonwebtoken.sign(
    { userId: user._id, accountId: user.accountId, sessionId: uuidv4() },
    jwtAccessTokenSecret,
  );

  return {
    success: true,
    token: token,
    userId: user._id,
    accountId: user.accountId,
  };
}

export function getAdminAuthDetails() {
  const token = jsonwebtoken.sign({ isAdmin: true, sessionId: uuidv4() }, jwtAccessTokenSecret);

  return {
    success: true,
    token: token,
    userId: null,
    accountId: null,
    isAdmin: true,
  };
}

export function prepUserForTransport(user: User) {
  if (!user) return null;
  user['hasPassword'] = !!user['password'];
  user['hasPin'] = !!user['pin'];
  user['hasPasswordCopy'] = !!user['passwordCopy'];
  user['hasRecoveryKeyStored'] = !!user['recoveryKey'];
  return user;
}

export function removeSensitiveInfoFromUser(user: User) {
  if (!user) return null;
  try {
    delete user['password'];
    delete user['pin'];
    delete user['passwordCopy'];
    delete user['recoveryKey'];
  } catch (e) {
    console.error(e);
  }

  return user;
}

export function removeExtraDetailsFromUser(user: User) {
  if (!user) return;

  removeSensitiveInfoFromUser(user);
  const validAttributes = ['_id', 'username', 'fullname', 'profileImage', 'type', 'accountId', 'displayedName'];
  const newUserObj = {};
  validAttributes.forEach((attr) => {
    newUserObj[attr] = user[attr];
  });


  return newUserObj;
}

export function getUserProfileInfo(user: User) {
  if (!user) return;
  const newUserObj = {};
  const profileAttributes = ['_id', 'username', 'fullname', 'profileImage', 'type', 'accountId', 'publicId', 'displayedName'];
  profileAttributes.forEach((attr) => {
    newUserObj[attr] = user[attr];
  });
  return newUserObj;
}

export function getTargetUserId(req) {
  return req.body.userId || req.authInfo.userId;
}

export function getAuthUserId(req) {
  return req.authInfo.userId;
} export function _createToken(user: User): TokenData {
  const dataStoredInToken: DataStoredInToken = {
    userId: user._id,
    accountId: user.accountId,
    sessionId: uuidv4(),
    expAtSec: null,
  };
  const secretKey: string = config.jwtAccessTokenSecret;

  return { expAtSec: null, token: sign(dataStoredInToken, secretKey, {}) };
}

export function _createTempToken(user: User): TokenData {
  const dataStoredInToken: DataStoredInToken = {
    userId: user._id,
    accountId: user.accountId,
    sessionId: uuidv4(),
    expAtSec: Math.floor(Date.now() / 1000) + 60 * 5,
  };
  const secretKey: string = config.jwtAccessTokenSecret;
  // date five minutes from now
  const expAtSec: number = dataStoredInToken.expAtSec;

  return { expAtSec, token: sign(dataStoredInToken, secretKey, {}) };
}

export function _createProviderRegToken(
  loginType: string,
  id_token: string,
  expInMin: number = 5
): TokenData {
  const expAtSec: number = Math.floor(Date.now() / 1000) + 60 * expInMin;
  const dataStoredInToken = {
    loginType: loginType,
    id_token: id_token,
    expAtSec: expAtSec,
  };
  const secretKey: string = config.jwtAccessTokenSecret;

  return {
    expAtSec: expAtSec,
    token: sign(dataStoredInToken, secretKey, {}),
  };
}
export function checkPassword(password) {
  if (!password || password.length < 6) {
    throw new Error(
      "Password isn't long enough. Must be at least 6 characters"
    );
  } else if (password && password.length > 200) {
    throw new Error("Password  is too long characters");
  }
  //check password strength
  let strength = 0;
  if (password.match(/[a-z]+/)) {
    strength += 1;
  }
  if (password.match(/[A-Z]+/)) {
    strength += 1;
  }
  if (password.match(/[0-9]+/)) {
    strength += 1;
  }
  if (password.match(/[$@#&!]+/)) {
    strength += 1;
  }
  if (strength < 2) {
    throw new Error(
      "Password is too weak. Try adding special characters and numbers."
    );
  }
}

export interface UserAuthInfo {
  findUser: User;
  tokenData: TokenData;
  passwordForClient?: string;
  recoveryKeyForClient?: string;
}

