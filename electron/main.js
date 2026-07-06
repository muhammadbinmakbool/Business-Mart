const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { performShutdownBackup } = require('./shutdownBackup');
const { ApplicationLogger } = require('./logger');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Business Mart',
    // ERP desktop styling
    autoHideMenuBar: true,
  });

  // Remove the default menu bar to make it feel like a real desktop ERP application
  Menu.setApplicationMenu(null);

  // Load target URL (in dev it's http://localhost:3000)
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  mainWindow.loadURL(startUrl);

  // Security: Prevent navigation away from the app domain
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const allowedOrigin = new URL(startUrl).origin;
      const parsedUrl = new URL(url);

      if (parsedUrl.origin !== allowedOrigin) {
        event.preventDefault();
        console.warn(`Blocked external navigation to: ${url}`);
      }
    } catch (err) {
      event.preventDefault();
      console.error(`Blocked malformed URL navigation: ${url}`, err);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ipcMain.handle('select-directory', async (event, defaultPath) => {
    const options = {
      properties: ['openDirectory', 'createDirectory']
    };
    if (defaultPath && fs.existsSync(defaultPath)) {
      options.defaultPath = defaultPath;
    }
    const result = await dialog.showOpenDialog(mainWindow, options);
    if (result.canceled) {
      return null;
    }
    return result.filePaths[0];
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  performShutdownBackup();
});

// Global Exception and Rejection Handlers
process.on('uncaughtException', (error) => {
  ApplicationLogger.error(error, null, '[Electron Main Dev Uncaught]');
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  ApplicationLogger.error(error, { promise }, '[Electron Main Dev Unhandled Rejection]');
});
