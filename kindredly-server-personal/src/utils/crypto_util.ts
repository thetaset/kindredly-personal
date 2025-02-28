import { config } from '@/config';
import crypto from 'crypto';


const webcrypto = crypto.webcrypto as any;
const subtle = webcrypto.subtle as any;

export function hashString(st: string) {
  return hashStringWithSalt(st, passwordSalt);
}

export const passwordSalt = String(config.passwordSalt);

export function secureCompareSecrets(secret1: string, secret2: string) {
  return crypto.timingSafeEqual(Uint8Array.from(Buffer.from(secret1)), Uint8Array.from(Buffer.from(secret2)));
}
/**
 * @method isEmpty
 * @param {String | Number | Object} value
 * @returns {Boolean} true & false
 * @description this value is Empty Check
 */
export const isEmpty = (value: string | number | object): boolean => {
  if (value === null) {
    return true;
  } else if (typeof value !== 'number' && value === '') {
    return true;
  } else if (typeof value === 'undefined' || value === undefined) {
    return true;
  } else if (value !== null && typeof value === 'object' && !Object.keys(value).length) {
    return true;
  } else {
    return false;
  }
};

export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
type Cast<X, Y> = X extends Y ? X : Y;
type FromEntries<T> = T extends [infer Key, any][]
  ? { [K in Cast<Key, string>]: Extract<ArrayElement<T>, [K, any]>[1] }
  : { [key in string]: any };

export type FromEntriesWithReadOnly<T> = FromEntries<DeepWriteable<T>>;

declare global {
  interface ObjectConstructor {
    fromEntries<T>(obj: T): FromEntriesWithReadOnly<T>;
  }
}

function hashStringWithSalt(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
}

export async function hashPasswordWithSubtle(password: string, salt: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hash = await subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface DynamicObject {
  [key: string]: any;
}

export function asPath(path: string) {
  return "/" + config.apiVersion + path;
}


export { hashStringWithSalt }; export function hashMD5({ s }: { s; }) {
  return crypto.createHash('md5').update(s).digest('hex');
}
export function generateToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return token;
}

function getEncryptionKey(): Uint8Array {
  let key = config.passwordStorageEncryptionKey;
  
  if (key.length !== 32) {
    throw new Error(`Invalid key length: ${key.length}. Must be exactly 32 bytes.`);
  }

  return new Uint8Array(Buffer.from(key, "utf8"));
}



export function encryptPassword(str: string) {
  if (!str) return null;
  
  const key = getEncryptionKey();
  const iv = Uint8Array.from(crypto.randomBytes(16)); 

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv); 

  let encryptedData = cipher.update(str, "utf8", "hex");
  encryptedData += cipher.final("hex");

  return { iv: Buffer.from(iv).toString("hex"), encryptedData }; 
}

export function decryptPassword(pwdInfo: { iv: string; encryptedData: string }) {
  if (!pwdInfo) return null;

  const iv = Uint8Array.from(Buffer.from(pwdInfo.iv, "hex")); 
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv); 

  let decryptedData = decipher.update(pwdInfo.encryptedData, "hex", "utf8");
  decryptedData += decipher.final("utf8");

  return decryptedData;
}


// export function encryptPasswordx(str: string) {
//   if (!str) return null;
//   const key = config.passwordStorageEncryptionKey;
//   // check key length
//   if (key.length != 32) {
//     throw new Error("Invalid key length:" + key.length);
//   }
//   const iv = crypto.randomBytes(16);

//   const cipher = crypto.createCipheriv(
//     'aes-256-cbc',
//     Buffer.from(key, 'utf8'),
//     iv
//   );

//   let encryptedData = cipher.update(str, "utf-8", "hex");
//   encryptedData += cipher.final("hex");
//   return { iv: iv.toString("hex"), encryptedData: encryptedData };
// }



// export function decryptPasswordx(pwdInfo: { iv: string; encryptedData: string; }) {
//   if (!pwdInfo) return null;
//   const iv = pwdInfo.iv;
//   const encryptedData = pwdInfo.encryptedData;
//   const key = config.passwordStorageEncryptionKey;
//   const decipher = crypto.createDecipheriv(
//     "aes-256-cbc",
//     Buffer.from(key),
//     Buffer.from(iv, "hex")
//   );

//   let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
//   decryptedData += decipher.final("utf-8");
//   return decryptedData;
// }


