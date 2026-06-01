# Business Mart — Electron Desktop Wrapper & Packaging Developer Guide

This guide documents the architecture, setup, development workflow, and production packaging pipeline for wrapping the Business Mart Next.js application in an Electron desktop shell.

---

## 🏛️ Desktop Architecture

To run as a desktop application without requiring external developer runtimes on target machines, Business Mart operates a programmatically spawned **standalone Next.js backend server** communicating with a sandboxed **Electron Chromium browser frame** over an internal TCP port.

```
+---------------------------------------------------------------+
|                      Desktop Client (EXE)                     |
|                                                               |
|  +---------------------+                   +---------------+  |
|  |   Electron UI       |    HTTP Request   |  Next.js App  |  |
|  | (BrowserWindow)     | <===============> | Standalone    |  |
|  | contextIsolation:   |      Port 3000    | (server.js)   |  |
|  | true                |                   +---------------+  |
|  +---------------------+                           ||         |
|                                             Prisma || Client  |
|                                                    \/         |
|                                           +----------------+  |
|                                           | Local/Remote   |  |
|                                           | SQL Server DB  |  |
|                                           +----------------+  |
+---------------------------------------------------------------+
```

---

## ⚙️ Development Environment

In development, Next.js runs in watch mode via Turbopack while Electron loads the active local port.

### Development Start Command
To run both Next.js dev server and the Electron watch window concurrently:
```bash
npm run dev:desktop
```

### Development Scripts Map (package.json)
* `"electron"`: Spawns the Electron shell targeting the development main process.
* `"dev:desktop"`: Uses `concurrently` to boot `npm run dev`, invokes `wait-on` to wait for port `3000` to be available, then launches `npm run electron`.

---

## 📦 Production Packaging Pipeline

In production, code security and dependency footprint are tightly managed using Next.js standalone outputs, protected ASAR bundling, and dynamic installer creation.

### The Packaging Build Command
To compile the standalone next app, sync local assets, and package the installer executable:
```bash
npm run electron:build
```

### Pipeline Sequence Breakdown

1. **Compilation (`npm run build:next`)**:
   Runs standard `next build`. Because `output: 'standalone'` is configured in `next.config.mjs`, Next.js compiles an optimized, minimal production Node.js server at `.next/standalone/` containing only required production dependency node modules.
2. **Asset Synchronization (`npm run postbuild:next`)**:
   Invokes our helper copy script (`scripts/copy-standalone-assets.js`) to copy `public/` and `.next/static/` directories into `.next/standalone/` so the standalone server can serve assets natively without an external CDN.
3. **Installer Packaging (`electron-builder`)**:
   Reads `electron-builder.json`, packages all files using `"asar": true` to protect source code from being visible inside `Program Files`, and unpacks the Prisma query binaries (`.exe` and `.dll.node`) into `app.asar.unpacked` via `"asarUnpack"` to allow direct Windows execution. Generates `dist/Business Mart Setup.exe`.

---

## 🔌 Offline Resilience & Database Connection Management

To ensure full compatibility with diverse offline machines and target local/network SQL Server installations, database mapping is calculated entirely at launch time.

### 1. Connection Schema (`resources/config.json`)
Administrators or testers can configure database routing in `resources/config.json` placed in the installation's root directory:
```json
{
  "db": {
    "server": "localhost\\SQLEXPRESS",
    "database": "business_mart",
    "trustedConnection": true,
    "user": "sa",
    "password": "YOUR_SQL_SERVER_PASSWORD"
  }
}
```
* **Dual-Authentication Modes:**
  * **Windows Authentication (`trustedConnection: true`):** Generates a Prisma-compatible connection string with `;integratedSecurity=true` and `instanceName=SQLEXPRESS`. It does **not** inject any SQL user/password credentials and automatically bypasses the setup/password warning dialogs.
  * **SQL Authentication (`trustedConnection: false`):** Utilizes standard `user` and `password` configurations. If standard mode is enabled and the default `"YOUR_SQL_SERVER_PASSWORD"` template password is left intact, a startup safeguard dialog will intercept the launch to guide the user on how and where to update the configuration file.

### 2. Prisma Performance Injections
The main process parses `config.json` on launch, splits named instances (e.g. `localhost\SQLEXPRESS` -> appending `;instanceName=SQLEXPRESS`), and injects specialized Prisma configurations into the generated `DATABASE_URL` string:
- `;integratedSecurity=true`: Injected if `trustedConnection: true` is configured to enable native integrated Windows Authentication.
- `connectionTimeout=10`: Enforces a fast-fail timeout within 10 seconds if database communication stalls, preventing UI freezes.
- `poolSize=5`: Limits concurrent connections to prevent database resource exhaustion on single-user offline client machines.
- `encrypt=true;trustServerCertificate=true`: Enables secure transport while trusting local self-signed certificates standard in testing environments.

### 3. Non-Blocking Connection Pre-flight Verification & Detailed Logging
On app launch, the main process provides highly descriptive developer logs and resilient pre-flight verification:
- **Resilient Pre-flight (Non-blocking):** Standard SQL Server Express named instances (`SQLEXPRESS`) natively use **dynamic ports** rather than static port 1433 on Windows. Enforcing a blocking TCP check on port 1433 would cause false negatives. The app performs a TCP pre-flight check but logs warnings on failure rather than hard-crashing, allowing successful boots over dynamic ports.
- **Active Path Verification:** The app prints the absolute path of the loaded `config.json` to logs on launch, guaranteeing the correct externalized file is read.
- **Security-First Logs:** Startup console logs cleanly output the active server, database, and authentication mode used without ever exposing sensitive passwords.

---

## 🔄 App Launch & Lifecycle Sync

The Electron main process manages the lifecycle of the Next.js process synchronously to avoid race conditions:

1. **Connection Validation**: DB status is verified.
2. **Server Spawning**: Next.js standalone `server.js` is spawned in the background via Electron's Node environment (`process.execPath`).
3. **Health Check HTTP Polling**: Electron polls `http://127.0.0.1:3000/` at **100ms intervals** up to a **10-second timeout**.
4. **Window Load**: The Chromium window frame is initialized and loads the port only *after* a successful `200 OK` health check.
5. **Clean Termination**: On window closure or app exit, the main process invokes `serverProcess.kill('SIGTERM')` and hooks process exit events to prevent orphaned Next.js server processes.
