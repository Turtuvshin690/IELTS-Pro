import { ipcMain, app } from 'electron';
import { getDb, migrate } from '../../lib/db/client';

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
}

export function getDbInstance(): ReturnType<typeof getDb> | null {
  return db;
}
