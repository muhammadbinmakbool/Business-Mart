# Ledger & Reconciliation System Philosophy

This document outlines the architectural foundations and business logic behind the Ledger & Reconciliation module in Business Mart.

---

## 1. Core Principle: The Derived Ledger

In Business Mart, the Ledger/Reconciliation system is strictly a **derived view**. It is **NOT** a database of record (source of truth) for account balances.

### Rules of Truth:
* The absolute sources of truth are the **Operational Events**:
  * `IntakeTransaction` (Goods received)
  * `SupplierInvoice` (Settlements issued)
  * `SaleTransaction` / `SaleItem` (Sales billed)
  * `IntakeAdvance` (Payments issued)
* The ledger queries these events and calculates summaries on the fly.
* Direct journal entries, arbitrary ledger edits, and manual accounting adjustments directly inside the ledger table are strictly prohibited. Any operational adjustment must be recorded as an adjustment line item on the source invoice or sale transaction.

---

## 2. Centralized Calculation Rule (Formula Lock)

To prevent formula fragmentation, math discrepancies, and rounding drift:
* **All** reconciliation math is implemented inside `src/lib/reconciliation.js`.
* Individual UI screens, dashboards, reports, and database repositories must never calculate totals, sums, or difference logic inline. They must delegate entirely to the functions in `reconciliation.js`.

### The Base Comparison Formula
A true reconciliation compares the underlying raw value of transacted physical goods before adjustments.

$$\text{Supplier Base Amount (totalGrossValue)} = \text{Supplier Net Settled Value} + \text{Supplier Deductions}$$

$$\text{Buyer Base Amount (baseAmount)} = \text{Buyer Final Invoice Total} - \text{Buyer Adjustments}$$

* If these base amounts are equal (within the configured tolerance), the physical operations are balanced and correct.
* Adjustments (commission, labour, market taxes) are added or subtracted on top of these base values to create the commercial invoices, but the core of the business balancing is checking if the raw values match.

---

## 3. Tolerance Handling

Due to division rounding (e.g., rate-per-maund to rate-per-kg conversions) or small fractions of a rupee, tiny difference values are expected in day-to-day operations.
* A configurable tolerance (defaulting to `1.00` rupee) is defined centrally in `src/lib/reconciliation.js`.
* Any absolute difference less than or equal to this tolerance is flagged as `MATCHED`.
* If a tighter or looser tolerance is required, it must be changed in the central configuration variable `DEFAULT_TOLERANCE`.

---

## 4. Reconciliation Sessions & Period Locking

To establish operational trust at the end of a business cycle (typically monthly), operators perform a **Reconciliation Session**:

1. **Verify Live Match**: Operators review the current month's transactions, filter by parties, resolve any mismatches, and confirm that the overall difference is within tolerance.
2. **Save Snapshot**: The operator saves a snapshot of the month (represented by a `LedgerSession` record) containing the title, start/end dates, current supplier/buyer totals, and remarks.
3. **Period Locking (Soft Protection)**: A session can be marked as `LOCKED`. When a session is locked, the UI disables deletion and modification controls. This acts as soft protection against accidental deletes.

---

## 5. Mistake & Edit Detection (Drift Detection)

Since the ledger is derived, saving a session does **NOT** duplicate or isolate the invoices of that period. The invoices remain active operational data.
* If a user retroactively modifies, adds, or deletes an invoice or sale in a previously closed month, the live transactions will no longer match the saved snapshot.
* When viewing a saved session, the system queries the live database for that period, compares the live aggregates with the session's saved properties, and highlights any differences instantly as **DRIFT DETECTED**.
* This enables rapid audit checks, ensuring historical integrity is maintained and unauthorized retroactive modifications are caught immediately.
