/**
 * Encryption and key management types
 */

export interface EncInfoKey {
  wrappedEncKey: any;
  wrappingKeyId: string;
  unwrappingKeyId: string;
}

export type EncInfo = 
  // v: encryption encoding version (v1 = object-level IV, v2 = per-field IV)
  // sv: encryption schema version (which fields are encrypted). Omit for sv=1 to keep payload small.
  | { keys: EncInfoKey[]; iv: string; v?: number; sv?: number; t?: number }
  | { decrypt: true; };

export type PropertyType = 'string' | 'array' | 'object' | 'number';

export interface JSONSchemaProperties {
  type?: PropertyType;
  encrypted?: boolean;
  encryptedChildren?: boolean;
  properties?: { [key: string]: JSONSchemaProperties };
  defaultKeyType?: string;
  encTarget?: string;
  constraintFunc?: any;
}

export interface EncStatus {
  hasPassword: boolean;
  hasCachedPassword: boolean;
  userEncSetup: boolean;
  userRecoveryKeyExists: boolean;
  acntEncSetup: boolean;
  userEncEnabled: boolean;
  acntEncEnabled: boolean;
  acntEncSupported: boolean;
  needsPassword: boolean;
}
