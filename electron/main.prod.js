const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const { spawn } = require('child_process');
const { resolveDatabaseConnection, getLocalSQLInstances, runMigrationsOnly } = require('./dbConnectionResolver');
const { getWritableConfigPath, loadDatabaseConfig } = require('./dbConfig');
const { performShutdownBackup } = require('./shutdownBackup');
const { ApplicationLogger } = require('./logger');

let mainWindow;
let serverProcess;
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';

// Perform TCP pre-flight verification to SQL Server
function testDatabaseReachability(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    socket.setTimeout(timeout);

    socket.once('connect', () => {
      socket.destroy();
      if (!resolved) {
        resolved = true;
        resolve(true);
      }
    });

    socket.once('timeout', () => {
      socket.destroy();
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    socket.once('error', () => {
      socket.destroy();
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

// Perform reachability loop (3 retries, 2s delay)
async function verifyDatabaseConnectivity(host, port) {
  const maxRetries = 3;
  const delayMs = 2000;

  for (let i = 1; i <= maxRetries; i++) {
    console.log(`[DB Verify] Connection attempt ${i} of ${maxRetries} to ${host}:${port}...`);
    const isReachable = await testDatabaseReachability(host, port);
    if (isReachable) {
      console.log('[DB Verify] SQL Server is reachable!');
      return true;
    }
    if (i < maxRetries) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return false;
}

// Spawn standalone Next.js server
function spawnStandaloneServer(connectionString, provider) {
  // Path inside .next/standalone folder (resolves to app.asar.unpacked when packaged)
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone').replace('app.asar', 'app.asar.unpacked');
  const serverJsPath = path.join(standaloneDir, 'server.js');

  if (!fs.existsSync(serverJsPath)) {
    const errorMsg = `Next.js standalone server not found at: ${serverJsPath}. Did you run 'npm run build'?`;
    ApplicationLogger.error(errorMsg);
    dialog.showErrorBox('Server Not Found', errorMsg);
    app.quit();
    return null;
  }

  console.log(`[Server Spawn] Launching Next.js server: ${serverJsPath}`);

  // Inherit environment and inject database URL
  const serverEnv = {
    ...process.env,
    PORT: PORT.toString(),
    HOSTNAME: HOST,
    NODE_ENV: 'production',
    DATABASE_URL: connectionString,
    DB_PROVIDER: provider,
    USER_DATA_PATH: app.getPath('userData'),
    JWT_SECRET: process.env.JWT_SECRET || 'bm-super-secret-production-key-fallback',
    ELECTRON_RUN_AS_NODE: '1' // Force Electron binary to act as standard Node.js interpreter
  };

  // Run server.js using Electron's Node runtime
  serverProcess = spawn(process.execPath, [serverJsPath], {
    cwd: standaloneDir,
    env: serverEnv,
    stdio: 'pipe' // Pipe stdout/stderr to files or console
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Next.js Server]: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    ApplicationLogger.error(data.toString().trim(), null, '[Next Server]');
  });

  serverProcess.on('close', (code) => {
    console.log(`[Next.js Server] Process exited with code ${code}`);
  });

  return serverProcess;
}

// Perform HTTP health checks until Next.js responds
function checkServerHealth(url, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const pollInterval = 100;

    function poll() {
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
        return;
      }

      const req = http.get(url, (res) => {
        // Status code between 200 and 404 indicates the server is active and serving requests
        if (res.statusCode >= 200 && res.statusCode <= 404) {
          resolve(true);
        } else {
          setTimeout(poll, pollInterval);
        }
      });

      req.on('error', () => {
        setTimeout(poll, pollInterval);
      });

      req.end();
    }

    poll();
  });
}

function createWindow(isRecovery = false) {
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
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);

  if (isRecovery) {
    mainWindow.loadFile(path.join(__dirname, 'recovery.html'));
  } else {
    mainWindow.loadURL(`http://${HOST}:${PORT}`);

    mainWindow.webContents.on('will-navigate', (event, url) => {
      try {
        const allowedOrigin = `http://${HOST}:${PORT}`;
        const parsedUrl = new URL(url);

        if (parsedUrl.origin !== allowedOrigin) {
          event.preventDefault();
          console.warn(`Blocked external navigation to: ${url}`);
        }
      } catch (err) {
        event.preventDefault();
        ApplicationLogger.error(`Blocked malformed URL navigation: ${url}`, err);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Teardown spawned process cleanly
function killServerProcess() {
  if (serverProcess) {
    console.log('[Teardown] Killing Next.js standalone server process...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// Dynamically start application server and redirect existing setup window
async function startApplicationFlowFromRecovery(resolvedDb, dbConfig) {
  const provider = dbConfig.db.provider;
  console.log('[DB Boot] Dynamically checking migrations from recovery flow...');
  const migrationRes = runMigrationsOnly(provider, resolvedDb.database, dbConfig.db);
  if (!migrationRes.success) {
    ApplicationLogger.error(`[DB Boot] Auto-migration failed: ${migrationRes.error}`);
    dialog.showErrorBox(
      'Database Migration Failed',
      `An error occurred while automatically applying database updates:\n\n${migrationRes.error}\n\nPlease contact support if this issue persists.`
    );
    app.quit();
    return false;
  }

  // Spawn standalone Next.js server
  const processStarted = spawnStandaloneServer(resolvedDb.connectionString, provider);
  if (!processStarted) {
    return false;
  }

  // Health check loop
  console.log('[Server Health] Starting health check polling...');
  const isHealthy = await checkServerHealth(`http://${HOST}:${PORT}/`);
  if (!isHealthy) {
    dialog.showErrorBox(
      'Server Start Timeout',
      `Next.js standalone server failed to respond within 30 seconds at http://${HOST}:${PORT}.\n\n` +
      `Please contact system administrator or check logs.`
    );
    killServerProcess();
    app.quit();
    return false;
  }

  console.log('[Server Health] Next.js is healthy and online! Redirecting window...');
  if (mainWindow) {
    mainWindow.loadURL(`http://${HOST}:${PORT}`);
    
    // Remove all recovery listeners from will-navigate
    mainWindow.webContents.removeAllListeners('will-navigate');
    mainWindow.webContents.on('will-navigate', (event, url) => {
      try {
        const allowedOrigin = `http://${HOST}:${PORT}`;
        const parsedUrl = new URL(url);

        if (parsedUrl.origin !== allowedOrigin) {
          event.preventDefault();
          console.warn(`Blocked external navigation to: ${url}`);
        }
      } catch (err) {
        event.preventDefault();
        ApplicationLogger.error(`Blocked malformed URL navigation: ${url}`, err);
      }
    });
  }
  return true;
}

// Save manual configuration changes back to config.json
function saveDatabaseConfig(newDbConfig) {
  const configPath = getWritableConfigPath();
  console.log(`[DB Config] Attempting to save config.json to writable user path: ${configPath}`);
  
  try {
    const parentDir = path.dirname(configPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    let existingConfig = {};
    if (fs.existsSync(configPath)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) || {};
      } catch (e) {}
    }

    const provider = newDbConfig.provider || (existingConfig.db && existingConfig.db.provider) || 'mssql';

    const configData = {
      db: {
        provider,
        ...(provider === 'sqlite' ? {
          database: newDbConfig.database || 'business_mart.db'
        } : {
          server: newDbConfig.server,
          database: newDbConfig.database,
          trustedConnection: newDbConfig.trustedConnection,
          user: newDbConfig.user,
          password: newDbConfig.password
        })
      }
    };

    if (newDbConfig.backupDirectory !== undefined) {
      configData.backupDirectory = newDbConfig.backupDirectory;
    } else if (existingConfig.backupDirectory !== undefined) {
      configData.backupDirectory = existingConfig.backupDirectory;
    }

    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    console.log(`[DB Config] Saved updated database config to: ${configPath}`);
  } catch (err) {
    ApplicationLogger.error(`[DB Config] Failed to save config to writable path: ${configPath}`, err);
  }

  // If in development mode, also write back to the workspace resources folder so it is updated in source control
  if (!app.isPackaged) {
    const devConfigPath = path.join(__dirname, '..', 'resources', 'config.json');
    try {
      const devParentDir = path.dirname(devConfigPath);
      if (!fs.existsSync(devParentDir)) {
        fs.mkdirSync(devParentDir, { recursive: true });
      }
      
      let existingDevConfig = {};
      if (fs.existsSync(devConfigPath)) {
        try {
          existingDevConfig = JSON.parse(fs.readFileSync(devConfigPath, 'utf8')) || {};
        } catch (e) {}
      }
      
      const provider = newDbConfig.provider || (existingDevConfig.db && existingDevConfig.db.provider) || 'mssql';
      const devConfigData = {
        db: {
          provider,
          ...(provider === 'sqlite' ? {
            database: newDbConfig.database || 'business_mart.db'
          } : {
            server: newDbConfig.server,
            database: newDbConfig.database,
            trustedConnection: newDbConfig.trustedConnection,
            user: newDbConfig.user,
            password: newDbConfig.password
          })
        }
      };

      if (newDbConfig.backupDirectory !== undefined) {
        devConfigData.backupDirectory = newDbConfig.backupDirectory;
      } else if (existingDevConfig.backupDirectory !== undefined) {
        devConfigData.backupDirectory = existingDevConfig.backupDirectory;
      }

      fs.writeFileSync(devConfigPath, JSON.stringify(devConfigData, null, 2), 'utf8');
      console.log(`[DB Config] Dev mode: Also saved config back to workspace resources path: ${devConfigPath}`);
    } catch (err) {
      console.warn(`[DB Config] Dev mode: Could not write copy to workspace path: ${devConfigPath}`);
    }
  }

  return true;
}

let resolvedDbState = null;

app.whenReady().then(async () => {
  // 1. Set up safe IPC handlers for the Recovery Screen UI
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

  ipcMain.handle('get-sql-instances', async () => {
    return getLocalSQLInstances();
  });

  ipcMain.handle('get-installer-provider', async () => {
    const { getInstallerProvider } = require('./dbConfig');
    return getInstallerProvider();
  });

  ipcMain.handle('get-current-config', async () => {
    try {
      const config = loadDatabaseConfig();
      return {
        config,
        resolvedDbState
      };
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('test-and-save-config', async (event, configPayload) => {
    console.log('[IPC] Testing manual database settings override...');
    console.log(`[IPC] Target: server=${configPayload.server}, database=${configPayload.database}, trustedConnection=${configPayload.trustedConnection}`);
    
    // Bug 2 fix: Test the EXACT server the user specified — no candidate scanning.
    const { testNativeConnection } = require('./dbConnectionResolver');
    const test = testNativeConnection(
      configPayload.server,
      configPayload.database,
      configPayload.trustedConnection,
      configPayload.user,
      configPayload.password
    );

    if (test.success) {
      // Check if it's SQLite and the file does not exist, or schema check is invalid
      if (configPayload.provider === 'sqlite') {
        const { getSqliteDbPath, testSqliteSchema } = require('./dbConnectionResolver');
        const dbPath = getSqliteDbPath(configPayload.database);
        if (!fs.existsSync(dbPath) || !testSqliteSchema(dbPath).success) {
          console.log(`[IPC] SQLite database file '${configPayload.database}' is missing or schema is invalid. Transitioning to bootstrap.`);
          saveDatabaseConfig(configPayload);
          
          resolvedDbState = {
            success: false,
            mode: 'BOOTSTRAP_REQUIRED',
            server: 'SQLite',
            database: configPayload.database
          };
          return { success: true, mode: 'BOOTSTRAP_REQUIRED' };
        }
      }

      // DB exists and is accessible — save config and launch server dynamically
      console.log('[IPC] Connection fully verified. Saving configuration...');
      saveDatabaseConfig(configPayload);
      
      const { resolveDatabaseConnection } = require('./dbConnectionResolver');
      const updatedDbInfo = loadDatabaseConfig();
      const resolvedDb = resolveDatabaseConnection(updatedDbInfo);
      
      setTimeout(() => {
        startApplicationFlowFromRecovery(resolvedDb, updatedDbInfo);
      }, 50);
      return { success: true };
    } else if (test.reason === 'DB_NOT_FOUND') {
      // Server is reachable, credentials work, but DB doesn't exist yet.
      // Save config in background, but DO NOT relaunch immediately.
      // Return success with mode: 'BOOTSTRAP_REQUIRED' so the UI can show the bootstrap button instantly!
      console.log(`[IPC] Server reachable but database '${configPayload.database}' missing. Saving config and notifying UI...`);
      saveDatabaseConfig(configPayload);
      
      // Update the resolvedDbState so the next bootstrap IPC call uses the correct state
      resolvedDbState = {
        success: false,
        mode: 'BOOTSTRAP_REQUIRED',
        server: configPayload.server,
        database: configPayload.database,
        trustedConnection: configPayload.trustedConnection,
        user: configPayload.user
      };
      
      return { success: true, mode: 'BOOTSTRAP_REQUIRED' };
    } else {
      // Hard failure: auth, instance not found, or network error
      let errorMessage = 'Could not establish connection. Please check server active status and credentials.';
      if (test.reason === 'AUTH_FAILED') {
        errorMessage = `Authentication failed: The provided SQL credentials or Windows account are not valid.`;
      } else if (test.reason === 'UNREACHABLE') {
        errorMessage = `SQL Server instance '${configPayload.server}' was not found or is unreachable.`;
      } else if (test.error) {
        errorMessage = `Connection failed: ${test.error}`;
      }
      return { success: false, error: errorMessage };
    }
  });

  // Bug 3b fix: Accept raw config params, save config, create+migrate+seed, THEN relaunch.
  // No premature relaunch. No connection string parsing.
  ipcMain.handle('create-and-bootstrap-db', async (event, configParams) => {
    console.log('[IPC] Manual DB Bootstrap requested.');
    console.log(`[IPC] Bootstrap target: server=${configParams.server}, database=${configParams.database}`);
    const { createDatabase, runMigrationsAndSeed } = require('./dbConnectionResolver');
    
    // Step 1: Save the config so it persists for the final relaunch
    saveDatabaseConfig(configParams);

    // Step 2: Create the database
    const dbCreateResult = createDatabase(
      configParams.server, configParams.database,
      configParams.trustedConnection, configParams.user, configParams.password
    );
    if (!dbCreateResult.success) {
      return { 
        success: false, 
        error: dbCreateResult.error || 'Could not create SQL Server database. Check that your user has CREATE DATABASE privileges or contact your system administrator.' 
      };
    }

    // Step 3: Run migrations and seed
    console.log('[IPC] Database created successfully. Running migrations and seed...');
    const bootstrapResult = runMigrationsAndSeed(
      configParams.server, configParams.database,
      configParams.trustedConnection, configParams.user, configParams.password
    );
    if (!bootstrapResult.success) {
      return { 
        success: false, 
        error: bootstrapResult.error || 'Database was created, but schema migrations and seeding failed.' 
      };
    }

    // Step 4: Dynamically start server and load the app instead of relaunching
    console.log('[IPC] Database successfully bootstrapped! Starting standalone server...');
    const { resolveDatabaseConnection } = require('./dbConnectionResolver');
    const updatedDbInfo = loadDatabaseConfig();
    const resolvedDb = resolveDatabaseConnection(updatedDbInfo);

    setTimeout(() => {
      startApplicationFlowFromRecovery(resolvedDb, updatedDbInfo);
    }, 50);
    return { success: true };
  });

  // 2. Resolve Working Database Connection dynamically
  const initialDbInfo = loadDatabaseConfig();
  const resolvedDb = resolveDatabaseConnection(initialDbInfo);
  resolvedDbState = resolvedDb;

  if (!resolvedDb || resolvedDb.success === false) {
    if (resolvedDb && resolvedDb.mode === 'BOOTSTRAP_REQUIRED') {
      ApplicationLogger.error(`[DB Boot] Reachable SQL Server found at [${initialDbInfo.server}], but database [${initialDbInfo.database}] is missing. Spawning Setup UI...`);
    } else {
      ApplicationLogger.error('[DB Boot] FAILED to resolve any working SQL Server connection. Launching Recovery Configuration UI...');
    }
    createWindow(true); // Open window in Recovery Mode
    return;
  }

  console.log(`[DB Boot] SUCCESS! Spawning standalone Next.js server with dynamic host: ${resolvedDb.server}`);

  // Auto-run migrations on startup to apply schema updates to existing databases
  console.log('[DB Boot] Checking for pending database migrations...');
  const migrationRes = runMigrationsOnly(initialDbInfo.provider, resolvedDb.database, initialDbInfo);
  if (!migrationRes.success) {
    ApplicationLogger.error(`[DB Boot] Auto-migration failed: ${migrationRes.error}`);
    dialog.showErrorBox(
      'Database Migration Failed',
      `An error occurred while automatically applying database updates:\n\n${migrationRes.error}\n\nPlease contact support if this issue persists.`
    );
    app.quit();
    return;
  }

  // 3. Spawn Standalone server
  const processStarted = spawnStandaloneServer(resolvedDb.connectionString, initialDbInfo.provider);
  if (!processStarted) {
    return;
  }

  // 4. Health check loop
  console.log('[Server Health] Starting health check polling...');
  const isHealthy = await checkServerHealth(`http://${HOST}:${PORT}/`);
  if (!isHealthy) {
    dialog.showErrorBox(
      'Server Start Timeout',
      `Next.js standalone server failed to respond within 30 seconds at http://${HOST}:${PORT}.\n\n` +
      `Please contact system administrator or check logs.`
    );
    killServerProcess();
    app.quit();
    return;
  }

  console.log('[Server Health] Next.js is healthy and online! Spawning UI...');
  createWindow(false); // Open window in Live App Mode

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(false);
    }
  });
});

app.on('window-all-closed', () => {
  killServerProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', (event) => {
  event.preventDefault();
  
  if (serverProcess) {
    console.log('[Teardown] Awaiting Next.js shutdown to flush database writes...');
    
    // 5-second fallback watchdog: if Next.js hangs, kill it with SIGKILL and exit app
    const forceExitTimeout = setTimeout(() => {
      console.warn('[Teardown] Next.js process failed to exit within 5s. Forcing exit via SIGKILL...');
      if (serverProcess) {
        try { serverProcess.kill('SIGKILL'); } catch (e) {}
      }
      performShutdownBackup();
      app.exit(0);
    }, 5000);

    serverProcess.once('exit', () => {
      clearTimeout(forceExitTimeout);
      console.log('[Teardown] Next.js process exited. Initiating shutdown backup...');
      performShutdownBackup();
      app.exit(0);
    });
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  } else {
    performShutdownBackup();
    app.exit(0);
  }
});

// Enforce cleanup on unexpected process exit
process.on('exit', () => {
  killServerProcess();
});
