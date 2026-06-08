const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { performShutdownBackup } = require('./shutdownBackup');

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
