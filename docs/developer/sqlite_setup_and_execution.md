# SQLite Setup and Execution Guide

This document describes how SQLite support was implemented as a build-time compile target for the Business Mart application and provides developer instructions for running and building each database variant.

---

## 🛠️ How SQLite Was Implemented

### 1. Build-Time Target Model
Rather than routing multiple database clients or dynamically compiling SQL syntax at runtime, the application uses a **deterministic build-time selection model**:
*   The target database engine is chosen before compiling.
*   The targeted Prisma Client is generated specifically for that dialect.
*   Next.js compiles static pages with the provider key baked into compilation templates.
*   The Electron installer packages the app locked to the selected provider.

### 2. Dual Schemas
We maintain two database-specific schemas in the repository:
*   `prisma/schema.mssql.prisma`: Baseline production schema configured with SQL Server attributes (e.g. `@db.Decimal(18,2)`, `@db.NVarChar(255)`).
*   `prisma/schema.sqlite.prisma`: SQLite-compatible twin schema. All SQL Server-specific native properties (`@db.*`) are stripped out as SQLite manages fields using standard generic column affinities.

### 3. Build & Command Prep Tooling
Two CLI helper scripts execute target changes securely across different platforms (Windows, macOS, Linux):
*   `scripts/prepare-build.js`: Copies the selected target schema file (`schema.mssql.prisma` or `schema.sqlite.prisma`) to the active compiler schema (`prisma/schema.prisma`), and stores the selection inside `resources/config.json`.
*   `scripts/env-run.js`: Injects variables like `DB_PROVIDER` and executes the build sub-processes cross-platform.

### 4. Packaged App Engine Lock
To guarantee database stability in packaged builds:
*   In development (`app.isPackaged === false`), developers can configure or override the provider.
*   In production (`app.isPackaged === true`), the Electron main process reads the provider strictly from `resources/config.json` inside the read-only installation directory, preventing database corruption from local `userData` configurations.

### 5. Safe Local Data Persistence
SQLite database files are resolved strictly within Electron's persistent app directory (`app.getPath('userData')`) inside the sub-folder structure, guaranteeing a single path authority across launchers.

---

## 🚀 How to Execute and Build the App

Always execute targeted commands. The scripts automatically handle copying schemas, generating Prisma clients, and setting environment variables.

### 1. Run in Development Mode
To launch the developer workspace (Next.js server + Electron desktop window wrapper):

*   **For SQL Server Target**:
    ```bash
    npm run dev:mssql
    ```
*   **For SQLite Target**:
    ```bash
    npm run dev:sqlite
    ```

### 2. Compile Standalone Next.js Server
To verify page compilation and run local production checks:

*   **For SQL Server Target**:
    ```bash
    npm run build:mssql
    ```
*   **For SQLite Target**:
    ```bash
    npm run build:sqlite
    ```

### 3. Compile Desktop Installer Packages
To build database-specific desktop distributions (installers compile *only* the targeted engine):

*   **For SQL Server Target**:
    ```bash
    npm run electron:build:mssql
    ```
*   **For SQLite Target**:
    ```bash
    npm run electron:build:sqlite
    ```
