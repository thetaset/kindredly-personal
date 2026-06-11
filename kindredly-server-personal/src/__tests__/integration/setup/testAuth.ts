import {getTestRequest} from './testServer';
import {LoginType, UserType} from 'tset-sharedlib/shared.types';
import {Knex} from 'knex';

export interface TestUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  type: UserType;
  token?: string;
  accountId?: string;
}

export function createUniqueTestEmail(prefix = 'testuser'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function createUniqueTestUsername(prefix: string): string {
  const normalizedPrefix = (prefix || 'testuser').toLowerCase().replace(/[^a-z0-9]/g, '');
  const basePrefix = normalizedPrefix.length >= 6 ? normalizedPrefix : `${normalizedPrefix}user`;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${basePrefix}${suffix}`.slice(0, 200);
}

export async function createTestUser(
  username: string,
  email: string,
  password: string,
  type: UserType = UserType.restricted,
): Promise<TestUser> {
  const actualUsername = createUniqueTestUsername(username);
  const response = await getTestRequest().post('/v3.0/auth/register').send({
    username: actualUsername,
    email,
    password,
    type,
  });

  if ((response.statusCode !== 200 && response.statusCode !== 201) || response.body?.success === false) {
    throw new Error(`Failed to create test user: ${response.text}`);
  }

  return {
    _id: response.body.user?._id || response.body._id,
    username: actualUsername,
    email,
    password,
    type,
    token: response.body.token || response.body.tokenData?.token,
    accountId: response.body.user?.accountId || response.body.accountId,
  };
}

export async function loginTestUser(email: string, password: string): Promise<{token: string; user: any}> {
  const response = await getTestRequest().post('/v3.0/auth/signin').send({
    email,
    password,
  });

  if (response.statusCode !== 200 || response.body?.success === false) {
    throw new Error(`Failed to login test user: ${response.text}`);
  }

  return {
    token: response.body.tokenData?.token,
    user: response.body.user,
  };
}

export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function cleanupTestUsers(db: Knex, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  // Clean up in reverse order of foreign key dependencies
  await db('item').whereIn('userId', userIds).del();
  await db('user_activity').whereIn('userId', userIds).del();
  await db('post').whereIn('userId', userIds).del();
  await db('user').whereIn('_id', userIds).del();
}
