const fs = require('fs');
const path = require('path');

function performShutdownBackup() {
  try {
    const { getBuildProvider } = require('./dbConfig');
    const provider = getBuildProvider();
    if (provider !== 'sqlite') {
      return; // Shutdown database file copy is only applicable to SQLite
    }

    const { loadDatabaseConfig } = require('./dbConfig');
    const config = loadDatabaseConfig();

    const { resolveDatabaseConnection } = require('./dbConnectionResolver');
    const resolution = resolveDatabaseConnection(config);
    if (!resolution || !resolution.success || !resolution.connectionString) {
      console.warn('[Shutdown Backup] Cannot resolve database path for auto-backup.');
      return;
    }

    const dbUrl = resolution.connectionString;
    if (!dbUrl.startsWith('file:')) {
      return;
    }

    const srcPath = path.resolve(dbUrl.replace(/^file:/, ''));
    if (!fs.existsSync(srcPath)) {
      console.warn('[Shutdown Backup] SQLite database file not found at:', srcPath);
      return;
    }

    // Target backup directory
    let targetDir = config.backupDirectory;
    if (!targetDir) {
      // Fallback: Check if D:\ exists, then E:\, then default to userData/backups
      if (fs.existsSync('D:\\')) {
        targetDir = 'D:\\BusinessMartBackups';
      } else if (fs.existsSync('E:\\')) {
        targetDir = 'E:\\BusinessMartBackups';
      } else {
        const { app } = require('electron');
        targetDir = path.join(app.getPath('userData'), 'backups');
      }
    }

    // Ensure backup directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Generate timestamped backup file name
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const destName = `business_mart_backup_${timestamp}.db`;
    const destPath = path.join(targetDir, destName);

    fs.copyFileSync(srcPath, destPath);
    console.log(`[Shutdown Backup] SUCCESS: SQLite database auto-backed up to ${destPath}`);
  } catch (err) {
    console.error('[Shutdown Backup] ERROR:', err.message);
  }
}

module.exports = { performShutdownBackup };
