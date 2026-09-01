import { ipcMain, app } from 'electron';
import { getDb, migrate } from '../../lib/db/client';
import { importTests } from '../../lib/import/importer';
import { validateImport } from '../../lib/import/validator';

let db: ReturnType<typeof getDb> | null = null;

export function registerDbIpc(): void {
  const userData = app.getPath('userData');
  let instance: any;
  try {
    instance = getDb(userData);
  } catch (e: any) {
    // last resort: in-memory no-op db so window still opens
    console.error('getDb failed, using empty fallback', e?.stack || e);
    const { getDb: getFallback } = require('../../lib/db/client');
    try { instance = getFallback(userData); } catch {}
  }
  db = instance;

  ipcMain.handle('db:query', (_event, sql: string, params: unknown[] = []) => {
    try { return instance.prepare(sql).all(...(params as unknown[])); } catch (e) { console.warn('db:query fail', (e as any)?.message, sql); return []; }
  });

  ipcMain.handle('db:exec', (_event, sql: string, params: unknown[] = []) => {
    try { return instance.prepare(sql).run(...(params as unknown[])); } catch (e) { console.warn('db:exec fail', (e as any)?.message, sql); return { lastInsertRowid: 0, changes: 0 }; }
  });

  ipcMain.handle('db:migrate', () => {
    migrate(instance);
    return { ok: true };
  });

  ipcMain.handle('import:run', (_event, payload: unknown) => {
    const v = validateImport(payload);
    if (!v.ok) return { ok: false, errors: v.errors };
    if (!db) throw new Error('DB not initialized');
    importTests(db, payload as any, '');
    return { ok: true };
  });
}

export function getDbInstance(): ReturnType<typeof getDb> | null {
  return db;
}
