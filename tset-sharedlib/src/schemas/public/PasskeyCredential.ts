/**
 * PasskeyCredential schema
 * 
 * Stores WebAuthn passkey credentials for users
 */

export default interface PasskeyCredential {
  _id?: string;
  
  userId: string;
  
  accountId?: string | null;
  
  /** Base64URL encoded credential ID */
  credentialId: string;
  
  /** Base64URL encoded COSE public key */
  publicKey: string;
  
  /** Authenticator transports (e.g., 'internal', 'hybrid', 'usb') */
  transports?: string[] | null;
  
  /** Whether PRF extension is supported by this credential */
  prfSupported: boolean;
  
  /** User-friendly name for the passkey (e.g., "MacBook Pro", "iPhone 15") */
  deviceName?: string | null;
  
  /** Signature counter for replay attack prevention */
  signCount: number;
  
  createdAt?: Date | null;
  
  updatedAt?: Date | null;
  
  /** Last time this passkey was used for authentication */
  lastUsedAt?: Date | null;
  
  /** Whether this credential is disabled */
  disabled?: boolean | null;
}
