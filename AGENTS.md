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
