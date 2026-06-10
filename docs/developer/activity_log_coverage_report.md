# Verified Activity Log Coverage & Audit Report

This developer document provides a comprehensive report on the features, UI capabilities, background architecture, and transaction coverage of the **System Activity Log** module in Business Mart.

---

## 1. UI Accessibility & Filters

The admin interface for audit trials is located directly in the main sidebar layout under the **Activity Log** navigation item (`/activity`).

### Interactive Capabilities:
* **Entity ID Search**: Direct numeric filtering by database primary key ID for rapid troubleshooting.
* **Entity Type Filter**: Multi-select dropdown filtering by entity categories:
  * `PRODUCT`
  * `PARTY`
  * `INTAKE`
  * `SALE`
  * `SETTLEMENT`
  * `SYSTEM`
* **Action Selector**: Filter logs by specific operation actions:
  * `CREATED`, `UPDATED`, `DELETED`, `COMPLETED`
  * `CANCELLED`, `ARCHIVED`, `SUPERSEDED`, `SOLD`
* **Date Range Picker**: Focus audits to specific start and end boundaries.
* **Inspector Panel**: Clicking **Inspect** on any row displays a structured JSON code block containing the raw, immutable `meta` state snapshot.

---

## 2. Background Queue & Safety Design

Logging is handled via an asynchronous, fire-and-forget logging pipeline defined in `src/modules/activity-log/activityLogger.js` to ensure zero performance impact on core database transaction tables.

* **Non-Blocking Write**: Operations are pushed to `logQueue` in-memory.
* **Memory Protection**: Maximum queue size is capped at `10,000` to prevent memory exhaustion during batch actions.
* **Dead-Letter Buffer**: If log writes fail, they are retried. Persistent errors are offloaded to `failedLogsBuffer` (cap: 500) for administrator review.
* **Exit Flush**: Shutdown hooks listen for `SIGINT` / `SIGTERM` signals and commit all cached logs to the database before the process exits.

---

## 3. Transaction Coverage Audit

### A. Goods Intake Module
* **CREATED**: Records intake number, supplier name/ID, normalized weights, bag counts, and rate.
* **UPDATED**: Logs changes to weights, quantities, and status transitions (e.g. `PENDING` to `SOLD`).
* **SOLD / PARTIALLY SOLD**: Tracks consumption of physical stock.
* **DELETED (Soft-Delete)**: Logs operator name, timestamp, and delete reason.
* **HARD_DELETED**: Emits permanent deletion event (captured under Destructive Mode) and the administrative reason.

### B. Sales & Billing Module
* **CREATED**: Logs buyer ID, product IDs, weights, and final billing amount.
* **UPDATED**: Logged with updated item arrays, weight, and value changes.
* **CANCELLED / CLEARED**: Logs status transitions (e.g. `CANCELLED` resets linked sales tracks).
* **DELETED / HARD_DELETED**: Logs soft-deleted and permanently hard-deleted records.

### C. Financial Payments & Adjustments
* **Direct Payments**: Cash-in and Cash-out payments log the total amount, unallocated balances, and payment reference numbers.
* **FIFO Clearing Allocations**: Emits individual child log events for each invoice/settlement cleared during transaction allocation.

### D. Inventory Management
* **Recalculations / Corrections**: Logs manual physical inventory stock corrections or bulk recalculations (capturing the count of affected products).
* **Conversion Overrides**: Logs modifications to conversion parameters or initial onboarding stock updates.

### E. Ledger Reconciliation Sessions
* **CREATED**: Emits session snapshot title, date ranges, base totals, and difference.
* **UPDATED**: Logs locking status updates (`status: "LOCKED" | "OPEN"`).
* **DELETED / HARD_DELETED**: Logs soft-deletion and permanent destruction details.

### F. System-Level Events
* **Backup & Restore**: Logs complete database restore events with backup generation timestamps.
* **Destructive Mode Toggle**: 
  * `DESTRUCTIVE_MODE_ENABLED`: Logs admin details, access reason, and session duration.
  * `DESTRUCTIVE_MODE_DISABLED`: Logs manual session logout/expiration.
* **Data Import / Migrations**: Logs bulk catalog/party onboarding imports, reporting counts of success vs skipped rows.
