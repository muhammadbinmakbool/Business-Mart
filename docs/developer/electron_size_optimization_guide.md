# Next.js + Electron Standalone Size Optimization Guide

This guide details how to resolve and prevent installer bloat in desktop applications built using Next.js (with `output: 'standalone'`) and Electron.

---

## 1. The Root Cause of Installer Bloat

When building desktop applications that wrap a Next.js server, the standard approach is to compile Next.js with `output: 'standalone'` and bundle the resulting `.next/standalone` folder inside the Electron package using `electron-builder`.

During this process, two primary issues cause exponential installer size growth:

### A. Recursive Build Output Contamination
By default, the Next.js Node File Tracer (`@vercel/nft`) attempts to trace and copy all workspace files required by the server. If previous Electron build output folders (such as `dist/` or `win-unpacked/`) exist in the project root, `@vercel/nft` can recursively copy them into `.next/standalone/dist/win-unpacked/`. 
This creates a recursive packaging loop (an app inside an app inside an app), causing the installer to bloat to **1.8 GB+**.

### B. Dynamic Path Resolution Tracing Leakage
Any server-side code using dynamic path lookups (like `process.cwd()`, dynamic requires, or parent directory resolutions) triggers `@vercel/nft` to make a safe fallback assumption: **it traces the entire project root folder**. This forces the bundler to include the `dist/` folder and other unrelated workspace artifacts.

---

## 2. Implemented Fixes

To achieve a clean, lightweight build (~270MB installer size), two architectural fixes are required:

### Fix 1: Configure Standalone Build Exclusions
Isolate the Next.js compilation from build artifacts by defining strict exclusions in `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingExcludes: {
    '*': [
      './dist/**/*',
      './electron/**/*',
      './docs/**/*',
      './scripts/**/*',
      './.next/cache/**/*',
    ],
  },
};

export default nextConfig;
```

This prevents Next.js from tracing and copying build-time folders, documents, and dev scripts into the production bundle.

### Fix 2: Refactor Dynamic File Lookups
Replace dynamic `process.cwd()` node_modules lookups with static package resolutions.

*   **Bloated Pattern (Bad):**
    ```javascript
    const filePath = path.join(
      process.cwd(),
      "node_modules",
      "html2pdf.js",
      "dist",
      "html2pdf.bundle.min.js"
    );
    ```
    *Why it fails:* `@vercel/nft` cannot statically resolve this at compile-time and traces the entire project root directory.

*   **Optimized Pattern (Good):**
    ```javascript
    import { createRequire } from "module";
    const require = createRequire(import.meta.url);

    const filePath = require.resolve("html2pdf.js/dist/html2pdf.bundle.min.js");
    const fileContent = fs.readFileSync(filePath, "utf8");
    ```
    *Why it succeeds:* The path is resolved relative to the module entry point via static ESM-compatible require resolution, allowing `@vercel/nft` to trace *only* that single library file.

---

## 3. Build & Packaging Instructions

To build a fresh, optimized installer:

1.  **Clean previous builds:**
    Ensure previous directories are removed before compilation to prevent stale trace caches:
    ```powershell
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .next, dist, win-unpacked
    ```

2.  **Run the build pipeline:**
    ```bash
    npm run electron:build
    ```

The final installer will be generated under `dist/Business Mart Setup <version>.exe` with a highly optimized size of **~274 MB**.
