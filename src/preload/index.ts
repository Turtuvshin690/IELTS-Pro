import { contextBridge, ipcRenderer } from 'electron';

export type ElectronAPI = {
  ping: () => Promise<string>;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping')
});
