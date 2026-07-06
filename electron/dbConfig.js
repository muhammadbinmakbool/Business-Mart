const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { ApplicationLogger } = require('./logger');

function getWritableConfigPath() {
  try {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'config.json');
  } catch (e) {
    // Fallback if app properties are not yet initialized (e.g., in early CLI boots)
    return path.join(__dirname, '..', 'resources', 'config.json');
  }
}

// ONLY reads resources/config.json (build-time frozen config) - NEVER reads userData/config.json
function getInstallerProvider() {
  try {
    let configPath = '';
    if (app && app.isPackaged) {
      const prodConfigPath = path.join(process.resourcesPath, 'config.json');
      const nestedProdConfigPath = path.join(process.resourcesPath, 'resources', 'config.json');
      if (fs.existsSync(prodConfigPath)) configPath = prodConfigPath;
      else if (fs.existsSync(nestedProdConfigPath)) configPath = nestedProdConfigPath;
    } else {
      const devConfigPath = path.join(__dirname, '..', 'resources', 'config.json');
      if (fs.existsSync(devConfigPath)) configPath = devConfigPath;
    }

    if (configPath) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (parsed && parsed.db && parsed.db.provider) {
        const prov = parsed.db.provider.toLowerCase();
        if (prov === 'sqlite' || prov === 'mssql') {
          return prov;
        }
      }
    }
  } catch (e) {
    // Fail silently
  }
  return 'mssql'; // Default fallback
}

// Resolve provider based on build packaging context
function getBuildProvider(dbConfig) {
  if (process.env.DB_PROVIDER) {
    return process.env.DB_PROVIDER.toLowerCase();
  }
  return getInstallerProvider();
}

function loadDatabaseConfig() {
  const writablePath = getWritableConfigPath();
  const devConfigPath = path.join(__dirname, '..', 'resources', 'config.json');
  const prodConfigPath = app ? path.join(process.resourcesPath, 'config.json') : '';
  const nestedProdConfigPath = app ? path.join(process.resourcesPath, 'resources', 'config.json') : '';

  let configPath = '';
  if (fs.existsSync(writablePath)) {
    configPath = writablePath;
  } else if (prodConfigPath && fs.existsSync(prodConfigPath)) {
    configPath = prodConfigPath;
  } else if (nestedProdConfigPath && fs.existsSync(nestedProdConfigPath)) {
    configPath = nestedProdConfigPath;
  } else if (fs.existsSync(devConfigPath)) {
    configPath = devConfigPath;
  }

  let dbConfig = {
    server: 'localhost\\SQLEXPRESS',
    database: 'business_mart',
    trustedConnection: true
  };

  let configStatus = 'ok';
  let backupDirectory = '';
  if (configPath) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (parsed && parsed.db) {
        dbConfig = parsed.db;
      } else {
        configStatus = 'fallback';
      }
      if (parsed && parsed.backupDirectory) {
        backupDirectory = parsed.backupDirectory;
      }
    } catch (err) {
      configStatus = 'error';
      ApplicationLogger.error(`[DB Config] Failed to parse config file: ${configPath}. Defaulting to fallback.`, err);
    }
  } else {
    configStatus = 'fallback';
  }

  const provider = getBuildProvider();

  // Enforce isolation: sanitize database filename/configuration to prevent parameter leaks
  let database = dbConfig.database;
  if (provider === 'sqlite') {
    if (!database || !database.endsWith('.db') || database === 'business_mart') {
      database = 'business_mart.db';
    }
  } else {
    if (!database || database.endsWith('.db')) {
      database = 'business_mart';
    }
  }

  return {
    provider,
    server: provider === 'sqlite' ? 'SQLite' : (dbConfig.server || 'localhost\\SQLEXPRESS'),
    database,
    trustedConnection: provider === 'sqlite' ? false : (dbConfig.trustedConnection !== false),
    user: provider === 'sqlite' ? '' : (process.env.DB_USER || dbConfig.user || 'sa'),
    password: provider === 'sqlite' ? '' : (process.env.DB_PASSWORD || dbConfig.password || ''),
    backupDirectory: backupDirectory || dbConfig.backupDirectory || '',
    configStatus
  };
}

module.exports = {
  getWritableConfigPath,
  loadDatabaseConfig,
  getInstallerProvider,
  getBuildProvider
};
