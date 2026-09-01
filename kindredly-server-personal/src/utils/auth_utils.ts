import jsonwebtoken, {sign} from 'jsonwebtoken';
import {Request, Response} from 'express';

import {config} from '@/config';
import {HttpException} from '@/exceptions/HttpException';
import {v4 as uuidv4} from 'uuid';
import User from 'tset-sharedlib/schemas/public/User';
import {RequestContext} from '@/base/request_context';

import {promisify} from 'util';
import {DataStoredInToken} from '@/interfaces/auth.interface';
import {SessionService} from '@/services/session.service';
import {recordSecurityEvent, SECURITY_EVENT_TYPES} from '@/services/security_event.service';
import {TokenData} from 'tset-sharedlib/api/api-types';
import {UserView} from 'tset-sharedlib/types';

const jwtAccessTokenSecret = config.jwtAccessTokenSecret;

// Verification key-ring: the primary signing secret first, then any verify-only
// fallbacks (previous secrets kept across a rotation). Deduped, empties dropped.
// Signing always uses jwtAccessTokenSecret (the primary); we only accept the
// others when validating existing tokens so a secret rotation never strands the
// non-expiring tokens already in the wild.
const jwtVerificationSecrets: string[] = [jwtAccessTokenSecret, ...config.jwtAccessTokenSecretsPrevious].filter(
  (secret, index, all) => !!secret && all.indexOf(secret) === index,
);

/**
 * Callback-style JWT verify that tries each secret in the ring, first match wins.
 * Falls back to the last error only if every secret rejects the token.
 */
export function verifyWithRing(token: string, callback: (err: any, decoded?: any) => void): void {
  const tryAt = (index: number): void => {
    jsonwebtoken.verify(token, jwtVerificationSecrets[index], (err, decoded) => {
      if (!err) return callback(null, decoded);
      if (index + 1 < jwtVerificationSecrets.length) return tryAt(index + 1);
      return callback(err);
    });
  };
  tryAt(0);
}

const jwtverify = promisify((arg: string, callback) => verifyWithRing(arg, callback));

function headerValue(req: any, name: string): string | undefined {
  const value = req?.headers?.[name];
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized ? String(normalized) : undefined;
}

export function removeNullFields(obj: any, seen = new WeakSet()): any {
  if (!obj || typeof obj !== 'object') return obj;

  // Preserve Date objects, RegExp, and other built-in objects
  if (obj instanceof Date || obj instanceof RegExp || obj instanceof Buffer) {
    return obj;
  }

  // Detect circular references
  if (seen.has(obj)) return obj;
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.filter((item) => item !== null && item !== undefined).map((item) => removeNullFields(item, seen));
  }

  // For objects, use faster approach with direct property assignment
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = typeof value === 'object' && value !== null ? removeNullFields(value, seen) : value;
    }
  }

  return result;
}

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
      // No credentials → fail auth. Previously this resolved (without a return),
      // so a header-less request passed as "authenticated" with no authInfo —
      // an auth bypass for any caller that gates access on this helper.
      return reject({message: 'AuthTokenError', status: 401} as TErrorInfo);
    }
    const token = authHeader.split(' ')[1];

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
          return reject({message: 'AuthUserError', status: 401} as TErrorInfo);
        }
      })
      .catch((err) => {
        console.error('AuthTokenError:', err);
        return reject({message: 'AuthTokenError', status: 401} as TErrorInfo);
      });
  });
};

const getTokenFromRequest = (req: TRequest): string => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    return token;
  }
  return null;
};

/**
 * The user a request belongs to, or null — for callers that run BEFORE route-level auth.
 *
 * The rate limiter is mounted globally in app.ts, ahead of every route's `authenticateJWT`,
 * so `req.authInfo` does not exist yet when it needs to decide what to count the request
 * against. This verifies the signature rather than merely decoding it: an unverified decode
 * would let anyone mint a userId and hand themselves a fresh rate-limit budget per forged
 * id, which is strictly worse than keying on the address.
 *
 * Synchronous by necessity — the key is needed before the limiter runs — and cheap: one
 * HMAC verification, the same work `authenticateJWT` does moments later.
 *
 * Returns null for a missing, malformed, expired or forged token. A caller that gets null
 * must fall back to something it can trust, never to a value taken from the request.
 */
