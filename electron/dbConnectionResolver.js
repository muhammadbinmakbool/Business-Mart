const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect available local SQL Server instances via Windows Registry
function getLocalSQLInstances() {
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
      let reason = 'NETWORK_ERROR';
      let details = output;
      if (output.includes('ERROR:DB_NOT_FOUND')) reason = 'DB_NOT_FOUND';
      else if (output.includes('ERROR:AUTH_FAILED')) reason = 'AUTH_FAILED';
      else if (output.includes('ERROR:INSTANCE_NOT_FOUND')) reason = 'INSTANCE_NOT_FOUND';
      
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

  const tempScriptPath = path.join(os.tmpdir(), `bm-db-fallback-${Date.now()}.js`);
  try {
    const scriptContent = `
      const { PrismaClient } = require('@prisma/client');
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
      return { success: false, reason: 'NETWORK_ERROR', error: result.stderr || 'Connection timed out or host unreachable.' };
    }
  } catch (err) {
    try { fs.unlinkSync(tempScriptPath); } catch (e) {}
    return { success: false, reason: 'NETWORK_ERROR', error: err.message };
  }
}

// Create database via system 'master' connection
function createDatabase(connectionString) {
  const dbName = getDatabaseName(connectionString);
  const masterConnectionString = connectionString.replace(/database=[^;]+/, 'database=master');
  
  console.log(`[DB Resolver] Auto-creating database: [${dbName}] ...`);
  const tempScriptPath = path.join(os.tmpdir(), `bm-db-create-${Date.now()}.js`);
  try {
    const scriptContent = `
      const { PrismaClient } = require('@prisma/client');
      async function create() {
        const prisma = new PrismaClient({
          datasources: { db: { url: ${JSON.stringify(masterConnectionString)} } }
        });
        try {
          await prisma.$executeRawUnsafe("CREATE DATABASE [${dbName}]");
          await prisma.$disconnect();
          process.exit(0);
        } catch (err) {
          console.error(err.message);
          await prisma.$disconnect();
          process.exit(1);
        }
      }
      create();
    `;
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');

    const result = spawnSync(process.execPath, [tempScriptPath], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8'
    });

    try { fs.unlinkSync(tempScriptPath); } catch (e) {}
    return result.status === 0;
  } catch (err) {
    try { fs.unlinkSync(tempScriptPath); } catch (e) {}
    console.error('[DB Resolver] Exception during CREATE DATABASE:', err.message);
    return false;
  }
}

// Run migrations and seeds programmatically
function runMigrationsAndSeed(connectionString) {
  try {
    const prismaCliPath = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js').replace('app.asar', 'app.asar.unpacked');
    const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma').replace('app.asar', 'app.asar.unpacked');
    const seedJsPath = path.join(__dirname, '..', 'prisma', 'seed.js').replace('app.asar', 'app.asar.unpacked');

    console.log('[DB Resolver] Database created successfully. Deploying schema migrations...');
    
    // 1. Run migrations deploy
    const migrationResult = spawnSync(process.execPath, [prismaCliPath, 'migrate', 'deploy', '--schema', schemaPath], {
      env: { ...process.env, DATABASE_URL: connectionString, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8'
    });
    console.log('[DB Resolver] Migrations Output:', migrationResult.stdout);

    if (migrationResult.status !== 0) {
      console.error('[DB Resolver] Migrations Failed:', migrationResult.stderr);
      return false;
    }

    // 2. Run seed JS file
    console.log('[DB Resolver] Deploy complete. Launching database seed script...');
    const seedResult = spawnSync(process.execPath, [seedJsPath], {
      env: { ...process.env, DATABASE_URL: connectionString, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8'
    });
    console.log('[DB Resolver] Seed Output:', seedResult.stdout);
    
    return seedResult.status === 0;
  } catch (err) {
    console.error('[DB Resolver] Exception during migrations & seeding:', err.message);
    return false;
  }
}

// Helper to construct highly standard, compliant Prisma SQL Server connection URLs
function buildPrismaConnectionString(server, database, trustedConnection, user, password) {
  let connectionString = '';
  // Avoid placing backslashes in URL hostnames to prevent CJS/URI specification parse errors
  if (server.includes('\\')) {
    const parts = server.split('\\');
    const host = parts[0] || '.';
    const instance = parts[1];
    connectionString = `sqlserver://${host};database=${database};instanceName=${instance}`;
  } else {
    connectionString = `sqlserver://${server};database=${database}`;
  }

  if (trustedConnection) {
    connectionString += `;integratedSecurity=true`;
  } else {
    connectionString += `;user=${user};password=${password}`;
  }
  connectionString += `;encrypt=true;trustServerCertificate=true;connectionTimeout=10;poolSize=5;`;
  return connectionString;
}

// Main Connection Resolution Loop
function resolveDatabaseConnection(configHint) {
  const database = (configHint && configHint.database) || 'business_mart';
  const trustedConnection = configHint ? configHint.trustedConnection : true;
  const user = (configHint && configHint.user) || 'sa';
  const password = (configHint && configHint.password) || '';

  const candidates = getCandidateServers(configHint);
  console.log('[DB Resolver] Strategic candidate servers:', candidates);

  let firstMissingDbCandidate = null;

  for (const server of candidates) {
    console.log(`[DB Resolver] Testing candidate natively: ${server} ...`);
    const testResult = testNativeConnection(server, database, trustedConnection, user, password);

    if (testResult.success) {
      console.log(`[DB Resolver] SUCCESS! Resolved working SQL Server instance natively: ${server}`);
      const connectionString = buildPrismaConnectionString(server, database, trustedConnection, user, password);

      return {
        success: true,
        connectionString,
        server,
        database,
        trustedConnection,
        user
      };
    } else if (testResult.reason === 'DB_NOT_FOUND') {
      console.log(`[DB Resolver] Server reachable at [${server}], but database [${database}] is missing.`);
      const connectionString = buildPrismaConnectionString(server, database, trustedConnection, user, password);

      if (!firstMissingDbCandidate) {
        firstMissingDbCandidate = {
          success: false,
          reason: 'database_missing',
          connectionString,
          server,
          database,
          trustedConnection,
          user
        };
      }
    } else {
      console.log(`[DB Resolver] Candidate [${server}] failed: Unreachable (${testResult.reason}). Details: ${testResult.error}`);
    }
  }

  // If no working database was found, but we found a server where the database is missing, return it
  if (firstMissingDbCandidate) {
    console.log(`[DB Resolver] No active database found, but detected server with missing DB: ${firstMissingDbCandidate.server}`);
    return firstMissingDbCandidate;
  }

  console.error('[DB Resolver] FAILED: All candidates exhausted. No active SQL Server resolved.');
  return null;
}

module.exports = {
  resolveDatabaseConnection,
  getLocalSQLInstances,
  createDatabase,
  runMigrationsAndSeed,
  testNativeConnection
};
