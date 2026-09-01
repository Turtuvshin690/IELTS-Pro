import { autoUpdater } from 'electron-updater';

export function checkUpdates(): void {
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.warn('[updater] check failed:', err);
  }
}
