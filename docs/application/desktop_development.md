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

## 🔌 Smart Database Connection Resolver & Offline Resilience

To ensure seamless "zero-configuration" operations across diverse client systems, corporate environments, and local enterprise SQL Server instances, the application implements a multi-layered **Smart Connection Resolver** at [electron/dbConnectionResolver.js](file:///d:/Projects/Next%20JS/electron/dbConnectionResolver.js).

```
                 +-----------------------------------------+
                 | Load db configuration from config.json  |
                 +-----------------------------------------+
                                     ||
                                     \/
                 +-----------------------------------------+
                 | Scan Windows Registry for SQL Instances |
                 +-----------------------------------------+
                                     ||
                                     \/
                 +-----------------------------------------+
                 | Generate Prioritized Server Candidates   |
                 +-----------------------------------------+
                                     ||
                                     \/
                 +-----------------------------------------+
                 |    Test Connection (Dual-Layer check)   |
                 |      1. Primary ADO.NET via PowerShell  |
                 |      2. Fallback standalone Prisma JS   |
                 +-----------------------------------------+
                                     ||
                                     \/
                 +-----------------------------------------+
                 |   Classify Connectivity Error Details   |
                 |  DB_NOT_FOUND / AUTH_FAILED / etc.      |
                 +-----------------------------------------+
                                     ||
                                     \/
                 +-----------------------------------------+
                 | Prompt Setup recovery HTML overlay UI   |
                 |    * Accidental click safety guard      |
                 +-----------------------------------------+
```

### 1. Registry Scanning & Candidate Resolution Strategy
The resolver dynamically queries the Windows Registry (`HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL`) at startup to discover installed SQL Server instances (e.g. `SQLEXPRESS`, `SQLEXPRESS01`). It then generates an ordered list of connection candidates:
1. **Configured Server:** Prioritizes the server host explicitly declared in `config.json`.
2. **Registry Discovered Instances:** Combines detected instances with local loopbacks (`localhost`, `127.0.0.1`, `.`).
3. **Standard Instance Fallbacks:** Includes standard default combinations (`localhost\SQLEXPRESS`, `localhost\SQLEXPRESS01`).
4. **Bare Hosts:** Falls back to root hosts without named instances.

*Resilience Note: If the registry scan is blocked by system administrators or dynamic keys are missing, the scanner catches the error, logs a clean warning, and gracefully relies on the extensive fallback host candidate list.*

### 2. Resilient Dual-Layer Health Verification
To avoid slow boot times and false positives, the system operates a robust dual-layer connection health check:
- **Layer 1: Native ADO.NET (Primary):** Spawns a lightweight native .NET `SqlConnection` check via a PowerShell child script. This executes in milliseconds, uses the OS-level SQL driver, and bypasses the overhead of heavy Node engines or Prisma clients.
- **Layer 2: Prisma JS Client (Fallback):** If PowerShell execution policies are restricted (`Restricted`, `AllSigned`), corporate group policies block script runs, or native .NET SQL wrappers are unavailable, the engine catches the exception and falls back to a standalone JS Prisma connection health verification check.

### 3. Precise Connectivity Error Classifications
When connection validation fails, the resolver analyzes error strings and maps them to highly actionable, specific classifications, which are then passed to the main process and UI:
* **`DB_NOT_FOUND`:** Reached the target database instance successfully, but the database named `business_mart` does not exist on it.
* **`AUTH_FAILED`:** Reached the SQL Server, but the provided login credentials or Windows domain accounts failed authentication.
* **`INSTANCE_NOT_FOUND`:** The specific SQL Server instance name was not found or is inactive.
* **`NETWORK_ERROR`:** General TCP network failures, firewall blockages, or connection timeouts.

### 4. Setup Recovery UI & Accidental Click Safeguard
If a working database connection cannot be resolved automatically, the Electron shell suspends Next.js server spawning and loads a focused glassmorphic setup overlay:
* **Explicit User Database Creation:** If the database is missing (`DB_NOT_FOUND`), instead of silently auto-mutating or overriding target databases in production, the recovery UI displays a clean modal explanation prompting: *"Database Not Found. Create it?"*
* **Accidental Click Guard:** The bootstrapping action is locked behind an explicit confirmation safety check: `"Are you sure? This will initialize a new empty Business Mart database."` ensuring administrators never trigger unintended initializations.
* **Hot Relaunching:** Clicking yes triggers the dynamic DB creation query and runs the standalone migrations (`prisma migrate deploy`) and seeding (`prisma/seed.js`) programmatically, showing real-time feedback before hot-relaunching the application.

---

## 🔄 App Launch & Lifecycle Sync

The Electron main process manages the lifecycle of the Next.js process synchronously to avoid race conditions:

1. **Connection Validation**: DB status is verified.
2. **Server Spawning**: Next.js standalone `server.js` is spawned in the background via Electron's Node environment (`process.execPath`).
3. **Health Check HTTP Polling**: Electron polls `http://127.0.0.1:3000/` at **100ms intervals** up to a **10-second timeout**.
4. **Window Load**: The Chromium window frame is initialized and loads the port only *after* a successful `200 OK` health check.
5. **Clean Termination**: On window closure or app exit, the main process invokes `serverProcess.kill('SIGTERM')` and hooks process exit events to prevent orphaned Next.js server processes.
