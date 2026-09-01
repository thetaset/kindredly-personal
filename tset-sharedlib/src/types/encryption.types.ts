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
  /**
   * Minimum encryption schema version (`encInfo.sv`) at which this field is encrypted.
   * Below this version the field is left plaintext (read straight from the column).
   * Used to add newly-encrypted fields (e.g. publishId/imageFilename at sv=2) without
   * breaking older rows that stored them plaintext. Absent/undefined ⇒ always encrypted.
   */
  minSv?: number;
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
