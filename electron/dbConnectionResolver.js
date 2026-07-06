const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadDatabaseConfig } = require('./dbConfig');
const { ApplicationLogger } = require('./logger');

// Helper to retrieve the active provider from env or config.json
function getActiveProvider() {
  if (process.env.DB_PROVIDER) {
    return process.env.DB_PROVIDER.toLowerCase();
  }
  try {
    const config = loadDatabaseConfig();
    return (config.provider || 'mssql').toLowerCase();
  } catch (e) {
    console.warn("[Provider] fallback to mssql due to error:", e.message);
    return 'mssql';
  }
}

// Helper to resolve SQLite file path using Electron userData
function getSqliteDbPath(databaseName) {
  // Enforce that the database name is strictly a filename, ensuring it is always placed inside userData
  const dbFile = databaseName ? path.basename(databaseName) : 'business_mart.db';
  const { app } = require('electron');
  if (!app) {
    throw new Error('[DB Resolver] Electron app context is not available. Cannot resolve SQLite path.');
  }
  const userDataPath = app.getPath('userData');
  if (!userDataPath) {
    throw new Error('[DB Resolver] Electron userData directory is not resolved. Cannot resolve SQLite path.');
  }
  return path.join(userDataPath, dbFile);
}

// Detect available local SQL Server instances via Windows Registry
function getLocalSQLInstances() {
  if (getActiveProvider() === 'sqlite') {
    return [];
  }
  const instances = [];
  try {
    const cmd = `powershell -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\Instance Names\\SQL' -ErrorAction SilentlyContinue).psobject.properties.name"`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (output) {
      output.split(/\r?\n/)
        .map(line => line.trim())
        .forEach(line => {
          if (
            line && 
            !line.startsWith('PS') && 
            line !== 'PSPath' && 
            line !== 'PSParentPath' && 
            line !== 'PSChildName' && 
            line !== 'PSDrive' && 
            line !== 'PSProvider'
          ) {
            instances.push(line);
          }
        });
    }
  } catch (err) {
    console.warn('[DB Resolver] Registry scan warning or not Windows:', err.message);
  }
  return instances;
}

// Extract database name from connection string
function getDatabaseName(connectionString) {
  const match = connectionString.match(/database=([^;]+)/);
  return match ? match[1] : 'business_mart';
}

// Generate candidate servers in strategic connection order
function getCandidateServers(configHint) {
  const candidates = [];
  
  // 1. If configured server hint exists, prioritize it
  if (configHint && configHint.server) {
    candidates.push(configHint.server);
  }

  // 2. Discover local SQL instances via registry
  const localInstances = getLocalSQLInstances();
  const baseHosts = ['localhost', '127.0.0.1', '.'];

  // Add dynamic discovered combinations
  localInstances.forEach(inst => {
    baseHosts.forEach(host => {
      candidates.push(`${host}\\${inst}`);
    });
  });

  // 3. Fallback to standard instances
  baseHosts.forEach(host => {
    candidates.push(`${host}\\SQLEXPRESS`);
    candidates.push(`${host}\\SQLEXPRESS01`);
  });

  // 4. Fallback to bare host connections
  baseHosts.forEach(host => {
    candidates.push(host);
  });

  // Deduplicate candidates while maintaining order
  return Array.from(new Set(candidates));
}

