import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from './schema';

// Force fallback JSON DB for packaged app to avoid native ABI crash — native requires Visual Studio Build Tools
// Set USE_NATIVE_DB=1 env to try native (dev only)
let Database: any = null;
if (process.env.USE_NATIVE_DB === '1') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Database = require('better-sqlite3');
  } catch (e) {
    try { console.warn('better-sqlite3 not available, using fallback JSON db', (e as any)?.message); } catch {}
  }
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
    const sel = sql.match(/from\s+(\w+)/i);
    if (sel) {
      const table = sel[1];
      let rows = this.data[table] || [];
      // Handle WHERE kind='reading' literal
      const kindLit = sql.match(/kind\s*=\s*['"](\w+)['"]/i);
      if (kindLit) {
        const kind = kindLit[1];
        rows = rows.filter((r: any) => r.kind === kind);
        return rows;
      }
      // JOIN handling: questions JOIN sections — return questions filtered by testId
      if (lower.includes('join') && lower.includes('sections') && lower.includes('testid')) {
        // SELECT q.* FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = ?
        const testId = params[0];
        const sectionIds = (this.data['sections'] || []).filter((s: any) => s.testId === testId).map((s: any) => s.id);
        rows = (this.data['questions'] || []).filter((q: any) => sectionIds.includes(q.sectionId));
        return rows;
      }
      if (lower.includes('where') && params.length) {
        const id = params[0];
        rows = rows.filter((r: any) => r.id === id || r.testId === id || r.sectionId === id);
      }
      // Handle WHERE id IN (?, ?, ?) with multiple params
      if (lower.includes('where') && lower.includes(' in ') && params.length) {
        const ids = params;
        rows = rows.filter((r: any) => ids.includes(r.id));
      }
      return rows;
    }
    return [];
  }
  private handleRun(sql: string, params: any[]): any {
    const lower = sql.toLowerCase();
    // INSERT OR REPLACE — allow column list: INSERT OR REPLACE INTO tests (id, kind, ...) VALUES
    const ins = sql.match(/insert or replace into (\w+)/i);
    if (ins) {
      const rawTable = ins[1];
      const table = ['tests','passages','sections','questions','attempts','scores','settings'].find(k => k === rawTable) || rawTable;
      if (!this.data[table]) this.data[table] = [];
      const id = params[0];
      const existingIdx = this.data[table].findIndex((r: any) => r.id === id);
      const row: any = { id, _raw: params };
      if (table === 'tests' && params.length >= 4) { row.kind = params[1]; row.title = params[2]; row.durationSec = params[3]; row.createdAt = params[4]; }
      else if (table === 'passages' && params.length >= 3) { row.title = params[1]; row.body = params[2]; }
      else if (table === 'sections' && params.length >= 6) { row.testId = params[1]; row.type = params[2]; row.title = params[3]; row.audioPath = params[4]; row.passageId = params[5]; }
      else if (table === 'questions' && params.length >= 7) { row.sectionId = params[1]; row.qType = params[2]; row.prompt = params[3]; row.options = params[4]; row.answer = params[5]; row.marks = params[6]; }
      else if (table === 'attempts' && params.length >= 8) { row.testId = params[1]; row.mode = params[2]; row.startedAt = params[3]; row.submittedAt = params[4]; row.rawScore = params[5]; row.band = params[6]; row.answers = params[7]; }
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
