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

  if (configPath) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (parsed && parsed.db) {
        dbConfig = parsed.db;
      }
    } catch (err) {
      console.warn(`[DB Config] Failed to parse config file: ${configPath}. Defaulting to fallback. Error: ${err.message}`);
    }
  }

  return {
    provider: process.env.DB_PROVIDER || dbConfig.provider || 'mssql',
    server: dbConfig.server || 'localhost\\SQLEXPRESS',
    database: dbConfig.database || 'business_mart',
    trustedConnection: dbConfig.trustedConnection !== false,
    user: process.env.DB_USER || dbConfig.user || 'sa',
    password: process.env.DB_PASSWORD || dbConfig.password || ''
  };
}

module.exports = {
  getWritableConfigPath,
  loadDatabaseConfig
};
