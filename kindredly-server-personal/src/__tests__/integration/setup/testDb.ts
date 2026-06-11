import fs from 'fs';
import path from 'path';
import knex, {Knex} from 'knex';
import {config} from '@/config';

let testDb: Knex | null = null;
const migrationDirectory = path.resolve(__dirname, '../../../../knex/migrations');

export function getTestDb(): Knex {
  if (!testDb) {
    const baseConnection = (config.db?.connection || {}) as Record<string, any>;
    const testConfig = {
      ...config.db,
      connection: {
        ...baseConnection,
        host: String(baseConnection.host || 'localhost'),
        database: String(process.env.TEST_DB_NAME || baseConnection.database || 'thetasettest'),
        user: String(baseConnection.user || 'postgres'),
        password: String(baseConnection.password ?? ''),
        port: Number(baseConnection.port || 5432),
      },
    };
    testDb = knex(testConfig);
  }
  return testDb;
}

export async function setupTestDb(): Promise<Knex> {
  const db = getTestDb();

  await reconcileTestMigrationState(db);

  // Run migrations
  await db.migrate.latest({
    directory: migrationDirectory,
  });

  return db;
}

async function reconcileTestMigrationState(db: Knex): Promise<void> {
  const hasMigrationsTable = await db.schema.hasTable('knex_migrations');
  if (!hasMigrationsTable) {
    return;
  }

  const availableMigrations = new Set(
    fs.readdirSync(migrationDirectory).filter((fileName) => /\.(ts|js)$/.test(fileName)),
  );
  const appliedMigrations = await db<{name: string}>('knex_migrations').select('name');
  const missingMigrations = appliedMigrations
    .map((entry) => entry.name)
    .filter((name) => !availableMigrations.has(name));

  if (missingMigrations.length === 0) {
    return;
  }

  console.warn(
    `[testDb] Resetting test schema because knex_migrations contains missing files: ${missingMigrations.join(', ')}`,
  );

  await db.raw('DROP SCHEMA public CASCADE');
  await db.raw('CREATE SCHEMA public');
}

export async function cleanupTestDb(): Promise<void> {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
}

export async function clearAllTables(db: Knex): Promise<void> {
  // Get all table names
  const tables = await db.raw(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT IN ('knex_migrations', 'knex_migrations_lock')
  `);

  const tableNames = (tables.rows as Array<{tablename: string}>).map((table) => table.tablename).filter(Boolean);

  if (!tableNames.length) return;

  const quotedTableNames = tableNames.map((name) => `"${name}"`).join(', ');
  await db.raw(`TRUNCATE TABLE ${quotedTableNames} RESTART IDENTITY CASCADE`);
}
