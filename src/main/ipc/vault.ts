import { ipcMain, safeStorage, app } from 'electron';
import fs from 'fs';
import path from 'path';

const KEY_FILE = (): string => path.join(app.getPath('userData'), 'vault.bin');

export function encryptKey(k: string): Buffer {
  return safeStorage.encryptString(k);
}

export function decryptKey(b: Buffer): string {
  return safeStorage.decryptString(b);
}

export async function validateKey(key: string): Promise<boolean> {
  const r = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` }
  });
  return r.ok;
}

export function registerVaultIpc(): void {
  ipcMain.handle('vault:set', (_e: unknown, key: string) => {
    const enc = encryptKey(key);
    fs.writeFileSync(KEY_FILE(), enc, { mode: 0o600 });
    return true;
  });

  ipcMain.handle('vault:get', () => {
    if (!fs.existsSync(KEY_FILE())) return null;
    return decryptKey(fs.readFileSync(KEY_FILE()));
  });

  ipcMain.handle('vault:validate', (_e: unknown, key: string) => validateKey(key));
}
