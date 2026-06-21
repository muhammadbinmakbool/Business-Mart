# POS Billing UI — Developer Guide

This document details the architectural, UI/UX, and technical design for the retail-focused POS Billing interface in Business Mart.

---

## 🏛️ Architecture & Data Flow

The POS billing UI introduces an alternative entry-point for recording customer transactions, keeping the backend services, database schemas, and validation routines unchanged.

```
+------------------+     +-------------------+
|  Classic Sales   |     |    New POS UI     |
|   (Form-based)   |     |  (Keyboard-first) |
+--------+---------+     +---------+---------+
         |                         |
         +------------+------------+
                      |
                      ▼
            +-------------------+
            |    SaleService    | (Backend service & validation)
            +---------+---------+
                      |
                      ▼
            +-------------------+
            |    Prisma / DB    |
            +-------------------+
```

---

## ⚙️ Layout Preference & Sidebar Control

To provide maximum horizontal screen space for the billing spreadsheet under the POS workflow, the sidebar is collapsed automatically.

* **Unified Route**: The POS workflow is unified under `/sales/create` instead of a separate route.
* **Server-Driven Layout**: The `RootLayout` fetches feature flags server-side and passes them to `AppLayout`. If the `salesWorkflow` flag is configured to `"POS"`, `AppLayout` dynamically collapses the sidebar (`80px` width) and locks scroll heights on the creation viewport.
* **Non-destructive Behavior**: The layout override applies reactively and does not overwrite the user's saved preferences in `localStorage`. Once they navigate away, the sidebar returns to its previous state.

---

## 🔢 Single Source of Calculation Truth

To prevent math and roundoff drift between the Classic and POS sales interfaces, all calculation logic remains pure, isolated, and centralized.

* **Zero Custom Calculation in POS**: POS components must never run custom multiplication or addition to calculate subtotal, adjustments, or final totals.
* **Central Utilities**:
  * Product quantities are normalized using `normalizeQuantity` from `@/lib/units.js`.
  * Product rates are normalized using `normalizeRate` from `@/lib/units.js`.
  * Total invoice calculations are computed using `calculateTransactionTotals` from `@/lib/financial.js`.
  * Row-level totals are computed using:
    ```javascript
    const normalizedRate = normalizeRate(item.rate || 0, item.rateUnit || "KG", product);
    const baseQuantity = normalizeQuantity(item.weight || 0, item.unit || "KG", product);
    const amount = round(baseQuantity * normalizedRate);
    ```
* **Instant Recalculation Trigger**: When any table input (quantity, unit, rate) is edited, the items array state updates, triggering a reactive recalculation of row-level amounts and global totals.

---

## ⌨️ Custom Keyboard Flow

To support rapid, mouse-free entry for cashiers, the POS UI implements standard key bindings.

### Global Keys
* **`F2`**: Focus the Product / Barcode Scan field.
* **`F3`**: Focus the Cash Received field in the calculator.
* **`F4`**: Move focus to the first editable cell (Product Search or Quantity) in the item table.
* **`F5`** / **`Alt+C`**: Focus the Customer / Buyer selection select button.
* **`F7`** / **`Ctrl+P`** / **`Alt+P`**: Save and print invoice receipt, then reset for next customer.
* **`Ctrl+Enter`** / **`Alt+S`**: Save & Close the invoice.
* **`Ctrl+Space`** / **`Alt+N`**: Quick checkout (Save & Reset form for the next customer).
* **`Esc`**: Clear the current cart / Cancel transaction.

### Spreadsheet Navigation
* **`Enter`**:
  * Focus on Product Select -> moves to Quantity input.
  * Focus on Quantity input -> moves to Rate input.
  * Focus on Rate input -> if last row, appends a new empty row and focuses its Product select. If not last row, focuses the next row's Product select.
* **`Up Arrow`**: Focuses the input in the same column in the row above.
* **`Down Arrow`**: Focuses the input in the same column in the row below.
* **`Ctrl+Delete`** / **`Ctrl+Backspace`**: Deletes the active row.

---

## 🔍 Barcode & Product Search Workflow

The barcode scan input detects typed text and barcode scanner inputs (which emit text followed by an `ENTER` key).

1. **Scanner Input**: The operator scans an item or types a keyword.
2. **Identifier Matching**:
   * First, check for an exact match against Product ID: `product.id.toString() === query.trim()`.
   * Next, check for an exact name match (case-insensitive): `product.name.toLowerCase() === query.trim().toLowerCase()`.
   * Finally, check for a case-insensitive substring match on the name.
3. **Action Execution**:
   * **Unique Match**: If exactly one product is found, it is appended to the items list with a quantity of `1` (or incremented if already present). Focus is immediately returned to the scan input.
   * **Multiple Matches**: Display a compact autocomplete overlay. The user can navigate using `Up/Down Arrow` and select with `Enter`.
   * **No Match**: Display a temporary warning toast and flash the scanner input red.

---

## 💵 Cash Calculator Module

For retail checkouts, the POS provides a payment helper section:

* **Subtotal & Final Bill**: Displayed in prominent font.
* **Cash Received**: An input field (automatically selects its value on focus for quick typing).
* **Change Due**: Computed dynamically as `Cash Received - Final Bill`.
  * **Exact / Overpaid**: Displayed in vibrant green text.
  * **Underpaid**: Displayed in red/gray with a warning indicator.

---

## 📂 File Organization

The sales and POS components are structured as follows:

```
src/app/sales/
├── create/
│   ├── page.js                 # Unified page loader (computes visible adjustments, determines POS vs Classic)
│   └── SaleForm.js             # Classic Form Client Shell
├── pos/
│   ├── page.js                 # Redirects server-side to /sales/create
│   ├── PosBillingClient.js     # POS Interface Client Shell
│   └── components/
│       ├── PosProductTable.js  # Spreadsheet-style editable grid
│       ├── PosTotals.js        # Subtotal, adjustments, and final bill display
│       └── PosCashCalculator.js# Cash received and change due calculator
```
