const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const { spawn } = require('child_process');
const { resolveDatabaseConnection, getLocalSQLInstances } = require('./dbConnectionResolver');

let mainWindow;
let serverProcess;
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';

// Load SQL Server Connection configuration and build Prisma DATABASE_URL
function loadDatabaseConfig() {
  const devConfigPath = path.join(__dirname, '..', 'resources', 'config.json');
  const prodConfigPath = path.join(__dirname, '..', '..', 'config.json');
  const nestedProdConfigPath = path.join(__dirname, '..', '..', 'resources', 'config.json');

  let configPath = '';
  if (fs.existsSync(prodConfigPath)) {
    configPath = prodConfigPath;
  } else if (fs.existsSync(nestedProdConfigPath)) {
    configPath = nestedProdConfigPath;
  } else if (fs.existsSync(devConfigPath)) {
    configPath = devConfigPath;
  }

  let dbConfig = {
    server: 'localhost\\SQLEXPRESS',
    database: 'business_mart',
    trustedConnection: true
  };

  if (configPath) {
    console.log(`[DB Config] Active Configuration File Found: ${path.resolve(configPath)}`);
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (parsed && parsed.db) {
        dbConfig = parsed.db;
        console.log(`[DB Config] Successfully parsed configuration details from: ${configPath}`);
      }
    } catch (err) {
      console.error(`[DB Config] Failed to parse config file: ${configPath}`, err);
    }
  } else {
    console.log('[DB Config] No config.json found in any resolved paths. Using defaults.');
  }

  // Override with environment variables if present
  const server = dbConfig.server || 'localhost';
  const database = dbConfig.database || 'business_mart';
  const user = process.env.DB_USER || dbConfig.user || 'sa';
  const password = process.env.DB_PASSWORD || dbConfig.password || 'Password123';
  const trustedConnection = dbConfig.trustedConnection;

  // Build connection string
  let host = server;
  let port = '';
  let instanceName = '';

  if (server.includes('\\')) {
    const parts = server.split('\\');
    host = parts[0];
    instanceName = parts[1];
  } else if (server.includes(':')) {
    const parts = server.split(':');
    host = parts[0];
    port = parts[1];
  }

  let connectionString = `sqlserver://${host}`;
  if (port) {
    connectionString += `:${port}`;
  }
  connectionString += `;database=${database}`;
  if (instanceName) {
    connectionString += `;instanceName=${instanceName}`;
  }

  // Handle credentials & integrated security
  if (trustedConnection) {
    connectionString += `;integratedSecurity=true`;
    console.log(`[DB Config] Mode: Windows Authentication (Integrated Security). Server: ${server}, Database: ${database}`);
  } else {
    connectionString += `;user=${user};password=${password}`;
    console.log(`[DB Config] Mode: SQL Authentication (User: ${user}). Server: ${server}, Database: ${database}`);
  }

  // Append latency, pooling and fast-fail parameters for robust production use
  connectionString += `;encrypt=true;trustServerCertificate=true;connectionTimeout=10;poolSize=5;`;

  return {
    connectionString,
    host,
    port: port || '1433', // Default SQL Server port
    password,
    configPath,
    trustedConnection
  };
}

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
function spawnStandaloneServer(connectionString) {
  // Path inside .next/standalone folder (resolves to app.asar.unpacked when packaged)
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone').replace('app.asar', 'app.asar.unpacked');
  const serverJsPath = path.join(standaloneDir, 'server.js');

  if (!fs.existsSync(serverJsPath)) {
    const errorMsg = `Next.js standalone server not found at: ${serverJsPath}. Did you run 'npm run build'?`;
    console.error(errorMsg);
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
    console.error(`[Next.js Server Error]: ${data.toString().trim()}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`[Next.js Server] Process exited with code ${code}`);
  });

  return serverProcess;
}

// Perform HTTP health checks until Next.js responds
function checkServerHealth(url, timeoutMs = 10000) {
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
        console.error(`Blocked malformed URL navigation: ${url}`, err);
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

// Save manual configuration changes back to config.json
function saveDatabaseConfig(newDbConfig) {
  const devConfigPath = path.join(__dirname, '..', 'resources', 'config.json');
  const prodConfigPath = path.join(__dirname, '..', '..', 'config.json');
  const nestedProdConfigPath = path.join(__dirname, '..', '..', 'resources', 'config.json');

  let configPath = prodConfigPath; // Default write path in production

  if (fs.existsSync(prodConfigPath)) {
    configPath = prodConfigPath;
  } else if (fs.existsSync(nestedProdConfigPath)) {
    configPath = nestedProdConfigPath;
  } else if (fs.existsSync(devConfigPath)) {
    configPath = devConfigPath;
  }

  try {
    const parentDir = path.dirname(configPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify({ db: newDbConfig }, null, 2), 'utf8');
    console.log(`[DB Config] Saved updated database config to: ${configPath}`);
    return true;
  } catch (err) {
    console.error(`[DB Config] Failed to save config to: ${configPath}`, err);
    return false;
  }
}

let resolvedDbState = null;

app.whenReady().then(async () => {
  // 1. Set up safe IPC handlers for the Recovery Screen UI
  ipcMain.handle('get-sql-instances', async () => {
    return getLocalSQLInstances();
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
    const resolved = resolveDatabaseConnection(configPayload);
    if (resolved && (resolved.success === true || resolved.reason === 'database_missing')) {
      console.log('[IPC] Manual database override validated (Active DB or Reachable Server with Missing DB). Saving configuration...');
      saveDatabaseConfig(configPayload);
      
      // Delay relaunch slightly to allow response to complete and files to flush
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 500);

      return { success: true };
    } else {
      // Analyze native connection error for highly actionable user feedback
      const { testNativeConnection } = require('./dbConnectionResolver');
      const test = testNativeConnection(
        configPayload.server,
        configPayload.database,
        configPayload.trustedConnection,
        configPayload.user,
        configPayload.password
      );

      let errorMessage = 'Could not establish connection. Please check server active status and credentials.';
      if (test.reason === 'DB_NOT_FOUND') {
        errorMessage = `SQL Server is active, but database '${configPayload.database}' does not exist on it.`;
      } else if (test.reason === 'AUTH_FAILED') {
        errorMessage = `Authentication failed: The provided SQL credentials or Windows account are not valid.`;
      } else if (test.reason === 'INSTANCE_NOT_FOUND') {
        errorMessage = `SQL Server instance '${configPayload.server}' was not found or is unreachable.`;
      } else if (test.error) {
        errorMessage = `Connection failed: ${test.error}`;
      }

      return { 
        success: false, 
        error: errorMessage
      };
    }
  });

  ipcMain.handle('create-and-bootstrap-db', async (event, connectionString) => {
    console.log('[IPC] Manual DB Bootstrap requested. Starting creation...');
    const { createDatabase, runMigrationsAndSeed } = require('./dbConnectionResolver');
    
    const dbCreated = createDatabase(connectionString);
    if (!dbCreated) {
      return { 
        success: false, 
        error: 'Could not create SQL Server database. Check that your user has CREATE DATABASE privileges or contact your system administrator.' 
      };
    }

    console.log('[IPC] Database created successfully. Running migrations and seed...');
    const bootstrapped = runMigrationsAndSeed(connectionString);
    if (!bootstrapped) {
      return { 
        success: false, 
        error: 'Database was created, but schema migrations and seeding failed. Please check SQL Server logs.' 
      };
    }

    console.log('[IPC] Database successfully bootstrapped! Relaunching application...');
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 500);

    return { success: true };
  });

  // 2. Resolve Working Database Connection dynamically
  const initialDbInfo = loadDatabaseConfig();
  const resolvedDb = resolveDatabaseConnection(initialDbInfo);
  resolvedDbState = resolvedDb;

  if (!resolvedDb || resolvedDb.success === false) {
    if (resolvedDb && resolvedDb.reason === 'database_missing') {
      console.error(`[DB Boot] Reachable SQL Server found at [${resolvedDb.server}], but database [${resolvedDb.database}] is missing. Spawning Setup UI...`);
    } else {
      console.error('[DB Boot] FAILED to resolve any working SQL Server connection. Launching Recovery Configuration UI...');
    }
    createWindow(true); // Open window in Recovery Mode
    return;
  }

  console.log(`[DB Boot] SUCCESS! Spawning standalone Next.js server with dynamic host: ${resolvedDb.server}`);

  // 3. Spawn Standalone server
  const processStarted = spawnStandaloneServer(resolvedDb.connectionString);
  if (!processStarted) {
    return;
  }

  // 4. Health check loop
  console.log('[Server Health] Starting health check polling...');
  const isHealthy = await checkServerHealth(`http://${HOST}:${PORT}/`);
  if (!isHealthy) {
    dialog.showErrorBox(
      'Server Start Timeout',
      `Next.js standalone server failed to respond within 10 seconds at http://${HOST}:${PORT}.\n\n` +
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

app.on('will-quit', () => {
  killServerProcess();
});

// Enforce cleanup on unexpected process exit
process.on('exit', () => {
  killServerProcess();
});
