import {setupTestDb, cleanupTestDb, clearAllTables, getTestDb} from './testDb';
import {disconnectRedis} from '@/base/redis_client';
import {mainQueue, queueEvents} from '@/base/taskqueue_instances';

// Global setup before all tests
beforeAll(async () => {
  // Setup test database with migrations
  await setupTestDb();
});

// Global cleanup after all tests
afterAll(async () => {
  await Promise.allSettled([queueEvents.close(), mainQueue.close(), disconnectRedis()]);

  // Close database connection
  await cleanupTestDb();
});

// Clear all tables before each test
beforeEach(async () => {
  const db = getTestDb();
  await clearAllTables(db);
});
