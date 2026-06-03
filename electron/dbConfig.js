const { app } = require('electron');
const path = require('path');
const fs = require('fs');

function getWritableConfigPath() {
  try {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'config.json');
  } catch (e) {
    // Fallback if app properties are not yet initialized (e.g., in early CLI boots)
    return path.join(__dirname, '..', 'resources', 'config.json');
  }
}

// Resolve provider based on build packaging context
function getBuildProvider(dbConfig) {
  if (process.env.DB_PROVIDER) {
    return process.env.DB_PROVIDER.toLowerCase();
  }
  try {
    if (app && app.isPackaged) {
      const prodConfigPath = path.join(process.resourcesPath, 'config.json');
      const nestedProdConfigPath = path.join(process.resourcesPath, 'resources', 'config.json');
      let configPath = '';
      if (fs.existsSync(prodConfigPath)) configPath = prodConfigPath;
      else if (fs.existsSync(nestedProdConfigPath)) configPath = nestedProdConfigPath;

      if (configPath) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed && parsed.db && parsed.db.provider) {
          return parsed.db.provider.toLowerCase();
        }
      }
    }
  } catch (e) {
    // Fail silently
  }
  return (dbConfig && dbConfig.provider) ? dbConfig.provider.toLowerCase() : 'mssql';
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
      console.warn(`[DB Config] Failed to parse config file: ${configPath}. Defaulting to fallback. Error: ${err.message}`);
    }
  } else {
    configStatus = 'fallback';
  }

  const provider = getBuildProvider(dbConfig);

  return {
    provider,
    server: dbConfig.server || 'localhost\\SQLEXPRESS',
    database: dbConfig.database || 'business_mart',
    trustedConnection: dbConfig.trustedConnection !== false,
    user: process.env.DB_USER || dbConfig.user || 'sa',
    password: process.env.DB_PASSWORD || dbConfig.password || '',
    backupDirectory: backupDirectory || dbConfig.backupDirectory || '',
    configStatus
  };
}

module.exports = {
  getWritableConfigPath,
  loadDatabaseConfig
};
