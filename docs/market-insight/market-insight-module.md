# Market Insight Module (Observational Intelligence Layer)

This document describes the architectural philosophy, database patterns, and integration rules of the Market Insight module.

---

## 🧠 System Mental Model

The Business Mart system organizes logic around strict boundaries:

```txt
Transactions            = source of truth events
Inventory               = stock truth
Ledger                  = financial truth
Market Insight / Rates  = market memory (reference only)
Dashboard               = operational overview
```

---

## 🎯 Purpose and Goals

The **Market Insight** module provides historical price tracking and event-level volume aggregation for observational reference. It is designed to act as "market memory" to assist operators in reviewing price trends and business activity over time.

---

## ⚠️ Architectural Isolation Rules

### 1. Strict Read-Only Boundaries
- The module reads data from the following tables to build analytics charts:
  - `Product`
  - `IntakeTransaction`
  - `SaleTransaction`
  - `SaleItem`
- The module **MUST NEVER** perform write operations or mutations on these tables.
- It must **never** influence inventory quantities, valuation calculations, ledger transactions, or invoices.

### 2. No Auto-Pricing Coupling
- The recorded `ProductRate` values **MUST NEVER** be used to auto-populate or override prices in:
  - Goods Intakes (supplier invoicing)
  - Sales & Billing (buyer invoicing)
- Operational transactional prices must remain entirely operator-controlled. The market rates are suggestion/observation references only.

### 3. Modularity & Safe Removability
- The Market Insight module behaves like a detachable analytics block. 
- It **must remain fully removable** without affecting the operational database structure, transactional, inventory, or ledger systems.

### 4. Dependency Direction
- The main operational dashboard may read from Market Insight to display charts.
- Market Insight **MUST NEVER** depend on the main dashboard components, controllers, or layout files.

---

## 💾 Data & Snapshot Integrity

### 1. Snapshot Rule
- Once a `ProductRate` log is written, it represents a human market observation at that exact timestamp.
- **Historical values must never be recalculated** from transactional data later.
- If a product's primary unit or system conversion factors change, historical `ProductRate` records must remain unchanged to preserve historical audit integrity.

### 2. Unit Fallbacks
- Rate entries capture a specific price per unit.
- If no unit is supplied, the rate defaults to the product's `primaryUnit` settings.
- If no product unit settings exist, it falls back to standard `"KG"`.

### 3. Soft-Deletions
- Records are soft-deleted via an `isDeleted` flag (labeled "Archive") to ensure that historical analytics are preserved for seasonal and auditing purposes.
