import {getTestRequest} from './setup/testServer';
import {createTestUser, getAuthHeaders, createUniqueTestEmail, createUniqueTestUsername} from './setup/testAuth';
import {getTestDb} from './setup/testDb';
import {UserType} from 'tset-sharedlib/shared.types';

describe('Auth Routes Integration Tests', () => {
  const db = getTestDb();

  describe('POST /v3.0/auth/register', () => {
    it('should create a new user with valid credentials', async () => {
      const email = createUniqueTestEmail('register');
      const username = createUniqueTestUsername('testuser');

      const response = await getTestRequest().post('/v3.0/auth/register').send({
        username,
        email,
        password: 'TestPassword123!',
        type: UserType.restricted,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tokenData?.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(username);
      expect(response.body.user.email).toBe(email);

      // Verify user was actually created in database
      const user = await db('user').where({email}).first();

      expect(user).toBeDefined();
      expect(user.username).toBe(username);
    });

    it('should reject registration with duplicate email', async () => {
      const email = createUniqueTestEmail('duplicate');

      // Create first user
      await createTestUser('userone', email, 'Pass123!');

      // Try to create second user with same email
      const response = await getTestRequest().post('/v3.0/auth/register').send({
        username: 'usertwo',
        email,
        password: 'Pass456!',
        type: UserType.restricted,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const email = createUniqueTestEmail('weak-password');
      const username = createUniqueTestUsername('testuser');

      const response = await getTestRequest().post('/v3.0/auth/register').send({
        username,
        email,
        password: 'weak',
        type: UserType.restricted,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /v3.0/auth/signin', () => {
    it('should login existing user with correct credentials', async () => {
      const email = createUniqueTestEmail('login');

      // Create test user
      await createTestUser('loginuser', email, 'LoginPass123!');

      // Login
      const response = await getTestRequest().post('/v3.0/auth/signin').send({
        email,
        password: 'LoginPass123!',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tokenData?.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(email);
    });

    it('should reject login with incorrect password', async () => {
      const email = createUniqueTestEmail('login-wrong-password');

      await createTestUser('loginuser', email, 'CorrectPass123!');

      const response = await getTestRequest().post('/v3.0/auth/signin').send({
        email,
        password: 'WrongPass123!',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(409);
    });

    it('should reject login with non-existent email', async () => {
      const response = await getTestRequest().post('/v3.0/auth/signin').send({
        email: 'nonexistent@example.com',
        password: 'SomePass123!',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(409);
    });
  });

  describe('POST /v3.0/auth/signout', () => {
    it('should logout authenticated user', async () => {
      const testUser = await createTestUser('logoutuser', createUniqueTestEmail('logout'), 'LogoutPass123!');

      const response = await getTestRequest().post('/v3.0/auth/signout').set(getAuthHeaders(testUser.token!));

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject logout without authentication', async () => {
      const response = await getTestRequest().post('/v3.0/auth/signout');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe(403);
    });
  });

  describe('POST /v3.0/auth/tokenLogin', () => {
    it('should accept a valid issued token and return nested auth results', async () => {
      const email = createUniqueTestEmail('token-login');
      const testUser = await createTestUser('tokenloginuser', email, 'TokenLoginPass123!');

      const response = await getTestRequest().post('/v3.0/auth/tokenLogin').send({
        token: testUser.token,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results?.success).toBe(true);
      expect(response.body.results?.user?.email).toBe(email);
      expect(response.body.results?.tokenData?.token).toBeDefined();
    });

    it('should reject malformed token login requests', async () => {
      const response = await getTestRequest().post('/v3.0/auth/tokenLogin').send({
        token: 'not-a-valid-jwt',
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
