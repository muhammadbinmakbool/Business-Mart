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

1. Navigate to **Settings** (via the sidebar/navigation header).
2. Click on the **Maintenance** tab or option.
3. Select **Data Export** from the left-hand navigation list of options.
4. Customize your export using the following steps:
   - **Select Dataset**: Choose between *Sales & Billing Registry*, *Supplier Settlements Registry*, or *Ledger Reconciliation Snapshots*.
   - **Configure Filters**: Input optional text search terms, status filters, and specific date range/presets.
   - **File Format**: Choose *Excel (.xlsx)* or *CSV (.csv)*.
5. Click **Download Dataset**. Your browser will generate and download the file.

---

## Technical Features for Spreadsheet Users

### Raw Numeric Formats
Spreadsheet amounts (such as rates, deductions, and total weights) are preserved as raw numeric values rather than localized currency strings. This enables immediate mathematical calculations, sorting, and `=SUM(...)` actions without requiring manual data cleanup.

### Formula Injection Protection
To protect operators from malicious spreadsheets, any text input starting with `=`, `+`, `-`, or `@` is automatically escaped by prefixing it with a single quote (`'`). This prevents Microsoft Excel or Google Sheets from executing instructions as live macros.
