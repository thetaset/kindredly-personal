# BGRouter Integration Tests

This directory contains integration tests for all BGRouter API routes. These tests run against a real PostgreSQL database and validate end-to-end functionality.

## Overview

- **216 total routes** extracted from BGRouter
  - 15 server routes (actual API endpoints)
  - 201 client-only routes (local processing)
- Tests use real database with automatic cleanup
- Each test runs in isolated transaction
- Authentication and test user helpers provided

## Setup

### Prerequisites

1. PostgreSQL running locally on port 5432
2. Test database created: `kindredly_test`
3. Environment configured in `tset-server/.env.test`

### Create Test Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE kindredly_test;
\q
```

### Run Tests

```bash
cd tset-server

# Run all integration tests
npm run test

# Run specific test file
npm test -- auth.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Infrastructure

### Setup Files

- **`setup/testDb.ts`** - Database connection and cleanup utilities
  - `getTestDb()` - Get test database connection
  - `setupTestDb()` - Run migrations on test database
  - `cleanupTestDb()` - Close database connection
  - `clearAllTables()` - Truncate all tables between tests

- **`setup/testServer.ts`** - Express app initialization
  - `getTestApp()` - Get Express app instance
  - `getTestRequest()` - Get supertest request object

- **`setup/testAuth.ts`** - Authentication helpers
  - `createTestUser()` - Register and return test user with token
  - `loginTestUser()` - Login and return token
  - `getAuthHeaders()` - Generate auth headers from token
  - `cleanupTestUsers()` - Delete test users and related data

- **`setup/testHelpers.ts`** - Test data factories
  - `createTestItem()` - Create test item in database
  - `createTestCollection()` - Create test collection
  - `createTestPost()` - Create test post
  - `expectValidId()` - Assert valid ID format
  - `expectValidTimestamp()` - Assert valid timestamp

- **`setup/jest.setup.ts`** - Global test lifecycle
  - Runs migrations before all tests
  - Clears all tables before each test
  - Closes database after all tests

### Route Inventory

The file `route-inventory.json` contains metadata about all BGRouter routes:

```json
{
  "generated": "2025-11-19T20:40:57.814Z",
  "summary": {
    "totalRoutes": 216,
    "serverRoutes": 15,
    "clientRoutes": 201,
    "files": 11
  },
  "serverRoutes": [
    {
      "path": "/authInfo",
      "method": "POST",
      "file": "user.bgroute.ts",
      "requiresAuth": true,
      "paramType": "inline"
    }
  ]
}
```

**Update inventory:**
```bash
node scripts/extract-routes.js
```

## Writing Tests

### Basic Pattern

```typescript
import { getTestRequest } from './setup/testServer';
import { createTestUser, getAuthHeaders } from './setup/testAuth';
import { getTestDb } from './setup/testDb';

describe('Your Route Tests', () => {
  const db = getTestDb();
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authHeaders: Record<string, string>;

  beforeEach(async () => {
    testUser = await createTestUser('username', 'email@example.com', 'Password123!');
    authHeaders = getAuthHeaders(testUser.token!);
  });

  it('should do something', async () => {
    const response = await getTestRequest()
      .post('/v3.0/your/route')
      .set(authHeaders)
      .send({ data: 'value' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ expected: 'result' });

    // Verify database state
    const dbRecord = await db('table').where({ id: 'value' }).first();
    expect(dbRecord).toBeDefined();
  });
});
```

### Test Categories

1. **Authentication Required**
   - Use `createTestUser()` and `getAuthHeaders()`
   - Test both authenticated and unauthenticated access
   - Verify 401 responses without auth

2. **Database Verification**
   - After POST/PUT: Query database to verify data was saved
   - After DELETE: Verify data was removed
   - After GET: Ensure correct data was returned

3. **Error Cases**
   - Invalid input validation
   - Not found (404) scenarios
   - Permission denied (403) scenarios
   - Conflict (409) scenarios

4. **Edge Cases**
   - Empty data
   - Large data sets
   - Duplicate operations
   - Concurrent requests

## Existing Tests

- **`auth.test.ts`** - Authentication routes (register, login, logout)
- **`item.test.ts`** - Item CRUD operations (save, info, delete, list)

## Priority Routes to Test

Based on usage and criticality:

### High Priority
- ✅ `/auth/register` - User registration
- ✅ `/auth/login` - User authentication
- ✅ `/auth/logout` - Session termination
- ✅ `/item/save` - Save/update items
- ✅ `/item/info` - Retrieve item details
- ✅ `/item/delete` - Remove items
- ✅ `/item/list` - List user items
- `/post/create` - Create posts
- `/feed/list` - Get user feed
- `/comment/create` - Add comments

### Medium Priority
- `/sync/*` - Sync operations (8 routes)
- `/item/collection/*` - Collection management
- `/user/prefs/*` - User preferences
- `/user/activity/*` - Activity logging

### Lower Priority (Client-Only)
- `/client/*` - Local processing routes (201 routes)
- These don't hit server but could have unit tests

## Test Database

The test database (`kindredly_test`) is:
- Automatically migrated before tests run
- Cleared between each test (all tables truncated)
- Isolated from development database
- Uses same schema as production

**Never run tests against production database!**

## Configuration

Test configuration in `tset-server/.env.test`:

```bash
DB_DBNAME=kindredly_test
PORT=3001
IS_LIVE=false
ABORT_ON_DB_LAUNCH_FAILURE=false
```

Jest configuration in `tset-server/jest.config.js`:

```javascript
{
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup/jest.setup.ts'],
  testTimeout: 30000
}
```

## Troubleshooting

### Database Connection Errors
```bash
# Ensure PostgreSQL is running
pg_isready

# Check if test database exists
psql -U postgres -l | grep kindredly_test

# Recreate test database
dropdb kindredly_test && createdb kindredly_test
```

### Test Timeouts
- Default timeout is 30 seconds
- Increase in jest.config.js if needed
- Check for hanging database connections

### Failed Assertions
- Check test database state: `psql -U postgres -d kindredly_test`
- Review server logs for errors
- Verify migrations are up to date: `npm run migrate`

### Type Errors
- Ensure tset-sharedlib types are up to date
- Check api-route-map.ts for type definitions
- Rebuild: `cd tset-sharedlib && npm run build`

## Next Steps

1. ✅ Test infrastructure complete
2. ✅ Route inventory generated
3. ✅ Sample tests created (auth, item)
4. 🔄 Add tests for remaining priority routes
5. ⏳ Add test coverage reporting
6. ⏳ Integrate with CI/CD pipeline

## Resources

- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Jest Documentation](https://jestjs.io/)
- [Knex Migrations](http://knexjs.org/guide/migrations.html)
