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

export class FallbackDB {
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
      // JOIN handling: questions JOIN sections — return questions filtered by testId
      // Supports both param form (WHERE s.testId = ?) and literal form (WHERE s.testId = 'xxx')
      if (lower.includes('join') && lower.includes('sections') && lower.includes('testid')) {
        // SELECT q.* FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = ?
        let testId: string | null = params[0] ?? null;
        const litJoin = sql.match(/testid\s*=\s*['"]([^'"]+)['"]/i);
        if (litJoin) testId = litJoin[1];
        if (testId) {
          const sectionIds = (this.data['sections'] || []).filter((s: any) => s.testId === testId).map((s: any) => s.id);
          rows = (this.data['questions'] || []).filter((q: any) => sectionIds.includes(q.sectionId));
          return rows;
        }
        return rows;
      }
      // Handle WHERE col='literal' form (e.g. kind='reading', testId='reading-ieltsfever-1', id='x')
      // Collect all literal equality filters and apply them (AND semantics).
      const litFilters = [...sql.matchAll(/(\w+)\s*=\s*['"]([^'"]+)['"]/gi)];
      if (litFilters.length) {
        for (const m of litFilters) {
          const col = m[1];
          const val = m[2];
          // Only apply to known columns to avoid matching unrelated SQL fragments
          if (['kind', 'testId', 'id', 'sectionId', 'type', 'key'].includes(col)) {
            rows = rows.filter((r: any) => String(r[col] ?? r.id ?? '') === val);
          }
        }
        return rows;
      }
      if (lower.includes('where') && params.length) {
        // Support WHERE id IN (?, ?, ?) with multiple params
        if (lower.includes(' in ')) {
          const ids = params;
          rows = rows.filter((r: any) => ids.includes(r.id));
          return rows;
        }
        const id = params[0];
        rows = rows.filter((r: any) => r.id === id || r.testId === id || r.sectionId === id);
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
      else if (table === 'settings' && params.length >= 2) { row.key = params[0]; row.value = params[1]; }
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
    const del = sql.match(/delete from (\w+)/i);
    if (del) {
      const table = del[1];
      if (this.data[table]) {
        if (!lower.includes('where') || params.length === 0) {
          this.data[table] = [];
        } else {
          const p = params[0];
          if (table === 'questions') {
            const sIds = (this.data['sections'] || []).filter((s: any) => s.testId === p).map((s: any) => s.id);
            this.data[table] = this.data[table].filter(
              (r: any) => r.id !== p && r.testId !== p && r.sectionId !== p && !sIds.includes(r.sectionId)
            );
          } else {
            this.data[table] = this.data[table].filter(
              (r: any) => r.id !== p && r.testId !== p && r.sectionId !== p
            );
          }
        }
        this.save();
      }
      return { lastInsertRowid: 0, changes: 1 };
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
