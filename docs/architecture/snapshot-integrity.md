# Architecture Invariant: Snapshot Integrity (Master-to-Snapshot Rule)

This document establishes the architecture, invariants, and developer guidelines for **Snapshot Integrity** in the Business Mart ERP.

---

## 🏛️ Core Principle

The **Master-to-Snapshot Rule** states:
> **Master data must be copied into transaction snapshots at creation/recording time. Existing transactions, items, and billing/deduction adjustments must never be automatically synchronized with, rehydrated from, or overwritten by later modifications to master records.**

This principle prevents silent retro-modification, data drift, and audit trail corruption. Once a transaction (e.g. Sale, Intake, Settlement, or Payment) is finalized or recorded, its calculations and labels are frozen.

---

## ⚠️ The Danger of Live Referencing

If transaction records reference master data dynamically (via direct joins/foreign key lookup) instead of recording snapshots:
1. **Historical Distortion**: Renaming a product, tax template, or supplier profile instantly changes all historical records and printed invoices retrospectively.
2. **Reconciliation Failures**: Modifying a tax percentage or deduction rate changes the calculated amounts on existing transactions, causing ledger imbalances and accounting discrepancies.
3. **Broken Edits**: Disabling or soft-deleting a master configuration prevents operators from editing or adjusting older invoices that rely on that configuration.

---

## 📋 Core Applications

The Snapshot Integrity principle applies across these key domains:

### 1. Dynamic Adjustments (Taxes, Commissions, Discounts)
* **Model Snapshots**: `TransactionAdjustment` and `SupplierInvoiceAdjustment` store their own copies of:
  - `adjustmentType` (storing the exact display name snapshot at creation, e.g. `"GST"`).
  - `code` (referencing the original template code, e.g. `"GST"`).
  - `method` (e.g. `PERCENTAGE`, `FIXED`, `PER_WEIGHT`).
  - `direction` (e.g. `ADD`, `SUBTRACT`).
  - `value` (configured default rate/amount).
  - `isUserEditable` (Boolean flag controlling UI input locking).
* **Decoupled Calculations**: Total recalculations on invoice edits run purely using the snapshotted parameters, never by querying or re-joining the master `AdjustmentDefinition` configuration.
* **UI Locking**: Form inputs are rendered as read-only labels or disabled fields based on the snapshot's stored `isUserEditable` value, independent of the template's current flag in settings.
* **Name Isolation**: If the master template for `GST` is renamed to `General Sales Tax`, historical records continue to render and print as `GST` using their stored `adjustmentType`.

### 2. Product & Party Profiles
* When a sale item is saved, details such as the product name, packaging unit, and rate units are snapshotted in `SaleItem` / `SupplierInvoiceItem` rather than fetched live from the `Product` table on invoice display.

### 3. Unit Conversions & Math
* Standard weight conversions (e.g. Maunds-to-Kilograms) must freeze their conversion rates in the transaction records, protecting historical volumes from configuration shifts.

### 4. Company Branding Profiles
* Information shown on printed invoices (e.g., logo path, company name, contact numbers, tax registration numbers) must be stored or snapshotted as of the transaction date so that rebranding does not retro-modify historical legal document copies.

---

## 🛠️ Guidelines for Developers

When implementing new modules or editing existing logic:
1. **Never Join on Master Tables for Display**: Detail views, print layouts, ledger statement generation, and PDF generation must extract all labels and parameters directly from the transaction/item snapshot tables.
2. **Handle Inactive Master Data Gracefully**:
   - For **new additions**, only populate select menus or search lists with *active* master definitions (`isActive = true` and `isDeleted = false`).
   - For **edits to existing records**, do not validate that the adjustment's original template is still active. Allow it to load and recalculate strictly from its snapshot.
3. **Map All Metadata on Save**: Always ensure that snapshot parameters are completely mapped on both creation and edit/update routes.