// Test connection natively using ADO.NET and PowerShell
function testNativeConnection(server, database, trustedConnection, user, password) {
  if (getActiveProvider() === 'sqlite') {
    try {
      const dbPath = getSqliteDbPath(database);
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        return { success: false, reason: 'UNREACHABLE', error: `Directory ${dbDir} does not exist.` };
      }
      if (fs.existsSync(dbPath)) {
        fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      } else {
        fs.accessSync(dbDir, fs.constants.W_OK);
      }
      return { success: true };
    } catch (err) {
      return { success: false, reason: 'UNREACHABLE', error: err.message };
    }
  }

  let adonetConnString = `Server=${server};Database=${database};Encrypt=True;TrustServerCertificate=True;Connection Timeout=3;`;
  if (trustedConnection) {
    adonetConnString += `Integrated Security=True;`;
  } else {
    adonetConnString += `User ID=${user};Password=${password};`;
  }

  const tempPsPath = path.join(os.tmpdir(), `bm-db-test-${Date.now()}.ps1`);
  try {
    const psContent = `
$connString = "${adonetConnString.replace(/"/g, '`"')}"
try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()
    
    # Explicitly check if the database exists to prevent ADO.NET fallback to master
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT db_id('${database}')"
    $dbId = $cmd.ExecuteScalar()
    if ($dbId -eq [System.DBNull]::Value -or $dbId -eq $null) {
        $conn.Close()
        Write-Output "ERROR:DB_NOT_FOUND"
        Write-Output "DETAILS: Requested database '${database}' does not exist on this SQL Server instance."
        exit 1
    }
    
    $conn.Close()
    Write-Output "SUCCESS"
    exit 0
} catch {
    $msg = $_.Exception.Message
    if ($_.Exception.InnerException) {
        $msg += " " + $_.Exception.InnerException.Message
    }
    
    if ($msg -like "*Cannot open database*" -or $msg -like "*database*does not exist*") {
        Write-Output "ERROR:DB_NOT_FOUND"
    } elseif ($msg -like "*Login failed*") {
        Write-Output "ERROR:AUTH_FAILED"
    } elseif ($msg -like "*network-related*" -or $msg -like "*instance-specific*" -or $msg -like "*provider:*") {
        Write-Output "ERROR:INSTANCE_NOT_FOUND"
    } else {
        Write-Output "ERROR:NETWORK_ERROR"
    }
    Write-Output "DETAILS: $msg"
    exit 1
}
`;
    fs.writeFileSync(tempPsPath, psContent, 'utf8');

    const result = spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', tempPsPath], {
      encoding: 'utf8'
    });

    try { fs.unlinkSync(tempPsPath); } catch (e) {}

    const output = result.stdout ? result.stdout.trim() : '';
    const hasStructuredError = output.includes('ERROR:DB_NOT_FOUND') || 
                               output.includes('ERROR:AUTH_FAILED') || 
                               output.includes('ERROR:INSTANCE_NOT_FOUND') ||
                               output.includes('ERROR:NETWORK_ERROR');

    // Safe fallback if PowerShell is blocked, restricted, or not available
    if (result.status !== 0 && !hasStructuredError) {
      console.warn('[DB Resolver] Native PowerShell check blocked or unsupported. Falling back to Prisma health check...');
      return testPrismaFallback(server, database, trustedConnection, user, password);
    }

    if (result.status === 0 && output.includes('SUCCESS')) {
      return { success: true };
    } else {
      let reason = 'UNREACHABLE';
      let details = output;
      if (output.includes('ERROR:DB_NOT_FOUND')) reason = 'DB_NOT_FOUND';
      else if (output.includes('ERROR:AUTH_FAILED')) reason = 'AUTH_FAILED';
      
      const detailsMatch = output.match(/DETAILS:\s*(.*)/s);
      if (detailsMatch) {
        details = detailsMatch[1].trim();
      }

      return { success: false, reason, error: details };
    }
  } catch (err) {
    try { fs.unlinkSync(tempPsPath); } catch (e) {}
    console.warn('[DB Resolver] Exception running native PowerShell check. Falling back to Prisma health check...');
    return testPrismaFallback(server, database, trustedConnection, user, password);
  }
}

// Standalone Prisma health check fallback if PowerShell is blocked/restricted
function testPrismaFallback(server, database, trustedConnection, user, password) {
  let connectionString = `sqlserver://${server};database=${database}`;
  if (trustedConnection) {
    connectionString += `;integratedSecurity=true`;
  } else {
    connectionString += `;user=${user};password=${password}`;
  }
  connectionString += `;encrypt=true;trustServerCertificate=true;connectionTimeout=5;poolSize=1;`;

  const clientPath = path.join(__dirname, '..', 'prisma', 'client').replace('app.asar', 'app.asar.unpacked').replace(/\\/g, '\\\\');
  const tempScriptPath = path.join(os.tmpdir(), `bm-db-fallback-${Date.now()}.js`);
  try {
    const scriptContent = `
      const { PrismaClient } = require('${clientPath}');
      async function test() {
        const prisma = new PrismaClient({
          datasources: { db: { url: ${JSON.stringify(connectionString)} } }
        });
        try {
          await prisma.$queryRaw\`SELECT 1 as [test]\`;
          await prisma.$disconnect();
          process.exit(0);
        } catch (err) {
          const errMsg = err.message || '';
          console.error(errMsg);
          await prisma.$disconnect();
          if (
            errMsg.includes('does not exist') || 
            (errMsg.includes('database') && errMsg.includes('exist')) ||
            errMsg.includes('P2010')
          ) {
            process.exit(2); // Database Missing
          } else if (errMsg.includes('Authentication failed') || errMsg.includes('credentials') || errMsg.includes('P2015')) {
            process.exit(3); // Auth Failed
          }
          process.exit(1);
        }
      }
      test();
    `;
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');

    const result = spawnSync(process.execPath, [tempScriptPath], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8'
    });

    try { fs.unlinkSync(tempScriptPath); } catch (e) {}

    if (result.status === 0) {
      return { success: true };
    } else if (result.status === 2) {
      return { success: false, reason: 'DB_NOT_FOUND', error: result.stderr || 'Database does not exist.' };
    } else if (result.status === 3) {
      return { success: false, reason: 'AUTH_FAILED', error: result.stderr || 'Authentication failed.' };
    } else {
      return { success: false, reason: 'UNREACHABLE', error: result.stderr || 'Connection timed out or host unreachable.' };
    }
  } catch (err) {
    try { fs.unlinkSync(tempScriptPath); } catch (e) {}
    return { success: false, reason: 'UNREACHABLE', error: err.message };
  }
}

