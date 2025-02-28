import {Pool} from 'pg';
import {config} from '@/config';
// Create a connection pool

const conn = {
  ...config.db.connection,
};

const databasename = config.db.connection.database;

delete conn.database;
const pool = new Pool(conn);

async function createDatabase() {
  const client = await pool.connect();

  try {
    // Run the SQL query to create the database

    await client.query(`CREATE DATABASE "${databasename}"`);

    console.log('Database created successfully!');
  } catch (error) {
    console.error('Error creating the database:', error);
  } finally {
    // Release the client back to the connection pool
    client.release();
  }
  // exit app
  process.exit();
}

createDatabase();
