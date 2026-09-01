import Database from 'better-sqlite3';
import path from 'path';
import { MIGRATIONS } from './schema';

export function migrate(db: Database.Database): void {
  for (const sql of MIGRATIONS) {
    db.exec(sql);
  }
}

export function getDb(userDataPath: string): Database.Database {
  const dbPath = path.join(userDataPath, 'ielts.db');
  const db = new Database(dbPath);
  // WAL for concurrent read/write; main process is single writer but renderer reads via IPC
  try {
    db.pragma('journal_mode = WAL');
  } catch {
    // pragma may fail on :memory: or readonly; ignore
  }
  migrate(db);
  return db;
}
