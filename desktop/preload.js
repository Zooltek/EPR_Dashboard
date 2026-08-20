const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  onOpenHelpModal: (callback) => ipcRenderer.on('open-help-modal', () => callback()),
});
