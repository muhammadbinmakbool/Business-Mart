const fs = require("fs");
const path = require("path");
const os = require("os");

// Resolve application version from Electron or package.json
let appVersion = "0.1.9";
try {
  const { app } = require("electron");
  if (app && typeof app.getVersion === "function") {
    appVersion = app.getVersion();
  } else {
    const pkgPath = path.join(__dirname, "..", "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      appVersion = pkg.version || "0.1.9";
    }
  }
} catch (e) {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      appVersion = pkg.version || "0.1.9";
    }
  } catch (err) {
    // Silent fallback
  }
}

// Resolve logging directory based on electron environment and platform
let logDir;
try {
  const { app } = require("electron");
  if (app && typeof app.getPath === "function") {
    logDir = path.join(app.getPath("userData"), "logs");
  }
} catch (e) {
  // Silent fallback if electron app is not ready/available
}

if (!logDir) {
  if (process.env.USER_DATA_PATH) {
    logDir = path.join(process.env.USER_DATA_PATH, "logs");
  } else if (process.env.NODE_ENV !== "production") {
    logDir = path.join(process.cwd(), "logs");
  } else {
    // Production fallback based on OS standard application data paths
    let userDataPath;
    const appName = "business-mart";
    if (process.platform === "win32") {
      userDataPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), appName);
    } else if (process.platform === "darwin") {
      userDataPath = path.join(os.homedir(), "Library", "Application Support", appName);
    } else {
      userDataPath = path.join(os.homedir(), ".config", appName);
    }
    logDir = path.join(userDataPath, "logs");
  }
}

function getFullErrorStack(error) {
  if (!(error instanceof Error)) return String(error);
  let result = error.stack || error.message;
  if (error.cause instanceof Error) {
    result += `\n\nCaused by: ${getFullErrorStack(error.cause)}`;
  } else if (error.cause !== undefined && error.cause !== null) {
    result += `\n\nCaused by: ${typeof error.cause === "object" ? JSON.stringify(error.cause, null, 2) : String(error.cause)}`;
  }
  return result;
}

function formatLogEntry(level, processType, messageOrError, context) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  let message = "";
  let stack = "";

  if (messageOrError instanceof Error) {
    message = messageOrError.message;
    stack = getFullErrorStack(messageOrError);
  } else {
    message = String(messageOrError);
  }

  let entry = "========================================================\n";
  entry += `Date: ${dateStr}\n`;
  entry += `Time: ${timeStr}\n`;
  entry += `Process: ${processType}\n`;
  entry += `Level: ${level}\n\n`;
  entry += `Message:\n${message}\n\n`;

  if (stack) {
    entry += `Stack:\n${stack}\n\n`;
  }

  if (context !== undefined && context !== null) {
    let serializedContext = "";
    try {
      serializedContext = typeof context === "string" ? context : JSON.stringify(context, null, 4);
    } catch (e) {
      serializedContext = `[Serialization Error: ${e.message}]`;
    }
    entry += `Context:\n${serializedContext}\n\n`;
  }

  entry += "========================================================\n";
  return { entry, dateStr };
}

function writeLog(level, processType, messageOrError, context) {
  try {
    const { entry, dateStr } = formatLogEntry(level, processType, messageOrError, context);

    // Development mirroring to console
    if (process.env.NODE_ENV !== "production") {
      const consoleMsg = `[${processType}] [${level}] ${messageOrError instanceof Error ? messageOrError.message : messageOrError}`;
      if (level === "ERROR") {
        console.error(consoleMsg, messageOrError instanceof Error ? messageOrError.stack : "", context !== undefined ? context : "");
      } else if (level === "WARN") {
        console.warn(consoleMsg, context !== undefined ? context : "");
      } else {
        console.log(consoleMsg, context !== undefined ? context : "");
      }
    }

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `${dateStr}.log`);

    // Write file header if newly created
    if (!fs.existsSync(logFile)) {
      const header = `=================================================\n` +
                     `Business Mart\n\n` +
                     `Version:\n${appVersion}\n\n` +
                     `Date:\n${dateStr}\n` +
                     `=================================================\n\n`;
      fs.writeFileSync(logFile, header, "utf8");
    }

    fs.appendFileSync(logFile, entry, "utf8");
  } catch (loggingError) {
    // Failsafe error log to console (only if logging itself failed, we do not throw)
    console.error("[ApplicationLogger Error] Logging failed:", loggingError);
  }
}

const ApplicationLogger = {
  info(msg, context, processType = "[Electron Main]") {
    writeLog("INFO", processType, msg, context);
  },
  warn(msg, context, processType = "[Electron Main]") {
    writeLog("WARN", processType, msg, context);
  },
  error(err, context, processType = "[Electron Main]") {
    writeLog("ERROR", processType, err, context);
  },
  debug(msg, context, processType = "[Electron Main]") {
    writeLog("DEBUG", processType, msg, context);
  }
};

module.exports = { ApplicationLogger };
