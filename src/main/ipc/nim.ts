import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { chat } from '../../lib/nim/nemotron';
import { transcribe } from '../../lib/nim/parakeet';
import { synthesize } from '../../lib/nim/magpie';

function getKey(): string | null {
  try {
    // require inside function avoids mocking issues in tests and keeps safeStorage dynamic
    const { safeStorage } = require('electron');
    const vaultPath = path.join(app.getPath('userData'), 'vault.bin');
    const buf = fs.readFileSync(vaultPath);
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
}

export function registerNimIpc(): void {
  ipcMain.handle('nim:chat', async (_e: unknown, messages: unknown[]) => {
    const k = getKey();
    if (!k) throw new Error('No API key');
    return chat(k, messages);
  });

  ipcMain.handle('nim:asr', async (_e: unknown, wav: Buffer) => {
    const k = getKey();
    if (!k) throw new Error('No API key');
    return transcribe(k, wav);
  });

  ipcMain.handle('nim:tts', async (_e: unknown, text: string) => {
    const k = getKey();
    if (!k) throw new Error('No API key');
    const buf = await synthesize(k, text);
    return buf;
  });
}
