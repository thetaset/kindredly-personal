import {findMissingProductionSecrets} from '@/config';

const allSet = {
  JWT_ACCESS_TOKEN_SECRET: 'a',
  PASSWORD_STORAGE_ENCRYPTION_KEY: 'b',
  PASSWORD_SALT: 'c',
  ADMIN_CONSOLE_PASSWORD: 'e',
};

describe('findMissingProductionSecrets', () => {
  test('returns empty when all required secrets are set', () => {
    expect(findMissingProductionSecrets(allSet, true)).toEqual([]);
  });

  test('reports missing core secrets', () => {
    expect(findMissingProductionSecrets({}, false)).toEqual([
      'JWT_ACCESS_TOKEN_SECRET',
      'PASSWORD_STORAGE_ENCRYPTION_KEY',
      'PASSWORD_SALT',
    ]);
  });

  test('treats empty string as missing', () => {
    expect(findMissingProductionSecrets({...allSet, PASSWORD_SALT: ''}, false)).toEqual(['PASSWORD_SALT']);
  });

  test('requires admin console password only when console is enabled', () => {
    const env = {...allSet, ADMIN_CONSOLE_PASSWORD: undefined};
    expect(findMissingProductionSecrets(env, false)).toEqual([]);
    expect(findMissingProductionSecrets(env, true)).toEqual(['ADMIN_CONSOLE_PASSWORD']);
  });
});
