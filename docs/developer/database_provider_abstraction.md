# Database Provider Abstraction Layer Guide

This guide details the architectural foundation implemented to support multi-provider databases (primarily **Microsoft SQL Server** and **SQLite**) in the Business Mart ERP. It details how the Next.js runtime and the Electron shell resolve connection configurations cleanly without modifying core business logic.

---

## 🏗️ Architecture Design Overview

The goal is to ensure that database access is config-driven rather than hardcoded. The system resolves the active database provider using:
1. The `DB_PROVIDER` environment variable (highest priority).
2. The `provider` field within `config.json`'s `db` block.
3. A fallback default of `"mssql"`.

---

## 🛠️ Step-by-Step Implementation Guide

### Step 1: Create Database Provider Configuration
Create the central configuration resolver at `src/lib/database/config.js`. This module normalizes the active provider value and exports helpers.

```javascript
export const PROVIDERS = {
  MSSQL: "mssql",
  SQLITE: "sqlite",
};

export const DEFAULT_PROVIDER = PROVIDERS.MSSQL;

export function getDatabaseConfig() {
  const provider = process.env.DB_PROVIDER || DEFAULT_PROVIDER;
  const normalized = provider.toLowerCase();
  
  return {
    provider: normalized,
    isMSSQL: normalized === PROVIDERS.MSSQL,
    isSQLite: normalized === PROVIDERS.SQLITE,
  };
}
```

---

### Step 2: Create Database Provider Helpers
Create `src/lib/database/provider.js` to expose readable check utility functions for use across API routes or modules.

```javascript
import { getDatabaseConfig } from "./config";

export function getProvider() {
  const config = getDatabaseConfig();
  return config.provider;
}

export function isSQLite() {
  const config = getDatabaseConfig();
  return config.isSQLite;
}

export function isMSSQL() {
  const config = getDatabaseConfig();
  return config.isMSSQL;
}
```

---

### Step 3: Integrate with Prisma Client
Modify `src/lib/prisma.js` to log the active provider during initialization. This serves as a central registry trace without impacting any ORM query calls.

```diff
 import { PrismaClient } from "../../prisma/client";
+import { getProvider } from "./database/provider";
 
 const globalForPrisma = global;
 
+const provider = getProvider();
+console.log(`[Prisma] Active database provider resolved as: ${provider}`);
+
 export const prisma =
   globalForPrisma.prisma ||
   new PrismaClient({
     log: ["query"],
   });
```

---

### Step 4: Add Provider Awareness to Electron Resolver
Update `electron/dbConnectionResolver.js` to support SQLite-based routing internally:

1.  **Integrate Shared Configuration Utility**:
    Import the centralized configuration module at the top of the file:
    ```javascript
    const { loadDatabaseConfig } = require('./dbConfig');
    ```

2.  **Simplify Provider Detection with Error Diagnostics**:
    Use the unified configuration loader and print warning diagnostics on parsing failure:
    ```javascript
    function getActiveProvider() {
      if (process.env.DB_PROVIDER) {
        return process.env.DB_PROVIDER.toLowerCase();
      }
      try {
        const config = loadDatabaseConfig();
        return (config.provider || 'mssql').toLowerCase();
      } catch (e) {
        console.warn("[Provider] fallback to mssql due to error:", e.message);
        return 'mssql';
      }
    }
    ```

3.  **Resolve SQLite Files in User Data Directory**:
    To prevent data loss and ensure path stability inside packaged Electron apps, resolve sqlite files inside the persistent `app.getPath('userData')` folder:
    ```javascript
    function getSqliteDbPath(databaseName) {
      const dbFile = databaseName || 'business_mart.db';
      try {
        const { app } = require('electron');
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, dbFile);
      } catch (e) {
        // Fallback for CLI engines/migrations before app properties initialize
        return path.resolve(process.cwd(), dbFile);
      }
    }
    ```

4.  **Add Branch Checks in Resolver Commands**:
    Ensure the methods skip SQL Server specific concepts (Windows Registry scans, ADO.NET PowerShell instances, master database lookups) and handle SQLite path targets natively.
    *   **Instance Scans**: Return `[]` immediately if `sqlite`.
    *   **Connection Tests**: Verify directory exists and is writable using `getSqliteDbPath()`.
    *   **Migrations**: Execute standard prisma deploy command with file-based URL scheme (`file:<resolved_path>`).
    *   **Resolution Output**: Return a successful resolution state structure containing the local connection URL.

---

## 🔍 How to Verify Implementation

### 1. Build Verification
Execute a production compilation. Next.js will prerender components and trace provider configuration:
```powershell
npm run build
```
Verify that the output contains the console trace:
```text
[Prisma] Active database provider resolved as: mssql
```

### 2. Runtime Execution
Launch development or packaged builds:
*   In MSSQL mode (default), the app continues communicating with SQL Server instances exactly as before.
*   In SQLite mode (e.g. running `cross-env DB_PROVIDER=sqlite npm run dev`), the client resolves using the configured file path database and skips named registry scans.
