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

// Test connectivity of a connection string using short-lived node child process
function testPrismaConnection(connectionString) {
  const tempScriptPath = path.join(os.tmpdir(), `bm-db-test-${Date.now()}.js`);
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
            process.exit(2); // Specific exit code for Database Missing but Server Active
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
      return { success: false, reason: 'database_missing' };
    } else {
      return { success: false, reason: 'server_unreachable', error: result.stderr };
    }
  } catch (err) {
    try { fs.unlinkSync(tempScriptPath); } catch (e) {}
    return { success: false, reason: 'script_failure', error: err.message };
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
    let connectionString = `sqlserver://${server};database=${database}`;
    
    // Inject dynamic connection string parameters
    if (trustedConnection) {
      connectionString += `;integratedSecurity=true`;
    } else {
      connectionString += `;user=${user};password=${password}`;
    }
    connectionString += `;encrypt=true;trustServerCertificate=true;connectionTimeout=10;poolSize=5;`;

    console.log(`[DB Resolver] Testing candidate: ${server} ...`);
    const testResult = testPrismaConnection(connectionString);

    if (testResult.success) {
      console.log(`[DB Resolver] SUCCESS! Resolved working SQL Server instance: ${server}`);
      return {
        success: true,
        connectionString,
        server,
        database,
        trustedConnection,
        user
      };
    } else if (testResult.reason === 'database_missing') {
      console.log(`[DB Resolver] Server reachable at [${server}], but database [${database}] is missing.`);
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
      console.log(`[DB Resolver] Candidate [${server}] failed: Unreachable.`);
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
  runMigrationsAndSeed
};
