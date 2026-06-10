# Operator Guide: Data Export Features

This guide explains how to use the export features in Business Mart to generate Excel and CSV reports.

## Export Features Comparison
Business Mart provides three distinct methods to output or save data:

| Feature | Primary Purpose | Output Format | When to Use |
| :--- | :--- | :--- | :--- |
| **Data Export** | Structured list reporting, sorting, custom Excel filtering & finance reconciliation. | Excel (`.xlsx`), CSV (`.csv`) | For creating custom reports, sending raw transactions to accountants, or analyzing sales in pivot tables. |
| **Print / PDF** | Official, pixel-perfect transaction receipts, invoices, and summaries. | PDF / Print Paper | For generating customer receipts or official supplier invoices to print or email. |
| **Backup & Restore** | Full database backup, system migration, and disaster recovery. | SQLite Database File | Weekly/monthly system security maintenance. *Never use this for general spreadsheet analysis.* |

---

## How to Export Data

### 1. Sales & Billing Registry
1. Go to the **Sales / Billing** page.
2. Apply any search query, status tab, or date range filter (e.g. filter by "This Month").
3. Click the **Export Excel** or **Export CSV** button in the top right.
4. Your browser will download a file containing only the sales matching your filters.

### 2. Supplier Settlements Registry
1. Go to the **Supplier Settlements** page.
2. Use the search input or date filter to locate the desired settlement list.
3. Click **Export Excel** or **Export CSV** next to the "Generate Settlement" action button.

### 3. Ledger Reconciliation History
1. Go to the **Ledger & Reconciliation** page.
2. Click the **History** tab.
3. Click the **Export Excel** or **Export CSV** buttons in the header to download a history of all saved reconciliation session snapshots.

---

## Technical Features for Spreadsheet Users

### Raw Numeric Formats
Spreadsheet amounts (such as rates, deductions, and total weights) are preserved as raw numeric values rather than localized currency strings. This enables immediate mathematical calculations, sorting, and `=SUM(...)` actions without requiring manual data cleanup.

### Formula Injection Protection
To protect operators from malicious spreadsheets, any text input starting with `=`, `+`, `-`, or `@` is automatically escaped by prefixing it with a single quote (`'`). This prevents Microsoft Excel or Google Sheets from executing instructions as live macros.
