<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Business Mart Architecture Rules

## 🚫 Settings & Configuration Boundary (IMMUTABLE RULE)

Settings (General Setup, Print settings, Inventory settings, and any future settings key in `SystemSetting`) are **Display and Behavioral Configuration ONLY**.

* **MUST NEVER BE USED INSIDE**:
  * Financial calculations, rates, adjustments, or monetary math.
  * Inventory stock balances, Maunds-to-Kilograms conversions, or transaction quantity math.
  * Ledger matching, double-entry bookkeeping, or reconciliation logic.
  * Core database services/services calculation layers.

* **CAN ONLY BE USED FOR**:
  * UI visibility controls (toggles, filters, alerts, conditional sections).
  * Form defaults (default inputs, default dropdown selections).
  * Display preferences (currency formatting symbols, language, page size, orientation, watermark visibility).
  * Front-end validation hints (warnings, alerts, non-blocking boundaries).

All core arithmetic and conversions must remain pure, floating-point accurate, and database-independent inside `@/lib/financial.js` and `@/lib/units.js`.

## 🚫 Currency & Financial Precision Formatting (IMMUTABLE RULE)

* **EXCLUSIVITY OF ARITHMETIC ROUNDING (GUARANTEE)**: ❗ **ALL mathematical and financial rounding must happen ONLY inside `@/lib/financial.js`**. No React UI component, frontend helper, page, hook, or print subsystem mapper is ever allowed to perform rounding or decimal truncating calculations.
* **FORMATTING & VALUE PRESERVATION**:
  * **NEVER** use hardcoded formatting symbols (like `"Rs."` or `"PKR"`) or raw `.toLocaleString()` calls directly in component markup or print mappers for currency values.
  * **MUST ALWAYS** format financial amounts using the centralized `formatCurrency` utility from `@/lib/formatters/financialFormatter` and propagate user preferences via `useSettings()` (or `printConfig` in the print subsystem).
  * **UI/Display Layers ONLY**: Formatting must happen exclusively at the terminal rendering stage. Do NOT write formatted strings into database/service records or let calculations depend on formatted outputs.
* **PRINT SUBSYSTEM INTEGRATION**: `printConfig` parameters passed through the print template resolution pipeline are configuration-only transport objects. They **MUST NOT** implement or override custom formatting logic. All print template and mapper formatting must consume the central `formatCurrency` utility.
* **REACT CONTEXT PROPAGATION**: To avoid performance degradation and excessive re-renders (over-hooking), do not call `useSettings()` inside low-level children/widgets. Retrieve the values at the top-level container or client-page component and pass the configuration parameters down via properties.