// Create database via system 'master' connection
// Accepts raw config params to build connection natively via ADO.NET and PowerShell.
// Returns { success: boolean, error?: string }
function createDatabase(server, database, trustedConnection, user, password) {
  if (getActiveProvider() === 'sqlite') {
    console.log(`[DB Resolver] Auto-creating SQLite database file [${database}]...`);
    try {
      const dbPath = getSqliteDbPath(database);
      if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, '', 'utf8');
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  console.log(`[DB Resolver] Auto-creating database [${database}] on server [${server}] natively via ADO.NET PowerShell...`);

  let adonetConnString = `Server=${server};Database=master;Encrypt=True;TrustServerCertificate=True;Connection Timeout=10;`;
  if (trustedConnection) {
    adonetConnString += `Integrated Security=True;`;
  } else {
    adonetConnString += `User ID=${user};Password=${password};`;
  }

  const tempPsPath = path.join(os.tmpdir(), `bm-db-create-${Date.now()}.ps1`);
  try {
    const psContent = `
$connString = "${adonetConnString.replace(/"/g, '`"')}"
try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()
    
    # 1. Check if database already registered in SQL Server catalog
    $cmdCheck = $conn.CreateCommand()
    $cmdCheck.CommandText = "SELECT database_id FROM sys.databases WHERE name = '${database}'"
    $exists = $cmdCheck.ExecuteScalar()
    
    if ($exists -ne $null) {
        $conn.Close()
        Write-Output "SUCCESS (ALREADY_EXISTS)"
        exit 0
    }

    # 2. Get default data path from master database file location
    $cmdPath = $conn.CreateCommand()
    $cmdPath.CommandText = "SELECT SUBSTRING(physical_name, 1, CHARINDEX('master.mdf', LOWER(physical_name)) - 1) FROM sys.master_files WHERE database_id = 1 AND file_id = 1"
    $dataPath = $cmdPath.ExecuteScalar()

    if ($dataPath -eq $null -or $dataPath -eq "") {
        $dataPath = "C:\\Program Files\\Microsoft SQL Server\\MSSQL16.SQLEXPRESS\\MSSQL\\DATA\\"
    }

    $mdfPath = Join-Path $dataPath "${database}.mdf"

    # 3. Check if physical files exist on disk
    $mdfExists = Test-Path $mdfPath

    if ($mdfExists) {
        Write-Output "INFO: Orphaned physical database files found at $mdfPath. Attempting to attach..."
        try {
            $cmdAttach = $conn.CreateCommand()
            $cmdAttach.CommandText = "CREATE DATABASE [${database}] ON (FILENAME = '$mdfPath') FOR ATTACH"
            $cmdAttach.ExecuteNonQuery()
            $conn.Close()
            Write-Output "SUCCESS (ATTACHED)"
            exit 0
        } catch {
            # Fallback to rebuild log if log file is missing or mismatched
            try {
                $cmdAttachRebuild = $conn.CreateCommand()
                $cmdAttachRebuild.CommandText = "CREATE DATABASE [${database}] ON (FILENAME = '$mdfPath') FOR ATTACH_REBUILD_LOG"
                $cmdAttachRebuild.ExecuteNonQuery()
                $conn.Close()
                Write-Output "SUCCESS (ATTACHED_REBUILD)"
                exit 0
            } catch {
                $attachErr = $_.Exception.Message
                Write-Output "ERROR: Orphaned database files exist at $mdfPath, but attach failed: $attachErr"
                exit 1
            }
        }
    } else {
        # 4. Standard clean database creation
        $cmdCreate = $conn.CreateCommand()
        $cmdCreate.CommandText = "CREATE DATABASE [${database}]"
        $cmdCreate.ExecuteNonQuery()
        $conn.Close()
        Write-Output "SUCCESS"
        exit 0
    }
} catch {
    $msg = $_.Exception.Message
    if ($_.Exception.InnerException) {
        $msg += " " + $_.Exception.InnerException.Message
    }
    Write-Output "ERROR: $msg"
    exit 1
}
`;
    fs.writeFileSync(tempPsPath, psContent, 'utf8');

    const result = spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', tempPsPath], {
      encoding: 'utf8'
    });

    try { fs.unlinkSync(tempPsPath); } catch (e) {}

    const output = result.stdout ? result.stdout.trim() : '';
    console.log('[DB Resolver] Native Create DB output:', output);
    if (result.stderr) console.error('[DB Resolver] Native Create DB stderr:', result.stderr);

    if (result.status === 0 && output.includes('SUCCESS')) {
      console.log(`[DB Resolver] Database [${database}] created successfully natively.`);
      return { success: true };
    } else {
      let errDetail = output;
      if (result.stderr) errDetail += '\n' + result.stderr;
      ApplicationLogger.error(`[DB Resolver] Native database creation failed: ${errDetail}`);
      return { success: false, error: errDetail };
    }
  } catch (err) {
    try { fs.unlinkSync(tempPsPath); } catch (e) {}
    ApplicationLogger.error('[DB Resolver] Exception during native CREATE DATABASE:', err);
    return { success: false, error: err.message };
  }
}

// Run migrations and seeds programmatically
// Accepts raw config params to build connection strings internally.
// Returns { success: boolean, error?: string }
function runMigrationsAndSeed(server, database, trustedConnection, user, password) {
  const provider = getActiveProvider();
  const configHint = { server, trustedConnection, user, password };

  console.log(`[DB Resolver] Running migrations for ${provider} database [${database}]...`);
  const migrationRes = runMigrationsOnly(provider, database, configHint);
  if (!migrationRes.success) {
    return migrationRes;
  }

  // Run seed JS file
  let connectionString;
  if (provider === 'sqlite') {
    const dbPath = getSqliteDbPath(database);
    connectionString = `file:${dbPath}`;
  } else {
    connectionString = buildPrismaConnectionString(server, database, trustedConnection, user, password);
  }

  try {
    const seedJsPath = path.join(__dirname, '..', 'prisma', 'seed.js').replace('app.asar', 'app.asar.unpacked');
    console.log('[DB Resolver] Deploy complete. Launching database seed script...');
    
    const seedResult = spawnSync(process.execPath, [seedJsPath], {
      env: { 
        ...process.env, 
        DATABASE_URL: connectionString, 
        ELECTRON_RUN_AS_NODE: '1',
        NODE_PATH: path.join(__dirname, '..', 'node_modules')
      },
      encoding: 'utf8'
    });
    
    const seedStdout = seedResult.stdout || '';
    const seedStderr = seedResult.stderr || '';
    console.log('[DB Resolver] Seed Output:', seedStdout);
    
    if (seedResult.status !== 0) {
      ApplicationLogger.error('[DB Resolver] Seeding Failed:', seedStderr);
      return {
        success: false,
        error: `Database created and migrated successfully, but seeding failed (exit code ${seedResult.status}).\n\nStderr:\n${seedStderr}\n\nStdout:\n${seedStdout}`
      };
    }
    
    return { success: true };
  } catch (err) {
    ApplicationLogger.error('[DB Resolver] Exception during seeding:', err);
    return {
      success: false,
      error: `Exception during seeding: ${err.message}`
    };
  }
}

// Run only migrations programmatically
function runMigrationsOnly(provider, database, configHint) {
  let connectionString;
  if (provider === 'sqlite') {
    const dbPath = getSqliteDbPath(database);
    connectionString = `file:${dbPath}`;
  } else {
    const server = configHint.server;
    const trustedConnection = configHint.trustedConnection === true;
    const user = configHint.user || '';
    const password = configHint.password || '';
    connectionString = buildPrismaConnectionString(server, database, trustedConnection, user, password);
  }

  try {
    const prismaCliPath = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js').replace('app.asar', 'app.asar.unpacked');
    const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma').replace('app.asar', 'app.asar.unpacked');

    console.log(`[DB Resolver] Auto-deploying database migrations for ${provider}...`);
    
    const migrationResult = spawnSync(process.execPath, [prismaCliPath, 'migrate', 'deploy', '--schema', schemaPath], {
      env: { 
        ...process.env, 
        DATABASE_URL: connectionString, 
        ELECTRON_RUN_AS_NODE: '1',
        NODE_PATH: path.join(__dirname, '..', 'node_modules')
      },
      encoding: 'utf8'
    });
    
    const migrationStdout = migrationResult.stdout || '';
    const migrationStderr = migrationResult.stderr || '';
    console.log('[DB Resolver] Auto-migrations Output:', migrationStdout);

    if (migrationResult.status !== 0) {
      ApplicationLogger.error('[DB Resolver] Auto-migrations Failed:', migrationStderr);
      return {
        success: false,
        error: `Auto-migrations failed (exit code ${migrationResult.status}).\n\nStderr:\n${migrationStderr}\n\nStdout:\n${migrationStdout}`
      };
    }
    
    console.log('[DB Resolver] Auto-migration successfully completed.');
    return { success: true };
  } catch (err) {
    ApplicationLogger.error('[DB Resolver] Exception during auto-migration:', err);
    return { success: false, error: err.message };
  }
}

// Helper to construct highly standard, compliant Prisma SQL Server connection URLs
function buildPrismaConnectionString(server, database, trustedConnection, user, password) {
  let host = server;
  let instance = '';

  // Avoid placing backslashes in URL hostnames to prevent CJS/URI specification parse errors
  if (server.includes('\\')) {
    const parts = server.split('\\');
    host = parts[0] || 'localhost';
    instance = parts[1];
  }

  // Normalize host name dot to localhost (Rust driver does not support dot as hostname)
  if (host === '.' || host === '127.0.0.1') {
    host = 'localhost';
  }

  let connectionString = `sqlserver://${host};database=${database}`;
  if (instance) {
    connectionString += `;instanceName=${instance}`;
  }

  if (trustedConnection) {
    connectionString += `;integratedSecurity=true`;
  } else {
    connectionString += `;user=${user};password=${password}`;
  }
  connectionString += `;encrypt=true;trustServerCertificate=true;connectionTimeout=10;poolSize=5;`;
  return connectionString;
}

// Run a quick schema verification query on SQLite User table to verify schema integrity
function testSqliteSchema(dbPath) {
  const clientPath = path.join(__dirname, '..', 'prisma', 'client').replace('app.asar', 'app.asar.unpacked').replace(/\\/g, '\\\\');
  const tempScriptPath = path.join(os.tmpdir(), `bm-sqlite-check-${Date.now()}.js`);
  try {
    const scriptContent = `
      const { PrismaClient } = require('${clientPath}');
      async function test() {
        const prisma = new PrismaClient({
          datasources: { db: { url: 'file:${dbPath.replace(/\\/g, '\\\\')}' } }
        });
        try {
          // Verify that user tables are migrated and present in sqlite_master
          const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%';");
          await prisma.$disconnect();
          if (!tables || tables.length === 0) {
            process.exit(2); // Schema/Table Missing
          }
          process.exit(0);
        } catch (err) {
          const errMsg = err.message || '';
          console.error(errMsg);
          await prisma.$disconnect();
          process.exit(1); // Other connection/corruption issue
        }
      }
      test();
    `;
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');

    const result = spawnSync(process.execPath, [tempScriptPath], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8'
    });

    try { fs.unlinkSync(tempScriptPath); } catch (e) {}

    if (result.status === 0) {
      return { success: true };
    } else if (result.status === 2) {
      return { success: false, reason: 'SCHEMA_MISSING', error: result.stderr || 'User table missing.' };
    } else {
      return { success: false, reason: 'CORRUPTED', error: result.stderr || 'Database corrupted or inaccessible.' };
    }
  } catch (err) {
    try { fs.unlinkSync(tempScriptPath); } catch (e) {}
    return { success: false, reason: 'CORRUPTED', error: err.message };
  }
}

