import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerDbIpc } from './ipc/db';
import { registerVaultIpc } from './ipc/vault';
import { registerNimIpc } from './ipc/nim';
import { checkUpdates } from './updater';

process.env.ELECTRON_DISABLE_CRASH_REPORTER = '1';
app.commandLine.appendSwitch('disable-crash-reporter');
app.commandLine.appendSwitch('disable-features', 'Crashpad');

const logFile = () => {
  try { return path.join(app.getPath('userData'), 'main.log'); } catch { return path.join(process.cwd(), 'main.log'); }
};
function fileLog(...a: any[]) {
  const line = new Date().toISOString() + ' ' + a.map(v => String(v)).join(' ') + '\n';
  try { fs.appendFileSync(logFile(), line); } catch {}
  // also console
  // eslint-disable-next-line no-console
  console.log(...a);
}
process.on('uncaughtException', (e) => {
  fileLog('uncaughtException', (e as any)?.stack || String(e));
  try { dialog.showErrorBox('IELTS Pro crash', String((e as any)?.stack || e)); } catch {}
});
process.on('unhandledRejection', (e: any) => {
  fileLog('unhandledRejection', e?.stack || String(e));
});

let win: BrowserWindow | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle('ping', () => 'pong');
ipcMain.handle('shell:openExternal', (_e, url: string) => {
  const { shell } = require('electron');
  // allow only http/https to official IELTS domains + general web for resources
  try { const u = new URL(url); if (!['https:', 'http:'].includes(u.protocol)) throw new Error('blocked'); } catch { throw new Error('Invalid URL'); }
  return shell.openExternal(url);
});

app.whenReady().then(() => {
  fileLog('app.whenReady userData', app.getPath('userData'), 'version', app.getVersion());
  try { registerDbIpc(); fileLog('registerDbIpc ok'); } catch (e: any) { fileLog('registerDbIpc FAIL', e?.stack || e); dialog.showErrorBox('DB init fail', String(e?.stack || e)); }
  try { registerVaultIpc(); fileLog('registerVaultIpc ok'); } catch (e: any) { fileLog('registerVaultIpc FAIL', e?.stack || e); }
  try { registerNimIpc(); fileLog('registerNimIpc ok'); } catch (e: any) { fileLog('registerNimIpc FAIL', e?.stack || e); }
  try { createWindow(); fileLog('createWindow ok'); } catch (e: any) { fileLog('createWindow FAIL', e?.stack || e); dialog.showErrorBox('Window fail', String(e?.stack || e)); }
  try { checkUpdates(); } catch (e: any) { fileLog('checkUpdates FAIL', e?.stack || e); }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
