const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';

// Load SQL Server Connection configuration and build Prisma DATABASE_URL
function loadDatabaseConfig() {
  const devConfigPath = path.join(__dirname, '..', 'resources', 'config.json');
  const prodConfigPath = path.join(__dirname, '..', '..', 'config.json');

  let configPath = '';
  if (fs.existsSync(prodConfigPath)) {
    configPath = prodConfigPath;
  } else if (fs.existsSync(devConfigPath)) {
    configPath = devConfigPath;
  }

  let dbConfig = {
    server: 'localhost',
    database: 'business_mart',
    trustedConnection: true
  };

  if (configPath) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (parsed && parsed.db) {
        dbConfig = parsed.db;
        console.log(`[DB Config] Loaded configuration from: ${configPath}`);
      }
    } catch (err) {
      console.error(`[DB Config] Failed to parse config file: ${configPath}`, err);
    }
  } else {
    console.log('[DB Config] No config.json found. Using default parameters.');
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

  // Handle credentials
  if (!trustedConnection) {
    connectionString += `;user=${user};password=${password}`;
  }

  // Append latency, pooling and fast-fail parameters for robust production use
  connectionString += `;encrypt=true;trustServerCertificate=true;connectionTimeout=10;poolSize=5;`;

  return {
    connectionString,
    host,
    port: port || '1433' // Default SQL Server port
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
  // Path inside .next/standalone folder
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
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
    shell: true, // Use shell to correctly handle executable paths with spaces on Windows
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
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);

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

app.whenReady().then(async () => {
  const dbInfo = loadDatabaseConfig();

  // 1. Verify SQL Server Connectivity
  const isDbConnected = await verifyDatabaseConnectivity(dbInfo.host, parseInt(dbInfo.port));
  if (!isDbConnected) {
    dialog.showErrorBox(
      'Database Connection Failed',
      `Could not establish a connection to SQL Server at ${dbInfo.host}:${dbInfo.port}.\n\n` +
      `Please ensure:\n` +
      `1. SQL Server database service is running locally or at the specified IP address.\n` +
      `2. Your database configuration in resources/config.json is correct.\n` +
      `3. Firewall rules allow traffic on port ${dbInfo.port}.`
    );
    app.quit();
    return;
  }

  // 2. Spawn Standalone server
  const processStarted = spawnStandaloneServer(dbInfo.connectionString);
  if (!processStarted) {
    return;
  }

  // 3. Health check loop
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
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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
