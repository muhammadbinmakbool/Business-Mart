# Financial Precision & Settings User Guide

This user guide describes how to configure the decimal precision and currency settings in the application, and how these configurations impact your invoices, printed receipts, ledgers, and reports.

---

## 1. Accessing System Settings

To configure the financial display settings:
1. Log in to the application.
2. Navigate to **Settings** from the main navigation sidebar.
3. Look for the **General Settings** panel.

---

## 2. Configurable Options

You can adjust the following financial preferences:

* **Decimal Places**: 
  Controls the number of digits shown after the decimal point for all monetary values.
  * Options: `0` (e.g. `1,250`), `1` (e.g. `1,250.0`), or `2` (e.g. `1,250.00`).
* **Currency Symbol**:
  Changes the prefix applied to currency amounts.
  * Default: `Rs.`
  * Custom symbols can be set to match local currencies or market requirements.

---

## 3. How Settings Propagate

Once updated, these settings will instantly reflect in the following parts of the application:

* **Registry Tables**: The Net Balance columns in Parties, Suppliers, and Customer registers.
* **Transaction Invoices**: Total fields, commissions, tax adjustments, and final payable/receivable balances on the Sales Invoice and Settlement pages.
* **Print Preview & PDF Export**: Generated invoices, receipts, and ledger statements will automatically adopt the selected currency symbol and decimal formatting.
* **Ledgers & Reconciliation**: The debit/credit columns and reconciliation difference totals.
* **Dashboard Widgets**: Total sales, total payables, and outstanding balances shown on the dashboard.
