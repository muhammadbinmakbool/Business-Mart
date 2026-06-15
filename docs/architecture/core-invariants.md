# Business Mart — Core Architecture Invariants

This document defines the immutable architectural rules and boundaries of the Business Mart ERP. These invariants must be strictly adhered to during all development, refactoring, and testing passes.

---

## 📦 1. Inventory & Stock Invariants

* **Single Source of Truth**: Inventory stock levels are dynamically derived *exclusively* from raw stock movements (e.g. Intakes, Sales, Adjustments). Stock balance caches or tables are for performance optimization only and must be recalculable from the raw movement log.
* **Intake Increments**: A finalized Intake increases inventory stock exactly once.
* **Sale Decrements**: A finalized Sale reduces inventory stock exactly once.
* **Optional Source Tracking Isolation**: The optional Source Tracking module (buyer-to-supplier intake mapping) does *not* modify or affect core inventory quantities or calculations. It is a secondary tracing overlay.

---

## ⚙️ 2. Configuration & Flag Boundaries

* **Display & Behavior Only**: System settings, defaults, print options, and Feature Flags control *only* front-end UI visibility, form defaults, and route guards.
* **No Calculation Coupling**: Feature flags and configuration settings must **never** influence or be imported into:
  * Pure financial arithmetic, tax rates, adjustments calculations, or monetary equations.
  * Stock weight/quantity unit conversion arithmetic.
  * Ledger balancing and double-entry bookkeeping reconciliations.

---

## 🧮 3. Financial & Units Calculations

* **Centralized Mathematical Engine**: All financial calculations (such as gross totals, dynamic adjustments, fees, and final payable amounts) must be executed solely by the pure, centralized functions in `@/lib/financial.js`.
* **Centralized Unit Conversions**: All unit conversion logic (e.g. Maunds to Kilograms, Bags to Kilograms) must reside exclusively in `@/lib/units.js`.
* **Zero Floating-Point Drift**: All monetary operations must use precise rounding helpers to prevent floating-point discrepancy accumulation.

---

## 📊 4. Ledgers & Reporting

* **Derived Views Only**: Ledger entries, account statement balances, and report summaries are derived views generated from transaction source documents (Sales, Intakes, Payments). They are not independent sources of truth.
* **Reconciliation Integrity**: Adjusting a source transaction must cascade recalculations to update its corresponding ledger entries, maintaining perfect double-entry alignment.
