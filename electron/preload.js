// Preload script for safe security sandbox.
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, minimal information if needed
contextBridge.exposeInMainWorld('ELECTRON_ENV', {
  isElectron: true,
  getInstances: () => ipcRenderer.invoke('get-sql-instances'),
  getConfig: () => ipcRenderer.invoke('get-current-config'),
  testAndSaveConfig: (config) => ipcRenderer.invoke('test-and-save-config', config),
  createAndBootstrapDb: (connectionString) => ipcRenderer.invoke('create-and-bootstrap-db', connectionString)
});
