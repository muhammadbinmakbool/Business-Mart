const fs = require('fs');
const path = require('path');

const targetProvider = process.argv[2] || 'mssql';
const normalizedProvider = targetProvider.toLowerCase();

if (normalizedProvider !== 'mssql' && normalizedProvider !== 'sqlite') {
  console.error(`[Build Prepare] ERROR: Unknown database provider [${targetProvider}]. Supported providers: mssql, sqlite.`);
  process.exit(1);
}

console.log(`[Build Prepare] Preparing workspace for [${normalizedProvider}] build...`);

// 1. Copy targeted schema file to default schema.prisma
const schemaSource = path.resolve(__dirname, `../prisma/schema.${normalizedProvider}.prisma`);
const schemaDest = path.resolve(__dirname, '../prisma/schema.prisma');

try {
  if (!fs.existsSync(schemaSource)) {
    console.error(`[Build Prepare] ERROR: Schema source file not found: ${schemaSource}`);
    process.exit(1);
  }
  fs.copyFileSync(schemaSource, schemaDest);
  console.log(`[Build Prepare] Coerced ${path.basename(schemaSource)} -> ${path.basename(schemaDest)}`);
} catch (err) {
  console.error(`[Build Prepare] ERROR copying schema file:`, err.message);
  process.exit(1);
}

// 1b. Copy targeted migrations folder to default prisma/migrations
const migrationsSource = path.resolve(__dirname, `../prisma/migrations_${normalizedProvider}`);
const migrationsDest = path.resolve(__dirname, '../prisma/migrations');

try {
  if (fs.existsSync(migrationsDest)) {
    fs.rmSync(migrationsDest, { recursive: true, force: true });
  }
  if (fs.existsSync(migrationsSource)) {
    fs.cpSync(migrationsSource, migrationsDest, { recursive: true });
    console.log(`[Build Prepare] Coerced ${path.basename(migrationsSource)} -> ${path.basename(migrationsDest)}`);
  } else {
    fs.mkdirSync(migrationsDest, { recursive: true });
    console.log(`[Build Prepare] Created empty migrations directory`);
  }
} catch (err) {
  console.error(`[Build Prepare] ERROR copying migrations folder:`, err.message);
  process.exit(1);
}

// 2. Load and write the target provider to resources/config.json
const configPath = path.resolve(__dirname, '../resources/config.json');

try {
  let config = {};
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  }

  config.db = config.db || {};
  config.db.provider = normalizedProvider;

  // Preserve existing parameters safely
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`[Build Prepare] Updated static build configuration in resources/config.json`);
} catch (err) {
  console.error(`[Build Prepare] ERROR updating configuration file:`, err.message);
  process.exit(1);
}

// 3. Write or delete .env.local to set local SQLite URL dynamically for Next.js
const envLocalPath = path.resolve(__dirname, '../.env.local');

try {
  if (normalizedProvider === 'sqlite') {
    fs.writeFileSync(envLocalPath, 'DATABASE_URL="file:./prisma/business_mart.db"\n', 'utf8');
    console.log('[Build Prepare] Created temporary .env.local with SQLite database URL.');
  } else {
    if (fs.existsSync(envLocalPath)) {
      fs.unlinkSync(envLocalPath);
      console.log('[Build Prepare] Removed temporary .env.local to fall back to MSSQL configuration.');
    }
  }
} catch (err) {
  console.error('[Build Prepare] ERROR managing .env.local:', err.message);
  process.exit(1);
}

console.log('[Build Prepare] Ready!');
