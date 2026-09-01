import { ipcMain, app } from 'electron';
import { getDb, migrate } from '../../lib/db/client';
import { importTests } from '../../lib/import/importer';
import { validateImport } from '../../lib/import/validator';

let db: ReturnType<typeof getDb> | null = null;

export function registerDbIpc(): void {
  const userData = app.getPath('userData');
  const instance = getDb(userData);
  db = instance;

  ipcMain.handle('db:query', (_event, sql: string, params: unknown[] = []) => {
    return instance.prepare(sql).all(...(params as unknown[]));
  });

  ipcMain.handle('db:exec', (_event, sql: string, params: unknown[] = []) => {
    return instance.prepare(sql).run(...(params as unknown[]));
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