export function verifiedUserIdSync(req: any): string | null {
  // Guarded rather than assuming an Express-shaped request: this runs inside the rate
  // limiter, on every request, and a throw there would 500 the whole API.
  if (!req?.headers) return null;
  const token = getTokenFromRequest(req);
  if (!token) return null;
  for (const secret of jwtVerificationSecrets) {
    try {
      const decoded = jsonwebtoken.verify(token, secret) as any;
      const userId = decoded?.userId;
      return typeof userId === 'string' && userId ? userId : null;
    } catch {
      // Try the next key in the ring; a failure on all of them is an untrusted token.
    }
  }
  return null;
}

export const authenticateJWTWithToken = (req, res, next, token: string) => {
  if (token) {
    verifyWithRing(token, async (err, authInfo) => {
      if (err) {
        console.error('AuthTokenError:', err);
        return res.json({success: false, message: 'AuthTokenError', status: 401});
      }
      req.authInfo = authInfo;

      // Scoped tokens (Companion device-agent) are deny-by-default: only their
      // allowlisted endpoints, regardless of what else the user could do.
      const tokenScope = (authInfo as DataStoredInToken).scope;
      if (tokenScope && !DEVICE_AGENT_ALLOWED_PATHS.has(req.path)) {
        console.error('AuthScopeError:', tokenScope, req.path);
        return res.json({success: false, message: 'AuthScopeError', status: 401});
      }

      // Session revocation check (lazily adopts unknown sessions, fails open).
      const sessionCheck = await SessionService.instance.verifyAuthInfoSession(authInfo as DataStoredInToken, {
        appType: headerValue(req, 'tsapptype'),
        clientId: headerValue(req, 'tsclientid'),
        context: req.path,
      });
      if (!sessionCheck.ok) {
        // A revoked session gets its OWN message, distinct from a malformed or
        // unknown token. The Companion has to be able to tell "a parent removed this
        // device" from "auth is having a bad day": it already folds every
        // /Auth(Token|Scope)Error/ into one generic flag, and if it tore down its
        // provisioning on that, a single auth outage or key-ring rollover would
        // un-guard every family's computer at once. Only this exact string may ever
        // mean "stand down".
        //
        // `checkSession` returns ok:false ONLY for a session explicitly marked
        // revoked — every other failure, including redis and the database being
        // down, fails open. So reaching here already means revoked.
        return res.json({success: false, message: 'AuthSessionRevoked', status: 401});
      }

      try {
        let ctx: RequestContext = RequestContext.instance(req);
        await ctx.verifyUserExists();

        ctx.logClientActivity().catch((e) => console.error(e));

        // temp authorization allows for a user to be authorized for a limited time
        // (never for scoped tokens — no privilege elevation from a device agent)
        const tempAuthToken = tokenScope ? null : (req.body.tempAuthToken as {token: string; expAtSec: number});
        if (tempAuthToken) {
          try {
            const tempAuthInfo: any = (await jwtverify(tempAuthToken.token)) as DataStoredInToken;

            if (tempAuthInfo && tempAuthInfo.expAtSec && tempAuthInfo.expAtSec >= Date.now() / 1000) {
              ctx.setTempAuthUserId(tempAuthInfo.userId);
            } else {
              throw new Error('token corrupted or expired' + tempAuthInfo);
            }
          } catch (e) {
            console.error('TempAuthTokenError:', req.path, ' error:', e);
            throw e;
          }
        }

        req.ctx = ctx;
      } catch (e) {
        console.error('AuthUserError:', e);
        return res.json({success: false, message: 'AuthUserError', status: 401});
      }

      next();
      return;
    });
  } else {
    const message = 'AuthError: Not authorized';
    console.error(message, req.path);
    res.json({success: false, message, status: 403});
  }
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

  // A rejected admin token is a materially more interesting signal than a rejected user
  // token: these routes carry account changes, purges and config writes. The
  // non_admin_token reason in particular means a *valid* user token was presented to an
  // admin route, which is privilege probing rather than an expired session.
  const recordAdminFailure = (reason: string) =>
    recordSecurityEvent({
      eventType: SECURITY_EVENT_TYPES.AUTH_ADMIN_LOGIN_FAILED,
      severity: 'warn',
      ip: req?.ip,
      route: req?.path,
      detail: {reason},
    });

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    verifyWithRing(token, (err, authInfo) => {
      if (err) {
        console.error(err);
        recordAdminFailure('invalid_token');
        return res.sendStatus(403);
      } else if (!authInfo.isAdmin) {
        console.error(err);
        recordAdminFailure('non_admin_token');
        return res.sendStatus(403);
      }

      req.authInfo = authInfo;

      next();
    });
  } else {
    console.error('Missing authorization header');
    recordAdminFailure('missing_header');
    res.sendStatus(401);
  }
};

