import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function initDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: path.join(process.cwd(), 'aif-data.db'),
    driver: sqlite3.Database
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS holds (
      transactionId TEXT PRIMARY KEY,
      payload TEXT,
      assessment TEXT,
      status TEXT,
      createdAt INTEGER,
      agentName TEXT
    );
  `);

  console.log('📦 [Database] SQLite persistent storage initialized.');
  return dbInstance;
}

export async function getDB() {
  if (!dbInstance) return await initDB();
  return dbInstance;
}