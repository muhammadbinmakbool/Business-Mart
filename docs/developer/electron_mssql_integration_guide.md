# Next.js + Electron + Prisma + MSSQL Integration Guide

This guide outlines the production-ready integration of a standalone **Next.js server**, an **Electron desktop shell**, and a **Prisma Client** communicating with **Microsoft SQL Server (MSSQL)**. 

It provides in-depth analysis of critical packaging and runtime database resolution hurdles, their solutions, and a step-by-step onboarding guide for developers setting up the system from scratch.

---

## 🏗️ High-Level Architecture Overview

In a production environment, the desktop app executes as a self-contained, offline Windows application without requiring Node.js or npm on the host system:

```
+-------------------------------------------------------------+
|                      Desktop Client (EXE)                   |
|  +------------------+                   +----------------+  |
|  |                  |    Local HTTP     |                |  |
|  | Electron Shell   | <===============> | Next.js Server |  |
|  | (BrowserWindow)  |    (Random Port)  | (Node.js Fork) |  |
|  +------------------+                   +----------------+  |
|                                                  ||         |
|                                           Prisma || Client  |
|                                                  \/         |
|                                         +----------------+  |
|                                         | Local SQL Server| |
|                                         | (e.g. SQLEXPRESS)| |
|                                         +----------------+  |
+-------------------------------------------------------------+
```

1.  **Electron Shell**: Renders the frontend window and handles systems controls (e.g. IPC config managers).
2.  **Next.js Server**: Compiled as a standalone distribution and forked by Electron on startup to handle local API routing.
3.  **Prisma Client**: Natively loaded inside the Next.js process and targets the dynamic connection URL configured by the user.

---

## 🛑 Critical Hurdles (Stoppers) & Solutions