/**
 * Statuses that must keep going out as HTTP 200 with the code in the body, for now.
 *
 * A real 401 is destructive: `RemoteRequester` treats it as an unrecoverable auth failure and
 * runs handleFatalAuthError -> LogOut -> `appDb.kvClear()` + `indexedDB.deleteDatabase()`, which
 * destroys the pending OperationQueue. A server-side slip would turn into user data loss on every
 * installed client. A real 403 is milder but still a regression: that path discards the server's
 * message and shows a hardcoded "Access Denied".
 *
 * Both become safe only once a client that handles them non-destructively has aged into the
 * fleet — they are Ring 2, client-first, months after the client half ships.
 */
const SOFT_STATUS_CODES = new Set([401, 403]);

export const errorHelper = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('Error', error);
    const statusCode = error.status || 500;

    // Streaming routes (file downloads) pipe directly into res. Once the first byte is out we
    // cannot set a status or send a body, and trying throws ERR_HTTP_HEADERS_SENT — which would
    // replace a partial download with a crash.
    if (res.headersSent) {
      return;
    }

    // The message is still echoed as-is, deliberately.
    //
    // The obvious hardening here is to replace the message of anything that is not an
    // HttpException, on the grounds that an unplanned failure can leak a driver error or a query
    // fragment. That is wrong in this codebase: there are ~524 `throw new Error(...)` against
    // ~132 `throw new HttpException(...)`, and the plain ones carry the messages users actually
    // read — "Item not found", "User does not have permission to edit this item". Suppressing
    // them would replace real feedback with "Internal server error" across most of the API.
    //
    // Message hygiene needs those throws migrated to HttpException first; it is a separate task
    // from getting the status codes right, and doing it here would be a silent UX regression.
    //
    // `statusCode` MUST stay in the body regardless of the HTTP status: AuthService branches on
    // `body.statusCode == 409` for federated signin, and older clients read the body only.
    const body = {success: false, message: error.message, statusCode};

    if (SOFT_STATUS_CODES.has(statusCode)) {
      res.json(body);
      return;
    }

    // Previously every error — including 500s — went out as HTTP 200, so the load balancer and
    // CloudWatch saw a perfectly healthy service while users were failing. This is what makes
    // 5xx alerting (and therefore alarm-based auto-rollback) possible at all.
    res.status(statusCode).json(body);
  });
};

