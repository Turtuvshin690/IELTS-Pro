import { contextBridge, ipcRenderer } from 'electron';

export type ElectronAPI = {
  ping: () => Promise<string>;
};

export type DbAPI = {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  exec: (sql: string, params?: unknown[]) => Promise<unknown>;
  migrate: () => Promise<{ ok: boolean }>;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    db: DbAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping')
});

contextBridge.exposeInMainWorld('db', {
  query: (sql: string, params: unknown[] = []) => ipcRenderer.invoke('db:query', sql, params),
  exec: (sql: string, params: unknown[] = []) => ipcRenderer.invoke('db:exec', sql, params),
  migrate: () => ipcRenderer.invoke('db:migrate')
});