### 1. Named Instance & Tiberius Host Constraints
*   **The Problem**: Prisma's native database driver (`tiberius` written in Rust) treats single dots (`.`) as invalid hostnames in URI strings. Furthermore, connecting to named instances (e.g. `.\SQLEXPRESS`) using standard slashes causes connection timeouts or URI parsing errors during startup.
*   **The Solution**: Normalization. In `electron/dbConnectionResolver.js`, all host values matching `.` or `127.0.0.1` are normalized to `localhost`. Slashes are parsed to extract the instance name, generating a compliant semicolon-separated connection string:
    ```javascript
    // Convert .\SQLEXPRESS to host: localhost, instanceName: SQLEXPRESS
    if (server.includes('\\')) {
      const parts = server.split('\\');
      host = parts[0] || 'localhost';
      instance = parts[1];
    }
    if (host === '.' || host === '127.0.0.1') {
      host = 'localhost';
    }
    
    let connectionString = `sqlserver://${host};database=${database}`;
    if (instance) connectionString += `;instanceName=${instance}`;
    ```

---

### 2. Disappearing `.prisma` Client Packaging Bug
*   **The Problem**: By default, Prisma generates the client inside `node_modules/.prisma/client`. However, `electron-builder` skips packaging dot-directories (files starting with `.`) inside the `app.asar` archive to reduce size. This results in a fatal runtime error:
    ```text
    Cannot find module '.prisma/client/default'
    ```
*   **The Solution**: Redirect generator output. In `prisma/schema.prisma`, we explicitly configure the client output target to a custom, non-hidden subfolder:
    ```prisma
    generator client {
      provider = "prisma-client-js"
      output   = "./client"
    }
    ```
*   **Asar Unpack Rules**: Because Prisma's engine relies on a native binary library (`query_engine-windows.dll.node`), it cannot execute from within a compressed ASAR archive. We must configure `electron-builder.json` to unpack the custom `prisma` folder during packaging:
    ```json
    "asarUnpack": [
      "prisma/**/*",
      ".next/standalone/**/*"
    ]
    ```

---

### 3. Programmatic Auto-Creation & Silent Migrations Failure
*   **The Problem**: Fresh installations start with no database. If we only run `prisma migrate deploy`, it automatically creates the `_prisma_migrations` table but **fails silently** with no tables (e.g. `dbo.User`) if there is no migration history folder in the application root, leading to seeding failures.
*   **The Solution**:
    1.  **PowerShell Catalog Check & Attaching**: On fresh setups, Electron executes a lightweight ADO.NET script via PowerShell to check if the database exists in SQL Server's catalog. If orphaned physical `.mdf` files are found on disk, it attaches them; otherwise, it executes `CREATE DATABASE`.
    2.  **Prisma Migrations Folder**: Maintain the full schema migration history under `prisma/migrations`. 
    3.  **DATABASE_URL Injection**: Inject `DATABASE_URL` dynamically into process environments before spawning the Prisma CLI migration engine or Next.js servers, forcing migrations to deploy to the correct target catalog.

---

### 4. Centralized System Mode Architecture
*   **The Problem**: Splitting database flow checks between the UI and backend resolver causes logic drift, exposing raw error traces and credentials in frontend layouts.
*   **The Solution**: Standardize resolver outcomes into a single unified `mode` parameter:
    *   `SUCCESS`: Connection verified, ready to spawn the server.
    *   `BOOTSTRAP_REQUIRED`: SQL Server reachable, but database catalog is missing (requires manual database creation).
    *   `CONFIG_ERROR`: Config file is empty or missing server/database keys.
    *   `UNREACHABLE`: Credentials failed or SQL Server is offline.
*   **Payload Sanitization**: The resolver separates payloads. On failure, it never returns the `connectionString` or passwords, exposing only a human-readable `message` for the UI and a `debugError` with raw trace diagnostics strictly for backend logging:
    ```javascript
    return {
      success: false,
      mode: 'BOOTSTRAP_REQUIRED',
      message: `Database '${database}' was not found on server '${server}'.`,
      debugError: testResult.error
    };
    ```

---

## 🚀 Step-by-Step Developer Setup Guide

Follow these instructions to set up, initialize, and package the repository from scratch:

### Prerequisites
*   Windows 10/11 operating system.
*   Node.js (LTS version v20+ recommended).
*   Microsoft SQL Server (SQLEXPRESS or Developer instance active).
*   Windows PowerShell enabled.

---

### 1. Install Dependencies
Clone the repository and install all node packages:
```powershell
npm install
```

---

### 2. Configure Local Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="sqlserver://localhost:1433;database=business_mart;user=sa;password=YOUR_SQL_PASSWORD;encrypt=true;trustServerCertificate=true"
IP_ADDRESS="127.0.0.1"
NEXT_PUBLIC_MOCK_DATA=false
JWT_SECRET=your_jwt_signing_key_secret_2026
```

---

### 3. Generate the Migration History
If you have an existing database schema on SQL Server, you must generate the initial migration history:
```powershell
npx prisma migrate dev --name init
```
This command compiles the Prisma schema, creates the migrations history under `prisma/migrations`, and generates the custom client at `prisma/client`.

---

### 4. Build Standalone Next.js Server
Compile Next.js in production standalone mode:
```powershell
npm run build
```
This creates the standalone distribution at `.next/standalone/server.js`, including all static and public assets.

---

### 5. Running the Application Natively
*   **Development Mode** (Electron wrapper hot-loading the dev server):
    ```powershell
    npm run dev
    ```
*   **Production Standalone Mode** (Electron launching compiled standalones directly):
    ```powershell
    npm run electron:build
    ```
    This builds the distributable `.exe` inside the `dist/` directory.

---

## 📋 Diagnostics Check sheet

To verify the bootstrap integrity of a newly compiled application, run these checks:
1.  Verify that `dist/win-unpacked/resources/app.asar.unpacked/prisma/migrations` folder exists and contains SQL files.
2.  Verify that `_prisma_migrations` contains the initial row `20260601183918_init` (success).
3.  Verify that `dbo.User` has `admin@businessmart.com` populated (success).
4.  Ensure that running the app with an invalid server config in `config.json` immediately opens the recovery UI showing `mode: "UNREACHABLE"`.