export function getUserAuthDetails(user: User) {
  const token = jsonwebtoken.sign(
    {userId: user._id, accountId: user.accountId, sessionId: uuidv4()},
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
  // Admin console tokens are outside the user_session registry (no userId), so
  // expiry is their only invalidation mechanism — keep them short-lived.
  const token = jsonwebtoken.sign({isAdmin: true, sessionId: uuidv4()}, jwtAccessTokenSecret, {expiresIn: '12h'});

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

  return user as UserView;
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
  const profileAttributes = [
    '_id',
    'username',
    'fullname',
    'profileImage',
    'type',
    'accountId',
    'publicId',
    'displayedName',
  ];
  profileAttributes.forEach((attr) => {
    newUserObj[attr] = user[attr];
  });
  return newUserObj;
}

export function getTargetUserId(req) {
  if (!!req.body.userId) {
    //&& req.body.userId != "null") {
    return req.body.userId;
  }

  // Many typed requests use targetUserId instead of userId (e.g. SaveItemRequest).
  if (!!req.body.targetUserId) {
    return req.body.targetUserId;
  }

  return req.authInfo.userId;
}

export function getAuthUserId(req) {
  return req.authInfo.userId;
}
export function _createToken(user: User): TokenData {
  const dataStoredInToken: DataStoredInToken = {
    userId: user._id,
    accountId: user.accountId,
    sessionId: uuidv4(),
    expAtSec: null,
  };
  const secretKey: string = config.jwtAccessTokenSecret;

  return {expAtSec: null, token: sign(dataStoredInToken, secretKey, {})};
}

/**
 * Endpoints a device-agent scoped token may call. Everything else 401s.
 *
 * Deny-by-default, and the set stays small on purpose. Two rules for anything added here:
 *
 *  1. **A request, never a grant.** The Companion may ask for something a parent then approves; it
 *     may never be the thing that approves. `/access_request/add` is on the list because a child
 *     pressing "Ask a parent" on a blocked Mac must reach their parent with every browser closed —
 *     and the row it files is inert until an adult acts on it. Nothing that changes policy belongs
 *     here. (Contrast the bridge's `companionSetRules`, which rewrites a child's limits with no
 *     authorization at all — observation 24. Do not treat this list as cover for that.)
 *  2. **Both routes already gate on the caller.** `add` stamps `requesterId` from the context, so
 *     the Companion cannot file as anyone else. `listForUser` DOES accept a `userId` — being on
 *     this list is not what stops a sibling being named — but
 *     `listAccessRequestsByRequesterId` runs `verifyAdminPermissions` for any id that is not the
 *     caller's, and the token is minted for a restricted user, so the ask is refused. Check that
 *     gate still exists before adding a third route that takes a target id.
 */
export const DEVICE_AGENT_ALLOWED_PATHS = new Set([
  '/user/activity/push',
  '/user/client/heartbeat',
  // A blocked child asking for an app or for more time, from the Companion, with no browser open.
  '/access_request/add',
  // ...and seeing whether it has been answered yet. Read-only, and only their own.
  '/access_request/listForUser',
  // The compiled ruleset for THIS device. Read-only, and a read of the policy a parent
  // already set — it grants nothing and changes nothing, so rule 1 above holds. It takes no
  // user id at all: the child is whoever the token was minted for, and the device id comes
  // from the token rather than the body, so rule 2 holds without a further gate. Guard needs
  // this to enforce without the main app running (UX-019).
  '/companion/rules/current',
]);

/** Long-lived Companion (device-agent) token: `DEVICE_AGENT_ALLOWED_PATHS` only, session-revocable. */
export function _createCompanionToken(user: User, deviceId: string): TokenData {
  const dataStoredInToken: DataStoredInToken = {
    userId: user._id,
    accountId: user.accountId,
    sessionId: uuidv4(),
    expAtSec: null,
    scope: 'device-agent',
    deviceId,
  };
  const secretKey: string = config.jwtAccessTokenSecret;

  return {expAtSec: null, token: sign(dataStoredInToken, secretKey, {})};
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

  return {expAtSec, token: sign(dataStoredInToken, secretKey, {})};
}

export function _createProviderRegToken(loginType: string, id_token: string, expInMin: number = 5): TokenData {
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
    throw new HttpException(400, "Password isn't long enough. Must be at least 6 characters");
  } else if (password && password.length > 200) {
    throw new HttpException(400, 'Password  is too long characters');
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
    throw new Error('Password is too weak. Try adding special characters and numbers.');
  }
}

export interface UserAuthInfo {
  findUser: User;
  tokenData: TokenData;
  passwordForClient?: string;
  recoveryKeyForClient?: string;
}
