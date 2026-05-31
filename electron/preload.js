// Preload script for safe security sandbox.
const { contextBridge } = require('electron');

// Expose safe, minimal information if needed, currently empty for pure shell mode.
contextBridge.exposeInMainWorld('ELECTRON_ENV', {
  isElectron: true
});
