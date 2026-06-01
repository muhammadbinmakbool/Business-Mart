# Business Mart — Desktop Production Setup & Packaging Roadmap

This document outlines the strategic path forward for transitioning the Business Mart Electron desktop application from development verification into a production-ready, distributable Windows application (`.exe`).

---

## 1. Production Mode Execution

In production, the application must run as a single executable without requiring the tester to have Node.js, npm, or VS Code installed.

### Proposed Architecture for Packaged App
```
+-------------------------------------------------------------+
|                      Desktop Client (EXE)                   |
|  +------------------+                   +----------------+  |
|  |                  |    Local HTTP     |                |  |
|  | Electron Shell   | <===============> | Next.js Server |  |
|  | (BrowserWindow)  |     (Port 3000)   | (Node.js Fork) |  |
|  +------------------+                   +----------------+  |
|                                                  ||         |
|                                           Prisma || Client  |
|                                                  \/         |
|                                         +----------------+  |
|                                         | SQL Server DB  |  |
|                                         +----------------+  |
+-------------------------------------------------------------+
```

### Starting Next.js in Production
1. **Next.js Production Build**:
   Prior to packaging, we run `next build` to compile the frontend and API routes.
2. **Spawning Next.js Process**:
   Within `electron/main.js`, we use Node's `child_process.fork` or `child_process.exec` to launch the Next.js production server (`next start` or targeting Next.js server standalone output) programmatically when the Electron app boots.
3. **Dynamic Port Allocation**:
   To prevent port collision, the main process will query for an available local port and instruct the Next.js server to bind to it, passing the port to the `BrowserWindow` instance.
4. **Clean Exit**:
   When the Electron window is closed, the main process catches the exit events and kills the Next.js background process to ensure zero orphaned node processes.

---

## 2. Database Configuration in Packaged Apps

Since SQL Server is installed locally on the tester's machine, the application must be able to read connection details dynamically.

### Delivery Mechanisms for Database Connection Strings
* **External Config File (`config.json`)**:
  We can store configuration details in a standard JSON format in the user's AppData directory:
  ```javascript
  const { app } = require('electron');
  const path = require('path');
  const fs = require('fs');

  const configPath = path.join(app.getPath('userData'), 'config.json');
  ```
  If the file does not exist, Electron can display a simple native setup window prompting the tester to enter their database host, username, password, and database name.
* **Injecting Environment Variables**:
  Once Electron reads the configuration, it dynamically sets `process.env.DATABASE_URL` within the main process environment prior to spawning the Next.js backend server.
  ```javascript
  // Inject into child environment
  process.env.DATABASE_URL = `sqlserver://${dbHost};database=${dbName};user=${dbUser};password=${dbPass};encrypt=true;trustServerCertificate=true;`;
  ```
  This ensures that Prisma Client in Next.js automatically connects to the correct database without altering the compiled codebase.

---

## 3. Roadmap & Remaining Work for Distributable Installer

To produce a production-ready `Business Mart Setup.exe`, the following implementation phases are required:

### Step 1: Standalone Node.js Bundling
We will configure Electron's builder to package a self-contained Node.js runtime environment, ensuring the app runs perfectly on machines without Node.js preinstalled.

### Step 2: Select and Configure Packaging Tool
We will use **`electron-builder`** due to its robust support for Windows installers:
1. Install as a devDependency:
   ```bash
   npm install --save-dev electron-builder
   ```
2. Configure `electron-builder.json` or `package.json` build properties:
   - Target: `nsis` (Nullsoft Scriptable Install System) for creating standard Windows `.exe` installers.
   - Shortcut configurations (Desktop & Start Menu).
   - Resource copy configuration to include Prisma engines (`query-engine-*.exe`) and the Next.js `.next` compilation folder.

### Step 3: Automated Prisma Migrations on Launch
To guarantee the local database is up to date, we can execute Prisma migrations programmatically on startup by invoking the Prisma CLI engine before spawning the Next.js server:
```javascript
const { execSync } = require('child_process');
// Run migrations silently on startup
execSync('npx prisma migrate deploy', { env: process.env });
```

### Step 4: System Integration & Polish
- Set custom brand icons (`.ico`).
- Create single-instance locks (`app.requestSingleInstanceLock()`) to prevent running multiple app instances simultaneously.
- Set up logging utilities (`electron-log`) to record errors in a user-accessible log file for easy debugging/support.
