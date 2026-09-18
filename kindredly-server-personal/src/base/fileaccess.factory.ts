import {config} from '@/config';
import {UserFileAccessProvider} from './user_fileaccess.provider';
import {UserFileAccessProviderFS} from './user_fileaccess.provider.fs';

/**
 * Selects the user/image file-access provider based on the configured storage
 * backend. Shared by every service that reads/writes image or user files so the
 * fs-vs-s3 decision lives in exactly one place.
 *
 * A self-hosted server always stores files on its own disk — the binding
 * inversify.personal.config.ts makes — whatever USER_STORAGE_TYPE says, and the
 * S3 provider is withheld from Kindredly Personal. So S3 is required only when it
 * is used: a top-level import here was a MODULE_NOT_FOUND on a Personal server the
 * first time the realm backup ran.
 */
export function getUserFileAccessProvider(): UserFileAccessProvider {
  if (config.privateServer || config.userStorage.type === 'fs') return new UserFileAccessProviderFS();
  // personal-optional: guarded, never reached on a self-hosted server
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {UserFileAccessProviderS3} = require('./_internal/user_fileaccess.provider.s3');
  return new UserFileAccessProviderS3();
}