// Main Connection Resolution Loop (Simple Try -> Success/Fail Flow)
function resolveDatabaseConnection(configHint) {
  const provider = getActiveProvider();
  if (provider === 'sqlite') {
    const database = configHint ? configHint.database || 'business_mart.db' : 'business_mart.db';
    const dbPath = getSqliteDbPath(database);
    const connectionString = `file:${dbPath}`;
    console.log(`[DB Resolver] Strategic Connection Try (SQLite): Connection string [${connectionString}]`);
    
    if (fs.existsSync(dbPath)) {
      try {
        fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
        
        // Enforce DB_READY = file exists + schema validated
        const schemaTest = testSqliteSchema(dbPath);
        if (schemaTest.success) {
          console.log(`[DB Resolver] SUCCESS! SQLite file and schema validated at: ${dbPath}`);
          return {
            success: true,
            mode: 'SUCCESS',
            connectionString,
            server: 'SQLite',
            database
          };
        } else {
          console.warn(`[DB Resolver] SQLite file exists at [${dbPath}], but schema verification failed: ${schemaTest.reason}. Error: ${schemaTest.error}`);
          return {
            success: false,
            mode: 'BOOTSTRAP_REQUIRED',
            message: `SQLite database schema is missing or invalid. Re-running migrations and seeds is required.`,
            connectionString,
            server: 'SQLite',
            database
          };
        }
      } catch (err) {
        ApplicationLogger.error('[DB Resolver] SQLite file permission error:', err);
        return {
          success: false,
          mode: 'UNREACHABLE',
          message: `Unable to access SQLite database file at ${dbPath}.`,
          debugError: err.message
        };
      }
    } else {
      console.log(`[DB Resolver] BOOTSTRAP REQUIRED: SQLite file does not exist at: ${dbPath}`);
      return {
        success: false,
        mode: 'BOOTSTRAP_REQUIRED',
        message: `SQLite database file was not found. System needs to run migrations and seed data.`,
        connectionString,
        server: 'SQLite',
        database
      };
    }
  }

  if (!configHint || !configHint.database || !configHint.server) {
    ApplicationLogger.error('[DB Resolver] FAILED: Strict config check failed. Missing server or database in configuration parameters.');
    return { 
      success: false, 
      mode: 'CONFIG_ERROR',
      message: 'Database configuration is invalid or missing required properties.',
      debugError: 'configHint object was empty or missing server/database fields.'
    };
  }

  const database = configHint.database;
  const server = configHint.server;
  const trustedConnection = configHint.trustedConnection === true;
  const user = configHint.user || '';
  const password = configHint.password || '';

  console.log(`[DB Resolver] Strategic Connection Try: Target Server [${server}], Database [${database}] ...`);

  // Try the configured server natively
  const testResult = testNativeConnection(server, database, trustedConnection, user, password);

  if (testResult.success) {
    console.log(`[DB Resolver] SUCCESS! Resolved working SQL Server instance: ${server}`);
    const connectionString = buildPrismaConnectionString(server, database, trustedConnection, user, password);

    return {
      success: true,
      mode: 'SUCCESS',
      connectionString,
      server,
      database
    };
  } else if (testResult.reason === 'DB_NOT_FOUND') {
    console.log(`[DB Resolver] Server reachable at [${server}], but database [${database}] is missing.`);

    return {
      success: false,
      mode: 'BOOTSTRAP_REQUIRED',
      message: `Database '${database}' was not found on server '${server}'.`,
      debugError: testResult.error
    };
  } else {
    // Standardized modes: 'UNREACHABLE'
    const mode = 'UNREACHABLE';
    const message = testResult.reason === 'AUTH_FAILED' 
      ? 'Authentication failed. Please verify your username and password.'
      : 'Cannot connect to SQL Server instance. Ensure the host is online and TCP/IP is enabled.';

    ApplicationLogger.error(`[DB Resolver] Connection failed: ${mode} (${testResult.reason}). Details: ${testResult.error}`);
    return {
      success: false,
      mode,
      message,
      debugError: testResult.error
    };
  }
}

module.exports = {
  resolveDatabaseConnection,
  getLocalSQLInstances,
  createDatabase,
  runMigrationsAndSeed,
  testNativeConnection,
  runMigrationsOnly,
  getSqliteDbPath,
  testSqliteSchema
};
