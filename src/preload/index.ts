import { contextBridge, ipcRenderer } from 'electron';

export type ElectronAPI = {
  ping: () => Promise<string>;
};

export type DbAPI = {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  exec: (sql: string, params?: unknown[]) => Promise<unknown>;
  migrate: () => Promise<{ ok: boolean }>;
};

export type VaultAPI = {
  set: (key: string) => Promise<boolean>;
  get: () => Promise<string | null>;
  validate: (key: string) => Promise<boolean>;
};

export type NimAPI = {
  chat: (messages: unknown[]) => Promise<string>;
  asr: (wav: Buffer) => Promise<string>;
  tts: (text: string) => Promise<Buffer>;
};

export type ImportAPI = {
  run: (payload: unknown) => Promise<{ ok: boolean; errors?: string[] }>;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI & { openExternal: (url: string) => Promise<void> };
    db: DbAPI;
    vault: VaultAPI;
    nim: NimAPI;
    import: ImportAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
});

contextBridge.exposeInMainWorld('db', {
  query: (sql: string, params: unknown[] = []) => ipcRenderer.invoke('db:query', sql, params),
  exec: (sql: string, params: unknown[] = []) => ipcRenderer.invoke('db:exec', sql, params),
  migrate: () => ipcRenderer.invoke('db:migrate')
});

contextBridge.exposeInMainWorld('vault', {
  set: (k: string) => ipcRenderer.invoke('vault:set', k),
  get: () => ipcRenderer.invoke('vault:get'),
  validate: (k: string) => ipcRenderer.invoke('vault:validate', k)
});

contextBridge.exposeInMainWorld('nim', {
  chat: (m: unknown[]) => ipcRenderer.invoke('nim:chat', m),
  asr: (b: Buffer) => ipcRenderer.invoke('nim:asr', b),
  tts: (t: string) => ipcRenderer.invoke('nim:tts', t)
});

contextBridge.exposeInMainWorld('import', {
  run: (payload: unknown) => ipcRenderer.invoke('import:run', payload)
});
