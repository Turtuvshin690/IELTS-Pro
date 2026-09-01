import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from './schema';

// Try to load native better-sqlite3, fallback to JSON file if ABI mismatch or missing build tools
let Database: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Database = require('better-sqlite3');
} catch (e) {
  // will use fallback
  try { console.warn('better-sqlite3 not available, using fallback JSON db', (e as any)?.message); } catch {}
}

class FallbackDB {
  private file: string;
  private data: Record<string, any[]> = {};
  constructor(userDataPath: string) {
    this.file = path.join(userDataPath, 'ielts-fallback.json');
    try {
      if (fs.existsSync(this.file)) this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch { this.data = {}; }
  }
  private save() { try { fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2)); } catch {} }
  pragma() { return 'fallback'; }
  exec(sql: string) {
    // handle CREATE TABLE — just ensure key exists
    const m = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (m) { const t = m[1]; if (!this.data[t]) this.data[t] = []; this.save(); }
    // also run migrations string which contains multiple CREATEs
    for (const mm of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi)) {
      const t = mm[1]; if (!this.data[t]) this.data[t] = [];
    }
    this.save();
  }
  prepare(sql: string) {
    const self = this;
    return {
      all: (...params: any[]) => self.handleAll(sql, params),
      run: (...params: any[]) => self.handleRun(sql, params),
      get: (...params: any[]) => self.handleAll(sql, params)[0] ?? null,
    };
  }
  private handleAll(sql: string, params: any[]): any[] {
    const lower = sql.toLowerCase();
    if (lower.includes('sqlite_master')) {
      return Object.keys(this.data).map(n => ({ name: n, type: 'table' }));
    }
    // SELECT * FROM tests / sections / questions / attempts etc — simple parsing
    const sel = sql.match(/from\s+(\w+)/i);
    if (sel) {
      const table = sel[1];
      let rows = this.data[table] || [];
      // crude WHERE id = ? handling
      if (lower.includes('where') && params.length) {
        // assume where id = ?
        const id = params[0];
        rows = rows.filter((r: any) => r.id === id || r.testId === id || r.sectionId === id);
      }
      return rows;
    }
    return [];
  }
  private handleRun(sql: string, params: any[]): any {
    const lower = sql.toLowerCase();
    // INSERT OR REPLACE
    const ins = sql.match(/insert or replace into (\w+)\s*values/i);
    if (ins) {
      const table = ins[1];
      if (!this.data[table]) this.data[table] = [];
      // store raw params as object with id first param
      const id = params[0];
      const existingIdx = this.data[table].findIndex((r: any) => r.id === id);
      const row: any = { id, _raw: params, _sql: sql };
      // also try to map columns for known tables: use params as values
      // For simplicity store as {id, kind, title, ...} based on table
      if (table === 'tests' && params.length >= 4) row.kind = params[1], row.title = params[2], row.durationSec = params[3];
      if (table === 'questions' && params.length >= 6) row.sectionId = params[1], row.qType = params[2];
      if (existingIdx >= 0) this.data[table][existingIdx] = { ...this.data[table][existingIdx], ...row };
      else this.data[table].push(row);
      this.save();
      return { lastInsertRowid: 1, changes: 1 };
    }
    const ins2 = sql.match(/insert into (\w+)/i);
    if (ins2) {
      const table = ins2[1];
      if (!this.data[table]) this.data[table] = [];
      this.data[table].push({ _raw: params });
      this.save();
      return { lastInsertRowid: 1, changes: 1 };
    }
    return { lastInsertRowid: 0, changes: 0 };
  }
}

export function migrate(db: any): void {
  for (const sql of MIGRATIONS) {
    try { db.exec(sql); } catch {}
  }
}

export function getDb(userDataPath: string): any {
  if (Database) {
    try {
      const dbPath = path.join(userDataPath, 'ielts.db');
      const db = new Database(dbPath);
      try { db.pragma('journal_mode = WAL'); } catch {}
      migrate(db);
      return db;
    } catch (e) {
      try { console.warn('better-sqlite3 getDb failed, fallback', (e as any)?.message); } catch {}
    }
  }
  // fallback
  const fb = new FallbackDB(userDataPath);
  migrate(fb as any);
  return fb as any;
}

export function isFallbackDb(db: any): boolean {
  return db instanceof FallbackDB;
}
